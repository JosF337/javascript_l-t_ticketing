const express = require('express');
const router = express.Router();
const { addComment, getComments } = require('../controllers/commentController');
const { protect } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');

// All comment endpoints require authentication
router.use(protect);

// POST /api/tickets/:id/comments - Add reply or internal note
// GET /api/tickets/:id/comments - View comment thread
router.route('/:id/comments')
  .post(validate(schemas.createComment), addComment)
  .get(getComments);

module.exports = router;