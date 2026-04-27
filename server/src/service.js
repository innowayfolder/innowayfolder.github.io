const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const BCRYPT_ROUNDS = 10;
const MIN_PHOTO_FILE_NAME_LENGTH = 5;
const {
  findByUsername,
  createRefreshToken,
  getRefreshTokensByUsername,
  deleteRefreshTokenByHash,
  updateArticleId,
  upsertArticle: upsertArticleRecord,
  getArticleById,
  getArticlePhotosById,
  getAllArticles,
} = require('./repository');
const { uploadToS3, deleteStaleArticlePhotosInS3, renameFolderInS3 } = require('./aws');
/**
 * Authentication Service
 * Handles authentication business logic for registration, login, and token management
 */

/**
 * Login an existing user with username and password
 * @param {string} username - User username
 * @param {string} password - Plain text password
 * @param {Object} deviceInfo - Device information from request
 * @param {string} deviceInfo.deviceName - Device name
 * @param {string} deviceInfo.ipAddress - Client IP address
 * @returns {Promise<Object>} Login response with tokens
 * @throws {Error} If credentials are invalid or login fails
 */
async function loginWithUsername(username, password, deviceInfo) {
  // Validate inputs
  if (!username || typeof username !== 'string') {
    throw new Error('Username must be a non-empty string');
  }
  
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string');
  }

  // Lookup user by username
  const user = await findByUsername(username);
  
  // Return error for invalid credentials
  if (!user) {
    const error = new Error('Invalid username or password');
    error.code = 'INVALID_CREDENTIALS';
    error.statusCode = 401;
    throw error;
  }

  // Check if user has a password (username/password user)
  if (!user.password) {
    const error = new Error('Invalid username or password');
    error.code = 'INVALID_CREDENTIALS';
    error.statusCode = 401;
    throw error;
  }

  // Verify password using password service
  const isPasswordValid = await verifyPassword(password, user.password);
  
  // Return error for invalid credentials
  if (!isPasswordValid) {
    const error = new Error('Invalid username or password');
    error.code = 'INVALID_CREDENTIALS';
    error.statusCode = 401;
    throw error;
  }
  return await generateTokenResponse(user.username, deviceInfo);
}


async function generateTokenResponse (username, deviceInfo)
{
  const accessToken = generateAccessToken(username);
  const refreshToken = generateRefreshToken();
  // Calculate refresh token expiration
  const refreshTokenExpiry = process.env.JWT_REFRESH_TOKEN_EXPIRY || '30d';
  const expiresAt = calculateExpiration(refreshTokenExpiry);

  // Hash and store refresh token with device info
  const refreshTokenHash = await hashRefreshToken(refreshToken);
  await createRefreshToken(
    username,
    refreshTokenHash,
    expiresAt,
    deviceInfo
  );
  return {
    username: username,
    auth_token: accessToken,
    refresh_token: refreshToken,
    expires_at: expiresAt.toISOString(),
  };
}

async function findMatchingRefreshTokenRecord(tokenRecords, refreshToken) {
  for (const record of tokenRecords) {
    const isMatch = await bcrypt.compare(refreshToken, record.refresh_token_hash);
    if (isMatch) {
      return record;
    }
  }

  return null;
}

/**
 * Refresh access and refresh tokens using a valid refresh token
 * @param {string} username - User username
 * @param {string} refreshToken - Plain text refresh token
 * @returns {Promise<Object>} Response with new tokens
 * @throws {Error} If refresh token is invalid or expired
 */
async function refreshTokens(username, refreshToken, deviceInfo) {
  // Validate inputs
  if (!username || typeof username !== 'string') {
    throw new Error('Username must be a non-empty string');
  }
  
  if (!refreshToken || typeof refreshToken !== 'string') {
    throw new Error('Refresh token must be a non-empty string');
  }

  // Lookup all token records for this user to find matching hash
  // We need to compare the submitted token against all stored hashes
  // because bcrypt hashes are not deterministic
  const tokenRecords = await getRefreshTokensByUsername(username);
  const matchingToken = await findMatchingRefreshTokenRecord(tokenRecords, refreshToken);
  
  // Return error for invalid refresh token
  if (!matchingToken) {
    const error = new Error('Invalid refresh token');
    error.code = 'INVALID_REFRESH_TOKEN';
    error.statusCode = 401;
    throw error;
  }

  // Verify token not expired
  const now = new Date();
  if (matchingToken.expires_at < now) {
    const error = new Error('Refresh token has expired');
    error.code = 'EXPIRED_REFRESH_TOKEN';
    error.statusCode = 401;
    throw error;
  }

  // Revoke the presented refresh token before minting a new one to prevent replay.
  await deleteRefreshTokenByHash(username, matchingToken.refresh_token_hash);

  return await generateTokenResponse(username, deviceInfo);
}

