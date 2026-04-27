/**
 * Device information extraction utilities
 * Extracts device and network information from HTTP requests
 */

/**
 * Extract device name from User-Agent header
 * Parses the User-Agent string to identify the device/browser
 * 
 * @param {Object} req - Express request object
 * @returns {string} Device name or 'Unknown Device' if not available
 */
function extractDeviceInfo(req) {
  const userAgent = req.headers['user-agent'];
  
  if (!userAgent) {
    return 'Unknown Device';
  }

  // Parse mobile devices first (they often contain browser names too)
  if (userAgent.includes('iPhone')) {
    return 'iPhone';
  }
  if (userAgent.includes('iPad')) {
    return 'iPad';
  }
  if (userAgent.includes('Android')) {
    return 'Android';
  }

  // Parse common browsers
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
    return 'Chrome';
  }
  if (userAgent.includes('Firefox')) {
    return 'Firefox';
  }
  if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    return 'Safari';
  }
  if (userAgent.includes('Edg')) {
    return 'Edge';
  }
  if (userAgent.includes('Opera') || userAgent.includes('OPR')) {
    return 'Opera';
  }

  // Parse operating systems if browser not identified
  if (userAgent.includes('Windows')) {
    return 'Windows';
  }
  if (userAgent.includes('Macintosh') || userAgent.includes('Mac OS')) {
    return 'macOS';
  }
  if (userAgent.includes('Linux')) {
    return 'Linux';
  }

  // Return truncated user agent if no match
  return userAgent.substring(0, 50);
}

/**
 * Extract IP address from request
 * Handles proxied requests by checking X-Forwarded-For header
 * 
 * @param {Object} req - Express request object
 * @returns {string} Client IP address or 'Unknown' if not available
 */
function extractIpAddress(req) {
  // Check X-Forwarded-For header (for proxied requests)
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs, take the first one
    const ips = forwardedFor.split(',').map(ip => ip.trim());
    return ips[0];
  }

  // Check X-Real-IP header (alternative proxy header)
  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return realIp;
  }

  // Fall back to direct connection IP
  if (req.connection && req.connection.remoteAddress) {
    return req.connection.remoteAddress;
  }

  // Express socket property
  if (req.socket && req.socket.remoteAddress) {
    return req.socket.remoteAddress;
  }

  // Last resort: req.ip (Express property)
  if (req.ip) {
    return req.ip;
  }

  return 'Unknown';
}

module.exports = {
  extractDeviceInfo,
  extractIpAddress,
};
