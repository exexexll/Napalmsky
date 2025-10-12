'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';

interface CalleeNotificationProps {
  invite: {
    inviteId: string;
    fromUser: {
      userId: string;
      name: string;
      gender: string;
      selfieUrl?: string;
      videoUrl?: string;
    };
    requestedSeconds: number;
    ttlMs: number;
  };
  onAccept: (inviteId: string, requestedSeconds: number) => void;
  onDecline: (inviteId: string) => void;
}

export function CalleeNotification({ invite, onAccept, onDecline }: CalleeNotificationProps) {
  const [seconds, setSeconds] = useState(invite.requestedSeconds);
  const [timeLeft, setTimeLeft] = useState(20); // Changed to 20s to respond
  const videoRef = useRef<HTMLVideoElement>(null);
  const firstFocusRef = useRef<HTMLButtonElement>(null);

  // Countdown for decision timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Auto-decline on timeout
          onDecline(invite.inviteId);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [invite.inviteId, onDecline]);

  // Focus trap - focus first button on mount
  useEffect(() => {
    firstFocusRef.current?.focus();
  }, []);

  // Prevent ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, []);

  const handleSecondsChange = (value: string) => {
    const num = parseInt(value.replace(/\D/g, '')) || 0;
    setSeconds(Math.min(500, Math.max(0, num)));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg space-y-6 rounded-2xl bg-[#0a0a0c] p-8 shadow-2xl border-2 border-[#ff9b6b]/30"
        role="alertdialog"
        aria-labelledby="callee-title"
        aria-describedby="callee-description"
      >
        {/* Timer Warning */}
        <div className="text-center">
          <div className={`inline-block rounded-lg px-4 py-2 ${
            timeLeft <= 10 ? 'bg-red-500/20 text-red-300' : 'bg-yellow-500/20 text-yellow-300'
          }`}>
            <span className="font-mono text-sm font-bold">
              {timeLeft}s to respond
            </span>
          </div>
        </div>

        {/* Title */}
        <div className="text-center">
          <h2 id="callee-title" className="font-playfair text-3xl font-bold text-[#eaeaf0]">
            Incoming Call
          </h2>
          <p id="callee-description" className="mt-2 text-[#eaeaf0]/70">
            {invite.fromUser.name} wants to connect
          </p>
        </div>

        {/* Caller Info */}
        <div className="space-y-4">
          {/* Selfie */}
          {invite.fromUser.selfieUrl && (
            <div className="relative mx-auto h-32 w-32 overflow-hidden rounded-full border-4 border-[#ff9b6b]/30">
              <Image
                src={invite.fromUser.selfieUrl}
                alt={invite.fromUser.name}
                fill
                className="object-cover"
              />
            </div>
          )}

          {/* Intro Video Preview */}
          {invite.fromUser.videoUrl && (
            <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
              <video
                ref={videoRef}
                src={invite.fromUser.videoUrl}
                autoPlay
                loop
                muted
                playsInline
                className="h-full w-full object-cover"
              />
            </div>
          )}

          {/* Gender + Requested Duration */}
          <div className="flex items-center justify-center gap-4 text-sm text-[#eaeaf0]/70">
            <span className="capitalize">{invite.fromUser.gender}</span>
            <span>•</span>
            <span>Wants {invite.requestedSeconds}s call</span>
          </div>
        </div>

        {/* Your Duration Input */}
        <div>
          <label className="block text-sm font-medium text-[#eaeaf0] mb-2 text-center">
            Your preferred duration (seconds)
          </label>
          <input
            type="text"
            value={seconds.toString().padStart(3, '0')}
            onChange={(e) => handleSecondsChange(e.target.value)}
            maxLength={3}
            className="w-full rounded-xl bg-white/10 px-4 py-3 text-center font-mono text-2xl text-[#eaeaf0] focus:outline-none focus:ring-2 focus:ring-[#ff9b6b]"
            aria-label="Your preferred call duration in seconds"
          />
          <p className="mt-2 text-xs text-[#eaeaf0]/50 text-center">
            Final duration will be averaged: {Math.floor((invite.requestedSeconds + seconds) / 2)}s
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => onDecline(invite.inviteId)}
            className="focus-ring flex-1 rounded-xl bg-white/10 px-6 py-3 font-medium text-[#eaeaf0] transition-all hover:bg-white/20"
            aria-label="Decline call"
          >
            Decline
          </button>
          <button
            ref={firstFocusRef}
            onClick={() => onAccept(invite.inviteId, seconds)}
            disabled={seconds < 1}
            className="focus-ring flex-1 rounded-xl bg-[#ff9b6b] px-6 py-3 font-medium text-[#0a0a0c] shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
            aria-label="Accept call"
          >
            Accept
          </button>
        </div>

        <p className="text-center text-xs text-[#eaeaf0]/40">
          Decision required • ESC disabled
        </p>
      </motion.div>
    </div>
  );
}

