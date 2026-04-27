/**
 * Token Validation Middleware
 * Validates JWT authentication tokens and extracts username from token payload
 */

const jwt = require('jsonwebtoken');

/**
 * Middleware to validate JWT token from Authorization header
 * Extracts username from token and attaches to request object
 * 
 * Expected header format: Authorization: Bearer <token>
 * 
 * On success: Attaches username to req.user and proceeds
 * On failure: Returns 401 Unauthorized with error details
 */
const validateToken = (req, res, next) => {
  try {
    // Extract Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        message: 'Missing authorization header',
        code: 'NO_TOKEN',
        statusCode: 401,
      });
    }

    // Parse Bearer token
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        message: 'Invalid authorization header format. Expected: Bearer <token>',
        code: 'INVALID_TOKEN_FORMAT',
        statusCode: 401,
      });
    }

    const token = parts[1];

    // Verify and decode token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Extract username from token payload
    if (!decoded.username) {
      return res.status(401).json({
        message: 'Token does not contain username',
        code: 'INVALID_TOKEN_PAYLOAD',
        statusCode: 401,
      });
    }

    // Attach username to request object for use in route handlers
    req.user = {
      username: decoded.username,
      ...decoded, // Include other token data if needed
    };

    next();
  } catch (error) {
    // Handle specific JWT errors
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        message: 'Token has expired',
        code: 'TOKEN_EXPIRED',
        statusCode: 401,
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        message: 'Invalid token',
        code: 'INVALID_TOKEN',
        statusCode: 401,
      });
    }

    // Unexpected error
    return res.status(401).json({
      message: 'Token validation failed',
      code: 'TOKEN_VALIDATION_ERROR',
      statusCode: 401,
    });
  }
};

module.exports = { validateToken };
