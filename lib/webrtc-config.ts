/**
 * WebRTC Configuration & Optimization
 * Phase 5: Enhanced mobile/VPN/Safari compatibility + aggressive TURN relay
 */

import { API_BASE } from './config';

export function detectDevice() {
  if (typeof window === 'undefined') {
    return { isMobile: false, isSafari: false, isIOS: false, isAndroid: false, isChrome: false, isFirefox: false };
  }
  
  const ua = navigator.userAgent;
  return {
    isMobile: /iPhone|iPad|iPod|Android/i.test(ua),
    isSafari: /^((?!chrome|android).)*safari/i.test(ua),
    isIOS: /iPhone|iPad|iPod/i.test(ua),
    isAndroid: /Android/i.test(ua),
    isChrome: /Chrome/i.test(ua) && !/Edge/i.test(ua),
    isFirefox: /Firefox/i.test(ua),
  };
}

/**
 * Detect if user is likely behind a VPN or restrictive network
 * Heuristics: Check for WebRTC IP leak protection, slow STUN, etc.
 */
export async function detectRestrictiveNetwork(): Promise<boolean> {
  try {
    // Quick STUN connectivity test (2 second timeout)
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    
    return new Promise((resolve) => {
      let hasCandidate = false;
      const timeout = setTimeout(() => {
        pc.close();
        // No candidates in 2s = likely VPN/restrictive network
        console.log('[Network] STUN test result:', hasCandidate ? 'OK' : 'BLOCKED');
        resolve(!hasCandidate);
      }, 2000);
      
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          hasCandidate = true;
          // Check if only relay candidates (VPN often blocks host/srflx)
          if (e.candidate.type === 'host' || e.candidate.type === 'srflx') {
            clearTimeout(timeout);
            pc.close();
            resolve(false); // Normal network
          }
        }
      };
      
      pc.createDataChannel('test');
      pc.createOffer().then(o => pc.setLocalDescription(o));
    });
  } catch {
    return false; // Assume normal on error
  }
}

/**
 * Get optimal getUserMedia constraints
 * Desktop: 1920x1080 @ 30fps (Full HD)
 * Mobile: 1280x720 @ 30fps (HD)
 */
export function getMediaConstraints() {
  const { isMobile } = detectDevice();
  
  return {
    video: {
      facingMode: 'user',
      width: { min: 480, ideal: isMobile ? 1280 : 1920, max: 1920 },
      height: { min: 480, ideal: isMobile ? 720 : 1080, max: 1080 },
      frameRate: { ideal: 30, max: 60 },
      aspectRatio: { ideal: isMobile ? 9/16 : 16/9 },
    },
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: { ideal: 48000 }, // CD quality
      channelCount: { ideal: 1 }, // Mono for voice
    }
  };
}

/**
 * Prefetch TURN credentials (saves 0.5-1s on call connection)
 * Call this on main page before user opens matchmaking
 */
export async function prefetchTurnCredentials(sessionToken: string): Promise<void> {
  try {
    const cached = sessionStorage.getItem('bumpin_turn_cache');
    if (cached) {
      const { fetchedAt } = JSON.parse(cached);
      // Skip if less than 45 min old (creds valid 1 hour)
      if (Date.now() - fetchedAt < 2700000) {
        return;
      }
    }
    
    const response = await fetch(`${API_BASE}/turn/credentials`, {
      headers: { 'Authorization': `Bearer ${sessionToken}` }
    });
    
    if (!response.ok) {
      console.warn('[TURN] Prefetch failed');
      return;
    }
    
    const data = await response.json();
    
    sessionStorage.setItem('bumpin_turn_cache', JSON.stringify({
      iceServers: data.iceServers,
      fetchedAt: Date.now(),
    }));
    
    console.log('[TURN] Prefetched (provider:', data.provider + ')');
  } catch (error) {
    console.log('[TURN] Prefetch error (non-critical):', error);
  }
}

/**
 * Get ICE servers (uses cache or fetches)
 * Enhanced with network type detection for optimal server selection
 */
