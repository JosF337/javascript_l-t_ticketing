const Ticket = require('../models/Ticket');
const User = require('../models/User');
const { sendSuccess } = require('../utils/responseHelper');

/**
 * @desc    Get SLA Compliance Report (Module 13 & Sample Endpoint #7)
 * @route   GET /api/manager/reports/sla
 * @access  Private (Manager, Admin)
 */
const getSlaComplianceReport = async (req, res, next) => {
  try {
    const totalTickets = await Ticket.countDocuments();
    const resolvedTickets = await Ticket.find({
      status: { $in: ['Resolved', 'Closed'] }
    });

    const totalResolved = resolvedTickets.length;
    let resolvedOnTime = 0;
    let resolvedBreached = 0;

    resolvedTickets.forEach((ticket) => {
      const resolutionDate = ticket.resolvedAt || ticket.closedAt || ticket.updatedAt;
      if (resolutionDate && ticket.slaDueAt && new Date(resolutionDate) <= new Date(ticket.slaDueAt)) {
        resolvedOnTime++;
      } else {
        resolvedBreached++;
      }
    });

    const activeBreaches = await Ticket.countDocuments({
      status: { $in: ['Open', 'In Progress', 'On Hold'] },
      $or: [
        { isBreached: true },
        { slaDueAt: { $lt: new Date() } }
      ]
    });

    const activeTickets = await Ticket.countDocuments({
      status: { $in: ['Open', 'In Progress', 'On Hold'] }
    });

    const complianceRate = totalResolved > 0
      ? parseFloat(((resolvedOnTime / totalResolved) * 100).toFixed(2))
      : 100.0;

    return sendSuccess(res, 200, 'SLA compliance report generated successfully', {
      totalTickets,
      activeTickets,
      activeBreaches,
      totalResolved,
      resolvedOnTime,
      resolvedBreached,
      complianceRatePercentage: complianceRate
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Agent Workload Dashboard (Module 12)
 * @route   GET /api/manager/reports/agent-workload
 * @access  Private (Manager, Admin)
 */
const getAgentWorkload = async (req, res, next) => {
  try {
    const agents = await User.find({ role: 'agent' }).select('name email');

    const workloadData = await Promise.all(
      agents.map(async (agent) => {
        // Open ticket count
        const openTickets = await Ticket.countDocuments({
          assignedAgentId: agent._id,
          status: { $in: ['Open', 'In Progress', 'On Hold'] }
        });

        // Resolved ticket count
        const resolvedDocs = await Ticket.find({
          assignedAgentId: agent._id,
          status: { $in: ['Resolved', 'Closed'] }
        });

        const resolvedTickets = resolvedDocs.length;

        // Average resolution time in hours
        let totalResolutionHours = 0;
        let countWithResolution = 0;

        resolvedDocs.forEach((doc) => {
          const resDate = doc.resolvedAt || doc.closedAt;
          if (resDate && doc.createdAt) {
            const diffHours = (new Date(resDate) - new Date(doc.createdAt)) / (1000 * 60 * 60);
            totalResolutionHours += diffHours;
            countWithResolution++;
          }
        });

        const avgResolutionHours =
          countWithResolution > 0
            ? parseFloat((totalResolutionHours / countWithResolution).toFixed(2))
            : 0;

        return {
          agentId: agent._id,
          agentName: agent.name,
          agentEmail: agent.email,
          openTicketsCount: openTickets,
          resolvedTicketsCount: resolvedTickets,
          avgResolutionHours
        };
      })
    );

    return sendSuccess(res, 200, 'Agent workload report generated successfully', workloadData);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Ticket Volume Trends (Module 13)
 * @route   GET /api/manager/reports/volume-trends
 * @access  Private (Manager, Admin)
 */
const getVolumeTrends = async (req, res, next) => {
  try {
    const trends = await Ticket.aggregate([
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: '$_id',
          ticketCount: '$count'
        }
      }
    ]);

    return sendSuccess(res, 200, 'Ticket volume trends generated successfully', trends);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Ticket Category Breakdown (Module 13)
 * @route   GET /api/manager/reports/category-breakdown
 * @access  Private (Manager, Admin)
 */
const getCategoryBreakdown = async (req, res, next) => {
  try {
    const breakdown = await Ticket.aggregate([
      {
        $group: {
          _id: '$category',
          total: { $sum: 1 },
          openCount: {
            $sum: {
              $cond: [{ $in: ['$status', ['Open', 'In Progress', 'On Hold']] }, 1, 0]
            }
          },
          resolvedCount: {
            $sum: {
              $cond: [{ $in: ['$status', ['Resolved', 'Closed']] }, 1, 0]
            }
          }
        }
      },
      { $sort: { total: -1 } },
      {
        $project: {
          _id: 0,
          category: '$_id',
          totalTickets: '$total',
          openTickets: '$openCount',
          resolvedTickets: '$resolvedCount'
        }
      }
    ]);

    return sendSuccess(res, 200, 'Category breakdown generated successfully', breakdown);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSlaComplianceReport,
  getAgentWorkload,
  getVolumeTrends,
  getCategoryBreakdown
};
