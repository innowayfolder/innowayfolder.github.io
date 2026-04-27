const { query, queryOne, transaction } = require('./utils/db');

/**
 * User Repository
 * Handles all database operations for the users table
 */

/**
 * Find a user by username (case-insensitive)
 * @param {string} username - User username
 * @returns {Promise<Object|null>} User object or null if not found
 */
async function findByUsername(username) {
    const text = `
    SELECT username, password, createdate
    FROM innoway.users
    WHERE LOWER(username) = LOWER($1)
  `;

    return await queryOne(text, [username]);
}

// token management
/**
 * Create a new refresh token record
 * @param {string} username - User username
 * @param {string} tokenHash - Bcrypt hash of the refresh token
 * @param {Date} expiresAt - Token expiration timestamp
 * @param {Object} deviceInfo - Device information
 * @param {string} deviceInfo.deviceName - Device name from User-Agent
 * @param {string} deviceInfo.ipAddress - Client IP address
 * @returns {Promise<Object>} Created refresh token record
 */
async function createRefreshToken(username, tokenHash, expiresAt, deviceInfo) {
  const now = new Date();
  const deviceName = deviceInfo.deviceName || null;
  const ipAddress = deviceInfo.ipAddress || null;

  return await transaction(async (client) => {
    const deleteText = `
      DELETE FROM innoway.auth_refresh_token
      WHERE username = $1 AND device_name = $2 AND ip_address = $3
    `;
    await client.query(deleteText, [username, deviceName, ipAddress]);

    const insertText = `
      INSERT INTO innoway.auth_refresh_token (
        username, refresh_token_hash, expires_at, device_name, 
        ip_address, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING username, refresh_token_hash, expires_at, device_name, ip_address, created_at, updated_at
    `;

    const insertParams = [username, tokenHash, expiresAt, deviceName, ipAddress, now, now];
    const result = await client.query(insertText, insertParams);
    return result.rows.length > 0 ? result.rows[0] : null;
  });
}

/**
 * Get all refresh token records for a user
 * @param {string} username - User username
 * @returns {Promise<Array>} Refresh token rows
 */
async function getRefreshTokensByUsername(username) {
  const text = `
    SELECT username, refresh_token_hash, expires_at, device_name,
           ip_address, created_at, updated_at
    FROM innoway.auth_refresh_token
    WHERE username = $1
  `;

  const result = await query(text, [username]);
  return result.rows;
}

/**
 * Delete one refresh token record for a user
 * @param {string} username - User username
 * @param {string} tokenHash - Stored refresh token hash
 * @returns {Promise<number>} Number of tokens deleted
 */
async function deleteRefreshTokenByHash(username, tokenHash) {
  const text = `
    DELETE FROM innoway.auth_refresh_token
    WHERE username = $1 AND refresh_token_hash = $2
  `;

  const result = await query(text, [username, tokenHash]);
  return result.rowCount;
}

/**
 * Update article primary key value.
 * @param {string} oldArticleId - Existing article identifier
 * @param {string} newArticleId - New article identifier
 * @returns {Promise<number>} Number of rows updated
 */
async function updateArticleId(oldArticleId, newArticleId) {
  const text = `
    UPDATE innoway.articles
    SET article_id = $2,
        updated_at = CURRENT_TIMESTAMP
    WHERE article_id = $1
  `;

  const result = await query(text, [oldArticleId, newArticleId]);
  return result.rowCount;
}

/**
 * Insert or update an article (upsert)
 * @param {Object} article - Article payload
 * @param {string} article.articleId - Unique article identifier
 * @param {string} article.title - Article title
 * @param {string} article.content - Article content
 * @param {string} article.status - Article status
 * @param {string|null} article.publishedAt - Publish date in YYYY-MM-DD format
 * @returns {Promise<Object>} Upserted article row
 */
