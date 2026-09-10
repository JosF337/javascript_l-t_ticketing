const Ticket = require('../models/Ticket');
const User = require('../models/User');
const Comment = require('../models/Comment');
const { calculateSlaDeadline, isTicketBreached } = require('../utils/slaHelper');
const { sendSuccess, sendError } = require('../utils/responseHelper');
const {
  emitTicketCreated,
  emitTicketAssigned,
  emitTicketStatusChanged,
  emitTicketEscalated,
  emitSlaBreachAlert
} = require('../config/socket');

// Valid status transitions map
const VALID_TRANSITIONS = {
  'Open': ['In Progress'],
  'In Progress': ['On Hold', 'Resolved'],
  'On Hold': ['In Progress', 'Resolved'],
  'Resolved': ['Closed', 'In Progress'],
  'Closed': []
};

/**
 * @desc    Create a new ticket (Module 2)
 * @route   POST /api/tickets
 * @access  Private (Customer, Agent, Manager)
 */
const createTicket = async (req, res, next) => {
  try {
    const { title, category, priority, description } = req.body;

    // Calculate SLA deadline from database SLA rules
    const { slaDueAt } = await calculateSlaDeadline(category, priority);

    const ticket = await Ticket.create({
      customerId: req.user.id,
      title,
      category,
      priority,
      description,
      status: 'Open',
      slaDueAt,
      isBreached: false
    });

    emitTicketCreated(ticket);

    return res.status(201).json({
      success: true,
      message: 'Record created successfully',
      data: {
        _id: ticket._id,
        customerId: ticket.customerId,
        title: ticket.title,
        category: ticket.category,
        priority: ticket.priority,
        status: ticket.status,
        assignedAgentId: ticket.assignedAgentId,
        slaDueAt: ticket.slaDueAt,
        createdAt: ticket.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all tickets with role-based filtering & dynamic breach check
 * @route   GET /api/tickets
 * @access  Private
 */
const getTickets = async (req, res, next) => {
  try {
    let query = {};

    // Role-based scoping
    if (req.user.role === 'customer') {
      query.customerId = req.user.id;
    } else if (req.user.role === 'agent') {
      // Agents can view tickets assigned to them or unassigned open tickets
      query.$or = [
        { assignedAgentId: req.user.id },
        { assignedAgentId: null, status: 'Open' }
      ];
    }
    // Managers & Admins view all tickets

    // Query filters
    if (req.query.status) {
      query.status = req.query.status;
    }
    if (req.query.priority) {
      query.priority = req.query.priority;
    }
    if (req.query.category) {
      query.category = new RegExp(req.query.category, 'i');
    }

    const tickets = await Ticket.find(query)
      .populate('customerId', 'name email')
      .populate('assignedAgentId', 'name email')
      .sort({ createdAt: -1 });

    // Dynamic SLA breach check and update
    const updatedTickets = await Promise.all(
      tickets.map(async (t) => {
        const breached = isTicketBreached(t);
        if (breached !== t.isBreached) {
          t.isBreached = breached;
          await t.save();
        }
        return t;
      })
    );

    // If filter requested only breached tickets
    let finalTickets = updatedTickets;
    if (req.query.breached === 'true') {
      finalTickets = updatedTickets.filter((t) => t.isBreached === true);
    }

    return sendSuccess(res, 200, 'Tickets retrieved successfully', finalTickets);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get ticket by ID
 * @route   GET /api/tickets/:id
 * @access  Private
 */
const getTicketById = async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('customerId', 'name email')
      .populate('assignedAgentId', 'name email');

    if (!ticket) {
      return sendError(res, 404, 'Ticket not found', 'NOT_FOUND');
    }

    // Role and ownership check
    if (req.user.role === 'customer' && ticket.customerId._id.toString() !== req.user.id) {
      return sendError(res, 403, 'Access denied: You can only view your own tickets', 'FORBIDDEN');
    }

    // Update breach status if applicable
    const breached = isTicketBreached(ticket);
    if (breached !== ticket.isBreached) {
      ticket.isBreached = breached;
      await ticket.save();
    }

    return sendSuccess(res, 200, 'Ticket details retrieved successfully', ticket);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Assign ticket to support agent (Module 3)
 * @route   PUT /api/tickets/:id/assign
 * @access  Private (Manager/Admin)
 */
const assignTicket = async (req, res, next) => {
  try {
    const { agentId } = req.body;

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return sendError(res, 404, 'Ticket not found', 'NOT_FOUND');
    }

    // Business rule: Cannot re-assign a closed ticket
    if (ticket.status === 'Closed') {
      return sendError(res, 409, 'Cannot assign or reassign a closed ticket', 'INVALID_OPERATION');
    }

    // Validate that agent exists and has role 'agent'
    const agent = await User.findById(agentId);
    if (!agent || agent.role !== 'agent') {
      return sendError(
        res,
        400,
        'Assigned user must be a valid registered support agent',
        'INVALID_AGENT'
      );
    }

    ticket.assignedAgentId = agent._id;
    // If ticket was Open, transition to In Progress upon assignment
    if (ticket.status === 'Open') {
      ticket.status = 'In Progress';
    }

    await ticket.save();

    const populatedTicket = await Ticket.findById(ticket._id)
      .populate('customerId', 'name email')
      .populate('assignedAgentId', 'name email');

    emitTicketAssigned(populatedTicket, agentId);

    return sendSuccess(res, 200, 'Ticket assigned successfully', {
      _id: populatedTicket._id,
      assignedAgentId: populatedTicket.assignedAgentId,
      status: populatedTicket.status
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Auto-assign ticket to available agent with lowest workload (Module 3)
 * @route   PUT /api/tickets/:id/auto-assign
 * @access  Private (Manager/Admin)
 */
const autoAssignTicket = async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return sendError(res, 404, 'Ticket not found', 'NOT_FOUND');
    }

    if (ticket.status === 'Closed') {
      return sendError(res, 409, 'Cannot assign a closed ticket', 'INVALID_OPERATION');
    }

    // Find all agents
    const agents = await User.find({ role: 'agent' });
    if (!agents || agents.length === 0) {
      return sendError(res, 400, 'No active support agents available in the system', 'NO_AGENTS_AVAILABLE');
    }

    // Count open tickets per agent to find the least loaded agent
    const agentWorkloads = await Promise.all(
      agents.map(async (agent) => {
        const openCount = await Ticket.countDocuments({
          assignedAgentId: agent._id,
          status: { $in: ['Open', 'In Progress', 'On Hold'] }
        });
        return { agent, openCount };
      })
    );

    // Sort by lowest open count
    agentWorkloads.sort((a, b) => a.openCount - b.openCount);
    const chosenAgent = agentWorkloads[0].agent;

    ticket.assignedAgentId = chosenAgent._id;
    if (ticket.status === 'Open') {
      ticket.status = 'In Progress';
    }
    await ticket.save();

    emitTicketAssigned(ticket, chosenAgent._id);

    return sendSuccess(res, 200, 'Ticket auto-assigned to least loaded agent successfully', {
      _id: ticket._id,
      assignedAgent: {
        _id: chosenAgent._id,
        name: chosenAgent.name,
        email: chosenAgent.email
      },
      status: ticket.status
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update ticket status strictly adhering to lifecycle workflow (Module 4)
 * @route   PUT /api/tickets/:id/status
 * @access  Private (Customer, Agent, Manager)
 */
const updateTicketStatus = async (req, res, next) => {
  try {
    const { status: newStatus } = req.body;
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return sendError(res, 404, 'Ticket not found', 'NOT_FOUND');
    }

    const currentStatus = ticket.status;

    // Check if status is identical
    if (currentStatus === newStatus) {
      return sendError(res, 400, `Ticket is already in '${currentStatus}' status`, 'SAME_STATUS');
    }

    // Workflow validation: Verify allowed transitions
    const allowedTransitions = VALID_TRANSITIONS[currentStatus] || [];
    if (!allowedTransitions.includes(newStatus)) {
      return res.status(409).json({
        success: false,
        message: `Invalid status transition from '${currentStatus}' to '${newStatus}'. Allowed transitions: ${
          allowedTransitions.join(', ') || 'None (ticket is in terminal Closed state)'
        }`,
        errorCode: 'INVALID_STATUS_TRANSITION'
      });
    }

    // Role-based transition authorization
    if (req.user.role === 'customer') {
      // Customer must own the ticket
      if (ticket.customerId.toString() !== req.user.id) {
        return sendError(res, 403, 'Access denied: You can only update your own tickets', 'FORBIDDEN');
      }
      // Customer can only close resolved tickets or reopen to In Progress
      if (!['Closed', 'In Progress'].includes(newStatus)) {
        return sendError(
          res,
          403,
          'Customers are only authorized to Close resolved tickets or Reopen them to In Progress',
          'FORBIDDEN'
        );
      }
    }

    if (req.user.role === 'agent') {
      // Agent must be assigned or ticket unassigned
      if (ticket.assignedAgentId && ticket.assignedAgentId.toString() !== req.user.id) {
        return sendError(res, 403, 'Access denied: You are not assigned to this ticket', 'FORBIDDEN');
      }
      // Agents cannot close tickets directly (only resolve or hold)
      if (newStatus === 'Closed') {
        return sendError(
          res,
          403,
          'Support agents can resolve tickets, but only customers or managers can close tickets',
          'FORBIDDEN'
        );
      }
    }

    // Set lifecycle timestamps
    ticket.status = newStatus;
    if (newStatus === 'Resolved') {
      ticket.resolvedAt = new Date();
    }
    if (newStatus === 'Closed') {
      ticket.closedAt = new Date();
    }

    await ticket.save();

    emitTicketStatusChanged(ticket);

    return res.status(200).json({
      success: true,
      message: 'Status updated successfully',
      data: {
        _id: ticket._id,
        status: ticket.status
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Actively scan, flag, and return SLA breached tickets (Module 6)
 * @route   GET /api/tickets/breaches/check
 * @access  Private (Agent, Manager, Admin)
 */
const checkSlaBreaches = async (req, res, next) => {
  try {
    const now = new Date();
    // Find active unresolved tickets that have passed SLA due time
    const breachedCandidates = await Ticket.find({
      status: { $in: ['Open', 'In Progress', 'On Hold'] },
      slaDueAt: { $lt: now }
    });

    const breachedIds = breachedCandidates.map((t) => t._id);
    if (breachedIds.length > 0) {
      await Ticket.updateMany(
        { _id: { $in: breachedIds } },
        { $set: { isBreached: true } }
      );
    }

    const breachedTickets = await Ticket.find({
      isBreached: true,
      status: { $in: ['Open', 'In Progress', 'On Hold'] }
    })
      .populate('customerId', 'name email')
      .populate('assignedAgentId', 'name email')
      .sort({ slaDueAt: 1 });

    return sendSuccess(res, 200, 'SLA breached tickets flagged successfully', {
      count: breachedTickets.length,
      tickets: breachedTickets
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Escalate a ticket to senior agent or manager (Module 9)
 * @route   PUT /api/tickets/:id/escalate
 * @access  Private (Agent, Manager, Admin)
 */
const escalateTicket = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return sendError(res, 404, 'Ticket not found', 'NOT_FOUND');
    }

    // Business rule: Cannot escalate a closed ticket
    if (ticket.status === 'Closed') {
      return sendError(res, 409, 'Cannot escalate a closed ticket', 'TICKET_CLOSED');
    }

    // Business rule: Cannot escalate an already escalated ticket
    if (ticket.isEscalated) {
      return sendError(res, 409, 'Ticket has already been escalated', 'ALREADY_ESCALATED');
    }

    // Workflow logic: Escalate priority if possible (Low -> Medium -> High -> Urgent)
    const priorityOrder = ['Low', 'Medium', 'High', 'Urgent'];
    const currentPriorityIndex = priorityOrder.indexOf(ticket.priority);
    if (currentPriorityIndex !== -1 && currentPriorityIndex < priorityOrder.length - 1) {
      ticket.priority = priorityOrder[currentPriorityIndex + 1];
    }

    ticket.isEscalated = true;
    ticket.escalatedAt = new Date();

    // Reassign to senior agent or manager if available
    const manager = await User.findOne({ role: { $in: ['manager', 'admin'] } });
    if (manager) {
      ticket.assignedAgentId = manager._id;
    }

    await ticket.save();

    // Log escalation as an internal note in comment thread
    await Comment.create({
      ticketId: ticket._id,
      authorId: req.user.id,
      message: `[ESCALATION WORKFLOW] Ticket escalated to senior management. Reason: ${
        reason || 'SLA threshold reached or manual escalation triggered by ' + req.user.role
      }. Updated priority: ${ticket.priority}.`,
      isInternal: true
    });

    const populatedTicket = await Ticket.findById(ticket._id)
      .populate('customerId', 'name email')
      .populate('assignedAgentId', 'name email');

    emitTicketEscalated(populatedTicket);

    return sendSuccess(res, 200, 'Ticket escalated successfully to Senior Management', {
      _id: populatedTicket._id,
      status: populatedTicket.status,
      priority: populatedTicket.priority,
      isEscalated: populatedTicket.isEscalated,
      escalatedAt: populatedTicket.escalatedAt,
      assignedAgentId: populatedTicket.assignedAgentId
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTicket,
  getTickets,
  getTicketById,
  assignTicket,
  autoAssignTicket,
  updateTicketStatus,
  checkSlaBreaches,
  escalateTicket
};
