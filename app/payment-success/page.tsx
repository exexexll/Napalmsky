'use client';

import { useEffect, useState, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { Container } from '@/components/Container';
import { getSession } from '@/lib/session';
import Image from 'next/image';

function PaymentSuccessPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [myInviteCode, setMyInviteCode] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.push('/onboarding');
      return;
    }

    const sessionId = searchParams.get('session_id');
    if (!sessionId) {
      router.push('/onboarding');
      return;
    }

    // Wait a bit for webhook to process, then fetch status
    setTimeout(() => {
      fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001'}/payment/status`, {
        headers: { 'Authorization': `Bearer ${session.sessionToken}` },
      })
        .then(res => res.json())
        .then(data => {
          if (data.paidStatus === 'paid') {
            setMyInviteCode(data.myInviteCode || '');
            setQrCodeUrl(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001'}/payment/qr/${data.myInviteCode}`);
            setLoading(false);
          } else {
            // Payment not processed yet, keep checking
            console.log('Payment not processed yet, retrying...');
            setTimeout(() => window.location.reload(), 2000);
          }
        })
        .catch(err => {
          console.error('Failed to check payment status:', err);
          setLoading(false);
        });
    }, 2000); // Wait 2 seconds for webhook
  }, [router, searchParams]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0a0a0c]">
        <div className="text-center">
          <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-[#ff9b6b] border-t-transparent" />
          <p className="text-[#eaeaf0]">Processing your payment...</p>
        </div>
      </main>
    );
  }

  return (
    <main id="payment-success" className="min-h-screen bg-[#0a0a0c] py-20">
      <Container>
        <div className="mx-auto max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 text-center"
          >
            <div>
              <div className="mb-4 text-5xl">✓</div>
              <h1 className="font-playfair text-3xl font-bold text-green-400 mb-2">
                Payment Successful
              </h1>
              <p className="text-sm text-[#eaeaf0]/60">
                Welcome to Napalm Sky
              </p>
            </div>

            {/* Invite Code Display - Minimal */}
            {myInviteCode && (
              <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-5">
                <h3 className="text-sm font-medium text-purple-300 mb-3">
                  Your Friend Invites (4 total)
                </h3>
                
                <div className="rounded-lg bg-black/30 px-4 py-3 mb-3">
                  <p className="font-mono text-xl font-bold text-purple-300 tracking-wider">
                    {myInviteCode}
                  </p>
                </div>

                {/* QR Code - Smaller */}
                {qrCodeUrl && (
                  <div className="flex justify-center mb-3">
                    <div className="rounded-lg bg-white p-2">
                      <img src={qrCodeUrl} alt="QR Code" className="w-32 h-32" />
                    </div>
                  </div>
                )}

                <button
                  onClick={() => navigator.clipboard.writeText(myInviteCode)}
                  className="focus-ring w-full rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-[#eaeaf0] transition-all hover:bg-white/20"
                >
                  Copy Code
                </button>

                <p className="mt-2 text-xs text-center text-[#eaeaf0]/40">
                  Find in Settings anytime
                </p>
              </div>
            )}

            {/* Continue Button - Minimal */}
            <button
              onClick={() => router.push('/main')}
              className="focus-ring w-full rounded-xl bg-[#ff9b6b] px-6 py-3 font-medium text-[#0a0a0c] transition-opacity hover:opacity-90"
            >
              Continue →
            </button>
          </motion.div>
        </div>
      </Container>
    </main>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0c]">
        <div className="text-center">
          <div className="mb-4 text-4xl">⏳</div>
          <p className="text-[#eaeaf0]/70">Loading...</p>
        </div>
      </div>
    }>
      <PaymentSuccessPageContent />
    </Suspense>
  );
}

