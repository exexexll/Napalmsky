'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { connectSocket, getSocket } from '@/lib/socket';
import { getSession } from '@/lib/session';
import { backgroundQueue } from '@/lib/backgroundQueue';
import { CalleeNotification } from '@/components/matchmake/CalleeNotification';

/**
 * GlobalCallHandler - Handles incoming call notifications across ALL pages
 * Must be mounted in root layout to persist across navigation
 */
export function GlobalCallHandler() {
  const router = useRouter();
  const [incomingInvite, setIncomingInvite] = useState<any>(null);
  const socketRef = useRef<any>(null);
  const listenersSetupRef = useRef(false);

  // Setup listeners on a socket - reusable for initial setup and reconnection
  const setupListeners = useCallback((socket: any) => {
    if (!socket) return;
    
    console.log('[GlobalCallHandler] Setting up listeners on socket:', socket.id);
    
    // Listener 1: Incoming call notification
    const handleCallNotify = (data: any) => {
      console.log('[GlobalCallHandler] ✅ INCOMING CALL:', data);
      console.log('[GlobalCallHandler] From:', data.fromUser?.name);
      console.log('[GlobalCallHandler] Current page:', window.location.pathname);
      setIncomingInvite(data);
    };

    // Listener 2: Call starting (both users accepted)
    const handleCallStart = ({ roomId, agreedSeconds, isInitiator, chatMode, peerUser }: any) => {
      console.log('[GlobalCallHandler] ✅ CALL STARTING:', { roomId, agreedSeconds, chatMode });
      console.log('[GlobalCallHandler] Navigating to room from:', window.location.pathname);

      const mode = chatMode || 'video';

      // Navigate to appropriate room
      if (mode === 'text') {
        router.push(
          `/text-room/${roomId}?duration=${agreedSeconds}&peerId=${peerUser.userId}&peerName=${encodeURIComponent(peerUser.name)}&peerSelfie=${encodeURIComponent(peerUser.selfieUrl || '')}`
        );
      } else {
        router.push(
          `/room/${roomId}?duration=${agreedSeconds}&peerId=${peerUser.userId}&peerName=${encodeURIComponent(peerUser.name)}&initiator=${isInitiator}`
        );
      }
    };

    // Remove existing listeners to prevent duplicates
    socket.off('call:notify'); 
    socket.off('call:start'); 
    
    // Add fresh listeners
    socket.on('call:notify', handleCallNotify);
    socket.on('call:start', handleCallStart);
    
    console.log('[GlobalCallHandler] ✅ Listeners attached to socket:', socket.id);
  }, [router]);

  // CRITICAL: Setup global socket listeners that persist across all pages
  useEffect(() => {
    // CRITICAL: Connect socket if not already connected
    const session = getSession();
    if (!session) {
      console.log('[GlobalCallHandler] No session, skipping socket setup');
      return;
    }

    console.log('[GlobalCallHandler] Initializing socket connection...');

    // Get or create socket connection
    let socket = getSocket();
    if (!socket) {
      console.log('[GlobalCallHandler] No socket exists, creating new connection...');
      socket = connectSocket(session.sessionToken);
    } else if (!socket.connected) {
      console.log('[GlobalCallHandler] Socket exists but not connected, reconnecting...');
      socket = connectSocket(session.sessionToken);
    } else {
      console.log('[GlobalCallHandler] Reusing existing connected socket:', socket.id);
    }

    if (!socket) {
      console.error('[GlobalCallHandler] ❌ Failed to get/create socket - aborting setup');
      return;
    }

    socketRef.current = socket;
    console.log('[GlobalCallHandler] Socket obtained:', socket.id);

    // Setup listeners immediately
    setupListeners(socket);
    listenersSetupRef.current = true;
    
    // Listen for connect event (fires on initial connect AND reconnects)
    socket.on('connect', () => {
      console.log('[GlobalCallHandler] Socket connected/reconnected:', socket?.id);
      // Re-setup listeners in case socket was recreated
      if (listenersSetupRef.current) {
        const currentSocket = getSocket();
        if (currentSocket && currentSocket !== socketRef.current) {
          console.log('[GlobalCallHandler] Socket changed, re-attaching listeners...');
          socketRef.current = currentSocket;
          setupListeners(currentSocket);
          backgroundQueue.init(currentSocket);
        }
      }
    });
    
    // CRITICAL: ALWAYS initialize background queue with socket
    backgroundQueue.init(socket);
    console.log('[GlobalCallHandler] Background queue initialized with socket:', socket.id);

    return () => {
      // CRITICAL: Don't remove listeners on unmount!
      // GlobalCallHandler should never unmount, but if it does,
      // keep listeners active for background queue to work
      console.log('[GlobalCallHandler] Cleanup called but keeping listeners active');
    };
  }, [setupListeners]); // setupListeners is stable due to useCallback

  return (
    <>
      {/* Global Incoming Call Notification - Shows on ALL pages */}
      {incomingInvite && (
        <CalleeNotification
          invite={incomingInvite}
          onAccept={(inviteId, requestedSeconds) => {
            console.log('[GlobalCallHandler] ✅ Call ACCEPTED');

            // Emit accept immediately
            const socket = getSocket();
            if (socket && socket.connected) {
              console.log('[GlobalCallHandler] Emitting call:accept to server');
              socket.emit('call:accept', {
                inviteId,
                requestedSeconds,
              });
            } else {
              console.error('[GlobalCallHandler] ❌ Socket not connected, cannot accept call');
              // Don't clear notification - let user try again when connection restored
              return;
            }

            // Clear notification
            setIncomingInvite(null);

            // Server will emit call:start to navigate
            console.log('[GlobalCallHandler] Waiting for call:start...');
          }}
          onDecline={(inviteId) => {
            console.log('[GlobalCallHandler] ❌ Call DECLINED');

            // Emit decline
            const socket = getSocket();
            if (socket && socket.connected) {
              console.log('[GlobalCallHandler] Emitting call:decline to server');
              socket.emit('call:decline', { inviteId });
            } else {
              console.error('[GlobalCallHandler] ❌ Socket not connected, cannot decline call');
            }

            // Clear notification regardless (user wants to dismiss)
            setIncomingInvite(null);
          }}
        />
      )}
    </>
  );
}

