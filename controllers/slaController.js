const SlaRule = require('../models/SlaRule');
const { sendSuccess, sendError } = require('../utils/responseHelper');

/**
 * @desc    Create SLA Rule for Category & Priority (Module 10)
 * @route   POST /api/sla
 * @access  Private (Admin, Manager)
 */
const createSlaRule = async (req, res, next) => {
  try {
    const { category, priority, resolutionHours } = req.body;

    const existingRule = await SlaRule.findOne({
      category: new RegExp(`^${category}$`, 'i'),
      priority
    });

    if (existingRule) {
      return sendError(
        res,
        409,
        `SLA rule for category '${category}' and priority '${priority}' already exists`,
        'DUPLICATE_RULE'
      );
    }

    const rule = await SlaRule.create({
      category,
      priority,
      resolutionHours
    });

    return res.status(201).json({
      success: true,
      message: 'SLA rule created successfully',
      data: rule
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all SLA rules (Module 10)
 * @route   GET /api/sla
 * @access  Private
 */
const getSlaRules = async (req, res, next) => {
  try {
    let query = {};
    if (req.query.category) {
      query.category = new RegExp(req.query.category, 'i');
    }
    if (req.query.priority) {
      query.priority = req.query.priority;
    }

    const rules = await SlaRule.find(query).sort({ category: 1, resolutionHours: 1 });
    return sendSuccess(res, 200, 'SLA rules retrieved successfully', rules);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get SLA rule by ID (Module 10)
 * @route   GET /api/sla/:id
 * @access  Private
 */
const getSlaRuleById = async (req, res, next) => {
  try {
    const rule = await SlaRule.findById(req.params.id);
    if (!rule) {
      return sendError(res, 404, 'SLA rule not found', 'NOT_FOUND');
    }

    return sendSuccess(res, 200, 'SLA rule details retrieved successfully', rule);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update SLA Rule resolution hours (Module 10)
 * @route   PUT /api/sla/:id
 * @access  Private (Admin, Manager)
 */
const updateSlaRule = async (req, res, next) => {
  try {
    const { resolutionHours } = req.body;

    const rule = await SlaRule.findById(req.params.id);
    if (!rule) {
      return sendError(res, 404, 'SLA rule not found', 'NOT_FOUND');
    }

    rule.resolutionHours = resolutionHours;
    await rule.save();

    return sendSuccess(res, 200, 'SLA rule updated successfully', rule);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete SLA Rule (Module 10)
 * @route   DELETE /api/sla/:id
 * @access  Private (Admin, Manager)
 */
const deleteSlaRule = async (req, res, next) => {
  try {
    const rule = await SlaRule.findById(req.params.id);
    if (!rule) {
      return sendError(res, 404, 'SLA rule not found', 'NOT_FOUND');
    }

    await rule.deleteOne();
    return sendSuccess(res, 200, 'SLA rule deleted successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSlaRule,
  getSlaRules,
  getSlaRuleById,
  updateSlaRule,
  deleteSlaRule
};
