/**
 * Payment Protection Hook
 * 
 * Reusable hook to protect pages that require payment
 * Automatically redirects unpaid users to paywall
 * 
 * Usage:
 * const { loading, hasPaid } = usePaymentProtection();
 * if (loading) return <Loading />;
 * // Page content here (only shown if paid)
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from './session';
import { API_BASE } from './config';

export function usePaymentProtection() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [hasPaid, setHasPaid] = useState(false);

  useEffect(() => {
    const session = getSession();
    
    if (!session) {
      router.push('/onboarding');
      return;
    }

    // Check payment status
    fetch(`${API_BASE}/payment/status`, {
      headers: { 'Authorization': `Bearer ${session.sessionToken}` },
    })
      .then(res => res.json())
      .then(data => {
        const paid = data.paidStatus === 'paid' || data.paidStatus === 'qr_verified';
        
        if (!paid) {
          console.warn('[PaymentProtection] Unpaid user attempted access - redirecting to paywall');
          router.push('/paywall');
          return;
        }
        
        setHasPaid(true);
        setLoading(false);
      })
      .catch(err => {
        console.error('[PaymentProtection] Payment status check failed:', err);
        // On error, redirect to onboarding to be safe
        router.push('/onboarding');
      });
  }, [router]);

  return { loading, hasPaid };
}

