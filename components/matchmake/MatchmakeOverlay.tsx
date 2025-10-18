'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { getSession } from '@/lib/session';
import { getQueue, ReelUser } from '@/lib/matchmaking';
import { connectSocket } from '@/lib/socket';
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
  const [mouseY, setMouseY] = useState(0);
  const [mouseX, setMouseX] = useState(0);
  const [showCursor, setShowCursor] = useState(false);
  const touchStartY = useRef<number>(0);
  const touchStartX = useRef<number>(0);
  const [viewedUserIds, setViewedUserIds] = useState<Set<string>>(new Set()); // Track by userId, not index
  const [isRateLimited, setIsRateLimited] = useState(false);
  
  const socketRef = useRef<any>(null);

  // Load rate limit state from sessionStorage on mount (survives overlay close/open)
  useEffect(() => {
    const savedLimit = sessionStorage.getItem('napalmsky_rate_limit');
    if (savedLimit) {
      const { expiry, viewedIds } = JSON.parse(savedLimit);
      if (Date.now() < expiry) {
        setIsRateLimited(true);
        setViewedUserIds(new Set(viewedIds));
        console.log('[RateLimit] Restored active rate limit from session');
      } else {
        sessionStorage.removeItem('napalmsky_rate_limit');
      }
    }
  }, []);

  // Show toast
  const showToast = useCallback((message: string, type: 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Track navigation rate and apply cooldown if needed
  const trackNavigation = useCallback((userId: string) => {
    const now = Date.now();
    
    // Add userId to viewed set
    setViewedUserIds(prev => {
      const newSet = new Set(prev);
      newSet.add(userId);
      return newSet;
    });
    
    // Get timestamps from sessionStorage
    const stored = sessionStorage.getItem('napalmsky_nav_timestamps');
    let timestamps: number[] = stored ? JSON.parse(stored) : [];
    timestamps.push(now);
    
    // Keep only last 30 seconds
    const thirtySecondsAgo = now - 30000;
    timestamps = timestamps.filter(ts => ts > thirtySecondsAgo);
    sessionStorage.setItem('napalmsky_nav_timestamps', JSON.stringify(timestamps));
    
    // Check if 10+ NEW card views in 30 seconds
    if (timestamps.length >= 10) {
      const cooldownEnd = now + 180000;
      setIsRateLimited(true);
      
      sessionStorage.setItem('napalmsky_rate_limit', JSON.stringify({
        expiry: cooldownEnd,
        viewedIds: Array.from(viewedUserIds),
      }));
      
      showToast('Slow down! 3-minute cooldown. You can still review seen cards.', 'error');
      
      setTimeout(() => {
        setIsRateLimited(false);
        sessionStorage.removeItem('napalmsky_rate_limit');
        sessionStorage.removeItem('napalmsky_nav_timestamps');
        showToast('Cooldown ended! Explore new cards again.', 'info');
      }, 180000);
    }
  }, [viewedUserIds, showToast]);

  // Check if rate limit expired (on mount and interval)
  useEffect(() => {
    const checkExpiry = () => {
      const savedLimit = sessionStorage.getItem('napalmsky_rate_limit');
      if (savedLimit) {
        const { expiry } = JSON.parse(savedLimit);
        if (Date.now() >= expiry) {
          setIsRateLimited(false);
          sessionStorage.removeItem('napalmsky_rate_limit');
          sessionStorage.removeItem('napalmsky_nav_timestamps');
          console.log('[RateLimit] Cooldown expired');
        }
      }
    };
    
    checkExpiry();
    const interval = setInterval(checkExpiry, 1000);
    return () => clearInterval(interval);
  }, []);

  // Track mouse position for cursor-synced arrow
  const handleMouseMove = (e: React.MouseEvent) => {
    setMouseX(e.clientX);
    setMouseY(e.clientY);
    setShowCursor(true);
  };

  // Hide custom cursor when mouse leaves
  const handleMouseLeave = () => {
    setShowCursor(false);
  };

  // Handle click - navigate based on cursor position
  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on buttons or interactive elements
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('a')) {
      return;
    }

    // Check if waiting
    const currentUserId = users[currentIndex]?.userId;
    const isWaiting = currentUserId && inviteStatuses[currentUserId] === 'waiting';
    if (isWaiting) return;

    const screenHeight = window.innerHeight;
    const isTopHalf = mouseY < screenHeight / 2;

    if (isTopHalf && currentIndex > 0) {
      goToPrevious();
    } else if (!isTopHalf && (currentIndex < users.length - 1 || hasMore)) {
      goToNext();
    }
  };

  // Swipe detection for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndY = e.changedTouches[0].clientY;
    const touchEndX = e.changedTouches[0].clientX;
    const deltaY = touchStartY.current - touchEndY;
    const deltaX = Math.abs(touchStartX.current - touchEndX);
    
    // Only trigger if vertical swipe (not horizontal) and significant distance
    if (deltaX < 50 && Math.abs(deltaY) > 80) {
      // Check if waiting
      const currentUserId = users[currentIndex]?.userId;
      const isWaiting = currentUserId && inviteStatuses[currentUserId] === 'waiting';
      if (isWaiting) return;
      
      if (deltaY > 0) {
        // Swiped up - go to next
        goToNext();
      } else {
        // Swiped down - go to previous (always allowed)
        goToPrevious();
      }
    }
  };

  // Prevent body scroll when matchmaking is open
  useEffect(() => {
    if (isOpen) {
      // Save current scroll position
      const scrollY = window.scrollY;
      
      // Prevent scrolling on body
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      
      return () => {
        // Restore scrolling
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

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
      
      // Mark first user as viewed
      if (sortedUsers.length > 0 && sortedUsers[0]) {
        setViewedUserIds(prev => {
          const newSet = new Set(prev);
          newSet.add(sortedUsers[0].userId);
          return newSet;
        });
      }
      
      console.log('[Matchmake] State updated - should now show', filteredUsers.length, 'users');
    } catch (err: any) {
      console.error('[Matchmake] Failed to load initial queue:', err);
      showToast('Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  }, [loading, directMatchTarget]);

  // Check for new users and update existing user data (cooldown, intro status)
  const checkForNewUsers = useCallback(async () => {
    const session = getSession();
    if (!session) return;

    try {
      const queueData = await getQueue(session.sessionToken);
      
      // Filter out self (extra safety)
      const filteredQueue = queueData.users.filter(u => u.userId !== session.userId);
      
      console.log('[Matchmake] Queue check - Total in queue:', filteredQueue.length, 'users shown,', queueData.totalAvailable, 'total available');
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

    // Remove any existing auth:success listeners first (prevent duplicates)
    socket.off('auth:success');
    
    // Listen for auth success
    socket.on('auth:success', handleAuth);
    
    // If already authenticated (reconnection), join immediately
    if (socket.connected) {
      console.log('[Matchmake] Socket already connected, emitting auth event');
      socket.emit('auth', { sessionToken: session.sessionToken });
    } else {
      console.log('[Matchmake] Socket connecting, will auth after connect event');
    }

    // Real-time presence tracking - instant updates
    socket.on('presence:update', ({ userId, online, available }: any) => {
      console.log('[Matchmake] Presence update:', { userId: userId.substring(0, 8), online, available });
      
      if (!online || !available) {
        // User went offline or unavailable - remove immediately
        setUsers(prev => {
          const filtered = prev.filter(u => u.userId !== userId);
          console.log('[Matchmake] Removed user from queue (offline/unavailable)');
          return filtered;
        });
        
        // Update total count
        setTotalAvailable(prev => Math.max(0, prev - 1));
      } else if (online && available) {
        // User came online - refresh queue to add them
        console.log('[Matchmake] User came online, refreshing queue...');
        setTimeout(() => checkForNewUsers(), 300);
      }
    });

    // Listen for queue-specific updates (busy/in-call status)
    socket.on('queue:update', ({ userId, available }: any) => {
      console.log('[Matchmake] Queue update:', { userId: userId.substring(0, 8), available });
      
      if (!available) {
        // User became busy (in call) - remove immediately
        setUsers(prev => {
          const filtered = prev.filter(u => u.userId !== userId);
          console.log('[Matchmake] Removed user (busy/in-call)');
          return filtered;
        });
        setTotalAvailable(prev => Math.max(0, prev - 1));
      } else {
        // User became available (call ended) - add back
        console.log('[Matchmake] User available again, refreshing...');
        setTimeout(() => checkForNewUsers(), 300);
      }
    });

    // Aggressive polling for status changes (5s for instant updates)
    const refreshInterval = setInterval(() => {
      console.log('[Matchmake] Polling for queue updates...');
      checkForNewUsers();
    }, 5000); // Fast polling for real-time feel

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

  // Navigate cards (TikTok-style)
  const goToNext = useCallback(() => {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= users.length) return;
    
    const nextUser = users[nextIndex];
    if (!nextUser) return;
    
    // Check if this is a NEW card (by userId)
    const isNewCard = !viewedUserIds.has(nextUser.userId);
    
    if (isRateLimited && isNewCard) {
      showToast('Rate limited! Review cards you\'ve already seen.', 'error');
      return;
    }
    
    // Track navigation for NEW cards only
    if (isNewCard) {
      trackNavigation(nextUser.userId);
    }
    
    setCurrentIndex(nextIndex);
  }, [currentIndex, users, isRateLimited, viewedUserIds, trackNavigation]);

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);

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

  // Page Visibility API: Auto-offline when tab out, auto-rejoin when tab back
  useEffect(() => {
    if (!isOpen) return;
    
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // User tabbed out or minimized - leave queue to prevent ghost users
        console.log('[Matchmake] 👻 User tabbed out, leaving queue to prevent ghost users...');
        
        if (socketRef.current) {
          socketRef.current.emit('queue:leave');
          socketRef.current.emit('presence:leave');
          console.log('[Matchmake] ✅ Left queue and presence (tab hidden)');
        }
      } else {
        // User came back - rejoin queue automatically
        console.log('[Matchmake] 👋 User tabbed back in, rejoining queue...');
        
        if (socketRef.current) {
          socketRef.current.emit('presence:join');
          socketRef.current.emit('queue:join');
          
          // Reload queue to get fresh users
          console.log('[Matchmake] 🔄 Reloading queue after tab return...');
          setTimeout(() => {
            loadInitialQueue();
          }, 500); // Small delay to ensure server state is updated
          
          console.log('[Matchmake] ✅ Rejoined queue and presence (tab visible)');
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isOpen, loadInitialQueue]);

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

  // CRITICAL: Handle page visibility changes (tab switch, minimize, etc.)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page/tab becoming hidden
        const waitingInvites = Object.entries(inviteStatuses)
          .filter(([_, status]) => status === 'waiting');
        
        if (waitingInvites.length > 0 && socketRef.current) {
          console.warn('[Matchmake] ⚠️ Page hidden while waiting - auto-rescinding');
          
          // Send rescind for all waiting invites
          waitingInvites.forEach(([userId]) => {
            socketRef.current.emit('call:rescind', { toUserId: userId });
          });
          
          // Clear waiting states locally
          setInviteStatuses(prev => {
            const newStatuses = { ...prev };
            waitingInvites.forEach(([userId]) => {
              delete newStatuses[userId];
            });
            return newStatuses;
          });
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [inviteStatuses]);
  
  // CRITICAL: Handle page unload/close (backup for hard closes)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const waitingInvites = Object.entries(inviteStatuses)
        .filter(([_, status]) => status === 'waiting');
      
      if (waitingInvites.length > 0 && socketRef.current) {
        // Send rescind immediately (synchronous)
        waitingInvites.forEach(([userId]) => {
          socketRef.current.emit('call:rescind', { toUserId: userId });
        });
        
        // Force warning dialog (prevents accidental close)
        e.preventDefault();
        e.returnValue = 'You are waiting for a response. Closing will cancel and set a 1-hour cooldown.';
        return e.returnValue;
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [inviteStatuses]);

  // CRITICAL: Block browser back navigation during waiting state
  useEffect(() => {
    const hasWaitingInvite = Object.values(inviteStatuses).includes('waiting');
    
    if (hasWaitingInvite) {
      // Push a dummy state to prevent immediate back navigation
      window.history.pushState(null, '', window.location.href);
      
      const handlePopState = (e: PopStateEvent) => {
        // Prevent back navigation during waiting
        console.log('[Matchmake] ⚠️ Back navigation blocked - user is waiting for response');
        window.history.pushState(null, '', window.location.href);
        showToast('Cannot go back while waiting for a response. Cancel the invite first.', 'error');
      };
      
      window.addEventListener('popstate', handlePopState);
      
      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [inviteStatuses]);

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
      <div 
        className="fixed inset-0 z-50 flex flex-col md:cursor-none"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleCardClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Custom Cursor - Desktop only (mobile uses swipe) */}
        {showCursor && typeof window !== 'undefined' && !/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) && (
          <div
            className="fixed pointer-events-none z-[60] transition-opacity duration-200"
            style={{
              left: `${mouseX}px`,
              top: `${mouseY}px`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            {mouseY < window.innerHeight / 2 ? (
              // Top half - Up arrow or disabled icon
              currentIndex > 0 && inviteStatuses[users[currentIndex]?.userId] !== 'waiting' ? (
                <svg 
                  className="h-10 w-10 text-white/70 drop-shadow-lg" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor" 
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                </svg>
              ) : (
                // Can't go up - show error/disabled icon
                <svg 
                  className="h-10 w-10 text-red-400/60 drop-shadow-lg" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor" 
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              )
            ) : (
              // Bottom half - Down arrow, error if at end, or rate limited icon
              (() => {
                const nextIndex = currentIndex + 1;
                const nextUser = users[nextIndex];
                const isNewCard = nextUser && !viewedUserIds.has(nextUser.userId);
                const canGoDown = currentIndex < users.length - 1 || hasMore;
                const isBlocked = isRateLimited && isNewCard;
                
                if (inviteStatuses[users[currentIndex]?.userId] === 'waiting') {
                  // Waiting state - show disabled
                  return (
                    <svg 
                      className="h-10 w-10 text-red-400/60 drop-shadow-lg" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor" 
                      strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                  );
                } else if (isBlocked) {
                  // Rate limited - show clock/pause icon
                  return (
                    <svg 
                      className="h-10 w-10 text-orange-400/70 drop-shadow-lg" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor" 
                      strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  );
                } else if (canGoDown) {
                  // Can go down - show down arrow
                  return (
                    <svg 
                      className="h-10 w-10 text-white/70 drop-shadow-lg" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor" 
                      strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  );
                } else {
                  // Can't go down - show error/disabled icon
                  return (
                    <svg 
                      className="h-10 w-10 text-red-400/60 drop-shadow-lg" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor" 
                      strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                  );
                }
              })()
            )}
          </div>
        )}

        {/* Compact Header - Top Right (Hidden on mobile for minimal UI) */}
        <div className="absolute top-6 right-6 items-center gap-4 z-20 hidden md:flex">
          <div className="text-right">
            <h2 className="font-playfair text-2xl font-bold text-white drop-shadow-lg">
              Matchmake
            </h2>
            <p className="text-xs text-white/90 drop-shadow">
              {totalAvailable} {totalAvailable === 1 ? 'person' : 'people'} online
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={!!incomingInvite}
            style={{
              display: Object.values(inviteStatuses).includes('waiting') ? 'none' : 'block'
            }}
            className="focus-ring rounded-full bg-black/60 p-3 backdrop-blur-md transition-all hover:bg-black/80 disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Close matchmaking"
            title={incomingInvite ? "Cannot close while receiving a call" : "Close matchmaking"}
          >
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Mobile: Close button only (top right corner) */}
        <div className="absolute top-6 right-6 z-20 flex md:hidden">
          <button
            onClick={handleClose}
            disabled={!!incomingInvite}
            style={{
              display: Object.values(inviteStatuses).includes('waiting') ? 'none' : 'block'
            }}
            className="focus-ring rounded-full bg-black/60 p-3 backdrop-blur-md transition-all hover:bg-black/80 disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Close matchmaking"
            title={incomingInvite ? "Cannot close while receiving a call" : "Close matchmaking"}
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

                {/* Navigation removed - use swipe on mobile, arrow keys on desktop */}

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

    </>
  );
}


