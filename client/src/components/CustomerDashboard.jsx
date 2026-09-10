import React, { useState } from 'react';
import { Plus, Ticket as TicketIcon, CheckCircle2, Clock, LifeBuoy, Search } from 'lucide-react';
import { TicketCard } from './TicketCard';

export function CustomerDashboard({ 
  tickets = [], 
  onSelectTicket, 
  onOpenNewTicket,
  currentUserId 
}) {
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const activeTickets = tickets.filter(t => t.status !== 'Closed');
  const closedTickets = tickets.filter(t => t.status === 'Closed');

  const filteredTickets = tickets.filter(t => {
    if (filterStatus !== 'ALL' && t.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Customer Hero Banner */}
      <div 
        className="glass-panel" 
        style={{ 
          padding: '28px 32px', 
          background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(6,182,212,0.1))',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          flexWrap: 'wrap', 
          gap: '20px' 
        }}
      >
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(6,182,212,0.2)', color: 'var(--cyan)', padding: '4px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '700', marginBottom: '10px' }}>
            <LifeBuoy size={14} /> Customer Self-Service Portal
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#fff', marginBottom: '6px' }}>
            How can we help you today?
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', maxWidth: '540px' }}>
            Submit tickets, track live SLA countdown timers, collaborate with assigned support agents, and rate resolved issues.
          </p>
        </div>

        <button onClick={onOpenNewTicket} className="btn btn-primary" style={{ padding: '12px 22px', fontSize: '15px' }}>
          <Plus size={18} /> Raise a New Ticket
        </button>
      </div>

      {/* Stats Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div className="glass-panel" style={{ padding: '18px 22px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-subtle)', fontWeight: '700', textTransform: 'uppercase' }}>Active Inquiries</div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--cyan)', marginTop: '4px' }}>{activeTickets.length}</div>
        </div>
        <div className="glass-panel" style={{ padding: '18px 22px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-subtle)', fontWeight: '700', textTransform: 'uppercase' }}>Resolved & Closed</div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--emerald)', marginTop: '4px' }}>{closedTickets.length}</div>
        </div>
        <div className="glass-panel" style={{ padding: '18px 22px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-subtle)', fontWeight: '700', textTransform: 'uppercase' }}>Total Submissions</div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#fff', marginTop: '4px' }}>{tickets.length}</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {['ALL', 'Open', 'In Progress', 'On Hold', 'Resolved', 'Closed'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className="btn btn-sm"
              style={{
                background: filterStatus === status ? 'var(--primary)' : 'var(--bg-surface-elevated)',
                color: filterStatus === status ? '#fff' : 'var(--text-muted)',
                border: '1px solid var(--border-glass)'
              }}
            >
              {status}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', minWidth: '240px' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search tickets by title or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '34px', width: '100%', fontSize: '13px' }}
          />
        </div>
      </div>

      {/* Tickets Grid */}
      {filteredTickets.length === 0 ? (
        <div className="glass-panel" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <TicketIcon size={36} color="var(--text-subtle)" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#fff', marginBottom: '6px' }}>No Tickets Found</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '18px' }}>
            {searchQuery ? 'No tickets match your search criteria.' : 'You have no tickets in this status.'}
          </p>
          <button onClick={onOpenNewTicket} className="btn btn-primary btn-sm">
            <Plus size={14} /> Submit a Ticket
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '18px' }}>
          {filteredTickets.map((ticket) => (
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
