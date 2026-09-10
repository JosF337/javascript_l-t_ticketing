import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Send, 
  Clock, 
  User, 
  Tag, 
  Flame, 
  CheckCircle2, 
  Lock, 
  MessageSquare, 
  Star, 
  AlertTriangle,
  Play,
  Pause,
  Check,
  Zap,
  ShieldAlert
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';
import { getStatusBadge, getPriorityBadge, formatTimeRemaining } from './TicketCard';
import { joinTicketRoom, leaveTicketRoom, getSocket } from '../services/socket';

export function TicketDetailModal({ 
  ticket, 
  currentUser, 
  onClose, 
  onTicketUpdated, 
  addToast,
  allAgents = []
}) {
  const [activeTab, setActiveTab] = useState('discussion'); // 'discussion' | 'internal_notes'
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [existingRating, setExistingRating] = useState(null);
  const [escalateReason, setEscalateReason] = useState('');
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState(ticket?.assignedAgentId?._id || '');
  const [loading, setLoading] = useState(false);

  const commentsEndRef = useRef(null);

  if (!ticket) return null;

  const isStaff = currentUser?.role === 'agent' || currentUser?.role === 'manager' || currentUser?.role === 'admin';
  const isOwnerCustomer = currentUser?.role === 'customer' && (ticket.customerId?._id === currentUser?.id || ticket.customerId === currentUser?.id);
  const slaInfo = formatTimeRemaining(ticket.slaDueAt, ticket.status, ticket.isBreached);

  // Load comments & ratings and subscribe to WebSocket room
  useEffect(() => {
    if (!ticket._id) return;

    joinTicketRoom(ticket._id);

    const loadData = async () => {
      try {
        const cRes = await api.comments.list(ticket._id);
        setComments(cRes.data || []);
      } catch (err) {
        console.error('Error fetching comments:', err);
      }

      if (ticket.status === 'Resolved' || ticket.status === 'Closed') {
        try {
          const rRes = await api.ratings.getByTicket(ticket._id);
          setExistingRating(rRes.data);
        } catch {
          // No rating yet
          setExistingRating(null);
        }
      }
    };

    loadData();

    // Listen for incoming live socket events
    const socket = getSocket();
    const handleCommentAdded = ({ ticketId, comment }) => {
      if (ticketId === ticket._id) {
        setComments((prev) => [...prev, comment]);
      }
    };

    const handleInternalNote = ({ ticketId, comment }) => {
      if (ticketId === ticket._id && isStaff) {
        setComments((prev) => [...prev, comment]);
      }
    };

    if (socket) {
      socket.on('comment:added', handleCommentAdded);
      socket.on('comment:internal_note', handleInternalNote);
    }

    return () => {
      leaveTicketRoom(ticket._id);
      if (socket) {
        socket.off('comment:added', handleCommentAdded);
        socket.off('comment:internal_note', handleInternalNote);
      }
    };
  }, [ticket._id, isStaff]);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  // Handle Comment Submission
  const handleSendComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const isInternal = isStaff ? isInternalNote : false;
      const res = await api.comments.add(ticket._id, newComment.trim(), isInternal);
      setNewComment('');
      addToast('success', isInternal ? 'Internal Note Logged' : 'Comment Posted', 'Sent to live channel.');
    } catch (err) {
      addToast('error', 'Failed to Send', err.message);
    }
  };

  // State Transition Handlers
  const handleTransition = async (nextStatus) => {
    setLoading(true);
    try {
      const res = await api.tickets.updateStatus(ticket._id, nextStatus);
      addToast('success', 'Status Transitioned', `Ticket is now marked as '${nextStatus}'.`);
      if (onTicketUpdated) onTicketUpdated({ ...ticket, status: nextStatus });
    } catch (err) {
      addToast('error', 'Transition Rejected', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Assignment Handlers
  const handleManualAssign = async (agentId) => {
    if (!agentId) return;
    try {
      const res = await api.tickets.assign(ticket._id, agentId);
      addToast('success', 'Ticket Assigned', 'Assigned agent updated.');
      if (onTicketUpdated) onTicketUpdated({ ...ticket, assignedAgentId: res.data.assignedAgentId, status: res.data.status });
    } catch (err) {
      addToast('error', 'Assignment Failed', err.message);
    }
  };

  const handleAutoAssign = async () => {
    try {
      const res = await api.tickets.autoAssign(ticket._id);
      addToast('success', 'Auto-Dispatched', `Auto-assigned to ${res.data.assignedAgent.name} (lowest workload).`);
      if (onTicketUpdated) onTicketUpdated({ ...ticket, assignedAgentId: res.data.assignedAgent, status: res.data.status });
    } catch (err) {
      addToast('error', 'Auto-Assign Failed', err.message);
    }
  };

  // Escalation Handler
  const handleEscalate = async (e) => {
    e.preventDefault();
    try {
      const res = await api.tickets.escalate(ticket._id, escalateReason);
      addToast('alert', 'Ticket Escalated', 'Priority boosted and reassigned to Senior Management.');
      setShowEscalateModal(false);
      if (onTicketUpdated) onTicketUpdated({ ...ticket, isEscalated: true, priority: res.data.priority });
    } catch (err) {
      addToast('error', 'Escalation Failed', err.message);
    }
  };

  // Rating Submission Handler
  const handleRatingSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.ratings.create({
        ticketId: ticket._id,
        score: ratingScore,
        comment: ratingComment
      });
      setExistingRating(res.data);
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
      addToast('success', 'Feedback Submitted', 'Ticket is now finalized and Closed. Thank you!');
      if (onTicketUpdated) onTicketUpdated({ ...ticket, status: 'Closed' });
    } catch (err) {
      addToast('error', 'Rating Error', err.message);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '840px', height: '88vh' }}>
        {/* Header */}
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-glass)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontFamily: 'monospace', color: 'var(--text-subtle)', fontSize: '12px' }}>
                #{ticket._id?.slice(-6).toUpperCase()}
              </span>
              {getStatusBadge(ticket.status)}
              {getPriorityBadge(ticket.priority)}
              {ticket.isEscalated && (
                <span className="badge" style={{ background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.4)' }}>
                  <Flame size={12} /> Escalated
                </span>
              )}
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#fff', lineHeight: 1.3 }}>{ticket.title}</h2>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-subtle)', cursor: 'pointer', padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        {/* SLA & Meta Quick Bar */}
        <div style={{ padding: '10px 24px', background: 'var(--bg-surface-elevated)', borderBottom: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', fontSize: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ color: 'var(--text-muted)' }}>
              Category: <strong style={{ color: '#fff' }}>{ticket.category}</strong>
            </span>
            <span style={{ color: 'var(--text-muted)' }}>
              Customer: <strong style={{ color: '#fff' }}>{ticket.customerId?.name || 'Customer'}</strong>
            </span>
            <span style={{ color: 'var(--text-muted)' }}>
              Assignee: <strong style={{ color: ticket.assignedAgentId ? 'var(--cyan)' : 'var(--amber)' }}>{ticket.assignedAgentId?.name || 'Unassigned'}</strong>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: slaInfo.color, fontWeight: '700' }}>
            <Clock size={14} />
            <span>{slaInfo.text}</span>
          </div>
        </div>

        {/* Action Controls Toolbar */}
        <div style={{ padding: '12px 24px', background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          {/* Status Transitions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-subtle)' }}>Actions:</span>
            {ticket.status === 'Open' && isStaff && (
              <button onClick={() => handleTransition('In Progress')} disabled={loading} className="btn btn-primary btn-sm">
                <Play size={13} /> Start In Progress
              </button>
            )}
            {ticket.status === 'In Progress' && isStaff && (
              <>
                <button onClick={() => handleTransition('On Hold')} disabled={loading} className="btn btn-secondary btn-sm">
                  <Pause size={13} /> Put On Hold
                </button>
                <button onClick={() => handleTransition('Resolved')} disabled={loading} className="btn btn-emerald btn-sm">
                  <CheckCircle2 size={13} /> Mark Resolved
                </button>
              </>
            )}
            {ticket.status === 'On Hold' && isStaff && (
              <>
                <button onClick={() => handleTransition('In Progress')} disabled={loading} className="btn btn-primary btn-sm">
                  <Play size={13} /> Resume In Progress
                </button>
                <button onClick={() => handleTransition('Resolved')} disabled={loading} className="btn btn-emerald btn-sm">
                  <CheckCircle2 size={13} /> Mark Resolved
                </button>
              </>
            )}
            {ticket.status === 'Resolved' && (currentUser?.role === 'customer' || currentUser?.role === 'manager' || currentUser?.role === 'admin') && (
              <>
                <button onClick={() => handleTransition('Closed')} disabled={loading} className="btn btn-secondary btn-sm">
                  <Check size={13} /> Finalize & Close
                </button>
                <button onClick={() => handleTransition('In Progress')} disabled={loading} className="btn btn-secondary btn-sm">
                  Reopen Ticket
                </button>
              </>
            )}

            {/* Escalation Button (if not already escalated) */}
            {ticket.status !== 'Closed' && !ticket.isEscalated && isStaff && (
              <button onClick={() => setShowEscalateModal(true)} className="btn btn-sm" style={{ background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.4)' }}>
                <Flame size={13} /> Escalate Ticket
              </button>
            )}
          </div>

          {/* Manager Dispatcher Quick Controls */}
          {(currentUser?.role === 'manager' || currentUser?.role === 'admin') && ticket.status !== 'Closed' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button onClick={handleAutoAssign} className="btn btn-secondary btn-sm" title="Auto-Assign to least loaded agent">
                <Zap size={13} color="var(--amber)" /> Auto-Assign
              </button>
              {allAgents.length > 0 && (
                <select 
                  className="form-select" 
                  style={{ padding: '4px 8px', fontSize: '12px' }}
                  value={selectedAgentId}
                  onChange={(e) => {
                    setSelectedAgentId(e.target.value);
                    handleManualAssign(e.target.value);
                  }}
                >
                  <option value="">Reassign Agent...</option>
                  {allAgents.map((ag) => (
                    <option key={ag._id} value={ag._id}>{ag.name}</option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>

        {/* Modal Body: Description + Timeline */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Ticket Description Box */}
          <div style={{ background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-md)', padding: '14px 18px', border: '1px solid var(--border-glass)' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-subtle)', textTransform: 'uppercase', marginBottom: '4px' }}>
              Issue Description
            </div>
            <p style={{ fontSize: '14px', color: 'var(--text-main)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
              {ticket.description}
            </p>
          </div>

          {/* Rating Display or Rating Form for Customer */}
          {(ticket.status === 'Resolved' || ticket.status === 'Closed') && (
            <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 'var(--radius-md)', padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Star size={18} color="#f59e0b" fill="#f59e0b" />
                <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>Customer Satisfaction Rating</h4>
              </div>

              {existingRating ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} size={16} color="#f59e0b" fill={s <= existingRating.score ? '#f59e0b' : 'none'} />
                    ))}
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#fff', marginLeft: '6px' }}>
                      {existingRating.score} / 5 Stars
                    </span>
                  </div>
                  {existingRating.comment && (
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '4px' }}>
                      "{existingRating.comment}"
                    </p>
                  )}
                </div>
              ) : isOwnerCustomer && ticket.status === 'Resolved' ? (
                <form onSubmit={handleRatingSubmit} style={{ marginTop: '8px' }}>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                    How would you rate the speed and resolution quality provided by our support team?
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRatingScore(star)}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                      >
                        <Star size={24} color="#f59e0b" fill={star <= ratingScore ? '#f59e0b' : 'none'} />
                      </button>
                    ))}
                    <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--amber)', marginLeft: '8px' }}>
                      {ratingScore} Stars
                    </span>
                  </div>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Optional feedback comment (e.g., Quick turnaround, thanks!)..."
                    value={ratingComment}
                    onChange={(e) => setRatingComment(e.target.value)}
                    style={{ marginBottom: '10px' }}
                  />
                  <button type="submit" className="btn btn-emerald btn-sm">
                    Submit Rating & Close Ticket
                  </button>
                </form>
              ) : (
                <span style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>Awaiting customer rating feedback.</span>
              )}
            </div>
          )}

          {/* Comment Stream Timeline */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-subtle)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MessageSquare size={14} /> Communication History ({comments.length})
            </div>

            {comments.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-subtle)', fontSize: '13px' }}>
                No comments or internal notes yet. Start the conversation below.
              </div>
            ) : (
              comments.map((c) => {
                const isInternal = c.isInternal;
                return (
                  <div
                    key={c._id || Math.random()}
                    style={{
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-md)',
                      background: isInternal ? 'rgba(168, 85, 247, 0.12)' : 'var(--bg-surface-elevated)',
                      border: isInternal ? '1px solid rgba(168, 85, 247, 0.35)' : '1px solid var(--border-glass)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: isInternal ? '#c084fc' : '#fff' }}>
                          {c.authorId?.name || 'User'}
                        </span>
                        <span style={{ fontSize: '10px', textTransform: 'capitalize', color: 'var(--text-subtle)' }}>
                          ({c.authorId?.role || 'staff'})
                        </span>
                        {isInternal && (
                          <span className="badge" style={{ background: 'rgba(168, 85, 247, 0.25)', color: '#d8b4fe', fontSize: '9px' }}>
                            <Lock size={10} /> STAFF ONLY NOTE
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>
                        {c.createdAt ? new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-main)', lineHeight: 1.4 }}>
                      {c.message}
                    </p>
                  </div>
                );
              })
            )}
            <div ref={commentsEndRef} />
          </div>
        </div>

        {/* Comment Input Composer */}
        {ticket.status !== 'Closed' ? (
          <form onSubmit={handleSendComment} style={{ padding: '16px 24px', borderTop: '1px solid var(--border-glass)', background: 'var(--bg-surface-elevated)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {isStaff && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: !isInternalNote ? 'var(--cyan)' : 'var(--text-subtle)', fontWeight: '600' }}>
                  <input
                    type="radio"
                    name="commentType"
                    checked={!isInternalNote}
                    onChange={() => setIsInternalNote(false)}
                  />
                  Public Reply (Visible to Customer)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: isInternalNote ? '#c084fc' : 'var(--text-subtle)', fontWeight: '600' }}>
                  <input
                    type="radio"
                    name="commentType"
                    checked={isInternalNote}
                    onChange={() => setIsInternalNote(true)}
                  />
                  <Lock size={12} /> Staff Internal Note (Strict Privacy Isolation)
                </label>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                className="form-input"
                placeholder={isInternalNote ? 'Log private troubleshooting notes (hidden from customer)...' : 'Type a reply to the customer...'}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                style={{ flex: 1 }}
              />
              <button type="submit" className={isInternalNote ? 'btn btn-secondary' : 'btn btn-primary'}>
                <Send size={15} /> Send
              </button>
            </div>
          </form>
        ) : (
          <div style={{ padding: '14px', textAlign: 'center', background: 'var(--bg-surface-elevated)', borderTop: '1px solid var(--border-glass)', color: 'var(--text-subtle)', fontSize: '12px' }}>
            This ticket is closed. Discussion and notes are locked.
          </div>
        )}

        {/* Escalation Prompt Sub-Modal */}
        {showEscalateModal && (
          <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.85)' }}>
            <div className="modal-content" style={{ maxWidth: '480px', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <ShieldAlert size={22} color="var(--purple)" />
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#fff' }}>Escalate to Senior Management</h3>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px' }}>
                Escalating increases ticket priority and reassigns it to the executive manager queue.
              </p>
              <form onSubmit={handleEscalate}>
                <div className="form-group">
                  <label className="form-label">Reason for Escalation *</label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    placeholder="e.g. Critical revenue-impacting bug or imminent SLA breach..."
                    value={escalateReason}
                    onChange={(e) => setEscalateReason(e.target.value)}
                    required
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
                  <button type="button" onClick={() => setShowEscalateModal(false)} className="btn btn-secondary btn-sm">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm" style={{ background: 'var(--purple)' }}>
                    Confirm Escalation
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
