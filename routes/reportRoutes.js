Set-Content routes/reportRoutes.js "const express = require('express');
const router = express.Router();

// GET /api/manager/reports/sla
router.get('/reports/sla', (req, res) => {
  res.json({ success: true, message: 'SLA report route working' });
});

module.exports = router;"