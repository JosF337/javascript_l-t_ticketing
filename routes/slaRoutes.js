const express = require('express');
const router = express.Router();
const {
  createSlaRule,
  getSlaRules,
  getSlaRuleById,
  updateSlaRule,
  deleteSlaRule
} = require('../controllers/slaController');
const { protect } = require('../middleware/auth');
const { allowRoles } = require('../middleware/roleCheck');
const { validate, schemas } = require('../middleware/validate');

// All SLA routes require authentication
router.use(protect);

// GET /api/sla - List SLA rules
// POST /api/sla - Admin/Manager creates SLA rule (Module 10)
router.route('/')
  .get(getSlaRules)
  .post(allowRoles('manager', 'admin'), validate(schemas.createSlaRule), createSlaRule);

// GET /api/sla/:id - Single rule
// PUT /api/sla/:id - Admin/Manager updates rule
// DELETE /api/sla/:id - Admin/Manager deletes rule
router.route('/:id')
  .get(getSlaRuleById)
  .put(allowRoles('manager', 'admin'), validate(schemas.updateSlaRule), updateSlaRule)
  .delete(allowRoles('manager', 'admin'), deleteSlaRule);

module.exports = router;