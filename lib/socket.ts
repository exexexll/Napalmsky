/**
 * Socket.io client utility for WebRTC signaling
 * Production-ready with centralized configuration
 */

import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from './config';

let socket: Socket | null = null;

export function connectSocket(sessionToken: string): Socket {
  if (socket && socket.connected) {
    return socket;
  }

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
    console.log('[Socket] Authenticated');
  });

  socket.on('auth:failed', () => {
    console.error('[Socket] Authentication failed');
  });

  socket.on('disconnect', () => {
    console.log('[Socket] Disconnected');
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

