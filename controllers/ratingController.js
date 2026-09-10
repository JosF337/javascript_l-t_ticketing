const Rating = require('../models/Rating');
const Ticket = require('../models/Ticket');
const { sendSuccess, sendError } = require('../utils/responseHelper');
const { emitRatingSubmitted, emitTicketStatusChanged } = require('../config/socket');

/**
 * @desc    Submit satisfaction rating for a resolved/closed ticket (Module 11)
 * @route   POST /api/ratings
 * @access  Private (Customer)
 */
const createRating = async (req, res, next) => {
  try {
    const { ticketId, score, comment } = req.body;

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return sendError(res, 404, 'Ticket not found', 'NOT_FOUND');
    }

    // Role and ownership check: Only the customer who raised the ticket can rate it
    if (ticket.customerId.toString() !== req.user.id) {
      return sendError(
        res,
        403,
        'Access denied: You can only rate your own tickets',
        'FORBIDDEN'
      );
    }

    // Business rule: Ticket must be Resolved or Closed to be rated
    if (!['Resolved', 'Closed'].includes(ticket.status)) {
      return sendError(
        res,
        409,
        `Cannot rate a ticket in '${ticket.status}' status. Ticket must be Resolved or Closed before rating.`,
        'TICKET_NOT_RESOLVED'
      );
    }

    // Business rule: Prevent duplicate ratings on the same ticket
    const existingRating = await Rating.findOne({ ticketId });
    if (existingRating) {
      return sendError(
        res,
        409,
        'This ticket has already been rated. Multiple ratings per ticket are not allowed.',
        'DUPLICATE_RATING'
      );
    }

    // Create rating
    const rating = await Rating.create({
      ticketId,
      customerId: req.user.id,
      score,
      comment: comment || ''
    });

    // If ticket was in Resolved status, rating it transitions it to Closed
    if (ticket.status === 'Resolved') {
      ticket.status = 'Closed';
      ticket.closedAt = new Date();
      await ticket.save();
      emitTicketStatusChanged(ticket);
    }

    emitRatingSubmitted(ticketId, rating);

    return res.status(201).json({
      success: true,
      message: 'Satisfaction rating submitted successfully',
      data: rating
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get rating for a specific ticket (Module 11)
 * @route   GET /api/ratings/ticket/:ticketId
 * @access  Private
 */
const getRatingByTicket = async (req, res, next) => {
  try {
    const { ticketId } = req.params;

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return sendError(res, 404, 'Ticket not found', 'NOT_FOUND');
    }

    if (req.user.role === 'customer' && ticket.customerId.toString() !== req.user.id) {
      return sendError(res, 403, 'Access denied', 'FORBIDDEN');
    }

    const rating = await Rating.findOne({ ticketId })
      .populate('customerId', 'name email')
      .populate('ticketId', 'title category priority status');

    if (!rating) {
      return sendError(res, 404, 'No rating found for this ticket', 'NOT_FOUND');
    }

    return sendSuccess(res, 200, 'Rating retrieved successfully', rating);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all ratings (Module 11)
 * @route   GET /api/ratings
 * @access  Private (Manager, Admin, Agent)
 */
const getAllRatings = async (req, res, next) => {
  try {
    let query = {};
    if (req.user.role === 'customer') {
      query.customerId = req.user.id;
    }

    const ratings = await Rating.find(query)
      .populate('customerId', 'name email')
      .populate('ticketId', 'title category priority')
      .sort({ createdAt: -1 });

    const avgScore =
      ratings.length > 0
        ? (ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length).toFixed(2)
        : null;

    return sendSuccess(res, 200, 'Ratings retrieved successfully', {
      totalRatings: ratings.length,
      averageScore: avgScore ? parseFloat(avgScore) : null,
      ratings
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createRating,
  getRatingByTicket,
  getAllRatings
};
