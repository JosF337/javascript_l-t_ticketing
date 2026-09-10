Set-Content routes/authRoutes.js "const express = require('express');
const router = express.Router();

// POST /api/auth/register
router.post('/register', (req, res) => {
  res.json({ success: true, message: 'Register route working' });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  res.json({ success: true, message: 'Login route working' });
});

module.exports = router;"