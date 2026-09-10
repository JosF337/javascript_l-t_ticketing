import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  ShieldCheck, 
  Clock, 
  Layers, 
  Plus, 
  Trash2, 
  Edit3, 
  Zap,
  PieChart,
  Activity,
  AlertOctagon,
  RefreshCw
} from 'lucide-react';
import { TicketCard } from './TicketCard';
import { api } from '../services/api';

export function ManagerDashboard({ 
  tickets = [], 
  onSelectTicket, 
  allAgents = [],
  addToast,
  activeTab = 'tickets',
  onRefresh
}) {
  const [slaReport, setSlaReport] = useState(null);
  const [agentWorkloads, setAgentWorkloads] = useState([]);
  const [volumeTrends, setVolumeTrends] = useState([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState([]);
  const [slaRules, setSlaRules] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);

  // New SLA Rule form state
  const [showNewRuleModal, setShowNewRuleModal] = useState(false);
  const [newCategory, setNewCategory] = useState('Software');
  const [newPriority, setNewPriority] = useState('Urgent');
  const [newHours, setNewHours] = useState(4);

  // Fetch Reports and SLA rules
  const fetchAnalytics = async () => {
    setLoadingReports(true);
    try {
      const [slaRes, workloadRes, trendsRes, catRes, rulesRes] = await Promise.all([
        api.reports.getSlaCompliance(),
        api.reports.getAgentWorkload(),
        api.reports.getVolumeTrends(),
        api.reports.getCategoryBreakdown(),
        api.sla.list()
      ]);
      setSlaReport(slaRes.data);
      setAgentWorkloads(workloadRes.data || []);
      setVolumeTrends(trendsRes.data || []);
      setCategoryBreakdown(catRes.data || []);
      setSlaRules(rulesRes.data || []);
    } catch (err) {
      addToast('error', 'Report Fetch Failed', err.message);
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleCreateSlaRule = async (e) => {
    e.preventDefault();
    try {
      await api.sla.create({
        category: newCategory,
        priority: newPriority,
        resolutionHours: Number(newHours)
      });
      addToast('success', 'SLA Rule Configured', `${newCategory} / ${newPriority} set to ${newHours}h target.`);
      setShowNewRuleModal(false);
      fetchAnalytics();
    } catch (err) {
      addToast('error', 'SLA Creation Failed', err.message);
    }
  };

  const handleDeleteSlaRule = async (id) => {
    try {
      await api.sla.delete(id);
      addToast('success', 'SLA Rule Removed', 'Rule removed from matrix.');
      fetchAnalytics();
    } catch (err) {
      addToast('error', 'Delete Failed', err.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Tab 1: Global Ticket Dispatcher */}
      {activeTab === 'tickets' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#fff' }}>Global Ticket Operations & Dispatch</h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                System-wide overview of all customer issues, active caseloads, and SLA trackers.
              </p>
            </div>
            <button onClick={onRefresh} className="btn btn-secondary btn-sm">
              <RefreshCw size={14} /> Refresh Queue
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '18px' }}>
            {tickets.map((ticket) => (
              <TicketCard
                key={ticket._id}
                ticket={ticket}
                onSelectTicket={onSelectTicket}
              />
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Executive Analytics Dashboard */}
      {activeTab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Top KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div className="glass-panel" style={{ padding: '20px 24px', borderLeft: '4px solid var(--emerald)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-subtle)', fontWeight: '700', textTransform: 'uppercase' }}>SLA Compliance Rate</span>
                <ShieldCheck size={20} color="var(--emerald)" />
              </div>
              <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--emerald)', marginTop: '6px' }}>
                {slaReport?.complianceRatePercentage ?? '100'}%
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                {slaReport?.resolvedOnTime || 0} on-time vs {slaReport?.resolvedBreached || 0} breached
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '20px 24px', borderLeft: '4px solid var(--cyan)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-subtle)', fontWeight: '700', textTransform: 'uppercase' }}>Active In-Flight Issues</span>
                <Activity size={20} color="var(--cyan)" />
              </div>
              <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--cyan)', marginTop: '6px' }}>
                {slaReport?.activeTickets || 0}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Open, In Progress & On Hold
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '20px 24px', borderLeft: '4px solid var(--rose)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: 'var(--rose)', fontWeight: '700', textTransform: 'uppercase' }}>Active SLA Breaches</span>
                <AlertOctagon size={20} color="var(--rose)" />
              </div>
              <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--rose)', marginTop: '6px' }}>
                {slaReport?.activeBreaches || 0}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Requiring immediate escalation
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '20px 24px', borderLeft: '4px solid var(--purple)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-subtle)', fontWeight: '700', textTransform: 'uppercase' }}>Total Tickets Handled</span>
                <Layers size={20} color="var(--purple)" />
              </div>
              <div style={{ fontSize: '32px', fontWeight: '800', color: '#fff', marginTop: '6px' }}>
                {slaReport?.totalTickets || 0}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Lifetime volume in system
              </div>
            </div>
          </div>

          {/* Middle Row: Agent Workload Distribution & Category Breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
            {/* Agent Workload Table/Bars */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
                <Users size={18} color="var(--primary)" />
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#fff' }}>Agent Workload & Resolution Velocity (Module 12)</h3>
              </div>

              {agentWorkloads.length === 0 ? (
                <div style={{ color: 'var(--text-subtle)', fontSize: '13px' }}>No active support agents registered.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {agentWorkloads.map((agent) => (
                    <div key={agent.agentId} style={{ background: 'var(--bg-surface-elevated)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <div>
                          <strong style={{ fontSize: '14px', color: '#fff' }}>{agent.agentName}</strong>
                          <span style={{ fontSize: '11px', color: 'var(--text-subtle)', marginLeft: '8px' }}>{agent.agentEmail}</span>
                        </div>
                        <span style={{ fontSize: '12px', color: 'var(--cyan)', fontWeight: '700' }}>
                          {agent.openTicketsCount} Open Active
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                        <span>Resolved Lifetime: {agent.resolvedTicketsCount}</span>
                        <span>Avg Resolution Time: <strong>{agent.avgResolutionHours}h</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Category Distribution Breakdown */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
                <PieChart size={18} color="var(--cyan)" />
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#fff' }}>Ticket Category Breakdown (Module 13)</h3>
              </div>

              {categoryBreakdown.length === 0 ? (
                <div style={{ color: 'var(--text-subtle)', fontSize: '13px' }}>No category data available.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {categoryBreakdown.map((cat) => (
                    <div key={cat.category} style={{ background: 'var(--bg-surface-elevated)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>{cat.category}</span>
                        <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--primary)' }}>{cat.totalTickets} Tickets</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                        <span>Open: <strong style={{ color: 'var(--amber)' }}>{cat.openTickets}</strong></span>
                        <span>Resolved: <strong style={{ color: 'var(--emerald)' }}>{cat.resolvedTickets}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Dynamic SLA Matrix Administration */}
      {activeTab === 'sla-matrix' && (
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#fff' }}>Dynamic SLA Rule Matrix (Module 10)</h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Configure resolution target deadlines per category and priority combination.
              </p>
            </div>
            <button onClick={() => setShowNewRuleModal(true)} className="btn btn-primary btn-sm">
              <Plus size={14} /> Add SLA Rule
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-glass)', color: 'var(--text-subtle)' }}>
                  <th style={{ padding: '12px 16px' }}>Category</th>
                  <th style={{ padding: '12px 16px' }}>Priority Level</th>
                  <th style={{ padding: '12px 16px' }}>Resolution Target</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {slaRules.map((rule) => (
                  <tr key={rule._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: '700', color: '#fff' }}>{rule.category}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className={`badge badge-priority-${rule.priority?.toLowerCase()}`}>{rule.priority}</span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--cyan)', fontWeight: '700' }}>
                      <Clock size={13} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-2px' }} />
                      {rule.resolutionHours} Hours
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <button 
                        onClick={() => handleDeleteSlaRule(rule._id)} 
                        className="btn btn-secondary btn-icon"
                        title="Delete SLA Rule"
                        style={{ padding: '6px' }}
                      >
                        <Trash2 size={13} color="var(--rose)" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add Rule Modal */}
          {showNewRuleModal && (
            <div className="modal-overlay">
              <div className="modal-content" style={{ maxWidth: '440px', padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#fff' }}>Add New SLA Rule</h3>
                  <button onClick={() => setShowNewRuleModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-subtle)', cursor: 'pointer' }}>
                    <X size={18} />
                  </button>
                </div>
                <form onSubmit={handleCreateSlaRule}>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <input
                      type="text"
                      className="form-input"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <select className="form-select" value={newPriority} onChange={(e) => setNewPriority(e.target.value)}>
                      <option value="Urgent">Urgent</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Target Resolution (Hours)</label>
                    <input
                      type="number"
                      min={1}
                      className="form-input"
                      value={newHours}
                      onChange={(e) => setNewHours(e.target.value)}
                      required
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                    <button type="button" onClick={() => setShowNewRuleModal(false)} className="btn btn-secondary btn-sm">Cancel</button>
                    <button type="submit" className="btn btn-primary btn-sm">Save Rule</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
