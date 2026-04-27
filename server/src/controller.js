/**
 * Authentication Routes
 * Defines Express route handlers for authentication endpoints
 */
const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { extractDeviceInfo, extractIpAddress } = require('./utils/device-info');
const {
  validateLogin,
  validateRefresh,
  validateLogout,
  validateUpsertArticle,
  validateGetArticle,
  validateUploadPhoto,
} = require('./middleware/validate-request');
const { validateToken } = require('./middleware/validate-token');
const {
  loginWithUsername,
  refreshTokens,
  revokeSessionToken,
  hashPassword,
  upsertArticle,
  uploadArticlePhoto,
  getOneArticle,
  getArticles,
} = require('./service');

const REFRESH_TOKEN_COOKIE_NAME = process.env.REFRESH_TOKEN_COOKIE_NAME || 'refresh_token';
const REFRESH_TOKEN_EXPIRY = process.env.JWT_REFRESH_TOKEN_EXPIRY || '30d';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const REFRESH_COOKIE_SECURE = process.env.REFRESH_COOKIE_SECURE
  ? process.env.REFRESH_COOKIE_SECURE === 'true'
  : IS_PRODUCTION;
const REFRESH_COOKIE_SAME_SITE = process.env.REFRESH_COOKIE_SAME_SITE
  || (REFRESH_COOKIE_SECURE ? 'none' : 'lax');

function parseDurationToMs(duration) {
  const match = /^([0-9]+)([smhd])$/.exec(duration || '');
  if (!match) {
    return 30 * 24 * 60 * 60 * 1000;
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    default:
      return 30 * 24 * 60 * 60 * 1000;
  }
}

function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) {
    return cookies;
  }

  const cookiePairs = cookieHeader.split(';');
  for (const pair of cookiePairs) {
    const separatorIndex = pair.indexOf('=');
    if (separatorIndex < 0) {
      continue;
    }

    const key = pair.slice(0, separatorIndex).trim();
    const value = pair.slice(separatorIndex + 1).trim();
    if (key) {
      cookies[key] = decodeURIComponent(value);
    }
  }

  return cookies;
}

function getRefreshTokenFromCookie(req) {
  const cookies = parseCookies(req.headers.cookie);
  return cookies[REFRESH_TOKEN_COOKIE_NAME] || null;
}

function getRefreshCookieOptions() {
  return {
    httpOnly: true,
    secure: REFRESH_COOKIE_SECURE,
    sameSite: REFRESH_COOKIE_SAME_SITE,
    maxAge: parseDurationToMs(REFRESH_TOKEN_EXPIRY),
    path: '/api/v1',
  };
}

function setRefreshTokenCookie(res, refreshToken) {
  res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, getRefreshCookieOptions());
}

function clearRefreshTokenCookie(res) {
  const options = getRefreshCookieOptions();
  res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, {
    httpOnly: options.httpOnly,
    secure: options.secure,
    sameSite: options.sameSite,
    path: options.path,
  });
}

function getUsernameFromOptionalToken(req) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  try {
    const decoded = jwt.verify(parts[1], process.env.JWT_SECRET);
    if (!decoded?.username || typeof decoded.username !== 'string') {
      return null;
    }

    return decoded.username;
  } catch {
    return null;
  }
}


/**
 * POST /api/v1/auth/login
 * Login an existing user with username/password
 * 
 * Request body:
 * - For username/password: { username: string, password: string }
 * 
 * Response: { username, auth_token, expires_at }
 */
