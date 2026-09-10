Set-Content routes/ratingRoutes.js "const express = require('express');
const router = express.Router();

// POST /api/ratings
router.post('/', (req, res) => {
  res.json({ success: true, message: 'Rating route working' });
});

module.exports = router;"