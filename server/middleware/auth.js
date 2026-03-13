const jwt = require('jsonwebtoken');
const { User, Session } = require('../models');

const isDevAuthBypassEnabled = () =>
  process.env.DEV_AUTH_BYPASS === 'true' || process.env.VITE_DEV_AUTH_BYPASS === 'true';

const getDevBypassUser = () => ({
  id: 1,
  email: process.env.DEV_AUTH_EMAIL || process.env.VITE_DEV_AUTH_EMAIL || 'super.admin@who.int',
  name: process.env.DEV_AUTH_NAME || process.env.VITE_DEV_AUTH_NAME || 'Development Admin',
  role: process.env.DEV_AUTH_ROLE || process.env.VITE_DEV_AUTH_ROLE || 'Super Admin',
  country: process.env.DEV_AUTH_COUNTRY || process.env.VITE_DEV_AUTH_COUNTRY || 'Nigeria',
  is_active: true,
  osl_admin_level: 0
});

// Verify JWT token and attach user to request
const authenticate = async (req, res, next) => {
  try {
    if (isDevAuthBypassEnabled()) {
      req.user = getDevBypassUser();
      req.token = 'dev-auth-bypass';
      return next();
    }

    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. No token provided.' 
      });
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if session is still valid
    const session = await Session.verify(token, decoded.userId);
    if (!session) {
      return res.status(401).json({ 
        success: false, 
        message: 'Session expired or invalid. Please login again.' 
      });
    }

    // Get user
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not found.' 
      });
    }

    if (!user.is_active) {
      return res.status(403).json({ 
        success: false, 
        message: 'Account is deactivated. Please contact administrator.' 
      });
    }

    // Attach user and token to request
    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token.' 
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expired. Please login again.' 
      });
    }
    console.error('Auth middleware error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Authentication error.' 
    });
  }
};

// Check if user has required role
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Not authenticated.' 
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Insufficient permissions.' 
      });
    }

    next();
  };
};

// Check if user can access specific country data
const authorizeCountry = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      message: 'Not authenticated.' 
    });
  }

  // Country Office can only access their own country's data
  if (req.user.role === 'Country Office') {
    const requestedCountry = req.params.country || req.body.country || req.query.country;
    if (requestedCountry && requestedCountry !== req.user.country) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. You can only access your own country\'s data.' 
      });
    }
  }

  next();
};

// Validate email format (allow all domains)
const validateWHOEmail = (email) => {
  // Allow all email domains for flexibility
  // You can re-enable domain restriction by setting ALLOWED_EMAIL_DOMAIN in .env
  if (process.env.ALLOWED_EMAIL_DOMAIN) {
    const allowedDomain = process.env.ALLOWED_EMAIL_DOMAIN;
    const emailDomain = email.split('@')[1]?.toLowerCase();
    return emailDomain === allowedDomain;
  }
  // If no domain restriction, just validate email format
  return email && email.includes('@');
};

// OSL Admin Levels:
// Level 0: Super OSL Admin - Full privileges
// Level 1: OSL Admin - All privileges EXCEPT adjusting warehouse order fulfillment quantities
// Level 2: OSL Viewer - View-only access to approved orders for packaging and distribution

// Check if OSL user has required level for an action
const authorizeOSLLevel = (maxAllowedLevel, action = 'perform this action') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Not authenticated.' 
      });
    }

    // Only applies to OSL Team users
    if (req.user.role !== 'OSL Team') {
      return next();
    }

    const userLevel = req.user.osl_admin_level ?? 0; // Default to 0 (full access) if not set

    // Level 0 can do everything
    // Level 1 can do levels 1 and 2 actions
    // Level 2 can only do level 2 actions
    if (userLevel > maxAllowedLevel) {
      return res.status(403).json({ 
        success: false, 
        message: `Access denied. Your OSL access level (${getOSLLevelName(userLevel)}) cannot ${action}.`
      });
    }

    next();
  };
};

// Helper to get human-readable level name
const getOSLLevelName = (level) => {
  switch (level) {
    case 0: return 'Super Admin';
    case 1: return 'Admin';
    case 2: return 'Viewer';
    default: return 'Unknown';
  }
};

module.exports = {
  authenticate,
  authorize,
  authorizeCountry,
  authorizeOSLLevel,
  getOSLLevelName,
  validateWHOEmail
};
