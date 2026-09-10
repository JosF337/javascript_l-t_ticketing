import React, { useState } from 'react';
import { X, Lock, Mail, User, Shield } from 'lucide-react';
import { api } from '../services/api';

export function AuthModal({ isOpen, onClose, onAuthSuccess, addToast }) {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('customer');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let res;
      if (isRegister) {
        res = await api.auth.register({ name, email, password, role });
        addToast('success', 'Account Registered', `Welcome, ${name}!`);
      } else {
        res = await api.auth.login({ email, password });
        addToast('success', 'Logged In', `Welcome back, ${res.data.name}!`);
      }

      if (res.data.token) {
        localStorage.setItem('helpdesk_token', res.data.token);
      }

      onAuthSuccess(res.data);
      onClose();
    } catch (err) {
      addToast('error', 'Authentication Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#fff' }}>
              {isRegister ? 'Create Helpdesk Account' : 'Sign In to Helpdesk'}
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {isRegister ? 'Register your role credentials' : 'Access your role-based ticketing workspace'}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-subtle)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Alex Johnson"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input"
              placeholder="e.g. user@helpdesk.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="Password@123"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {isRegister && (
            <div className="form-group">
              <label className="form-label">Select System Role</label>
              <select className="form-select" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="customer">Customer (Raise tickets & rate)</option>
                <option value="agent">Support Agent (Troubleshoot & resolve)</option>
                <option value="manager">Manager / Admin (Dispatch & SLA reports)</option>
              </select>
            </div>
          )}

          <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>
            {loading ? 'Processing...' : isRegister ? 'Register Account' : 'Sign In'}
          </button>

          <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>
            {isRegister ? 'Already have an account? ' : "Don't have an account? "}
            <button
              type="button"
              onClick={() => setIsRegister(!isRegister)}
              style={{ background: 'transparent', border: 'none', color: 'var(--cyan)', fontWeight: '700', cursor: 'pointer' }}
            >
              {isRegister ? 'Sign In' : 'Register Now'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
