/**
 * Location API Client
 * Frontend utilities for location-based features
 */

import { API_BASE } from './config';
import { formatDistance, roundCoordinates } from './distanceCalculation';

// Client-side rate limiting to prevent 429 errors
const LOCATION_UPDATE_COOLDOWN = 1800000; // 30 minutes (match server)
const LOCATION_TIMESTAMP_KEY = 'bumpin_location_last_update';
const LOCATION_BLOCKED_KEY = 'bumpin_location_browser_blocked';

// Export type for location result
export type LocationResult = {
  success: boolean;
  blockedByBrowser: boolean;
  error?: string;
};

/**
 * Check if location permission is blocked at the browser level
 * Returns 'granted', 'denied', 'prompt', or 'unknown' (Safari)
 */
export async function checkLocationPermissionState(): Promise<'granted' | 'denied' | 'prompt' | 'unknown'> {
  if (!navigator.permissions || !navigator.permissions.query) {
    // Safari doesn't support permissions.query for geolocation
    return 'unknown';
  }
  
  try {
    const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
    console.log('[Location] Permission state:', result.state);
    return result.state as 'granted' | 'denied' | 'prompt';
  } catch {
    // Safari throws on this query
    return 'unknown';
  }
}

/**
 * Check if location was previously blocked by browser (cached)
 */
export function wasLocationBlockedByBrowser(): boolean {
  return localStorage.getItem(LOCATION_BLOCKED_KEY) === 'true';
}

/**
 * Clear the browser-blocked flag (e.g., when user says they fixed settings)
 */
export function clearLocationBlockedFlag(): void {
  localStorage.removeItem(LOCATION_BLOCKED_KEY);
}

/**
 * Request browser location permission and update on server
 * Safari-compatible with extended timeout and better error handling
 * Returns detailed result including whether browser blocked the request
 */
export async function requestAndUpdateLocation(sessionToken: string): Promise<boolean> {
  const result = await requestAndUpdateLocationDetailed(sessionToken);
  return result.success;
}

/**
 * Detailed version that returns more info about why location failed
 */
export async function requestAndUpdateLocationDetailed(sessionToken: string): Promise<LocationResult> {
  // CLIENT-SIDE RATE LIMIT CHECK: Prevent 429 errors
  const lastUpdateStr = localStorage.getItem(LOCATION_TIMESTAMP_KEY);
  const lastUpdate = lastUpdateStr ? parseInt(lastUpdateStr) : 0;
  const timeSinceLastUpdate = Date.now() - lastUpdate;
  
  if (timeSinceLastUpdate < LOCATION_UPDATE_COOLDOWN) {
    const minutesRemaining = Math.ceil((LOCATION_UPDATE_COOLDOWN - timeSinceLastUpdate) / 60000);
    console.log(`[Location] ⏱️ Skipping update - already updated ${Math.round(timeSinceLastUpdate/60000)} min ago (${minutesRemaining} min remaining)`);
    return { success: true, blockedByBrowser: false };
  }
  
  // Detect browser for special handling
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isAndroid = /Android/i.test(navigator.userAgent);
  
  if (isSafari || isIOS) {
    console.log('[Location] 🍎 Safari/iOS detected - using extended timeout');
  }
  
  // Pre-check permission state (Chrome/Firefox)
  const permState = await checkLocationPermissionState();
  if (permState === 'denied') {
    console.error('[Location] ❌ Permission pre-denied by browser settings');
    localStorage.setItem(LOCATION_BLOCKED_KEY, 'true');
    return { 
      success: false, 
      blockedByBrowser: true,
      error: 'Location is blocked in your browser settings. Please enable it to see nearby people.'
    };
  }
  
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.error('[Location] Geolocation not supported');
      resolve({ success: false, blockedByBrowser: false, error: 'Geolocation not supported' });
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        console.log('[Location] Got coordinates:', { latitude, longitude, accuracy });
        
        // Clear blocked flag on success
        localStorage.removeItem(LOCATION_BLOCKED_KEY);
        
        // Round for privacy (~100m precision)
        const rounded = roundCoordinates(latitude, longitude);
        
        try {
          const response = await fetch(`${API_BASE}/location/update`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${sessionToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              latitude: rounded.lat,
              longitude: rounded.lon,
              accuracy
            }),
          });
          
          if (response.ok) {
            console.log('[Location] ✅ Updated successfully');
            localStorage.setItem(LOCATION_TIMESTAMP_KEY, Date.now().toString());
            resolve({ success: true, blockedByBrowser: false });
          } else if (response.status === 429) {
            const errorData = await response.json().catch(() => ({}));
            console.warn('[Location] ⏱️ Rate limited by server:', errorData);
            localStorage.setItem(LOCATION_TIMESTAMP_KEY, Date.now().toString());
            resolve({ success: true, blockedByBrowser: false });
          } else {
            const errorData = await response.json().catch(() => ({}));
            console.error('[Location] ❌ Update failed:', response.status, errorData);
            resolve({ success: false, blockedByBrowser: false, error: 'Server error' });
          }
        } catch (error) {
          console.error('[Location] API error:', error);
          resolve({ success: false, blockedByBrowser: false, error: 'Network error' });
        }
      },
      (error) => {
        // ENHANCED ERROR HANDLING
        const errorMessages = {
          1: 'PERMISSION_DENIED',
          2: 'POSITION_UNAVAILABLE', 
          3: 'TIMEOUT'
        };
        
        console.error('[Location] Error:', errorMessages[error.code as keyof typeof errorMessages] || 'Unknown');
        console.error('[Location] Details:', { code: error.code, message: error.message });
        
        // PERMISSION_DENIED (code 1) = blocked by browser or user
        if (error.code === 1) {
          // Mark as browser-blocked for future reference
          localStorage.setItem(LOCATION_BLOCKED_KEY, 'true');
          
          let instructions = '';
          if (isIOS) {
            instructions = 'Go to Settings → Privacy & Security → Location Services → Safari Websites → set to "While Using"';
          } else if (isSafari) {
            instructions = 'Click Safari menu → Settings for This Website → Location → Allow';
          } else if (isAndroid) {
            instructions = 'Go to Settings → Apps → Chrome → Permissions → Location → Allow';
          } else {
            instructions = 'Click the lock icon in the address bar → Site settings → Location → Allow';
          }
          
          resolve({ 
            success: false, 
            blockedByBrowser: true,
            error: instructions
          });
        } else {
          // Timeout or position unavailable - not a browser block
          resolve({ 
            success: false, 
            blockedByBrowser: false,
            error: error.code === 3 ? 'Location request timed out' : 'Could not determine location'
          });
        }
      },
      {
        enableHighAccuracy: false,
        timeout: isSafari || isIOS ? 15000 : 10000,
        maximumAge: 300000,
      }
    );
  });
}

/**
 * Clear user's location from server
 */
export async function clearLocation(sessionToken: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/location/clear`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
      },
    });
    
    return response.ok;
  } catch (error) {
    console.error('[Location] Clear failed:', error);
    return false;
  }
}

/**
 * Check location sharing status
 */
export async function checkLocationStatus(sessionToken: string): Promise<{
  active: boolean;
  updatedAt: string | null;
  expiresIn: number;
}> {
  try {
    const response = await fetch(`${API_BASE}/location/status`, {
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
      },
    });
    
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('[Location] Status check failed:', error);
  }
  
  return { active: false, updatedAt: null, expiresIn: 0 };
}

export { formatDistance };

