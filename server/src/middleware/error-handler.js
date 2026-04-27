/**
 * Error Handling Middleware
 * Centralized error handler for the application
 */

/**
 * Error handling middleware
 * Catches all errors and formats them consistently
 * 
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const errorHandler = (err, req, res, next) => {
  // Default to 500 server error
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let code = err.code || 'INTERNAL_ERROR';
  let details = err.details || undefined;

  // Log error for debugging (don't log in test environment)
  // Log appropriately without exposing sensitive data
  if (process.env.NODE_ENV !== 'test') {
    const logData = {
      message: err.message,
      statusCode,
      code,
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString(),
    };

    // Only log stack trace for server errors (5xx)
    if (statusCode >= 500) {
      logData.stack = err.stack;
      console.error('Server Error:', logData);
    } else {
      // For client errors (4xx), log less detail
      console.warn('Client Error:', logData);
    }
  }

  // Don't expose internal error details in production
  if (statusCode === 500 && process.env.NODE_ENV === 'production') {
    message = 'Internal server error';
    code = 'INTERNAL_ERROR';
    details = undefined;
  }

  // Format errors consistently with error code and message
  const errorResponse = {
    error: message,
    code,
  };

  // Include details if present (for validation errors)
  if (details) {
    errorResponse.details = details;
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};

module.exports = {
  errorHandler,
};
