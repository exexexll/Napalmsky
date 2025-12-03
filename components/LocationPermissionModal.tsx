'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { checkLocationPermissionState, wasLocationBlockedByBrowser, clearLocationBlockedFlag } from '@/lib/locationAPI';

interface LocationPermissionModalProps {
  onAllow: () => void;
  onDeny: () => void;
}

export function LocationPermissionModal({ onAllow, onDeny }: LocationPermissionModalProps) {
  const [permissionState, setPermissionState] = useState<'checking' | 'blocked' | 'available'>('checking');
  const [isIOS, setIsIOS] = useState(false);
  const [isSafari, setIsSafari] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  
  useEffect(() => {
    // Detect browser/device
    const ua = navigator.userAgent;
    setIsIOS(/iPhone|iPad|iPod/i.test(ua));
    setIsSafari(/^((?!chrome|android).)*safari/i.test(ua));
    setIsAndroid(/Android/i.test(ua));
    
    // Check permission state
    (async () => {
      // First check if we previously detected a browser block
      if (wasLocationBlockedByBrowser()) {
        setPermissionState('blocked');
        return;
      }
      
      // Then check current permission state
      const state = await checkLocationPermissionState();
      if (state === 'denied') {
        setPermissionState('blocked');
      } else {
        setPermissionState('available');
      }
    })();
  }, []);
  
  const handleRetryAfterSettings = () => {
    // Clear the blocked flag and try again
    clearLocationBlockedFlag();
    onAllow();
  };
  
  // Show blocked UI if browser has blocked location
  if (permissionState === 'blocked') {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md rounded-2xl bg-[#0a0a0c] p-8 shadow-2xl border border-red-500/30"
        >
          <div className="text-center mb-4">
            <div className="text-6xl mb-4">🚫</div>
            <h2 className="font-playfair text-2xl font-bold text-[#eaeaf0] mb-3">
              Location Blocked by Browser
            </h2>
          </div>
          
          <p className="text-[#eaeaf0]/80 mb-4 text-center">
            Your browser is set to block location access. You can still browse, but won&apos;t see who&apos;s nearby.
          </p>
          
          {/* Browser-specific instructions */}
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-4 mb-6">
            <p className="text-sm text-amber-200 font-medium mb-2">To enable location:</p>
            {isIOS ? (
              <ol className="text-xs text-amber-200/80 space-y-1 list-decimal list-inside">
                <li>Open <strong>Settings</strong> app</li>
                <li>Go to <strong>Privacy & Security</strong></li>
                <li>Tap <strong>Location Services</strong></li>
                <li>Find <strong>Safari Websites</strong></li>
                <li>Set to <strong>&quot;While Using&quot;</strong></li>
                <li>Come back and tap &quot;I&apos;ve Enabled It&quot;</li>
              </ol>
            ) : isSafari ? (
              <ol className="text-xs text-amber-200/80 space-y-1 list-decimal list-inside">
                <li>Click <strong>Safari</strong> in the menu bar</li>
                <li>Select <strong>Settings for This Website...</strong></li>
                <li>Find <strong>Location</strong></li>
                <li>Change to <strong>Allow</strong></li>
                <li>Come back and tap &quot;I&apos;ve Enabled It&quot;</li>
              </ol>
            ) : isAndroid ? (
              <ol className="text-xs text-amber-200/80 space-y-1 list-decimal list-inside">
                <li>Open <strong>Settings</strong> app</li>
                <li>Go to <strong>Apps</strong> → <strong>Chrome</strong></li>
                <li>Tap <strong>Permissions</strong></li>
                <li>Tap <strong>Location</strong></li>
                <li>Select <strong>Allow</strong></li>
                <li>Come back and tap &quot;I&apos;ve Enabled It&quot;</li>
              </ol>
            ) : (
              <ol className="text-xs text-amber-200/80 space-y-1 list-decimal list-inside">
                <li>Click the <strong>lock/info icon</strong> in the address bar</li>
                <li>Find <strong>Location</strong> setting</li>
                <li>Change to <strong>Allow</strong></li>
                <li>Refresh the page</li>
              </ol>
            )}
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={onDeny}
              className="flex-1 rounded-xl bg-white/10 px-6 py-3 font-medium text-[#eaeaf0] transition-all hover:bg-white/20"
            >
              Skip for Now
            </button>
            <button
              onClick={handleRetryAfterSettings}
              className="flex-1 rounded-xl bg-[#ffc46a] px-6 py-3 font-medium text-[#0a0a0c] transition-opacity hover:opacity-90"
            >
              I&apos;ve Enabled It
            </button>
          </div>
          
          <p className="mt-4 text-xs text-center text-[#eaeaf0]/40">
            You can still use BUMPIN without location—you just won&apos;t see distance info.
          </p>
        </motion.div>
      </div>
    );
  }
  
  // Loading state
  if (permissionState === 'checking') {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-white text-center"
        >
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p>Checking permissions...</p>
        </motion.div>
      </div>
    );
  }
  
  // Normal permission request UI
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md rounded-2xl bg-[#0a0a0c] p-8 shadow-2xl border border-white/10"
      >
        <div className="text-center mb-4">
          <div className="text-6xl mb-4">📍</div>
          <h2 className="font-playfair text-3xl font-bold text-[#eaeaf0] mb-3">
            Show People Near You?
          </h2>
        </div>
        
        <p className="text-[#eaeaf0]/80 mb-6 text-center">
          We&apos;ll show people closest to you first. Your exact location is never shared—only approximate distance.
        </p>
        
        <div className="space-y-2.5 mb-6 text-sm text-[#eaeaf0]/60">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span>Location updated only when you matchmake</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span>Automatically deleted after 24 hours</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span>Never shared with other users (only distance)</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span>Can disable anytime in Settings</span>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={onDeny}
            className="flex-1 rounded-xl bg-white/10 px-6 py-3 font-medium text-[#eaeaf0] transition-all hover:bg-white/20"
          >
            No Thanks
          </button>
          <button
            onClick={onAllow}
            className="flex-1 rounded-xl bg-[#ffc46a] px-6 py-3 font-medium text-[#0a0a0c] transition-opacity hover:opacity-90"
          >
            Show Nearby
          </button>
        </div>
        
        <p className="mt-4 text-xs text-center text-[#eaeaf0]/40">
          By allowing, you consent to temporary location storage per our Privacy Policy
        </p>
      </motion.div>
    </div>
  );
}

