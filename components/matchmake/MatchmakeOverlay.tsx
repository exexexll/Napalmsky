'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { getSession } from '@/lib/session';
import { getReel, getQueue, ReelUser } from '@/lib/matchmaking';
import { connectSocket, getSocket } from '@/lib/socket';
import { UserCard } from './UserCard';
import { CalleeNotification } from './CalleeNotification';

interface MatchmakeOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  directMatchTarget?: string | null;
}

export function MatchmakeOverlay({ isOpen, onClose, directMatchTarget }: MatchmakeOverlayProps) {
  const router = useRouter();
  const [users, setUsers] = useState<ReelUser[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [inviteStatuses, setInviteStatuses] = useState<Record<string, 'idle' | 'waiting' | 'declined' | 'timeout' | 'cooldown'>>({});
  const [incomingInvite, setIncomingInvite] = useState<any>(null);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'info' } | null>(null);
  const [totalAvailable, setTotalAvailable] = useState(0); // Total available count (before reported user filter)
  const [autoInviteSent, setAutoInviteSent] = useState(false);
  
  const socketRef = useRef<any>(null);

  // Load initial queue (no shuffling, consistent order)
  const loadInitialQueue = useCallback(async () => {
    const session = getSession();
    if (!session || loading) return;

    setLoading(true);
    try {
      console.log('[Matchmake] Fetching initial queue');
      const queueData = await getQueue(session.sessionToken);
      console.log('[Matchmake] ✅ Received from API:', queueData.users.length, 'users shown,', queueData.totalAvailable, 'total available');
      
      // Extra safety: Filter out current user from client side too
      let filteredUsers = queueData.users.filter(u => u.userId !== session.userId);
      if (filteredUsers.length < queueData.users.length) {
        console.warn('[Matchmake] ⚠️ Filtered out self from queue (server should have done this)');
      }
      
      // Deduplicate users (safety check to prevent React key warnings)
      const uniqueUserIds = new Set<string>();
      filteredUsers = filteredUsers.filter(user => {
        if (uniqueUserIds.has(user.userId)) {
          console.warn('[Matchmake] ⚠️ Duplicate user in initial queue, removing:', user.name);
          return false;
        }
        uniqueUserIds.add(user.userId);
        return true;
      });
      
      console.log('[Matchmake] User names:', filteredUsers.map(u => `${u.name}${u.hasCooldown ? ' [COOLDOWN]' : ''}${u.wasIntroducedToMe ? ' [INTRO]' : ''}`).join(', '));
      console.log('[Matchmake] Setting users state with', filteredUsers.length, 'users');
      
      // Prioritize users: 1) Direct match target, 2) Introductions, 3) Others
      const sortedUsers = [...filteredUsers];
      
      // First, prioritize direct match target if specified
      if (directMatchTarget) {
        const targetIndex = sortedUsers.findIndex(u => u.userId === directMatchTarget);
        if (targetIndex > 0) {
          const target = sortedUsers[targetIndex];
          sortedUsers.splice(targetIndex, 1);
          sortedUsers.unshift(target);
          console.log('[Matchmake] ⭐ Prioritized direct match target:', target.name);
        }
      } else {
        // If no direct target, prioritize all introductions
        const introductions = sortedUsers.filter(u => u.wasIntroducedToMe);
        const others = sortedUsers.filter(u => !u.wasIntroducedToMe);
        
        if (introductions.length > 0) {
          sortedUsers.splice(0, sortedUsers.length, ...introductions, ...others);
          console.log('[Matchmake] ⭐ Prioritized', introductions.length, 'introductions at top');
        }
      }
      
      setUsers(sortedUsers);
      setTotalAvailable(queueData.totalAvailable); // Store total available count
      setCurrentIndex(0);
      console.log('[Matchmake] State updated - should now show', filteredUsers.length, 'users');
    } catch (err: any) {
      console.error('[Matchmake] Failed to load initial queue:', err);
      showToast('Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  }, [loading]);

  // Show toast
  const showToast = (message: string, type: 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Fetch debug info
  const fetchDebugInfo = async () => {
    const session = getSession();
    if (!session) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001'}/room/debug/presence`, {
        headers: { 'Authorization': `Bearer ${session.sessionToken}` },
      });
      const data = await res.json();
      setDebugInfo(data);
      setShowDebug(true);
      console.log('[Debug] Server presence state:', data);
    } catch (err) {
      console.error('[Debug] Failed to fetch:', err);
    }
  };

  // Check for new users and update existing user data (cooldown, intro status)
  const checkForNewUsers = useCallback(async () => {
    const session = getSession();
    if (!session) return;

    try {
      const currentTestMode = testModeRef.current;
      const queueData = await getQueue(session.sessionToken, currentTestMode);
      
      // Filter out self (extra safety)
      const filteredQueue = queueData.users.filter(u => u.userId !== session.userId);
      
      console.log('[Matchmake] Queue check - Total in queue:', filteredQueue.length, 'users shown,', queueData.totalAvailable, 'total available', currentTestMode ? '(TEST MODE)' : '');
      console.log('[Matchmake] Users in queue:', filteredQueue.map(u => `${u.name} (${u.userId.substring(0, 8)})`));
      
      // Update total available count
      setTotalAvailable(queueData.totalAvailable);
      
      setUsers(prevUsers => {
        console.log('[Matchmake] Current reel has:', prevUsers.length, 'users');
        
        // Create a map of current user IDs to preserve order
        const prevUserIds = new Set(prevUsers.map(u => u.userId));
        const queueUserIds = new Set(filteredQueue.map(u => u.userId));
        
        // Keep existing users that are still in queue (update their data)
        const updatedExisting = prevUsers
          .filter(u => queueUserIds.has(u.userId))
          .map(prevUser => {
            // Find updated data from queue
            const queueUser = filteredQueue.find(u => u.userId === prevUser.userId);
            return queueUser || prevUser; // Use new data if available
          });
        
        // Find genuinely new users not in current reel
        const newUsers = filteredQueue.filter(u => !prevUserIds.has(u.userId));
        
        if (newUsers.length > 0) {
          console.log('[Matchmake] ✅ Adding', newUsers.length, 'new users at bottom:', newUsers.map(u => u.name));
        }
        
        // Check if any users were removed
        const removedUsers = prevUsers.filter(u => !queueUserIds.has(u.userId));
        if (removedUsers.length > 0) {
          console.log('[Matchmake] 🗑️ Removing', removedUsers.length, 'users who left queue:', removedUsers.map(u => u.name));
        }
        
        // Combine: updated existing + new users
        let combinedUsers = [...updatedExisting, ...newUsers];
        
        // Deduplicate by userId (safety check to prevent React key warnings)
        const uniqueUserIds = new Set<string>();
        combinedUsers = combinedUsers.filter(user => {
          if (uniqueUserIds.has(user.userId)) {
            console.warn('[Matchmake] ⚠️ Duplicate user detected, removing:', user.name);
            return false;
          }
          uniqueUserIds.add(user.userId);
          return true;
        });
        
        // Re-apply prioritization: Direct match > Introductions > Others
        if (directMatchTarget) {
          const targetIndex = combinedUsers.findIndex(u => u.userId === directMatchTarget);
          if (targetIndex > 0) {
            const target = combinedUsers[targetIndex];
            combinedUsers.splice(targetIndex, 1);
            combinedUsers.unshift(target);
            console.log('[Matchmake] ⭐ Re-prioritized direct match target:', target.name);
          }
        } else {
          // Prioritize introductions
          const introductions = combinedUsers.filter(u => u.wasIntroducedToMe);
          const others = combinedUsers.filter(u => !u.wasIntroducedToMe);
          
          if (introductions.length > 0 && others.length > 0) {
            combinedUsers = [...introductions, ...others];
            console.log('[Matchmake] ⭐ Re-prioritized', introductions.length, 'introductions');
          }
        }
        
        console.log('[Matchmake] Updated reel:', combinedUsers.length, 'total users');
        return combinedUsers;
      });
    } catch (err: any) {
      console.error('[Matchmake] ❌ Failed to check for new users:', err);
    }
  }, [directMatchTarget]);

  // Initialize socket and presence
  useEffect(() => {
    if (!isOpen) {
      // Remove data attribute when closed
      if (typeof window !== 'undefined') {
        document.body.dataset.matchmakingOpen = 'false';
      }
      return;
    }

    // Set data attribute to hide header
    if (typeof window !== 'undefined') {
      document.body.dataset.matchmakingOpen = 'true';
    }

    const session = getSession();
    if (!session) {
      console.error('[Matchmake] No session found');
      router.push('/onboarding');
      return;
    }

    console.log('[Matchmake] Session found:', { userId: session.userId, accountType: session.accountType });

    // Connect socket
    const socket = connectSocket(session.sessionToken);
    socketRef.current = socket;

    // WAIT for authentication before joining queue!
    const handleAuth = () => {
      console.log('[Matchmake] Socket authenticated, now joining presence and queue');
      
      // Mark as online (presence:join)
      socket.emit('presence:join');

      // Join queue (available for matching)
      socket.emit('queue:join');

      // Load initial queue
      console.log('[Matchmake] Loading initial queue...');
      loadInitialQueue();
    };

    // Listen for auth success
    socket.on('auth:success', handleAuth);
    
    // If already authenticated (reconnection), join immediately
    if (socket.connected) {
      socket.emit('auth', { sessionToken: session.sessionToken });
    }

    // Auto-check for new users every 15 seconds (reduced from 5s for better scalability)
    // Real-time updates still happen via socket events (presence:update, queue:update)
    const refreshInterval = setInterval(() => {
      console.log('[Matchmake] Checking for new users...');
      checkForNewUsers();
    }, 15000); // 15 seconds instead of 5

    // Listen for presence updates
    socket.on('presence:update', ({ userId, online, available }: any) => {
      if (!online || !available) {
        // Remove user from reel if they go offline/unavailable
        setUsers(prev => prev.filter(u => u.userId !== userId));
      }
    });

    // Listen for queue updates
    socket.on('queue:update', ({ userId, available }: any) => {
      if (!available) {
        // Remove user from reel if they become unavailable
        console.log('[Matchmake] User became unavailable, removing:', userId);
        setUsers(prev => prev.filter(u => u.userId !== userId));
      } else {
        // User became available - check for new users (don't reorder)
        console.log('[Matchmake] User became available, checking for additions:', userId);
        setTimeout(() => checkForNewUsers(), 500); // Small delay to ensure server state is updated
      }
    });

    // Listen for incoming invites
    socket.on('call:notify', (invite: any) => {
      console.log('[Matchmake] Incoming invite:', invite);
      setIncomingInvite(invite);
    });

    // Listen for rescinded invites (someone cancelled their invite to you)
    socket.on('call:rescinded', ({ inviteId }: any) => {
      console.log('[Matchmake] 🚫 Incoming invite was rescinded:', inviteId);
      // Close the incoming invite notification if it's currently showing
      if (incomingInvite && incomingInvite.inviteId === inviteId) {
        setIncomingInvite(null);
        showToast('Invite was cancelled', 'info');
      }
    });

    // Listen for declined invites
    socket.on('call:declined', ({ inviteId, reason }: any) => {
      console.log('[Matchmake] 📞 Invite declined - Reason:', reason, 'InviteId:', inviteId);
      
      // Find which user this was for
      const targetUserId = Object.entries(inviteStatuses).find(
        ([_, status]) => status === 'waiting'
      )?.[0];

      console.log('[Matchmake] Target user for this decline:', targetUserId?.substring(0, 8) || 'NOT FOUND');

      if (targetUserId) {
        if (reason === 'cooldown') {
          setInviteStatuses(prev => ({ ...prev, [targetUserId]: 'cooldown' }));
          showToast('You chatted recently — try again later (24h cooldown)', 'info');
        } else if (reason === 'user_declined') {
          // Decline triggers 24h cooldown on server, so show cooldown status
          setInviteStatuses(prev => ({ ...prev, [targetUserId]: 'cooldown' }));
          showToast('Declined — 24h cooldown activated', 'info');
        } else {
          // Other errors (offline, invalid, etc.) - just show declined
          setInviteStatuses(prev => ({ ...prev, [targetUserId]: 'declined' }));
        }
      }
    });

    // Listen for call start (matched!)
    socket.on('call:start', ({ roomId, agreedSeconds, isInitiator, peerUser }: any) => {
      console.log('[Matchmake] Call starting:', { roomId, agreedSeconds, isInitiator, peerUser });
      
      // Navigate to room
      router.push(
        `/room/${roomId}?duration=${agreedSeconds}&peerId=${peerUser.userId}&peerName=${encodeURIComponent(peerUser.name)}&initiator=${isInitiator}`
      );
    });

    // Cleanup
    return () => {
      clearInterval(refreshInterval);
      socket.emit('queue:leave');
      socket.off('auth:success');
      socket.off('presence:update');
      socket.off('queue:update');
      socket.off('call:notify');
      socket.off('call:rescinded');
      socket.off('call:declined');
      socket.off('call:start');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, router]);

  // Update testModeRef when testMode changes
  useEffect(() => {
    testModeRef.current = testMode;
  }, [testMode]);

  // Debug: Log users array whenever it changes and adjust index if needed
  useEffect(() => {
    console.log('[Matchmake] 🔍 Users array changed - now has:', users.length, 'users');
    console.log('[Matchmake] 🔍 User list:', users.map(u => u.name).join(', '));
    
    // Adjust currentIndex if it's out of bounds
    if (users.length > 0 && currentIndex >= users.length) {
      const newIndex = users.length - 1;
      console.log('[Matchmake] ⚠️ Index out of bounds, adjusting from', currentIndex, 'to', newIndex);
      setCurrentIndex(newIndex);
    } else if (users.length === 0) {
      setCurrentIndex(0);
    }
  }, [users, currentIndex]);

  // Reload when test mode changes
  useEffect(() => {
    if (isOpen && testMode) { // Only when turning ON
      console.log('[Matchmake] Test mode turned ON - reloading queue to bypass cooldowns...');
      const session = getSession();
      if (session) {
        getQueue(session.sessionToken, true)
          .then(queueData => {
            const filteredUsers = queueData.users.filter(u => u.userId !== session.userId);
            console.log('[Matchmake] Test mode queue loaded:', filteredUsers.length, 'users');
            setUsers(filteredUsers);
            setTotalAvailable(queueData.totalAvailable);
            setCurrentIndex(0);
          })
          .catch(err => console.error('[Matchmake] Test mode load failed:', err));
      }
    } else if (isOpen && !testMode && testModeRef.current) { // When turning OFF
      console.log('[Matchmake] Test mode turned OFF - reloading queue with cooldown filter...');
      const session = getSession();
      if (session) {
        getQueue(session.sessionToken, false)
          .then(queueData => {
            const filteredUsers = queueData.users.filter(u => u.userId !== session.userId);
            console.log('[Matchmake] Production queue loaded:', filteredUsers.length, 'users');
            setUsers(filteredUsers);
            setTotalAvailable(queueData.totalAvailable);
            setCurrentIndex(0);
          })
          .catch(err => console.error('[Matchmake] Production load failed:', err));
      }
    }
  }, [testMode, isOpen]);

  // Navigate cards (TikTok-style)
  const goToNext = () => {
    if (currentIndex < users.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen || incomingInvite) return;

    // Disable navigation if current user has waiting status
    const currentUserId = users[currentIndex]?.userId;
    const isWaiting = currentUserId && inviteStatuses[currentUserId] === 'waiting';
    if (isWaiting) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        goToPrevious();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        goToNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, currentIndex, users.length, hasMore, loading, incomingInvite, inviteStatuses]);

  // Auto-invite when direct match target is set
  useEffect(() => {
    const autoInvite = localStorage.getItem('napalmsky_auto_invite');
    
    if (autoInvite === 'true' && directMatchTarget && users.length > 0 && !autoInviteSent && socketRef.current) {
      // Find the target user in the list
      const targetUser = users.find(u => u.userId === directMatchTarget);
      
      if (targetUser && !targetUser.hasCooldown) {
        console.log('[Matchmake] 🎯 Auto-inviting direct match target:', targetUser.name, 'with 300 seconds');
        
        // Clear the flag
        localStorage.removeItem('napalmsky_auto_invite');
        setAutoInviteSent(true);
        
        // Send invite automatically with default 300 seconds
        setTimeout(() => {
          if (socketRef.current) {
            socketRef.current.emit('call:invite', {
              toUserId: directMatchTarget,
              requestedSeconds: 300,
            });
            
            setInviteStatuses(prev => ({ ...prev, [directMatchTarget]: 'waiting' }));
            console.log('[Matchmake] ✅ Auto-invite sent successfully');
          }
        }, 500); // Small delay to ensure socket is ready
      } else if (targetUser && targetUser.hasCooldown) {
        console.log('[Matchmake] ⚠️ Cannot auto-invite - target has cooldown');
        localStorage.removeItem('napalmsky_auto_invite');
      }
    }
  }, [directMatchTarget, users, autoInviteSent]);

  // Handle invite
  const handleInvite = (toUserId: string, requestedSeconds: number) => {
    if (!socketRef.current) {
      console.error('[Matchmake] ❌ Cannot send invite - socket not available');
      return;
    }

    // Check if already in a call
    const session = getSession();
    if (!session) {
      console.error('[Matchmake] ❌ Cannot send invite - no session');
      return;
    }

    console.log(`[Matchmake] 📞 Sending invite to user ${toUserId.substring(0, 8)} for ${requestedSeconds}s`);

    setInviteStatuses(prev => ({ ...prev, [toUserId]: 'waiting' }));
    
    socketRef.current.emit('call:invite', {
      toUserId,
      requestedSeconds,
    });

    console.log('[Matchmake] ✅ Invite event emitted to server');
  };

  // Handle rescind (cancel invite)
  const handleRescind = (toUserId: string) => {
    if (!socketRef.current) return;

    console.log('[Matchmake] 🚫 Rescinding invite to:', toUserId.substring(0, 8));

    // Emit rescind event to server (sets 1h cooldown)
    socketRef.current.emit('call:rescind', { toUserId });

    // Set cooldown status immediately (server will enforce)
    setInviteStatuses(prev => ({ ...prev, [toUserId]: 'cooldown' }));
    showToast('Invite cancelled — 1h cooldown', 'info');
    
    console.log('[Matchmake] ✅ Rescind sent, cooldown status set');
  };

  // Handle accept incoming
  const handleAccept = (inviteId: string, requestedSeconds: number) => {
    if (!socketRef.current) {
      console.error('[Matchmake] ❌ Cannot accept - socket not available');
      return;
    }

    console.log(`[Matchmake] 📞 Accepting invite ${inviteId} with ${requestedSeconds}s`);
    
    socketRef.current.emit('call:accept', {
      inviteId,
      requestedSeconds,
    });

    setIncomingInvite(null);
    console.log('[Matchmake] ✅ Accept event sent to server');
  };

  // Handle decline incoming
  const handleDecline = (inviteId: string) => {
    if (!socketRef.current) return;

    socketRef.current.emit('call:decline', { inviteId });
    setIncomingInvite(null);
    console.log('[Matchmake] Declined invite:', inviteId);
  };

  // Handle close overlay
  const handleClose = () => {
    if (incomingInvite) {
      // Cannot close while there's a pending invite
      return;
    }

    // Clean up
    if (socketRef.current) {
      socketRef.current.emit('queue:leave');
    }

    // Clear reel state for fresh load next time
    setUsers([]);
    setCursor(null);
    setHasMore(true);
    setInviteStatuses({});
    setAutoInviteSent(false);
    
    // Clear direct match flags
    localStorage.removeItem('napalmsky_direct_match_target');
    localStorage.removeItem('napalmsky_auto_invite');

    onClose();
  };

  if (!isOpen) return null;

  console.log('[Matchmake] 🎨 RENDERING with', users.length, 'users in state');

  return (
    <>
      {/* Transparent Overlay - Only Card Visible */}
      <div className="fixed inset-0 z-50 flex flex-col">
        {/* Compact Header - Top Right */}
        <div className="absolute top-6 right-6 flex items-center gap-4 z-20">
          <div className="text-right">
            <h2 className="font-playfair text-2xl font-bold text-white drop-shadow-lg">
              Matchmake
            </h2>
            <p className="text-xs text-white/90 drop-shadow">
              {totalAvailable} {totalAvailable === 1 ? 'person' : 'people'} online
            </p>
            <div className="flex flex-col gap-1">
              <button
                onClick={() => {
                  const newTestMode = !testMode;
                  setTestMode(newTestMode);
                  testModeRef.current = newTestMode;
                  showToast(newTestMode ? 'Test mode ON (cooldown bypass) - Reloading...' : 'Test mode OFF (24h cooldown active) - Reloading...', 'info');
                }}
                className="text-xs text-blue-300 hover:text-blue-200 underline"
              >
                {testMode ? '🧪 Test Mode: ON' : '🔒 Test Mode: OFF'}
              </button>
              <button
                onClick={fetchDebugInfo}
                className="text-xs text-green-300 hover:text-green-200 underline"
              >
                🔍 Debug Queue
              </button>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={!!incomingInvite}
            className="focus-ring rounded-full bg-black/60 p-3 backdrop-blur-md transition-all hover:bg-black/80 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Close matchmaking"
          >
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* TikTok-Style Single Card View - Centered */}
        <div className="relative flex-1 flex items-center justify-center px-4" role="list" aria-label="Available users">
            {users.length === 0 && !loading && (
              <div className="rounded-2xl bg-black/70 p-12 backdrop-blur-md text-center border border-white/20">
                <p className="text-xl text-white drop-shadow">
                  No one else is online right now
                </p>
                <p className="mt-3 text-sm text-white/80">
                  Check back in a bit or invite a friend!
                </p>
              </div>
            )}

            {users.length > 0 && users[currentIndex] && (
              <>
                {/* Current Card - Larger, Centered */}
                <div className="relative w-full max-w-2xl h-[85vh]">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={users[currentIndex].userId}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="absolute inset-0"
                    >
                      <UserCard
                        user={users[currentIndex]}
                        onInvite={handleInvite}
                        onRescind={handleRescind}
                        inviteStatus={
                          // Priority: local socket state > server API data
                          inviteStatuses[users[currentIndex].userId] === 'cooldown' || users[currentIndex].hasCooldown
                            ? 'cooldown'
                            : inviteStatuses[users[currentIndex].userId] || 'idle'
                        }
                        cooldownExpiry={users[currentIndex].cooldownExpiry}
                        isActive={true}
                      />
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Navigation Arrows - Vertical (Hidden when waiting for response) */}
                {currentIndex > 0 && inviteStatuses[users[currentIndex]?.userId] !== 'waiting' && (
                  <button
                    onClick={goToPrevious}
                    className="focus-ring absolute left-1/2 top-48 -translate-x-1/2 z-20 rounded-full bg-black/70 p-4 backdrop-blur-md transition-all hover:bg-black/90 shadow-lg"
                    aria-label="Previous user"
                  >
                    <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                )}

                {(currentIndex < users.length - 1 || hasMore) && inviteStatuses[users[currentIndex]?.userId] !== 'waiting' && (
                  <button
                    onClick={goToNext}
                    className="focus-ring absolute left-1/2 bottom-56 -translate-x-1/2 z-20 rounded-full bg-black/70 p-4 backdrop-blur-md transition-all hover:bg-black/90 shadow-lg"
                    aria-label="Next user"
                  >
                    <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                )}

                {/* Progress Indicator - Right Side */}
                <div className="absolute right-8 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-2">
                  {users.slice(0, Math.min(10, users.length)).map((_, idx) => (
                    <div
                      key={idx}
                      className={`w-2 rounded-full transition-all ${
                        idx === currentIndex 
                          ? 'h-10 bg-[#ff9b6b] shadow-lg' 
                          : 'h-2 bg-white/40'
                      }`}
                    />
                  ))}
                  {users.length > 10 && (
                    <div className="text-xs text-white/70 mt-2 font-medium">
                      +{users.length - 10}
                    </div>
                  )}
                </div>
              </>
            )}

            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-[#ff9b6b] border-t-transparent" />
              </div>
            )}
          </div>
      </div>

      {/* Incoming Invite (Blocking) */}
      <AnimatePresence>
        {incomingInvite && (
          <CalleeNotification
            invite={incomingInvite}
            onAccept={handleAccept}
            onDecline={handleDecline}
          />
        )}
      </AnimatePresence>

      {/* Toast Notifications */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 z-[90] -translate-x-1/2"
          >
            <div className={`rounded-xl px-6 py-3 shadow-lg backdrop-blur-sm ${
              toast.type === 'error' 
                ? 'bg-red-500/90 text-white'
                : 'bg-[#eaeaf0]/90 text-[#0a0a0c]'
            }`}>
              <p className="font-medium">{toast.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Debug Panel */}
      <AnimatePresence>
        {showDebug && debugInfo && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4"
            onClick={() => setShowDebug(false)}
          >
            <div 
              className="max-w-2xl w-full max-h-[80vh] overflow-auto rounded-2xl bg-[#0a0a0c] p-6 border-2 border-green-500/30"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-playfair text-2xl font-bold text-green-300">
                  🔍 Server Queue Debug
                </h3>
                <button
                  onClick={() => setShowDebug(false)}
                  className="text-white/70 hover:text-white"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-4 gap-3 p-4 rounded-xl bg-white/5">
                  <div>
                    <div className="text-white/50 text-xs">Total</div>
                    <div className="text-2xl font-bold text-white">{debugInfo.totalUsers}</div>
                  </div>
                  <div>
                    <div className="text-white/50 text-xs">Online</div>
                    <div className="text-2xl font-bold text-green-400">{debugInfo.onlineUsers}</div>
                  </div>
                  <div>
                    <div className="text-white/50 text-xs">Available</div>
                    <div className="text-2xl font-bold text-blue-400">{debugInfo.availableUsers}</div>
                  </div>
                  <div>
                    <div className="text-white/50 text-xs">Can Match</div>
                    <div className="text-2xl font-bold text-yellow-400">{debugInfo.canActuallyMatch !== undefined ? debugInfo.canActuallyMatch : (debugInfo.availableOthers || debugInfo.availableUsers - 1)}</div>
                  </div>
                </div>
                
                <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
                  <p className="text-xs text-yellow-300">
                    <strong>Your reel should show: {debugInfo.canActuallyMatch !== undefined ? debugInfo.canActuallyMatch : 'calculating...'} users</strong>
                    <br/>
                    (Available users excluding yourself, cooldowns OK, reported users excluded)
                    <br/>
                    <br/>
                    <strong>Your reel actually shows: {users.length} users</strong>
                    {debugInfo.canActuallyMatch !== undefined && users.length !== debugInfo.canActuallyMatch && (
                      <span className="block mt-1 text-red-400">
                        ⚠️ MISMATCH! Expected {debugInfo.canActuallyMatch} but showing {users.length}
                      </span>
                    )}
                    {debugInfo.canActuallyMatch !== undefined && users.length === debugInfo.canActuallyMatch && (
                      <span className="block mt-1 text-green-400">
                        ✅ MATCH! Queue is synced correctly
                      </span>
                    )}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="font-bold text-white">User Details:</div>
                  {debugInfo.users.map((u: any) => (
                    <div
                      key={u.userId}
                      className={`p-3 rounded-lg ${
                        u.isSelf
                          ? 'bg-purple-500/20 border-2 border-purple-500/50'
                          : u.isReported
                          ? 'bg-red-500/20 border-2 border-red-500/50'
                          : u.hasCooldown
                          ? 'bg-orange-500/20 border border-orange-500/30'
                          : u.online && u.available 
                          ? 'bg-green-500/20 border border-green-500/30'
                          : u.online
                          ? 'bg-yellow-500/20 border border-yellow-500/30'
                          : 'bg-gray-500/20 border border-gray-500/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-white">{u.name}</span>
                          <span className="text-white/50 ml-2">({u.userId})</span>
                          {u.isSelf && <span className="ml-2 text-xs text-purple-300">← YOU</span>}
                          {u.isReported && <span className="ml-2 text-xs text-red-300">🚫 REPORTED</span>}
                          {u.hasCooldown && <span className="ml-2 text-xs text-orange-300">⏰ COOLDOWN</span>}
                        </div>
                        <div className="flex gap-2 text-xs">
                          <span className={u.online ? 'text-green-400' : 'text-red-400'}>
                            {u.online ? '🟢 Online' : '🔴 Offline'}
                          </span>
                          <span className={u.available ? 'text-blue-400' : 'text-gray-400'}>
                            {u.available ? '✅ Available' : '⏸️ Busy'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={fetchDebugInfo}
                  className="w-full mt-4 rounded-xl bg-green-500/20 px-4 py-2 text-sm text-green-300 hover:bg-green-500/30"
                >
                  🔄 Refresh Debug Info
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}


