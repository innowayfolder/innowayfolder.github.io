const { Pool } = require('pg');

const SENSITIVE_QUERY_PATTERN = /(password|token|secret|authorization|api[_\s-]*key)/i;

/**
 * Database configuration from environment variables
 */
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'postgres',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection cannot be established
};

/**
 * PostgreSQL connection pool
 */
let pool = null;

/**
 * Initialize the database connection pool
 * @returns {Pool} PostgreSQL connection pool
 */
function getPool() {
  if (!pool) {
    pool = new Pool(dbConfig);

    // Set search path for all connections
    pool.on('connect', (client) => {
      console.log("Connected.");
    });

    // Handle pool errors
    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', {
        message: err.message,
        code: err.code,
      });
    });
  }

  return pool;
}

/**
 * Database utility for executing queries with error handling and retry logic
 */

/**
 * Execute a database query with retry logic
 * @param {string} text - SQL query text
 * @param {Array} params - Query parameters
 * @param {number} retries - Number of retry attempts (default: 3)
 * @returns {Promise<Object>} Query result
 * @throws {Error} If query fails after all retries
 */
async function query(text, params = [], retries = 3) {
  const pool = getPool();
  let lastError;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await pool.query(text, params);
      return result;
    } catch (error) {
      lastError = error;

      // Check if error is retryable
      const isRetryable = isRetryableError(error);

      if (!isRetryable || attempt === retries) {
        // Log the error with context
        console.error('Database query error:', {
          query: text,
          params: sanitizeParamsForLogging(text, params),
          attempt: attempt,
          error: error.message,
          code: error.code,
        });
        throw error;
      }

      // Wait before retrying (exponential backoff)
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      console.warn(`Query failed (attempt ${attempt}/${retries}), retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Execute a query and return the first row
 * @param {string} text - SQL query text
 * @param {Array} params - Query parameters
 * @returns {Promise<Object|null>} First row or null if no results
 */
async function queryOne(text, params = []) {
  const result = await query(text, params);
  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Execute a query within a transaction
 * @param {Function} callback - Async function that receives a client and executes queries
 * @returns {Promise<any>} Result from the callback
 * @throws {Error} If transaction fails
 */
async function transaction(callback) {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Transaction error:', {
      message: error.message,
      code: error.code,
    });
    throw error;
  } finally {
    client.release();
  }
}

function sanitizeParamsForLogging(queryText, params) {
  if (!SENSITIVE_QUERY_PATTERN.test(queryText)) {
    return params;
  }

  if (Array.isArray(params)) {
    return params.map(() => '[REDACTED]');
  }

  if (params && typeof params === 'object') {
    return Object.keys(params).reduce((sanitized, key) => {
      sanitized[key] = '[REDACTED]';
      return sanitized;
    }, {});
  }

  return '[REDACTED]';
}

/**
 * Check if a database error is retryable
 * @param {Error} error - Database error
 * @returns {boolean} True if error is retryable
 */
function isRetryableError(error) {
  // PostgreSQL error codes that are retryable
  const retryableCodes = [
    '08000', // connection_exception
    '08003', // connection_does_not_exist
    '08006', // connection_failure
    '08001', // sqlclient_unable_to_establish_sqlconnection
    '08004', // sqlserver_rejected_establishment_of_sqlconnection
    '40001', // serialization_failure
    '40P01', // deadlock_detected
    '53300', // too_many_connections
    '57P03', // cannot_connect_now
  ];

  return retryableCodes.includes(error.code);
}

/**
 * Sleep for a specified duration
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  query,
  queryOne,
  transaction,
};
