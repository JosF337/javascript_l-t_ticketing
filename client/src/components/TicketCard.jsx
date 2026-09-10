import React from 'react';
import { 
  Clock, 
  AlertTriangle, 
  User, 
  Tag, 
  CheckCircle, 
  Flame,
  ArrowRight,
  MessageSquare
} from 'lucide-react';

export function getStatusBadge(status) {
  switch (status) {
    case 'Open': return <span className="badge badge-open">Open</span>;
    case 'In Progress': return <span className="badge badge-in-progress">In Progress</span>;
    case 'On Hold': return <span className="badge badge-on-hold">On Hold</span>;
    case 'Resolved': return <span className="badge badge-resolved">Resolved</span>;
    case 'Closed': return <span className="badge badge-closed">Closed</span>;
    default: return <span className="badge badge-closed">{status}</span>;
  }
}

export function getPriorityBadge(priority) {
  switch (priority) {
    case 'Urgent': return <span className="badge badge-priority-urgent">Urgent</span>;
    case 'High': return <span className="badge badge-priority-high">High</span>;
    case 'Medium': return <span className="badge badge-priority-medium">Medium</span>;
    case 'Low': return <span className="badge badge-priority-low">Low</span>;
    default: return <span className="badge badge-priority-low">{priority}</span>;
  }
}

export function formatTimeRemaining(slaDueAt, status, isBreached) {
  if (status === 'Closed' || status === 'Resolved') {
    return { text: 'Target Achieved', color: 'var(--emerald)', breached: false };
  }
  if (!slaDueAt) return { text: 'N/A', color: 'var(--text-muted)', breached: false };

  const diffMs = new Date(slaDueAt) - new Date();
  const isPast = diffMs < 0 || isBreached;

  if (isPast) {
    const absDiff = Math.abs(diffMs);
    const hours = Math.floor(absDiff / (1000 * 60 * 60));
    const mins = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));
    return {
      text: `SLA Breached by ${hours}h ${mins}m`,
      color: 'var(--rose)',
      breached: true
    };
  }

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours === 0) {
    return {
      text: `${mins}m remaining`,
      color: 'var(--amber)',
      breached: false
    };
  }

  return {
    text: `${hours}h ${mins}m remaining`,
    color: hours < 4 ? 'var(--amber)' : 'var(--cyan)',
    breached: false
  };
}

export function TicketCard({ ticket, onSelectTicket, currentUserId }) {
  const slaInfo = formatTimeRemaining(ticket.slaDueAt, ticket.status, ticket.isBreached);

  return (
    <div 
      className="glass-panel" 
      onClick={() => onSelectTicket(ticket)}
      style={{
        padding: '18px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: '14px',
        position: 'relative',
        overflow: 'hidden',
        borderLeft: ticket.isBreached ? '4px solid var(--rose)' : ticket.isEscalated ? '4px solid var(--purple)' : '1px solid var(--border-glass)'
      }}
    >
      {/* Top Meta Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {getStatusBadge(ticket.status)}
          {getPriorityBadge(ticket.priority)}
          {ticket.isEscalated && (
            <span className="badge" style={{ background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.4)' }}>
              <Flame size={11} /> Escalated
            </span>
          )}
        </div>
        <span style={{ fontSize: '11px', color: 'var(--text-subtle)', fontFamily: 'monospace' }}>
          #{ticket._id ? ticket._id.slice(-6).toUpperCase() : 'NEW'}
        </span>
      </div>

      {/* Title & Description */}
      <div>
        <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#fff', marginBottom: '6px', lineHeight: 1.3 }}>
          {ticket.title}
        </h4>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {ticket.description}
        </p>
      </div>

      {/* Bottom Status & SLA Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '12px' }}>
        {/* Category & Assignee */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-subtle)' }}>
            <Tag size={13} /> {ticket.category}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: ticket.assignedAgentId ? 'var(--text-muted)' : 'var(--amber)' }}>
            <User size={13} /> {ticket.assignedAgentId?.name ? ticket.assignedAgentId.name.split(' ')[0] : 'Unassigned'}
          </span>
        </div>

        {/* SLA Clock */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: slaInfo.color, fontWeight: '600', fontSize: '11px' }}>
          <Clock size={13} />
          <span>{slaInfo.text}</span>
        </div>
      </div>
    </div>
  );
}
