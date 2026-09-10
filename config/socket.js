const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io = null;

/**
 * Initialize Socket.io Server with JWT Auth & Room Channels
 * @param {import('http').Server} httpServer
 */
const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE']
    }
  });

  // Socket Authentication Middleware
  io.use((socket, next) => {
    try {
      const authHeader = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
      if (!authHeader) {
        return next(new Error('Authentication error: No token provided'));
      }

      const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');

      socket.user = decoded; // { id, role, email }
      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    if (!user) return;

    // Join individual user room for direct alerts
    socket.join(`user:${user.id}`);

    // Join role room (role:customer, role:agent, role:manager, role:admin)
    socket.join(`role:${user.role}`);

    // Allow joining specific ticket room for live collaboration
    socket.on('join_ticket', (ticketId) => {
      if (ticketId) {
        socket.join(`ticket:${ticketId}`);
      }
    });

    socket.on('leave_ticket', (ticketId) => {
      if (ticketId) {
        socket.leave(`ticket:${ticketId}`);
      }
    });
  });

  return io;
};

const getIO = () => {
  return io;
};

// Event Emitters
const emitTicketCreated = (ticket) => {
  if (!io) return;
  // Notify agents and managers of new incoming ticket
  io.to('role:agent').to('role:manager').to('role:admin').emit('ticket:created', ticket);
};

const emitTicketAssigned = (ticket, agentId) => {
  if (!io) return;
  // Notify assigned agent directly
  io.to(`user:${agentId}`).emit('ticket:assigned', ticket);
  // Broadcast update to ticket channel
  io.to(`ticket:${ticket._id || ticket.id}`).emit('ticket:updated', ticket);
};

const emitTicketStatusChanged = (ticket) => {
  if (!io) return;
  // Notify customer, staff, and anyone viewing the ticket room
  io.to(`ticket:${ticket._id || ticket.id}`)
    .to(`user:${ticket.customerId?._id || ticket.customerId}`)
    .emit('ticket:status_changed', ticket);
};

const emitTicketEscalated = (ticket) => {
  if (!io) return;
  // Notify senior management
  io.to('role:manager').to('role:admin').emit('ticket:escalated', ticket);
  io.to(`ticket:${ticket._id || ticket.id}`).emit('ticket:updated', ticket);
};

const emitCommentAdded = (ticketId, comment) => {
  if (!io) return;
  // Broadcast public comment to everyone in ticket channel
  io.to(`ticket:${ticketId}`).emit('comment:added', { ticketId, comment });
};

const emitInternalNoteAdded = (ticketId, comment) => {
  if (!io) return;
  // Strictly broadcast internal note only to staff (Agents, Managers, Admins)
  io.to('role:agent').to('role:manager').to('role:admin').emit('comment:internal_note', { ticketId, comment });
};

const emitRatingSubmitted = (ticketId, rating) => {
  if (!io) return;
  // Notify management of new customer satisfaction feedback
  io.to('role:manager').to('role:admin').emit('rating:submitted', { ticketId, rating });
};

const emitSlaBreachAlert = (ticket) => {
  if (!io) return;
  io.to('role:agent').to('role:manager').to('role:admin').emit('sla:breach_alert', ticket);
};

module.exports = {
  initSocket,
  getIO,
  emitTicketCreated,
  emitTicketAssigned,
  emitTicketStatusChanged,
  emitTicketEscalated,
  emitCommentAdded,
  emitInternalNoteAdded,
  emitRatingSubmitted,
  emitSlaBreachAlert
};