export async function getIceServers(sessionToken: string): Promise<RTCIceServer[]> {
  // Try cache first
  const cached = sessionStorage.getItem('bumpin_turn_cache');
  if (cached) {
    const { iceServers, fetchedAt } = JSON.parse(cached);
    if (Date.now() - fetchedAt < 3300000) { // < 55 min old
      console.log('[TURN] Using cache');
      return iceServers;
    }
  }
  
  // Fetch fresh
  try {
    const response = await fetch(`${API_BASE}/turn/credentials`, {
      headers: { 'Authorization': `Bearer ${sessionToken}` }
    });
    
    const data = await response.json();
    
    sessionStorage.setItem('bumpin_turn_cache', JSON.stringify({
      iceServers: data.iceServers,
      fetchedAt: Date.now(),
    }));
    
    return data.iceServers;
  } catch (error) {
    console.error('[TURN] Fetch failed:', error);
    // Fallback with free public TURN (better than STUN-only)
    return [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      // Free public TURN for NAT traversal fallback
      {
        urls: 'turn:openrelay.metered.ca:443?transport=tcp',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      }
    ];
  }
}

/**
 * Get optimal RTCConfiguration based on device and network conditions
 * Addresses: mobile-to-mobile, VPN, Safari issues
 */
export async function getOptimalRTCConfig(sessionToken: string): Promise<RTCConfiguration> {
  const { isMobile, isSafari, isIOS, isAndroid } = detectDevice();
  const iceServers = await getIceServers(sessionToken);
  
  // Check for restrictive network (VPN, corporate firewall, etc.)
  const isRestrictive = await detectRestrictiveNetwork();
  
  // Determine optimal ICE transport policy
  let iceTransportPolicy: RTCIceTransportPolicy = 'all';
  
  // Force TURN relay for:
  // 1. Safari on iOS (known NAT issues)
  // 2. Mobile-to-mobile (symmetric NAT common)
  // 3. Restrictive networks (VPN, firewall)
  if ((isSafari && isIOS) || isRestrictive) {
    iceTransportPolicy = 'relay';
    console.log('[WebRTC] Forcing TURN relay:', { isSafari, isIOS, isRestrictive });
  } else if (isMobile) {
    // For mobile, prefer relay but allow fallback
    // This is handled by ICE candidate priority, not policy
    console.log('[WebRTC] Mobile device - will prioritize relay candidates');
  }
  
  const config: RTCConfiguration = {
    iceServers,
    iceCandidatePoolSize: 10, // Pre-gather candidates
    iceTransportPolicy,
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
  };
  
  // Safari-specific optimizations
  if (isSafari) {
    (config as any).sdpSemantics = 'unified-plan';
    console.log('[WebRTC] Safari detected - using unified-plan SDP');
  }
  
  console.log('[WebRTC] Optimal config:', {
    iceTransportPolicy: config.iceTransportPolicy,
    iceServerCount: iceServers.length,
    device: { isMobile, isSafari, isIOS, isAndroid },
    isRestrictive
  });
  
  return config;
}

/**
 * Get connection timeout based on device/network
 */
export function getConnectionTimeout(): number {
  const { isMobile, isSafari, isIOS } = detectDevice();
  
  // Safari on iOS needs longest timeout (known slow ICE)
  if (isSafari && isIOS) return 60000; // 60s
  
  // Other mobile devices
  if (isMobile) return 45000; // 45s
  
  // Desktop
  return 30000; // 30s
}

/**
 * Get ICE gathering timeout based on device
 */
export function getICEGatheringTimeout(): number {
  const { isMobile, isSafari, isIOS } = detectDevice();
  
  // Safari on iOS is notoriously slow at ICE gathering
  if (isSafari && isIOS) return 8000; // 8s
  
  // Other Safari
  if (isSafari) return 6000; // 6s
  
  // Mobile
  if (isMobile) return 5000; // 5s
  
  // Desktop
  return 4000; // 4s
}

