const express = require('express');
const router = express.Router();
const {
  createTicket,
  getTickets,
  getTicketById,
  assignTicket,
  autoAssignTicket,
  updateTicketStatus,
  checkSlaBreaches,
  escalateTicket
} = require('../controllers/ticketController');
const { protect } = require('../middleware/auth');
const { allowRoles } = require('../middleware/roleCheck');
const { validate, schemas } = require('../middleware/validate');

// All ticket routes require authentication
router.use(protect);

// GET /api/tickets/breaches/check - Identify and flag SLA breached tickets (Module 6)
router.get('/breaches/check', allowRoles('agent', 'manager', 'admin'), checkSlaBreaches);

// POST /api/tickets - Customer creates a ticket (Module 2)
// GET /api/tickets - List tickets based on role and filters
router.route('/')
  .post(validate(schemas.createTicket), createTicket)
  .get(getTickets);

// GET /api/tickets/:id - Get single ticket details
router.route('/:id')
  .get(getTicketById);

// PUT /api/tickets/:id/assign - Manager assigns ticket (Module 3)
router.put('/:id/assign', allowRoles('manager', 'admin'), validate(schemas.assignTicket), assignTicket);

// PUT /api/tickets/:id/auto-assign - Manager triggers auto-routing (Module 3)
router.put('/:id/auto-assign', allowRoles('manager', 'admin'), autoAssignTicket);

// PUT /api/tickets/:id/escalate - Escalate ticket (Module 9)
router.put('/:id/escalate', allowRoles('agent', 'manager', 'admin'), validate(schemas.escalateTicket), escalateTicket);

// PUT /api/tickets/:id/status - Update ticket lifecycle status (Module 4)
router.put('/:id/status', validate(schemas.updateStatus), updateTicketStatus);

module.exports = router;