/**
 * Revoke one refresh token session for a user (logout current session)
 * @param {string} username - User username
 * @param {string} refreshToken - Plain text refresh token
 * @returns {Promise<void>}
 * @throws {Error} If token is invalid or revocation fails
 */
async function revokeSessionToken(username, refreshToken) {
  if (!username || typeof username !== 'string') {
    throw new Error('Username must be a non-empty string');
  }

  if (!refreshToken || typeof refreshToken !== 'string') {
    throw new Error('Refresh token must be a non-empty string');
  }

  const tokenRecords = await getRefreshTokensByUsername(username);

  const matchingToken = await findMatchingRefreshTokenRecord(tokenRecords, refreshToken);

  if (!matchingToken) {
    const error = new Error('Invalid refresh token');
    error.code = 'INVALID_REFRESH_TOKEN';
    error.statusCode = 401;
    throw error;
  }

  await deleteRefreshTokenByHash(username, matchingToken.refresh_token_hash);
}

/**
 * Calculate expiration date from a duration string
 * @param {string} duration - Duration string (e.g., '15m', '30d', '1h')
 * @returns {Date} Expiration date
 */
function calculateExpiration(duration) {
  const now = new Date();
  const match = duration.match(/^(\d+)([smhd])$/);
  
  if (!match) {
    throw new Error('Invalid duration format');
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's': // seconds
      return new Date(now.getTime() + value * 1000);
    case 'm': // minutes
      return new Date(now.getTime() + value * 60 * 1000);
    case 'h': // hours
      return new Date(now.getTime() + value * 60 * 60 * 1000);
    case 'd': // days
      return new Date(now.getTime() + value * 24 * 60 * 60 * 1000);
    default:
      throw new Error('Invalid duration unit');
  }
}

//#region hashPassword, verifyPassword
/**
 * Hashes a password using bcrypt with automatic salt generation
 * @param {string} password - The plain text password to hash
 * @returns {Promise<string>} The bcrypt hash (includes salt)
 * @throws {Error} If password is invalid or hashing fails
 */
async function hashPassword(password) {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string');
  }

  // bcrypt.hash automatically generates a unique salt for each password
  // The salt is included in the returned hash string
  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  
  return hash;
}

/**
 * Verifies a password against a stored bcrypt hash
 * @param {string} password - The plain text password to verify
 * @param {string} hash - The bcrypt hash to compare against
 * @returns {Promise<boolean>} True if password matches, false otherwise
 * @throws {Error} If parameters are invalid
 */
async function verifyPassword(password, hash) {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string');
  }
  
  if (!hash || typeof hash !== 'string') {
    throw new Error('Hash must be a non-empty string');
  }

  // bcrypt.compare uses constant-time comparison to prevent timing attacks
  const isMatch = await bcrypt.compare(password, hash);
  
  return isMatch;
}
//#endregion

//#region token generation, validation, refresh
/**
 * Generates a JWT access token for a user
 * @param {string} userId - The user's unique identifier
 * @returns {string} Signed JWT access token
 * @throws {Error} If userId is invalid or JWT_SECRET is not configured
 */
function generateAccessToken(userId) {
  if (!userId || typeof userId !== 'string') {
    throw new Error('User ID must be a non-empty string');
  }

  const JWT_SECRET = process.env.JWT_SECRET;
  const JWT_ACCESS_TOKEN_EXPIRY = process.env.JWT_ACCESS_TOKEN_EXPIRY || '15m';

  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not configured');
  }

  // Create JWT payload with username and let jwt.sign add the exp claim
  const payload = {
    username: userId
  };

  // Sign the token with the secret and set expiration
  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_ACCESS_TOKEN_EXPIRY
  });

  return token;
}

/**
 * Generates a cryptographically secure random refresh token
 * @returns {string} A 64-character hexadecimal refresh token
 */
function generateRefreshToken() {
  // Generate 32 random bytes (256 bits) and convert to hexadecimal string (64 characters)
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hashes a refresh token using bcrypt
 * @param {string} token - The refresh token to hash
 * @returns {Promise<string>} The bcrypt hash of the refresh token
 * @throws {Error} If token is invalid or BCRYPT_ROUNDS is not configured
 */
async function hashRefreshToken(token) {
  if (!token || typeof token !== 'string') {
    throw new Error('Token must be a non-empty string');
  }

  const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);

  if (BCRYPT_ROUNDS < 10) {
    throw new Error('BCRYPT_ROUNDS must be at least 10');
  }

  // Hash the token using bcrypt with the configured work factor
  const hash = await bcrypt.hash(token, BCRYPT_ROUNDS);
  return hash;
}
//#endregion

