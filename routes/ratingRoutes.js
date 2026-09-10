const express = require('express');
const router = express.Router();
const {
  createRating,
  getRatingByTicket,
  getAllRatings
} = require('../controllers/ratingController');
const { protect } = require('../middleware/auth');
const { allowRoles } = require('../middleware/roleCheck');
const { validate, schemas } = require('../middleware/validate');

// All rating routes require authentication
router.use(protect);

// POST /api/ratings - Customer submits rating (Module 11)
// GET /api/ratings - View ratings
router.route('/')
  .post(allowRoles('customer'), validate(schemas.createRating), createRating)
  .get(getAllRatings);

// GET /api/ratings/ticket/:ticketId - Rating for specific ticket
router.get('/ticket/:ticketId', getRatingByTicket);

module.exports = router;