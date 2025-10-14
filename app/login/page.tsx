'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Container } from '@/components/Container';
import { login } from '@/lib/api';
import { saveSession } from '@/lib/session';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim() || !password.trim()) {
      setError('Email and password are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await login(email, password);
      saveSession({
        sessionToken: response.sessionToken,
        userId: response.userId,
        accountType: response.accountType,
      });
      router.push('/main');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main id="main" className="min-h-screen bg-[#0a0a0c] py-20">
      <Container>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="mx-auto max-w-md space-y-8 motion-reduce:opacity-100 motion-reduce:translate-y-0"
        >
          <div className="text-center">
            <h1 className="font-playfair text-4xl font-bold text-[#eaeaf0] sm:text-5xl">
              Welcome back
            </h1>
            <p className="mt-4 text-lg text-[#eaeaf0]/70">
              Login to your permanent account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-[#eaeaf0]">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl bg-white/10 px-4 py-3 text-[#eaeaf0] placeholder-[#eaeaf0]/50 focus:outline-none focus:ring-2 focus:ring-[#ff9b6b]"
                placeholder="your@email.com"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#eaeaf0]">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl bg-white/10 px-4 py-3 text-[#eaeaf0] placeholder-[#eaeaf0]/50 focus:outline-none focus:ring-2 focus:ring-[#ff9b6b]"
                placeholder="Enter your password"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="rounded-xl bg-red-500/10 p-4 text-sm text-red-400">
                <p className="font-medium mb-2">{error}</p>
                {error.includes('Invalid credentials') && (
                  <p className="text-xs text-red-300/80 mt-2">
                    Note: Login is only for permanent accounts. If you signed up as a guest, you don&apos;t have a password yet. 
                    Sign up or link your account in Settings after signing in.
                  </p>
                )}
                {error.includes('Too many') && (
                  <p className="text-xs text-red-300/80 mt-2">
                    Your IP has been temporarily blocked due to too many failed login attempts. Please wait 10 minutes or try signing up as a new guest instead.
                  </p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="focus-ring w-full rounded-xl bg-[#ff9b6b] px-6 py-3 font-medium text-[#0a0a0c] shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div className="text-center space-y-3">
            <p className="text-sm text-[#eaeaf0]/70">
              Don&apos;t have an account?{' '}
              <Link href="/onboarding" className="font-medium text-[#ff9b6b] hover:underline">
                Create one now
              </Link>
            </p>
            <Link href="/" className="block text-sm text-[#eaeaf0]/50 hover:text-[#eaeaf0]">
              ← Back to home
            </Link>
          </div>
        </motion.div>
      </Container>
    </main>
  );
}