/**
 * Upsert an article (insert or update)
 * Article ID must be provided by caller. Uses PostgreSQL ON CONFLICT for atomic upsert.
 * @param {string|null|undefined} oldArticleId - Previous article identifier when renaming
 * @param {string} articleId - Article identifier (required, generated by caller)
 * @param {string} title - Article title
 * @param {string} content - Article content
 * @param {string|null|undefined} status - Article status
 * @param {Array} photos - Article photos
 * @param {string|null|undefined} publishedAt - Publish date in YYYY-MM-DD format
 * @returns {Promise<Object>} Upserted article
 * @throws {Error} If articleId, title, or content is missing or invalid
 */
async function upsertArticle(oldArticleId, articleId, title, content, status, photos = [], publishedAt) {

  if (!articleId || typeof articleId !== 'string') {
    throw new Error('articleId must be a non-empty string');
  }

  if (oldArticleId && oldArticleId !== articleId) {
    const updatedCount = await updateArticleId(oldArticleId, articleId);
    if (updatedCount === 0) {
      const error = new Error('Old article not found');
      error.code = 'NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }
    // rename AWS folder
    await renameFolderInS3(oldArticleId, articleId);
  }

  if (!title || typeof title !== 'string') {
    throw new Error('Title must be a non-empty string');
  }

  if (!content || typeof content !== 'string') {
    throw new Error('Content must be a non-empty string');
  }

  const normalizedStatus = normalizeArticleStatus(status);
  const normalizedPhotos = normalizeArticlePhotos(photos);
  const normalizedPublishedAt = normalizePublishedAt(publishedAt);

  const upsertedArticle = await upsertArticleRecord({
    articleId: articleId,
    title: title.trim(),
    content,
    status: normalizedStatus,
    publishedAt: normalizedPublishedAt,
    photos: normalizedPhotos,
  });

  try {
    await deleteStaleArticlePhotosInS3(
      articleId,
      normalizedPhotos.map((photo) => photo.fileName)
    );
  } catch (error) {
    console.error(`Failed to reconcile S3 photos for article ${articleId}:`, error);
  }

  return upsertedArticle;
}

/**
 * Upload an article photo to S3.
 * @param {string} articleId - Article identifier
 * @param {string} fileName - Original file name
 * @param {Buffer} fileBuffer - Uploaded file content
 * @param {string} mimeType - MIME type for content-type metadata
 * @returns {Promise<Object>} Uploaded photo metadata
 */
async function uploadArticlePhoto(articleId, fileName, fileBuffer, mimeType) {
  if (!articleId || typeof articleId !== 'string') {
    throw new Error('articleId is required and must be a non-empty string');
  }

  if (!fileName || typeof fileName !== 'string') {
    throw new Error('fileName is required and must be a non-empty string');
  }

  if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
    throw new Error('file is required and must be a valid binary file');
  }

  if (!mimeType || typeof mimeType !== 'string') {
    throw new Error('mimeType is required and must be a non-empty string');
  }

  const safeFileName = normalizePhotoFileName(fileName);
  const photoUrl = await uploadToS3(fileBuffer, articleId, safeFileName, mimeType.trim());

  return {
    articleId,
    fileName: safeFileName,
    mimeType: mimeType.trim(),
    url: photoUrl,
  };
}

function normalizePhotoFileName(fileName) {
  const trimmedFileName = fileName.trim();
  const { baseName, extension } = splitFileName(trimmedFileName);

  let normalizedBaseName = slugifyFileNamePart(baseName);
  const normalizedExtension = slugifyExtension(extension);

  if (!normalizedBaseName) {
    normalizedBaseName = 'file';
  }

  if (normalizedBaseName.length < MIN_PHOTO_FILE_NAME_LENGTH) {
    normalizedBaseName += generateRandomSuffix(MIN_PHOTO_FILE_NAME_LENGTH - normalizedBaseName.length);
  }

  return normalizedExtension ? `${normalizedBaseName}.${normalizedExtension}` : normalizedBaseName;
}

function splitFileName(fileName) {
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex <= 0 || lastDotIndex === fileName.length - 1) {
    return {
      baseName: fileName,
      extension: '',
    };
  }

  return {
    baseName: fileName.slice(0, lastDotIndex),
    extension: fileName.slice(lastDotIndex + 1),
  };
}

