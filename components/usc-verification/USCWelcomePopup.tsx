'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface USCWelcomePopupProps {
  onContinue: () => void;
}

/**
 * Welcome popup for USC admin QR code users
 * Auto-transitions to get started after 3 seconds
 */
export function USCWelcomePopup({ onContinue }: USCWelcomePopupProps) {
  const [countdown, setCountdown] = useState(3);
  
  useEffect(() => {
    // Countdown timer
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    // Auto-transition after 3 seconds
    const timeout = setTimeout(async () => {
      // Check if open signup is enabled
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001'}/open-signup/status`);
        const data = await res.json();
        
        if (data.enabled) {
          console.log('[USC Welcome] Open signup ENABLED - skipping card scanner');
          window.location.href = '/onboarding';
          return;
        }
      } catch (err) {
        console.error('[USC Welcome] Failed to check open signup, proceeding to card scanner');
      }
      
      onContinue();
    }, 3000);
    
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [onContinue]);
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{
        background: 'linear-gradient(135deg, #990000 0%, #FFCC00 100%)',
      }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="max-w-lg bg-white/10 backdrop-blur-xl rounded-2xl p-8 sm:p-12 text-center border-2 border-white/30 shadow-2xl"
      >
        {/* USC Logo/Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
          className="mb-6"
        >
          <span className="text-7xl sm:text-8xl">🎓</span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="font-playfair text-3xl sm:text-5xl font-bold text-white mb-6"
        >
          Welcome to BUMPIN @ USC
        </motion.h1>

        {/* Body */}
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-white/90 text-lg sm:text-xl mb-8 leading-relaxed"
        >
          Connect with fellow Trojans on campus and around the world, make lasting connections. Go USC!
        </motion.p>

        {/* Auto-transition indicator */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-white/70 text-lg"
        >
          {countdown > 0 ? (
            <span>Starting in {countdown}...</span>
          ) : (
            <span>Loading...</span>
          )}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

