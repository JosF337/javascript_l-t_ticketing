Set-Content routes/commentRoutes.js "const express = require('express');
const router = express.Router();

// POST /api/tickets/:id/comments
router.post('/:id/comments', (req, res) => {
  res.json({ success: true, message: 'Add comment route working' });
});

module.exports = router;"