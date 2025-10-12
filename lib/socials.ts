/**
 * Social handle normalization utilities
 * Strips URLs, @, www, etc. to get canonical handles
 */

import { API_BASE } from './config';

export function normalizeSocialHandle(platform: string, input: string): string {
  if (!input || !input.trim()) return '';

  let cleaned = input.trim();

  // Strip URLs
  cleaned = cleaned.replace(/^https?:\/\//, '');
  cleaned = cleaned.replace(/^www\./, '');
  
  // Strip domain parts
  cleaned = cleaned.replace(/instagram\.com\//gi, '');
  cleaned = cleaned.replace(/tiktok\.com\/@?/gi, '');
  cleaned = cleaned.replace(/x\.com\//gi, '');
  cleaned = cleaned.replace(/twitter\.com\//gi, '');
  cleaned = cleaned.replace(/snapchat\.com\/add\//gi, '');
  
  // Strip leading @
  cleaned = cleaned.replace(/^@+/, '');
  
  // Remove trailing slashes
  cleaned = cleaned.replace(/\/+$/, '');
  
  // Validate allowed characters (relaxed)
  cleaned = cleaned.replace(/[^a-zA-Z0-9._-]/g, '');
  
  // Max length 30
  return cleaned.slice(0, 30);
}

export function getDisplayURL(platform: string, handle: string): string {
  if (!handle) return '';
  
  const normalized = normalizeSocialHandle(platform, handle);
  
  switch (platform.toLowerCase()) {
    case 'instagram':
      return `https://instagram.com/${normalized}`;
    case 'tiktok':
      return `https://tiktok.com/@${normalized}`;
    case 'twitter':
    case 'x':
      return `https://x.com/${normalized}`;
    case 'snapchat':
      return `https://snapchat.com/add/${normalized}`;
    case 'discord':
      return normalized; // Discord uses username#0000 format
    default:
      return normalized;
  }
}

export async function updateUserSocials(sessionToken: string, socials: Record<string, string>) {
  const res = await fetch(`${API_BASE}/user/me`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessionToken}`,
    },
    body: JSON.stringify({ socials }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to update' }));
    throw new Error(error.error || 'Failed to update socials');
  }

  return res.json();
}

