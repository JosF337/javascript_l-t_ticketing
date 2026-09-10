Set-Content routes/ticketRoutes.js "const express = require('express');
const router = express.Router();

// POST /api/tickets
router.post('/', (req, res) => {
  res.json({ success: true, message: 'Create ticket route working' });
});

// GET /api/tickets
router.get('/', (req, res) => {
  res.json({ success: true, message: 'Get tickets route working' });
});

module.exports = router;"
