/**
 * Main Application Entry Point
 * Initializes Express app with all middleware and routes
 * 
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const path = require('path');
const routes = require('./src/controller.js');
const { errorHandler } = require('./src/middleware/error-handler.js');
const fs = require('fs');


// Initialize Express app
const app = express();

// Get port from environment or default to 3010
// assigned by Heroku automatically.
const PORT = process.env.PORT || 3010;


// Configure middleware
// CORS middleware
app.use(cors({
  origin: ['http://localhost:3010', 'http://localhost:3011', 'innowayfolder.herokuapp.com', 'innowayfolder.com'],
  credentials: true,
}));

// Body parser middleware - parse JSON request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());

// Serve static resources from the project public folder
app.use('/resources', express.static(path.join(__dirname, '..', 'public', 'resources')));

// Health check route
app.get('/api/v1/health', (req, res) => {
  console.log("GET /api/v1/health");
  res.send('up');
});

// Mount authentication routes
app.use('/api/v1', routes);

// Serve frontend files as fallback after API routes
app.use(express.static(path.join(__dirname, '../client/build')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

// Apply error handling middleware
app.use(errorHandler);

// Start server (only if not in test environment)
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Export app for testing
module.exports = app;
