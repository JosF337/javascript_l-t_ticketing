Set-Content routes/slaRoutes.js "const express = require('express');
const router = express.Router();

// GET /api/sla
router.get('/', (req, res) => {
  res.json({ success: true, message: 'SLA rules route working' });
});

module.exports = router;"