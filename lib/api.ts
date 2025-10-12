/**
 * API client functions for Napalm Sky
 * Production-ready with centralized configuration
 */

import { API_BASE } from './config';

export async function createGuestAccount(name: string, gender: string, referralCode?: string, inviteCode?: string) {
  const res = await fetch(`${API_BASE}/auth/guest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, gender, referralCode, inviteCode }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to create account');
  }

  return res.json();
}

export async function linkAccount(sessionToken: string, email: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionToken, email, password }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to link account');
  }

  return res.json();
}

export async function login(email: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Login failed');
  }

  return res.json();
}

export async function uploadSelfie(sessionToken: string, blob: Blob) {
  const formData = new FormData();
  formData.append('selfie', blob, 'selfie.jpg');

  const res = await fetch(`${API_BASE}/media/selfie`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Upload failed');
  }

  return res.json();
}

export async function uploadVideo(sessionToken: string, blob: Blob) {
  // Ensure blob has correct MIME type by creating a new blob if needed
  const videoBlob = blob.type.startsWith('video/') 
    ? blob 
    : new Blob([blob], { type: 'video/webm' });
  
  const formData = new FormData();
  formData.append('video', videoBlob, 'intro.webm');

  const res = await fetch(`${API_BASE}/media/video`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Upload failed');
  }

  return res.json();
}

export async function getCurrentUser(sessionToken: string) {
  const res = await fetch(`${API_BASE}/user/me`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
    },
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to fetch user data');
  }

  return res.json();
}

export async function generateReferralLink(sessionToken: string, targetUserId: string) {
  const res = await fetch(`${API_BASE}/referral/generate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ targetUserId }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to generate referral link');
  }

  return res.json();
}

export async function getReferralInfo(code: string) {
  const res = await fetch(`${API_BASE}/referral/info/${code}`);

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Invalid referral code');
  }

  return res.json();
}

export async function getTargetStatus(code: string) {
  const res = await fetch(`${API_BASE}/referral/target-status/${code}`);

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to get target status');
  }

  return res.json();
}

export async function directMatch(sessionToken: string, referralCode: string) {
  const res = await fetch(`${API_BASE}/referral/direct-match`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ referralCode }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to direct match');
  }

  return res.json();
}

export async function getMyIntroductions(sessionToken: string) {
  const res = await fetch(`${API_BASE}/referral/my-introductions`, {
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
    },
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to get introductions');
  }

  return res.json();
}

export async function getReferralNotifications(sessionToken: string) {
  const res = await fetch(`${API_BASE}/referral/notifications`, {
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
    },
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to fetch notifications');
  }

  return res.json();
}

export async function markNotificationRead(sessionToken: string, notificationId: string) {
  const res = await fetch(`${API_BASE}/referral/notifications/${notificationId}/read`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
    },
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to mark notification as read');
  }

  return res.json();
}

// ===== Report & Ban System =====

export async function reportUser(sessionToken: string, reportedUserId: string, reason?: string, roomId?: string) {
  const res = await fetch(`${API_BASE}/report/user`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reportedUserId, reason, roomId }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to report user');
  }

  return res.json();
}

export async function checkBanStatus(sessionToken: string) {
  const res = await fetch(`${API_BASE}/report/check-ban`, {
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
    },
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to check ban status');
  }

  return res.json();
}

export async function getPendingReviews(sessionToken: string) {
  const res = await fetch(`${API_BASE}/report/pending`, {
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
    },
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to get pending reviews');
  }

  return res.json();
}

export async function getAllReports(sessionToken: string) {
  const res = await fetch(`${API_BASE}/report/all`, {
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
    },
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to get all reports');
  }

  return res.json();
}

export async function reviewBan(sessionToken: string, userId: string, decision: 'permanent' | 'vindicated') {
  const res = await fetch(`${API_BASE}/report/review/${userId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ decision }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to review ban');
  }

  return res.json();
}

export async function getBlacklist() {
  const res = await fetch(`${API_BASE}/report/blacklist`);

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to get blacklist');
  }

  return res.json();
}

export async function getReportStats(sessionToken: string) {
  const res = await fetch(`${API_BASE}/report/stats`, {
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
    },
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to get report stats');
  }

  return res.json();
}

