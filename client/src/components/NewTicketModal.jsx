import React, { useState } from 'react';
import { X, Send, Sparkles, Clock, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

const SLA_ESTIMATES = {
  Software: { Urgent: 4, High: 12, Medium: 24, Low: 48 },
  Hardware: { Urgent: 6, High: 24, Medium: 48, Low: 72 },
  Network: { Urgent: 4, High: 8, Medium: 16, Low: 24 },
  Billing: { Urgent: 8, High: 24, Medium: 48, Low: 72 }
};

export function NewTicketModal({ isOpen, onClose, onTicketCreated, addToast }) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Software');
  const [priority, setPriority] = useState('Medium');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const estimatedHours = SLA_ESTIMATES[category]?.[priority] || 24;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      addToast('error', 'Validation Error', 'Please provide both title and description.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.tickets.create({
        title,
        category,
        priority,
        description
      });
      addToast('success', 'Ticket Submitted', `Ticket #${response.data._id.slice(-6)} created with ${estimatedHours}h SLA target.`);
      if (onTicketCreated) onTicketCreated(response.data);
      onClose();
      // Reset form
      setTitle('');
      setDescription('');
    } catch (err) {
      addToast('error', 'Submission Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--border-glass)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.2)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#fff' }}>Create Support Ticket</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Submit an issue for automated routing & SLA assignment</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-subtle)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          <div className="form-group">
            <label className="form-label">Ticket Title *</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Production ERP checkout returning 500 database error"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Category *</label>
              <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="Software">Software</option>
                <option value="Hardware">Hardware</option>
                <option value="Network">Network</option>
                <option value="Billing">Billing</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Priority Level *</label>
              <select className="form-select" value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* SLA Calculation Preview Pill */}
          <div style={{ background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.3)', borderRadius: '10px', padding: '10px 14px', margin: '4px 0 18px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
            <span style={{ color: 'var(--cyan)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}>
              <Clock size={14} /> Calculated SLA Resolution Target:
            </span>
            <span style={{ fontWeight: '800', color: '#fff', background: 'rgba(6, 182, 212, 0.25)', padding: '2px 8px', borderRadius: '6px' }}>
              {estimatedHours} Hours
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">Detailed Description *</label>
            <textarea
              className="form-textarea"
              rows={4}
              placeholder="Provide exact symptoms, stack traces, steps to reproduce, or affected user accounts..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              <Send size={15} /> {loading ? 'Submitting...' : 'Submit Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