async function upsertArticle(article) {
  return await transaction(async (client) => {
    const articleText = `
      INSERT INTO innoway.articles (article_id, title, content, status, published_at, created_at, updated_at)
      VALUES (
        $1,
        $2,
        $3,
        $4::VARCHAR(20),
        CASE WHEN $5::TEXT IS NOT NULL THEN $5::TIMESTAMP ELSE NULL END,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT (article_id) DO UPDATE SET
        title = $2,
        content = $3,
        status = $4::VARCHAR(20),
        updated_at = CURRENT_TIMESTAMP,
        published_at = CASE
          WHEN $5::TEXT IS NOT NULL THEN $5::TIMESTAMP
          ELSE NULL
        END
      RETURNING article_id, title, content, status, created_at, updated_at, published_at
    `;

    const articleResult = await client.query(articleText, [
      article.articleId,
      article.title,
      article.content,
      article.status,
      article.publishedAt,
    ]);

    const photos = Array.isArray(article.photos) ? article.photos : [];
    const photoUpsertText = `
      INSERT INTO innoway.article_photo (article_id, rank, file_name, mime_type, created_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      ON CONFLICT (article_id, rank) DO UPDATE SET
        file_name = EXCLUDED.file_name,
        mime_type = EXCLUDED.mime_type
    `;

    for (const photo of photos) {
      await client.query(photoUpsertText, [
        article.articleId,
        photo.rank,
        photo.fileName,
        photo.mimeType,
      ]);
    }

    if (photos.length > 0) {
      const retainedRanks = photos.map((photo) => photo.rank);
      await client.query(
        `
          DELETE FROM innoway.article_photo
          WHERE article_id = $1 AND NOT (rank = ANY($2::INT[]))
        `,
        [article.articleId, retainedRanks],
      );
    } else {
      await client.query(
        `
          DELETE FROM innoway.article_photo
          WHERE article_id = $1
        `,
        [article.articleId],
      );
    }

    const photoResult = await client.query(
      `
        SELECT article_id, rank, file_name, mime_type, created_at
        FROM innoway.article_photo
        WHERE article_id = $1
        ORDER BY rank ASC
      `,
      [article.articleId],
    );

    return {
      ...articleResult.rows[0],
      photos: photoResult.rows,
    };
  });
}

/**
 * Get one article by article_id
 * @param {string} articleId - Article ID
 * @returns {Promise<Object|null>} Article row or null
 */
async function getArticleById(articleId, includeAllStatuses = false) {
  if (includeAllStatuses) {
    const text = `
      SELECT article_id, title, content, status, created_at, updated_at, published_at
      FROM innoway.articles
      WHERE article_id = $1
    `;

    return await queryOne(text, [articleId]);
  }

  const text = `
    SELECT article_id, title, content, status, created_at, updated_at, published_at
    FROM innoway.articles
    WHERE article_id = $1 AND status = 'PUBLISHED'
  `;

  return await queryOne(text, [articleId]);
}

/**
 * Get photos for one article by article_id ordered by rank
 * @param {string} articleId - Article ID
 * @returns {Promise<Array>} Article photo rows
 */
async function getArticlePhotosById(articleId) {
  const text = `
    SELECT rank, file_name, mime_type
    FROM innoway.article_photo
    WHERE article_id = $1
    ORDER BY rank ASC
  `;

  const result = await query(text, [articleId]);
  return result.rows;
}

/**
 * Get all articles ordered by newest first
 * @returns {Promise<Array>} List of article rows
 */
async function getAllArticles(includeAllStatuses = false) {
  if (includeAllStatuses) {
    const text = `
      SELECT article_id, title, content, status, created_at, updated_at, published_at
      FROM innoway.articles
      ORDER BY created_at DESC
    `;

    const result = await query(text);
    return result.rows;
  }

  const text = `
    SELECT article_id, title, content, status, created_at, updated_at, published_at
    FROM innoway.articles
    WHERE status = 'PUBLISHED'
    ORDER BY created_at DESC
  `;

  const result = await query(text);
  return result.rows;
}

/**
 * Delete an article by article_id
 * Photos are deleted automatically via database ON DELETE CASCADE constraint
 * @param {string} articleId - Article ID to delete
 * @returns {Promise<number>} Number of articles deleted
 */
async function deleteArticleById(articleId) {
  const text = `
    DELETE FROM innoway.articles
    WHERE article_id = $1
  `;

  const result = await query(text, [articleId]);
  return result.rowCount;
}

module.exports = {
    findByUsername,
    createRefreshToken,
    getRefreshTokensByUsername,
    deleteRefreshTokenByHash,
    updateArticleId,
    upsertArticle,
    getArticleById,
  getArticlePhotosById,
    getAllArticles,
    deleteArticleById,
};
