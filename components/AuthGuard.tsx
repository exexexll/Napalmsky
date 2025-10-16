'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getSession } from '@/lib/session';
import BanNotification from './BanNotification';

interface AuthGuardProps {
  children: React.ReactNode;
}

/**
 * AuthGuard - Protects routes from unauthorized access
 * Redirects to onboarding if no session exists
 * Shows ban notification if user is banned
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const session = getSession();
    
    // Public routes that don't require authentication
    const publicRoutes = [
      '/', 
      '/onboarding', 
      '/login', 
      '/manifesto', 
      '/blacklist',
      // Legal pages - must be publicly accessible
      '/terms-of-service',
      '/privacy-policy',
      '/acceptable-use',
      '/cookie-policy',
      '/community-guidelines',
      '/content-policy',
    ];
    
    // Check if current route is public
    const isPublicRoute = publicRoutes.includes(pathname || '');
    
    // If not public and no session, redirect to onboarding
    if (!isPublicRoute && !session) {
      console.log('[AuthGuard] No session found, redirecting to onboarding');
      router.push('/onboarding');
    }
  }, [pathname, router]);

  return (
    <>
      <BanNotification />
      {children}
    </>
  );
}