router.post('/login', validateLogin, async (req, res, next) => {
  console.log("POST /login");
  try {
    const { username, password } = req.body;
    // Extract device information from request
    const deviceInfo = {
      deviceName: extractDeviceInfo(req),
      ipAddress: extractIpAddress(req),
    };
    const result = await loginWithUsername(username, password, deviceInfo);
    const { refresh_token, ...responseBody } = result;
    setRefreshTokenCookie(res, refresh_token);
    return res.status(200).json(responseBody);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/article?articleId=1
 * Get one article by articleId
 */
router.get('/article', validateGetArticle, async (req, res, next) => {
  try {
    const { articleId } = req.query;
    const username = getUsernameFromOptionalToken(req);
    const includeAllStatuses = Boolean(username);
    const article = await getOneArticle(articleId, includeAllStatuses);
    return res.status(200).json(article);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/articles
 * Get all articles
 */
router.get('/articles', async (req, res, next) => {
  try {
    const username = getUsernameFromOptionalToken(req);
    const includeAllStatuses = Boolean(username);
    const articles = await getArticles(includeAllStatuses);
    return res.status(200).json(articles);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/auth/refresh
 * Refresh access and refresh tokens
 * 
 * Request body: { username: string }
 * 
 * Response: { username, auth_token, expires_at }
 * Note: do not validate token, because token comes in cookies, so we need to manually validate cookie.
 */
router.post('/refresh', validateRefresh, async (req, res, next) => {
  console.log("POST /refresh");
  try {
    const { username } = req.body;
    const refresh_token = getRefreshTokenFromCookie(req);
    // Extract device information from request
    const deviceInfo = {
      deviceName: extractDeviceInfo(req),
      ipAddress: extractIpAddress(req),
    };
    // Validate required fields
    if (!username || !refresh_token) {
      return res.status(400).json({
        error: 'username and refresh_token cookie are required',
        code: 'INVALID_REQUEST',
      });
    }
    // Call refreshTokens service method
    const result = await refreshTokens(username, refresh_token, deviceInfo);
    const { refresh_token: newRefreshToken, ...responseBody } = result;
    setRefreshTokenCookie(res, newRefreshToken);
    return res.status(200).json(responseBody);
  } catch (error) {
    next(error);
  }
});

// All routes below are admin APIs and require a valid access token.
router.use(validateToken);

/**
 * POST /api/v1/auth/logout
 * Logout user and revoke one refresh token session
 * 
 * Request body: { username: string }
 * 
 * Response: { success: true }
 */
router.post('/logout', validateLogout, async (req, res, next) => {
  console.log("POST /logout");
  try {
    const tokenUsername = req.user?.username;
    const { username } = req.body;
    const refresh_token = getRefreshTokenFromCookie(req);

    if (!tokenUsername || tokenUsername !== username) {
      return res.status(401).json({
        error: 'Token user does not match request user',
        code: 'INVALID_REQUEST',
      });
    }

    if (!refresh_token) {
      return res.status(400).json({
        error: 'refresh_token cookie is required',
        code: 'INVALID_REQUEST',
      });
    }

    await revokeSessionToken(username, refresh_token);
    clearRefreshTokenCookie(res);
    return res.status(200).json({
      success: true,
      message: 'Session token revoked successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/v1/article
 * Create or update an article
 *
 * Request body: { oldArticleId?: string, articleId: string, title: string, content: string, status?: string, publishedAt?: string, photos?: Array<{ rank: number, fileName: string, mimeType?: string }> }
 */
router.put('/article', validateUpsertArticle, async (req, res, next) => {
  try {
    const {
      oldArticleId,
      articleId,
      title,
      content,
      status,
      publishedAt,
      photos,
    } = req.body;
    const article = await upsertArticle(oldArticleId, articleId, title, content, status, photos, publishedAt);
    return res.status(200).json(article);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/v1/photo
 * Upload article photo to S3
 *
 * FormData fields: articleId, fileName, file
 */
router.put('/photo', validateUploadPhoto, async (req, res, next) => {
  try {
    const { articleId, fileName } = req.body;
    const photoFile = req.files.file;
    const mimeType = photoFile.mimetype;
    const fileBuffer = Buffer.isBuffer(photoFile.data) ? photoFile.data : Buffer.from(photoFile.data);
    const photo = await uploadArticlePhoto(articleId, fileName, fileBuffer, mimeType);
    return res.status(200).json(photo);
  } catch (error) {
    next(error);
  }
});
module.exports = router;
