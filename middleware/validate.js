const Joi = require('joi');

const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errorMessage = error.details.map((detail) => detail.message.replace(/['"]/g, '')).join(', ');
      return res.status(400).json({
        success: false,
        message: errorMessage,
        errorCode: 'VALIDATION_ERROR'
      });
    }

    req[property] = value;
    next();
  };
};

// Validation Schemas
const schemas = {
  // Auth
  register: Joi.object({
    name: Joi.string().trim().min(2).max(100).required(),
    email: Joi.string().trim().email().required(),
    password: Joi.string().min(6).max(128).required(),
    role: Joi.string().valid('customer', 'agent', 'manager', 'admin').default('customer')
  }),

  login: Joi.object({
    email: Joi.string().trim().email().required(),
    password: Joi.string().required()
  }),

  // Tickets
  createTicket: Joi.object({
    title: Joi.string().trim().min(3).max(150).required(),
    category: Joi.string().trim().min(2).max(50).required(),
    priority: Joi.string().valid('Low', 'Medium', 'High', 'Urgent').required(),
    description: Joi.string().trim().min(5).required()
  }),

  assignTicket: Joi.object({
    agentId: Joi.string().hex().length(24).required()
  }),

  updateStatus: Joi.object({
    status: Joi.string().valid('Open', 'In Progress', 'On Hold', 'Resolved', 'Closed').required()
  }),

  escalateTicket: Joi.object({
    reason: Joi.string().trim().min(3).max(500).optional()
  }),

  // Comments
  createComment: Joi.object({
    message: Joi.string().trim().min(1).max(2000).required(),
    isInternal: Joi.boolean().default(false)
  }),

  // SLA Rules
  createSlaRule: Joi.object({
    category: Joi.string().trim().min(2).max(50).required(),
    priority: Joi.string().valid('Low', 'Medium', 'High', 'Urgent').required(),
    resolutionHours: Joi.number().positive().min(0.5).max(720).required()
  }),

  updateSlaRule: Joi.object({
    resolutionHours: Joi.number().positive().min(0.5).max(720).required()
  }),

  // Ratings
  createRating: Joi.object({
    ticketId: Joi.string().hex().length(24).required(),
    score: Joi.number().integer().min(1).max(5).required(),
    comment: Joi.string().trim().max(500).allow('').optional()
  })
};

module.exports = {
  validate,
  schemas
};
