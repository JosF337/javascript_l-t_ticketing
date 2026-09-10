const Comment = require('../models/Comment');
const Ticket = require('../models/Ticket');
const { sendSuccess, sendError } = require('../utils/responseHelper');
const { emitCommentAdded, emitInternalNoteAdded } = require('../config/socket');

/**
 * @desc    Add comment or internal note to a ticket (Modules 7 & 8)
 * @route   POST /api/tickets/:id/comments
 * @access  Private (Customer, Agent, Manager)
 */
const addComment = async (req, res, next) => {
  try {
    const { id: ticketId } = req.params;
    const { message, isInternal } = req.body;

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return sendError(res, 404, 'Ticket not found', 'NOT_FOUND');
    }

    // Business rule: Cannot add comment to a closed ticket
    if (ticket.status === 'Closed') {
      return sendError(res, 409, 'Cannot add comments or notes to a closed ticket', 'TICKET_CLOSED');
    }

    // Role-based validations
    if (req.user.role === 'customer') {
      // Customer must own the ticket
      if (ticket.customerId.toString() !== req.user.id) {
        return sendError(res, 403, 'Access denied: You can only comment on your own tickets', 'FORBIDDEN');
      }

      // Module 8 rule: Customers cannot create internal notes
      if (isInternal === true) {
        return sendError(
          res,
          403,
          'Access denied: Customers are not permitted to create internal notes',
          'FORBIDDEN'
        );
      }
    }

    const comment = await Comment.create({
      ticketId,
      authorId: req.user.id,
      message,
      isInternal: req.user.role === 'customer' ? false : Boolean(isInternal)
    });

    const populatedComment = await Comment.findById(comment._id).populate(
      'authorId',
      'name email role'
    );

    // Real-time WebSocket emission
    if (populatedComment.isInternal) {
      emitInternalNoteAdded(ticketId, populatedComment);
    } else {
      emitCommentAdded(ticketId, populatedComment);
    }

    return res.status(201).json({
      success: true,
      message: populatedComment.isInternal
        ? 'Internal note added successfully'
        : 'Comment posted successfully',
      data: populatedComment
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get comment thread for a ticket with internal note protection (Modules 7 & 8)
 * @route   GET /api/tickets/:id/comments
 * @access  Private (Customer, Agent, Manager)
 */
const getComments = async (req, res, next) => {
  try {
    const { id: ticketId } = req.params;

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return sendError(res, 404, 'Ticket not found', 'NOT_FOUND');
    }

    // Role-based access and internal note filtering
    let filter = { ticketId };

    if (req.user.role === 'customer') {
      // Customer must own the ticket
      if (ticket.customerId.toString() !== req.user.id) {
        return sendError(res, 403, 'Access denied: You can only view comments on your own tickets', 'FORBIDDEN');
      }
      // Module 8 enforcement: Internal notes are strictly hidden from customers!
      filter.isInternal = false;
    }
    // Agents & Managers can see all comments including internal notes

    const comments = await Comment.find(filter)
      .populate('authorId', 'name email role')
      .sort({ createdAt: 1 });

    return sendSuccess(res, 200, 'Comments retrieved successfully', comments);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addComment,
  getComments
};
