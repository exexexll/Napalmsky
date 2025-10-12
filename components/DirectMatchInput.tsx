'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { directMatch } from '@/lib/api';
import { getSession } from '@/lib/session';

interface DirectMatchInputProps {
  onMatch: (targetUserId: string, targetName: string) => void;
}

export default function DirectMatchInput({ onMatch }: DirectMatchInputProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showInput, setShowInput] = useState(false);

  const handleMatch = async () => {
    if (!code.trim()) {
      setError('Please enter an intro code');
      return;
    }

    const session = getSession();
    if (!session) return;

    setLoading(true);
    setError('');

    try {
      const result = await directMatch(session.sessionToken, code.trim().toUpperCase());
      
      if (!result.isOnline || !result.isAvailable) {
        setError(`${result.targetUser.name} is not online right now. Try again later!`);
        return;
      }

      // Success! Trigger match
      console.log('[DirectMatch] Matched with:', result.targetUser.name);
      onMatch(result.targetUser.userId, result.targetUser.name);
      
      // Reset
      setCode('');
      setShowInput(false);
    } catch (err: any) {
      console.error('[DirectMatch] Failed:', err);
      setError(err.message || 'Invalid intro code');
    } finally {
      setLoading(false);
    }
  };

  // Silver-grey title bar (Windows 95/2000 style)
  const silverTitleBarClass = "bg-gradient-to-b from-gray-300 to-gray-400";

  return (
    <>
      {!showInput ? (
        <button
          onClick={() => setShowInput(true)}
          className="focus-ring group w-full h-full overflow-hidden rounded-md border-4 border-gray-400 shadow-2xl transition-all hover:scale-105 active:scale-95"
        >
          {/* Retro Window Title Bar */}
          <div className={`${silverTitleBarClass} px-3 py-1.5 flex items-center justify-between border-b-2 border-gray-500`}>
            <span className="text-xs font-bold text-gray-800">IntroCode.exe</span>
            <div className="flex gap-1">
              <div className="w-2.5 h-2.5 bg-gray-500 rounded-sm" />
              <div className="w-2.5 h-2.5 bg-gray-500 rounded-sm" />
              <div className="w-2.5 h-2.5 bg-gray-500 rounded-sm" />
            </div>
          </div>
          {/* Window Content */}
          <div className="bg-white p-1 h-full flex items-center justify-center">
            <h3 className="font-playfair text-4xl font-bold tracking-tight text-gray-600 leading-none">
              Intro Code
            </h3>
          </div>
        </button>
      ) : (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setShowInput(false)}>
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="rounded-2xl bg-[#0a0a0c]/95 p-6 shadow-2xl backdrop-blur-md border border-white/10 min-w-[320px]"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-playfair text-xl font-bold text-[#eaeaf0]">
                Direct Match
              </h3>
              <button
                onClick={() => {
                  setShowInput(false);
                  setCode('');
                  setError('');
                }}
                className="text-white/50 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <p className="mb-4 text-sm text-[#eaeaf0]/70">
              Enter the intro code from your referral link
            </p>

            <div className="space-y-3">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyPress={(e) => e.key === 'Enter' && handleMatch()}
                placeholder="e.g., ABC12345"
                maxLength={10}
                autoFocus
                className="w-full rounded-xl bg-white/10 px-4 py-3 font-mono text-center text-lg uppercase text-[#eaeaf0] placeholder-[#eaeaf0]/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />

              {error && (
                <div className="rounded-xl bg-red-500/10 px-4 py-3 border border-red-500/30">
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              )}

              <button
                onClick={handleMatch}
                disabled={loading || !code.trim()}
                className="focus-ring w-full rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 px-6 py-3 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {loading ? 'Matching...' : '🚀 Match Now'}
              </button>
            </div>

            <p className="mt-4 text-xs text-[#eaeaf0]/40">
              The code is at the end of your intro link
            </p>
          </motion.div>
        </div>
      )}
    </>
  );
}

