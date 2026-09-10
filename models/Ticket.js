const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Customer ID is required']
    },
    title: {
      type: String,
      required: [true, 'Ticket title is required'],
      trim: true
    },
    category: {
      type: String,
      required: [true, 'Ticket category is required'],
      trim: true
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Urgent'],
      required: [true, 'Ticket priority is required'],
      default: 'Medium'
    },
    description: {
      type: String,
      required: [true, 'Ticket description is required'],
      trim: true
    },
    status: {
      type: String,
      enum: ['Open', 'In Progress', 'On Hold', 'Resolved', 'Closed'],
      default: 'Open'
    },
    assignedAgentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    slaDueAt: {
      type: Date,
      required: [true, 'SLA due-by time is required']
    },
    isBreached: {
      type: Boolean,
      default: false
    },
    isEscalated: {
      type: Boolean,
      default: false
    },
    escalatedAt: {
      type: Date,
      default: null
    },
    resolvedAt: {
      type: Date,
      default: null
    },
    closedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Required index: { customerId: 1 }
ticketSchema.index({ customerId: 1 });
ticketSchema.index({ status: 1 });
ticketSchema.index({ assignedAgentId: 1 });
ticketSchema.index({ slaDueAt: 1 });

const Ticket = mongoose.model('Ticket', ticketSchema);

module.exports = Ticket;
