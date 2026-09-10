import React, { useState, useEffect, useCallback } from 'react';
import { Navbar, DEMO_USERS } from './components/Navbar';
import { CustomerDashboard } from './components/CustomerDashboard';
import { AgentDashboard } from './components/AgentDashboard';
import { ManagerDashboard } from './components/ManagerDashboard';
import { TicketDetailModal } from './components/TicketDetailModal';
import { NewTicketModal } from './components/NewTicketModal';
import { AuthModal } from './components/AuthModal';
import { ToastContainer } from './components/ToastContainer';
import { api } from './services/api';
import { initSocketClient, getSocket } from './services/socket';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [managerTab, setManagerTab] = useState('tickets');
  const [allAgents, setAllAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add Toast helper
  const addToast = useCallback((type, title, message) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Fetch Tickets based on active user role
  const fetchTickets = useCallback(async () => {
    try {
      const res = await api.tickets.list();
      setTickets(res.data || []);
    } catch (err) {
      console.warn('Could not fetch tickets:', err.message);
    }
  }, []);

  // Fetch all agents (for manager assignment dropdowns)
  const fetchAgents = useCallback(async () => {
    try {
      const res = await api.reports.getAgentWorkload();
      if (res.data) {
        setAllAgents(res.data.map(a => ({ _id: a.agentId, name: a.agentName, email: a.agentEmail })));
      }
    } catch {
      // ignore
    }
  }, []);

  // Quick Demo User Login
  const handleQuickLogin = async (demoUser) => {
    try {
      const res = await api.auth.login({ email: demoUser.email, password: demoUser.password });
      if (res.data?.token) {
        localStorage.setItem('helpdesk_token', res.data.token);
        setCurrentUser(res.data);
        addToast('success', 'Switched Role', `Now logged in as ${res.data.name} (${res.data.role.toUpperCase()})`);
      }
    } catch (err) {
      addToast('error', 'Login Failed', `Could not switch to ${demoUser.name}: ${err.message}`);
    }
  };

  // Standard Logout
  const handleLogout = () => {
    localStorage.removeItem('helpdesk_token');
    setCurrentUser(null);
    setTickets([]);
    addToast('info', 'Logged Out', 'Signed out of Helpdesk.');
  };

  // Initial Boot: Check Token or Auto-Login as Customer Demo
  useEffect(() => {
    const bootApp = async () => {
      setLoading(true);
      const token = localStorage.getItem('helpdesk_token');
      if (token) {
        try {
          const profile = await api.auth.getMe();
          setCurrentUser({ ...profile.data, token });
        } catch {
          // Token expired, log in as default customer demo
          await handleQuickLogin(DEMO_USERS[0]);
        }
      } else {
        // Auto sign-in with default demo user for instant live preview
        await handleQuickLogin(DEMO_USERS[0]);
      }
      setLoading(false);
    };

    bootApp();
  }, []);

  // When Current User changes, initialize Socket.io & load tickets
  useEffect(() => {
    if (!currentUser?.token) return;

    fetchTickets();
    if (currentUser.role === 'manager' || currentUser.role === 'admin') {
      fetchAgents();
    }

    // Initialize Socket
    const socket = initSocketClient(currentUser.token, setIsSocketConnected);

    if (socket) {
      const handleTicketCreated = (newTicket) => {
        addToast('info', 'New Ticket Ingested', `#${newTicket._id?.slice(-6)}: ${newTicket.title}`);
        fetchTickets();
      };

      const handleTicketUpdated = (updatedTicket) => {
        setTickets((prev) => prev.map((t) => (t._id === updatedTicket._id ? updatedTicket : t)));
        if (selectedTicket?._id === updatedTicket._id) {
          setSelectedTicket(updatedTicket);
        }
      };

      const handleStatusChanged = (updatedTicket) => {
        addToast('alert', 'Status Updated', `Ticket #${updatedTicket._id?.slice(-6)} changed to ${updatedTicket.status}`);
        handleTicketUpdated(updatedTicket);
      };

      const handleEscalated = (escalatedTicket) => {
        addToast('alert', 'Ticket Escalated', `Ticket #${escalatedTicket._id?.slice(-6)} escalated to Management`);
        handleTicketUpdated(escalatedTicket);
      };

      const handleBreachAlert = (breachedTicket) => {
        addToast('error', 'SLA Breached', `Ticket #${breachedTicket._id?.slice(-6)} missed resolution deadline!`);
        fetchTickets();
      };

      socket.on('ticket:created', handleTicketCreated);
      socket.on('ticket:updated', handleTicketUpdated);
      socket.on('ticket:status_changed', handleStatusChanged);
      socket.on('ticket:escalated', handleEscalated);
      socket.on('sla:breach_alert', handleBreachAlert);

      return () => {
        socket.off('ticket:created', handleTicketCreated);
        socket.off('ticket:updated', handleTicketUpdated);
        socket.off('ticket:status_changed', handleStatusChanged);
        socket.off('ticket:escalated', handleEscalated);
        socket.off('sla:breach_alert', handleBreachAlert);
      };
    }
  }, [currentUser, fetchTickets, fetchAgents, selectedTicket, addToast]);

  return (
    <div className="app-container">
      {/* Navbar Header */}
      <Navbar
        currentUser={currentUser}
        isSocketConnected={isSocketConnected}
        onQuickLogin={handleQuickLogin}
        onLogout={handleLogout}
        onOpenAuth={() => setIsAuthOpen(true)}
        activeTab={managerTab}
        setActiveTab={setManagerTab}
      />

      {/* Main Role-Tailored Dashboard View */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-subtle)' }}>
          <div style={{ fontSize: '16px', fontWeight: '600' }}>Initializing Helpdesk Intelligence Environment...</div>
        </div>
      ) : !currentUser ? (
        <div className="glass-panel" style={{ padding: '60px 24px', textAlign: 'center', maxWidth: '540px', margin: '40px auto' }}>
          <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#fff', marginBottom: '8px' }}>Sign In to Helpdesk</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '20px' }}>
            Choose a persona from the top bar or sign in with your credentials to access your ticket queue.
          </p>
          <button onClick={() => setIsAuthOpen(true)} className="btn btn-primary">
            Sign In / Register
          </button>
        </div>
      ) : currentUser.role === 'customer' ? (
        <CustomerDashboard
          tickets={tickets}
          onSelectTicket={setSelectedTicket}
          onOpenNewTicket={() => setIsNewTicketOpen(true)}
          currentUserId={currentUser.id || currentUser._id}
        />
      ) : currentUser.role === 'agent' ? (
        <AgentDashboard
          tickets={tickets}
          currentUserId={currentUser.id || currentUser._id}
          onSelectTicket={setSelectedTicket}
          onRefresh={fetchTickets}
          addToast={addToast}
        />
      ) : (
        <ManagerDashboard
          tickets={tickets}
          onSelectTicket={setSelectedTicket}
          allAgents={allAgents}
          addToast={addToast}
          activeTab={managerTab}
          onRefresh={fetchTickets}
        />
      )}

      {/* Ticket Details & Discussion Modal */}
      {selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          currentUser={currentUser}
          onClose={() => setSelectedTicket(null)}
          onTicketUpdated={(updated) => {
            setTickets((prev) => prev.map((t) => (t._id === updated._id ? updated : t)));
            setSelectedTicket(updated);
          }}
          addToast={addToast}
          allAgents={allAgents}
        />
      )}

      {/* New Ticket Modal */}
      <NewTicketModal
        isOpen={isNewTicketOpen}
        onClose={() => setIsNewTicketOpen(false)}
        onTicketCreated={(newT) => {
          setTickets((prev) => [newT, ...prev]);
        }}
        addToast={addToast}
      />

      {/* Custom Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={(user) => {
          setCurrentUser(user);
        }}
        addToast={addToast}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
