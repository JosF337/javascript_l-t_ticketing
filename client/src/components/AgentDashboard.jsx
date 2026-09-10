import React, { useState } from 'react';
import { 
  UserCheck, 
  Inbox, 
  AlertTriangle, 
  ShieldAlert, 
  RefreshCw, 
  CheckCircle2, 
  Search,
  Filter
} from 'lucide-react';
import { TicketCard } from './TicketCard';
import { api } from '../services/api';

export function AgentDashboard({ 
  tickets = [], 
  currentUserId, 
  onSelectTicket, 
  onRefresh,
  addToast 
}) {
  const [activeTab, setActiveTab] = useState('my-tickets'); // 'my-tickets' | 'unassigned' | 'breaches'
  const [searchQuery, setSearchQuery] = useState('');
  const [scanningBreaches, setScanningBreaches] = useState(false);

  const myTickets = tickets.filter(t => (t.assignedAgentId?._id === currentUserId || t.assignedAgentId === currentUserId) && t.status !== 'Closed');
  const unassignedTickets = tickets.filter(t => !t.assignedAgentId && t.status === 'Open');
  const breachedTickets = tickets.filter(t => t.isBreached && t.status !== 'Closed' && t.status !== 'Resolved');

  const handleScanBreaches = async () => {
    setScanningBreaches(true);
    try {
      const res = await api.tickets.checkBreaches();
      addToast('alert', 'SLA Active Scan Complete', `Flagged ${res.data.count} breached tickets across system.`);
      if (onRefresh) onRefresh();
    } catch (err) {
      addToast('error', 'Breach Scan Failed', err.message);
    } finally {
      setScanningBreaches(false);
    }
  };

  let displayTickets = [];
  if (activeTab === 'my-tickets') displayTickets = myTickets;
  else if (activeTab === 'unassigned') displayTickets = unassignedTickets;
  else if (activeTab === 'breaches') displayTickets = breachedTickets;

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    displayTickets = displayTickets.filter(t =>
      t.title.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q)
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Agent Metrics Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div 
          className="glass-panel" 
          onClick={() => setActiveTab('my-tickets')}
          style={{ 
            padding: '18px 22px', 
            cursor: 'pointer',
            borderLeft: activeTab === 'my-tickets' ? '4px solid var(--primary)' : '1px solid var(--border-glass)' 
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-subtle)', fontWeight: '700', textTransform: 'uppercase' }}>My Active Caseload</span>
            <UserCheck size={18} color="var(--primary)" />
          </div>
          <div style={{ fontSize: '30px', fontWeight: '800', color: '#fff', marginTop: '4px' }}>{myTickets.length}</div>
        </div>

        <div 
          className="glass-panel" 
          onClick={() => setActiveTab('unassigned')}
          style={{ 
            padding: '18px 22px', 
            cursor: 'pointer',
            borderLeft: activeTab === 'unassigned' ? '4px solid var(--cyan)' : '1px solid var(--border-glass)' 
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-subtle)', fontWeight: '700', textTransform: 'uppercase' }}>Unassigned Queue</span>
            <Inbox size={18} color="var(--cyan)" />
          </div>
          <div style={{ fontSize: '30px', fontWeight: '800', color: 'var(--cyan)', marginTop: '4px' }}>{unassignedTickets.length}</div>
        </div>

        <div 
          className="glass-panel" 
          onClick={() => setActiveTab('breaches')}
          style={{ 
            padding: '18px 22px', 
            cursor: 'pointer',
            borderLeft: activeTab === 'breaches' ? '4px solid var(--rose)' : '1px solid var(--border-glass)' 
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', color: 'var(--rose)', fontWeight: '700', textTransform: 'uppercase' }}>SLA Breach Watch</span>
            <ShieldAlert size={18} color="var(--rose)" />
          </div>
          <div style={{ fontSize: '30px', fontWeight: '800', color: 'var(--rose)', marginTop: '4px' }}>{breachedTickets.length}</div>
        </div>

        <div className="glass-panel" style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <button 
            onClick={handleScanBreaches} 
            disabled={scanningBreaches}
            className="btn btn-secondary btn-sm"
            style={{ width: '100%', justifyContent: 'center' }}
          >
            <RefreshCw size={14} className={scanningBreaches ? 'spin' : ''} /> {scanningBreaches ? 'Scanning...' : 'Trigger SLA Scanner'}
          </button>
        </div>
      </div>

      {/* Tabs & Search Filter */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
        <div style={{ display: 'flex', background: 'var(--bg-surface-elevated)', borderRadius: '10px', padding: '3px', border: '1px solid var(--border-glass)' }}>
          <button
            onClick={() => setActiveTab('my-tickets')}
            className="btn btn-sm"
            style={{
              background: activeTab === 'my-tickets' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'my-tickets' ? '#fff' : 'var(--text-muted)',
              borderRadius: '8px'
            }}
          >
            My Assigned ({myTickets.length})
          </button>
          <button
            onClick={() => setActiveTab('unassigned')}
            className="btn btn-sm"
            style={{
              background: activeTab === 'unassigned' ? 'var(--cyan)' : 'transparent',
              color: activeTab === 'unassigned' ? '#fff' : 'var(--text-muted)',
              borderRadius: '8px'
            }}
          >
            Open Queue ({unassignedTickets.length})
          </button>
          <button
            onClick={() => setActiveTab('breaches')}
            className="btn btn-sm"
            style={{
              background: activeTab === 'breaches' ? 'var(--rose)' : 'transparent',
              color: activeTab === 'breaches' ? '#fff' : 'var(--text-muted)',
              borderRadius: '8px'
            }}
          >
            Breached ({breachedTickets.length})
          </button>
        </div>

        <div style={{ position: 'relative', minWidth: '260px' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search tickets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '34px', width: '100%', fontSize: '13px' }}
          />
        </div>
      </div>

      {/* Ticket Grid */}
      {displayTickets.length === 0 ? (
        <div className="glass-panel" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <CheckCircle2 size={36} color="var(--emerald)" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#fff', marginBottom: '6px' }}>All Clear!</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            No tickets in this view. Great job keeping the queue moving!
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '18px' }}>
          {displayTickets.map((ticket) => (
            <TicketCard
              key={ticket._id}
              ticket={ticket}
              onSelectTicket={onSelectTicket}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
