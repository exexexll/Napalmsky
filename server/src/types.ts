// Core types for the application

export type Gender = 'female' | 'male' | 'nonbinary' | 'unspecified';
export type AccountType = 'guest' | 'permanent';
export type BanStatus = 'none' | 'temporary' | 'permanent' | 'vindicated';
export type ReviewStatus = 'pending' | 'reviewed_ban' | 'reviewed_vindicate';

export interface User {
  userId: string;
  name: string;
  gender: Gender;
  accountType: AccountType;
  email?: string;
  password_hash?: string; // bcrypt hashed password (cost factor: 12)
  selfieUrl?: string;
  videoUrl?: string;
  socials?: Record<string, string>; // Normalized social handles
  createdAt: number;
  // Metrics for Block 6
  timerTotalSeconds?: number;
  sessionCount?: number;
  lastSessions?: Array<{ at: number; duration: number }>;
  streakDays?: number;
  // Referral system
  referralCode?: string; // Unique code for this user
  referredBy?: string; // User ID of who referred them
  referrals?: string[]; // Array of user IDs this user has referred
  // Introduction system (matchmaker)
  introducedTo?: string; // User ID they were introduced to (target)
  introducedViaCode?: string; // Referral code used for introduction
  introducedBy?: string; // User ID of person who made the intro (creator)
  // Ban system
  banStatus?: BanStatus;
  bannedAt?: number;
  bannedReason?: string;
  reviewStatus?: ReviewStatus;
  // Paywall system
  paidStatus?: 'unpaid' | 'paid' | 'qr_verified';
  paidAt?: number;
  paymentId?: string; // Stripe payment intent ID
  inviteCodeUsed?: string; // QR/invite code used for free access
  myInviteCode?: string; // User's own invite code (5 uses)
  inviteCodeUsesRemaining?: number; // How many uses left on their code
}

export interface Report {
  reportId: string;
  reportedUserId: string;
  reportedUserName: string;
  reportedUserSelfie?: string;
  reportedUserVideo?: string;
  reporterUserId: string;
  reporterName: string;
  reporterIp: string;
  reason?: string;
  timestamp: number;
  roomId?: string;
}

export interface BanRecord {
  userId: string;
  userName: string;
  userSelfie?: string;
  userVideo?: string;
  banStatus: BanStatus;
  bannedAt: number;
  bannedReason: string;
  reportCount: number;
  reviewStatus: ReviewStatus;
  reviewedAt?: number;
  reviewedBy?: string;
  ipAddresses: string[];
}

export interface IPBan {
  ipAddress: string;
  bannedAt: number;
  userId: string;
  reason: string;
}

export interface ReferralNotification {
  id: string;
  forUserId: string; // Who should receive this notification (target)
  referredUserId: string; // The user who signed up (new person)
  referredName: string;
  introducedBy: string; // Who made the introduction (creator)
  introducedByName: string;
  timestamp: number;
  read: boolean;
}

export interface Session {
  sessionToken: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
  ipAddress?: string;
}

export interface InviteCode {
  code: string; // The actual code string (QR code content)
  createdBy: string; // userId who created it
  createdByName: string;
  createdAt: number;
  type: 'user' | 'admin'; // user codes have 5 uses, admin codes unlimited
  maxUses: number; // 5 for user, -1 for admin (unlimited)
  usesRemaining: number; // Decrements on each use
  usedBy: string[]; // Array of userIds who used this code
  isActive: boolean; // Can be deactivated by admin
}

export interface RateLimitRecord {
  ipAddress: string;
  attempts: number;
  firstAttemptAt: number;
  lastAttemptAt: number;
}

