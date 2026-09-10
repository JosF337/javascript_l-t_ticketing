import React from 'react';
import { 
  Headphones, 
  User, 
  Shield, 
  BarChart3, 
  LogOut, 
  Radio, 
  Sparkles,
  Layers,
  BookOpen
} from 'lucide-react';

export const DEMO_USERS = [
  { role: 'customer', name: 'Diana Prince (Customer)', email: 'customer2@helpdesk.com', password: 'Password@123', color: '#06b6d4' },
  { role: 'agent', name: 'Alice Cooper (Agent)', email: 'agent1@helpdesk.com', password: 'Password@123', color: '#6366f1' },
  { role: 'manager', name: 'Sarah Connor (Manager)', email: 'manager@helpdesk.com', password: 'Password@123', color: '#a855f7' }
];

export function Navbar({ 
  currentUser, 
  isSocketConnected, 
  onQuickLogin, 
  onLogout, 
  onOpenAuth,
  activeTab,
  setActiveTab
}) {
  return (
    <header className="glass-panel" style={{ margin: '20px 0 28px 0', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
      {/* Brand & Live Socket Indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'linear-gradient(135deg, #6366f1, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(99,102,241,0.4)' }}>
          <Headphones size={22} color="#fff" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px', fontWeight: '800', letterSpacing: '-0.02em', background: 'linear-gradient(to right, #ffffff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              HelpdeskPro
            </span>
            <span style={{ fontSize: '10px', background: 'rgba(99,102,241,0.2)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.4)', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
              v2.0 LIVE
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: isSocketConnected ? '#10b981' : '#ef4444', boxShadow: isSocketConnected ? '0 0 8px #10b981' : 'none' }}></span>
            <span style={{ fontSize: '11px', color: 'var(--text-subtle)', fontWeight: '500' }}>
              {isSocketConnected ? 'Real-Time WebSocket Connected' : 'Connecting WebSocket...'}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs (if Manager/Admin) */}
      {currentUser && (currentUser.role === 'manager' || currentUser.role === 'admin') && (
        <div style={{ display: 'flex', background: 'var(--bg-surface-elevated)', borderRadius: '10px', padding: '3px', border: '1px solid var(--border-glass)' }}>
          <button 
            onClick={() => setActiveTab('tickets')} 
            className="btn btn-sm"
            style={{ 
              background: activeTab === 'tickets' ? 'var(--primary)' : 'transparent', 
              color: activeTab === 'tickets' ? '#fff' : 'var(--text-muted)',
              borderRadius: '8px'
            }}
          >
            <Layers size={14} /> Ticket Dispatcher
          </button>
          <button 
            onClick={() => setActiveTab('analytics')} 
            className="btn btn-sm"
            style={{ 
              background: activeTab === 'analytics' ? 'var(--primary)' : 'transparent', 
              color: activeTab === 'analytics' ? '#fff' : 'var(--text-muted)',
              borderRadius: '8px'
            }}
          >
            <BarChart3 size={14} /> Executive Analytics
          </button>
          <button 
            onClick={() => setActiveTab('sla-matrix')} 
            className="btn btn-sm"
            style={{ 
              background: activeTab === 'sla-matrix' ? 'var(--primary)' : 'transparent', 
              color: activeTab === 'sla-matrix' ? '#fff' : 'var(--text-muted)',
              borderRadius: '8px'
            }}
          >
            <Shield size={14} /> SLA Matrix
          </button>
        </div>
      )}

      {/* Demo Persona Switcher & User Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        {/* Quick Persona Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0,0,0,0.3)', padding: '4px 8px', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-subtle)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Sparkles size={12} color="#f59e0b" /> Switch Role:
          </span>
          {DEMO_USERS.map((demo) => {
            const isActive = currentUser?.email === demo.email;
            return (
              <button
                key={demo.role}
                onClick={() => onQuickLogin(demo)}
                style={{
                  background: isActive ? demo.color : 'transparent',
                  color: isActive ? '#fff' : 'var(--text-muted)',
                  border: isActive ? `1px solid ${demo.color}` : '1px solid transparent',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                title={`Switch to ${demo.name}`}
              >
                {demo.role.toUpperCase()}
              </button>
            );
          })}
        </div>

        {/* User Pill / Login Button */}
        {currentUser ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: 'var(--bg-surface-elevated)', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>
                {currentUser.name ? currentUser.name.charAt(0) : 'U'}
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '700', lineHeight: 1.1 }}>{currentUser.name}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-subtle)', textTransform: 'capitalize' }}>
                  {currentUser.role} • {currentUser.email}
                </div>
              </div>
            </div>

            <button onClick={onLogout} className="btn btn-secondary btn-icon" title="Log Out">
              <LogOut size={16} color="var(--rose)" />
            </button>
          </div>
        ) : (
          <button onClick={onOpenAuth} className="btn btn-primary">
            <User size={16} /> Sign In / Register
          </button>
        )}

        {/* Swagger Docs Link */}
        <a 
          href="http://localhost:5000/api/docs" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="btn btn-secondary btn-sm"
          style={{ textDecoration: 'none' }}
        >
          <BookOpen size={14} color="var(--cyan)" /> API Docs
        </a>
      </div>
    </header>
  );
}
