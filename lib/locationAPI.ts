/**
 * Location API Client
 * Frontend utilities for location-based features
 */

import { API_BASE } from './config';
import { formatDistance, roundCoordinates } from './distanceCalculation';

// Client-side rate limiting to prevent 429 errors
const LOCATION_UPDATE_COOLDOWN = 1800000; // 30 minutes (match server)
const LOCATION_TIMESTAMP_KEY = 'bumpin_location_last_update';

/**
 * Request browser location permission and update on server
 * Safari-compatible with extended timeout and better error handling
 */
export async function requestAndUpdateLocation(sessionToken: string): Promise<boolean> {
  // CLIENT-SIDE RATE LIMIT CHECK: Prevent 429 errors
  // Use localStorage to persist across sessions/page reloads
  const lastUpdateStr = localStorage.getItem(LOCATION_TIMESTAMP_KEY);
  const lastUpdate = lastUpdateStr ? parseInt(lastUpdateStr) : 0;
  const timeSinceLastUpdate = Date.now() - lastUpdate;
  
  if (timeSinceLastUpdate < LOCATION_UPDATE_COOLDOWN) {
    const minutesRemaining = Math.ceil((LOCATION_UPDATE_COOLDOWN - timeSinceLastUpdate) / 60000);
    console.log(`[Location] ⏱️ Skipping update - already updated ${Math.round(timeSinceLastUpdate/60000)} min ago (${minutesRemaining} min remaining)`);
    return true; // Return TRUE to not show error - location is still valid
  }
  
  // Detect Safari for special handling
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  
  if (isSafari || isIOS) {
    console.log('[Location] 🍎 Safari/iOS detected - using extended timeout');
  }
  
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.error('[Location] Geolocation not supported');
      resolve(false);
      return;
    }
    
    // Check if geolocation permission is available (Safari compatibility)
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName }).then((result) => {
        console.log('[Location] Permission state:', result.state);
        if (result.state === 'denied') {
          console.error('[Location] Permission denied by browser settings');
          resolve(false);
          return;
        }
      }).catch(() => {
        // Safari doesn't support permissions.query for geolocation, continue anyway
        console.log('[Location] permissions.query not supported, proceeding...');
      });
    }
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        console.log('[Location] Got coordinates:', { latitude, longitude, accuracy });
        
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
            resolve(true);
          } else if (response.status === 429) {
            // Rate limited - store timestamp anyway to prevent repeated 429s
            const errorData = await response.json().catch(() => ({}));
            console.warn('[Location] ⏱️ Rate limited by server:', errorData);
            localStorage.setItem(LOCATION_TIMESTAMP_KEY, Date.now().toString());
            resolve(true); // Return true - location is still active on server
          } else {
            const errorData = await response.json().catch(() => ({}));
            console.error('[Location] ❌ Update failed:', response.status, errorData);
            // Don't update timestamp on failure (allow retry)
            resolve(false);
          }
        } catch (error) {
          console.error('[Location] API error:', error);
          resolve(false);
        }
      },
      (error) => {
        // ENHANCED ERROR LOGGING FOR MOBILE DEBUGGING
        const errorMessages = {
          1: 'PERMISSION_DENIED - User or browser blocked location',
          2: 'POSITION_UNAVAILABLE - GPS/network issue', 
          3: 'TIMEOUT - Location request timed out'
        };
        
        console.error('[Location] Error:', errorMessages[error.code as keyof typeof errorMessages] || 'Unknown error');
        console.error('[Location] Full error details:', { 
          code: error.code, 
          message: error.message,
          userAgent: navigator.userAgent.substring(0, 50)
        });
        
        // For Safari/iOS, provide specific instructions
        if ((isSafari || isIOS) && error.code === 1) {
          console.log('[Location] 🍎 Safari/iOS permission denied');
          console.log('[Location] iOS: Settings → Privacy → Location Services → Safari → While Using');
          console.log('[Location] macOS Safari: Safari → Settings for This Website → Location → Allow');
        } else if (/Android/i.test(navigator.userAgent) && error.code === 1) {
          console.log('[Location] 📱 Android permission denied');
          console.log('[Location] Settings → Apps → Chrome → Permissions → Location → Allow');
        }
        
        resolve(false);
      },
      {
        enableHighAccuracy: false, // Battery-friendly
        // Safari on iOS needs longer timeout
        timeout: isSafari || isIOS ? 15000 : 10000,
        maximumAge: 300000, // 5 min cache OK
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

