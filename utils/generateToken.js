const jwt = require('jsonwebtoken');

const generateToken = (userId, role, email) => {
  return jwt.sign(
    { id: userId, role, email },
    process.env.JWT_SECRET || 'fallback_secret_key',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

module.exports = generateToken;