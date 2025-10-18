/**
 * Enhanced API client with automatic session invalidation handling
 */

import { API_BASE } from './config';
import { clearSession } from './session';

export async function apiCall(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, options);
  
  // Check for session invalidation
  if (response.status === 401) {
    const data = await response.json();
    
    if (data.sessionInvalidated) {
      // Session was invalidated by new login
      console.log('[API] Session invalidated - logging out');
      clearSession();
      
      // Emit custom event for SessionInvalidatedModal to catch
      window.dispatchEvent(new CustomEvent('session-invalidated', {
        detail: {
          message: data.message || 'You have been logged out because you logged in from another device.',
          reason: 'session_invalidated_401'
        }
      }));
      
      // Wait a moment for modal to show, then redirect
      setTimeout(() => {
        window.location.href = '/login';
      }, 100);
      
      throw new Error('Session invalidated');
    }
  }
  
  return response;
}

