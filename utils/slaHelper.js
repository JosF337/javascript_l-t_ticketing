const SlaRule = require('../models/SlaRule');

// Fallback SLA default hours by priority
const DEFAULT_SLA_HOURS = {
  Urgent: 4,
  High: 12,
  Medium: 24,
  Low: 48
};

/**
 * Calculates the SLA due-by timestamp based on category and priority
 * @param {string} category 
 * @param {string} priority 
 * @returns {Promise<{ slaDueAt: Date, resolutionHours: number }>}
 */
const calculateSlaDeadline = async (category, priority) => {
  let resolutionHours = DEFAULT_SLA_HOURS[priority] || 24;

  try {
    const rule = await SlaRule.findOne({
      category: new RegExp(`^${category}$`, 'i'),
      priority
    });

    if (rule && rule.resolutionHours) {
      resolutionHours = rule.resolutionHours;
    }
  } catch (err) {
    console.warn('Error fetching SLA rule, using default hours:', err.message);
  }

  const slaDueAt = new Date(Date.now() + resolutionHours * 60 * 60 * 1000);

  return {
    slaDueAt,
    resolutionHours
  };
};

/**
 * Evaluates whether a ticket has breached its SLA
 * @param {Object} ticket 
 * @returns {boolean}
 */
const isTicketBreached = (ticket) => {
  if (['Resolved', 'Closed'].includes(ticket.status)) {
    return false;
  }
  return new Date() > new Date(ticket.slaDueAt);
};

module.exports = {
  calculateSlaDeadline,
  isTicketBreached,
  DEFAULT_SLA_HOURS
};
