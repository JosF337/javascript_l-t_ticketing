const express = require('express');
const router = express.Router();
const {
  getSlaComplianceReport,
  getAgentWorkload,
  getVolumeTrends,
  getCategoryBreakdown
} = require('../controllers/reportController');
const { protect } = require('../middleware/auth');
const { allowRoles } = require('../middleware/roleCheck');

// All manager reports require authentication and Manager/Admin role
router.use(protect);
router.use(allowRoles('manager', 'admin'));

// GET /api/manager/reports/sla - SLA compliance report (Sample endpoint #7)
router.get('/reports/sla', getSlaComplianceReport);

// GET /api/manager/reports/agent-workload - Agent workload dashboard (Module 12)
router.get('/reports/agent-workload', getAgentWorkload);

// GET /api/manager/reports/volume-trends - Ticket volume trends (Module 13)
router.get('/reports/volume-trends', getVolumeTrends);

// GET /api/manager/reports/category-breakdown - Category breakdown (Module 13)
router.get('/reports/category-breakdown', getCategoryBreakdown);

module.exports = router;