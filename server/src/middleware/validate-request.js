/**
 * Request Validation Middleware
 * Validates incoming requests for authentication endpoints using express-validator
 */

const { body, query, validationResult } = require('express-validator');

/**
 * Middleware to handle validation errors
 * Returns descriptive error messages for validation failures
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    // Extract error messages
    const errorMessages = errors.array().map(err => err.msg);
    
    return res.status(400).json({
      error: errorMessages.join(', '),
      code: 'VALIDATION_ERROR',
      details: errors.array(),
    });
  }
  
  next();
};

/**
 * Validation schema for login endpoint
 * Validates username format for username/password login
 */
const validateLogin = [
  // Username validation (only if username is provided)
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username must be a non-empty string'),
  
  // Password validation (only if password is provided)
  body('password')
    .notEmpty()
    .withMessage('Password must be a non-empty string'),
  
  // Handle validation errors
  handleValidationErrors,
];

/**
 * Validation schema for token refresh endpoint
 * Ensures username is provided
 */
const validateRefresh = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('username is required and must be a non-empty string'),
  
  // Handle validation errors
  handleValidationErrors,
];

/**
 * Validation schema for logout endpoint
 * Ensures username is provided
 */
const validateLogout = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('username is required and must be a non-empty string'),

  handleValidationErrors,
];

/**
 * Validation schema for upsert article endpoint
 */
const validateUpsertArticle = [
  body('oldArticleId')
    .optional({ values: 'undefined' })
    .isString()
    .withMessage('oldArticleId must be a string when provided')
    .bail()
    .trim()
    .notEmpty()
    .withMessage('oldArticleId must be a non-empty string when provided'),

  body('articleId')
    .trim()
    .notEmpty()
    .withMessage('articleId is required and must be a non-empty string'),

  body('title')
    .trim()
    .notEmpty()
    .withMessage('title is required and must be a non-empty string'),

  body('content')
    .isString()
    .notEmpty()
    .withMessage('content is required and must be a non-empty string'),

  body('status')
    .optional({ values: 'falsy' })
    .isString()
    .withMessage('status must be a string when provided'),

  body('publishedAt')
    .optional({ values: 'undefined' })
    .isString()
    .withMessage('publishedAt must be a string when provided')
    .bail()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('publishedAt must be in YYYY-MM-DD format when provided'),

  body('photos')
    .optional({ values: 'undefined' })
    .isArray()
    .withMessage('photos must be an array when provided')
    .custom((photos) => {
      for (const photo of photos) {
        if (!photo || typeof photo !== 'object') {
          throw new Error('each photo must be an object');
        }

        if (!Number.isInteger(photo.rank) || photo.rank < 1) {
          throw new Error('photos rank must be an integer greater than 0');
        }

        if (typeof photo.fileName !== 'string' || !photo.fileName.trim()) {
          throw new Error('photos fileName is required and must be a non-empty string');
        }

        if (typeof photo.mimeType !== 'undefined' && photo.mimeType !== null && typeof photo.mimeType !== 'string') {
          throw new Error('photos mimeType must be a string when provided');
        }
      }

      const ranks = photos.map(photo => photo.rank);
      if (new Set(ranks).size !== ranks.length) {
        throw new Error('photos ranks must be unique');
      }

      return true;
    }),

  handleValidationErrors,
];

/**
 * Validation schema for get single article endpoint
 */
const validateGetArticle = [
  query('articleId')
    .trim()
    .notEmpty()
    .withMessage('articleId is required and must be a non-empty string'),

  handleValidationErrors,
];

/**
 * Validation schema for photo upload endpoint
 */
const validateUploadPhoto = [
  body('articleId')
    .trim()
    .notEmpty()
    .withMessage('articleId is required and must be a non-empty string'),

  body('fileName')
    .trim()
    .notEmpty()
    .withMessage('fileName is required and must be a non-empty string'),

  handleValidationErrors,

  (req, res, next) => {
    const file = req.files?.file;
    if (!file || !file.data || !file.mimetype) {
      return res.status(400).json({
        error: 'file is required and must include valid file data and MIME type',
        code: 'VALIDATION_ERROR',
      });
    }

    next();
  },
];


module.exports = {
  validateLogin,
  validateRefresh,
  validateLogout,
  validateUpsertArticle,
  validateGetArticle,
  validateUploadPhoto,
};