function slugifyFileNamePart(value) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function slugifyExtension(value) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function generateRandomSuffix(length) {
  return crypto.randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
}

function normalizeArticleStatus(status) {
  if (typeof status !== 'string' || !status.trim()) {
    return 'DRAFT';
  }

  const normalizedStatus = status.trim().toUpperCase();
  const allowedStatuses = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];

  if (!allowedStatuses.includes(normalizedStatus)) {
    throw new Error('status must be one of DRAFT, PUBLISHED, or ARCHIVED');
  }

  return normalizedStatus;
}

function normalizeArticlePhotos(photos) {
  if (typeof photos === 'undefined') {
    return [];
  }

  if (!Array.isArray(photos)) {
    throw new Error('photos must be an array when provided');
  }

  const normalizedPhotos = photos.map((photo) => {
    if (!photo || typeof photo !== 'object') {
      throw new Error('each photo must be an object');
    }

    const rank = Number(photo.rank);
    if (!Number.isInteger(rank) || rank < 1) {
      throw new Error('photo rank must be an integer greater than 0');
    }

    if (!photo.fileName || typeof photo.fileName !== 'string' || !photo.fileName.trim()) {
      throw new Error('photo fileName must be a non-empty string');
    }

    if (typeof photo.mimeType !== 'undefined' && photo.mimeType !== null && typeof photo.mimeType !== 'string') {
      throw new Error('photo mimeType must be a string when provided');
    }

    return {
      rank,
      fileName: photo.fileName.trim(),
      mimeType: typeof photo.mimeType === 'string' && photo.mimeType.trim() ? photo.mimeType.trim() : null,
    };
  });

  const uniqueRanks = new Set(normalizedPhotos.map((photo) => photo.rank));
  if (uniqueRanks.size !== normalizedPhotos.length) {
    throw new Error('photos ranks must be unique');
  }

  return normalizedPhotos.sort((left, right) => left.rank - right.rank);
}

function normalizePublishedAt(publishedAt) {
  if (typeof publishedAt === 'undefined' || publishedAt === null) {
    return null;
  }

  if (typeof publishedAt !== 'string') {
    throw new Error('publishedAt must be a string when provided');
  }

  const trimmedPublishedAt = publishedAt.trim();
  if (!trimmedPublishedAt) {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedPublishedAt)) {
    throw new Error('publishedAt must be in YYYY-MM-DD format when provided');
  }

  const [year, month, day] = trimmedPublishedAt.split('-').map((value) => Number.parseInt(value, 10));
  const normalizedDate = new Date(Date.UTC(year, month - 1, day));

  if (
    Number.isNaN(normalizedDate.getTime())
    || normalizedDate.getUTCFullYear() !== year
    || normalizedDate.getUTCMonth() + 1 !== month
    || normalizedDate.getUTCDate() !== day
  ) {
    throw new Error('publishedAt must be a valid calendar date when provided');
  }

  return trimmedPublishedAt;
}

/**
 * Get an article by ID
 * @param {string} articleId - Article ID
 * @returns {Promise<Object>} Article
 */
async function getOneArticle(articleId, includeAllStatuses = false) {
  if (!articleId || typeof articleId !== 'string') {
    throw new Error('articleId is required and must be a non-empty string');
  }

  const article = await getArticleById(articleId, includeAllStatuses);
  if (!article) {
    const error = new Error('Article not found');
    error.code = 'NOT_FOUND';
    error.statusCode = 404;
    throw error;
  }

  const photos = await getArticlePhotosById(articleId);

  return {
    articleId: article.article_id,
    title: article.title,
    content: article.content,
    status: article.status,
    photos: photos.map((photo) => ({
      rank: photo.rank,
      fileName: photo.file_name,
      mimeType: photo.mime_type ?? '',
    })),
    createdAt: article.created_at,
    updatedAt: article.updated_at,
    publishedAt: article.published_at,
  };
}

/**
 * Get all articles
 * @returns {Promise<Array>} Articles list
 */
async function getArticles(includeAllStatuses = false) {
  let articles = await getAllArticles(includeAllStatuses);
  return articles.map(article => ({
    articleId: article.article_id,
    title: article.title,
    content: article.content,
    status: article.status,
    createdAt: article.created_at,
    updatedAt: article.updated_at,
    publishedAt: article.published_at,
  }));
}

module.exports = {
  loginWithUsername,
  refreshTokens,
  revokeSessionToken,
  hashPassword,
  verifyPassword,
  upsertArticle,
  uploadArticlePhoto,
  getOneArticle,
  getArticles,
};
