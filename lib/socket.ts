/**
 * Socket.io client utility for WebRTC signaling
 * Production-ready with centralized configuration
 */

import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from './config';

let socket: Socket | null = null;

export function connectSocket(sessionToken: string): Socket {
  // Reuse existing socket if it's connected OR connecting
  if (socket) {
    if (socket.connected) {
      console.log('[Socket] Reusing connected socket:', socket.id);
      return socket;
    }
    
    // Check if it's in the process of connecting
    const isConnecting = !socket.connected && !socket.disconnected;
    if (isConnecting) {
      console.log('[Socket] Reusing socket that is connecting...');
      return socket;
    }
    
    // Socket exists but is disconnected - clean it up first
    console.log('[Socket] Cleaning up disconnected socket');
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  console.log('[Socket] Creating new socket connection to:', SOCKET_URL);
  
  socket = io(SOCKET_URL, {
    autoConnect: true,
    auth: {
      token: sessionToken, // Send token in handshake for middleware authentication
    },
    transports: ['websocket', 'polling'], // WebSocket preferred, polling fallback
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 20000,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket?.id);
    // Still emit auth for backward compatibility with event handlers
    socket?.emit('auth', { sessionToken });
  });

  socket.on('auth:success', () => {
    console.log('[Socket] ✅ Authenticated successfully');
  });

  socket.on('auth:failed', () => {
    console.error('[Socket] ❌ Authentication failed - check session token validity');
    console.error('[Socket] Session token:', sessionToken?.substring(0, 8) + '...');
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('[Socket] Connection error:', error.message);
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket(): Socket | null {
  return socket;
}

