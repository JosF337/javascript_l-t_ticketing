import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket = null;

export const initSocketClient = (token, onConnectChange) => {
  if (socket) {
    socket.disconnect();
  }

  if (!token) return null;

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling']
  });

  socket.on('connect', () => {
    if (onConnectChange) onConnectChange(true);
  });

  socket.on('disconnect', () => {
    if (onConnectChange) onConnectChange(false);
  });

  socket.on('connect_error', (err) => {
    console.warn('Socket connection error:', err.message);
    if (onConnectChange) onConnectChange(false);
  });

  return socket;
};

export const getSocket = () => socket;

export const joinTicketRoom = (ticketId) => {
  if (socket && socket.connected && ticketId) {
    socket.emit('join_ticket', ticketId);
  }
};

export const leaveTicketRoom = (ticketId) => {
  if (socket && socket.connected && ticketId) {
    socket.emit('leave_ticket', ticketId);
  }
};
