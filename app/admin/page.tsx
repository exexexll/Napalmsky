'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { getSession } from '@/lib/session';
import { getPendingReviews, getAllReports, reviewBan, getReportStats } from '@/lib/api';
import { API_BASE } from '@/lib/config';

interface Report {
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

interface BanRecord {
  userId: string;
  userName: string;
  userSelfie?: string;
  userVideo?: string;
  banStatus: 'temporary' | 'permanent';
  bannedAt: number;
  bannedReason: string;
  reportCount: number;
  reviewStatus: string;
  reports: Report[];
}

interface Stats {
  totalReports: number;
  totalBans: number;
  pendingReviews: number;
  permanentBans: number;
  temporaryBans: number;
  vindicated: number;
}

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [pendingReviews, setPendingReviews] = useState<BanRecord[]>([]);
  const [allReports, setAllReports] = useState<Report[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selectedUser, setSelectedUser] = useState<BanRecord | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'reports' | 'qrcodes'>('pending');
  const [qrCodes, setQrCodes] = useState<any[]>([]);
  const [generatingQR, setGeneratingQR] = useState(false);
  const [qrLabel, setQrLabel] = useState('');

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.push('/onboarding');
      return;
    }

    loadData();
  }, [router]);

  const loadData = async () => {
    const session = getSession();
    if (!session) return;

    try {
      setLoading(true);
      const [pending, reports, statsData, codes] = await Promise.all([
        getPendingReviews(session.sessionToken),
        getAllReports(session.sessionToken),
        getReportStats(session.sessionToken),
        fetch(`${API_BASE}/payment/admin/codes`, {
          headers: { 'Authorization': `Bearer ${session.sessionToken}` },
        }).then(r => r.json()).catch(() => ({ codes: [] })),
      ]);

      setPendingReviews(pending.pending || []);
      setAllReports(reports.reports || []);
      setStats(statsData);
      setQrCodes(codes.codes || []);
    } catch (error) {
      console.error('[Admin] Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateQRCode = async () => {
    const session = getSession();
    if (!session) return;

    setGeneratingQR(true);
    try {
      const res = await fetch(`${API_BASE}/payment/admin/generate-code`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.sessionToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ label: qrLabel || 'Admin QR Code' }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to generate code');
      }

      const data = await res.json();
      console.log('[Admin] Generated QR code:', data.code);
      
      // Reload codes
      await loadData();
      setQrLabel('');
      alert(`QR Code generated: ${data.code}`);
    } catch (error: any) {
      console.error('[Admin] Failed to generate QR code:', error);
      alert(error.message || 'Failed to generate QR code');
    } finally {
      setGeneratingQR(false);
    }
  };

  const handleDeactivateCode = async (code: string) => {
    const session = getSession();
    if (!session) return;

    if (!confirm(`Deactivate code ${code}?`)) return;

    try {
      await fetch(`${API_BASE}/payment/admin/deactivate-code`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.sessionToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      await loadData();
    } catch (error) {
      console.error('[Admin] Failed to deactivate code:', error);
      alert('Failed to deactivate code');
    }
  };

  const handleReview = async (userId: string, decision: 'permanent' | 'vindicated') => {
    const session = getSession();
    if (!session) return;

    try {
      setReviewing(true);
      await reviewBan(session.sessionToken, userId, decision);
      
      // Reload data
      await loadData();
      setSelectedUser(null);
    } catch (error) {
      console.error('[Admin] Failed to review ban:', error);
      alert('Failed to submit review');
    } finally {
      setReviewing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0c]">
        <div className="text-center">
          <div className="mb-4 text-4xl">⏳</div>
          <p className="text-[#eaeaf0]/70">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0c] p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-playfair text-3xl font-bold text-[#eaeaf0] sm:text-4xl">
              Admin Panel
            </h1>
            <p className="mt-2 text-[#eaeaf0]/70">
              Review reports and manage banned users
            </p>
          </div>
          <button
            onClick={() => router.push('/main')}
            className="focus-ring rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-[#eaeaf0] transition-all hover:bg-white/20"
          >
            Back to Dashboard
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <div className="rounded-xl bg-white/5 p-4">
            <p className="text-sm text-[#eaeaf0]/50">Total Reports</p>
            <p className="mt-1 text-2xl font-bold text-[#eaeaf0]">{stats.totalReports}</p>
          </div>
          <div className="rounded-xl bg-orange-500/10 p-4">
            <p className="text-sm text-orange-300/70">Pending</p>
            <p className="mt-1 text-2xl font-bold text-orange-400">{stats.pendingReviews}</p>
          </div>
          <div className="rounded-xl bg-red-500/10 p-4">
            <p className="text-sm text-red-300/70">Permanent Bans</p>
            <p className="mt-1 text-2xl font-bold text-red-400">{stats.permanentBans}</p>
          </div>
          <div className="rounded-xl bg-yellow-500/10 p-4">
            <p className="text-sm text-yellow-300/70">Temporary Bans</p>
            <p className="mt-1 text-2xl font-bold text-yellow-400">{stats.temporaryBans}</p>
          </div>
          <div className="rounded-xl bg-green-500/10 p-4">
            <p className="text-sm text-green-300/70">Vindicated</p>
            <p className="mt-1 text-2xl font-bold text-green-400">{stats.vindicated}</p>
          </div>
          <div className="rounded-xl bg-white/5 p-4">
            <p className="text-sm text-[#eaeaf0]/50">Total Bans</p>
            <p className="mt-1 text-2xl font-bold text-[#eaeaf0]">{stats.totalBans}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b border-white/10">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'pending'
              ? 'border-b-2 border-[#ff9b6b] text-[#ff9b6b]'
              : 'text-[#eaeaf0]/50 hover:text-[#eaeaf0]/70'
          }`}
        >
          Pending Reviews ({pendingReviews.length})
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'reports'
              ? 'border-b-2 border-[#ff9b6b] text-[#ff9b6b]'
              : 'text-[#eaeaf0]/50 hover:text-[#eaeaf0]/70'
          }`}
        >
          All Reports ({allReports.length})
        </button>
        <button
          onClick={() => setActiveTab('qrcodes')}
          className={`px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'qrcodes'
              ? 'border-b-2 border-[#ff9b6b] text-[#ff9b6b]'
              : 'text-[#eaeaf0]/50 hover:text-[#eaeaf0]/70'
          }`}
        >
          QR Codes ({qrCodes.filter(c => c.type === 'admin').length})
        </button>
      </div>

      {/* Content */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          {pendingReviews.length === 0 ? (
            <div className="rounded-xl bg-white/5 p-8 text-center">
              <p className="text-[#eaeaf0]/70">No pending reviews</p>
            </div>
          ) : (
            pendingReviews.map((record) => (
              <div
                key={record.userId}
                className="rounded-xl bg-white/5 p-6 transition-all hover:bg-white/10"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4">
                      {record.userSelfie && (
                        <img
                          src={record.userSelfie || ''}
                          alt={record.userName}
                          className="h-16 w-16 rounded-full object-cover"
                        />
                      )}
                      <div>
                        <h3 className="text-xl font-bold text-[#eaeaf0]">{record.userName}</h3>
                        <p className="text-sm text-[#eaeaf0]/50">
                          {record.reportCount} reports • Banned {new Date(record.bannedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-lg bg-white/5 p-4">
                      <p className="text-sm font-medium text-[#eaeaf0]/70">Ban Reason:</p>
                      <p className="mt-1 text-[#eaeaf0]">{record.bannedReason}</p>
                    </div>

                    <div className="mt-4">
                      <p className="mb-2 text-sm font-medium text-[#eaeaf0]/70">
                        Reports ({record.reports.length}):
                      </p>
                      <div className="space-y-2">
                        {record.reports.slice(0, 5).map((report) => (
                          <div
                            key={report.reportId}
                            className="rounded-lg bg-white/5 p-3 text-sm"
                          >
                            <div className="flex justify-between">
                              <span className="text-[#eaeaf0]">By: {report.reporterName}</span>
                              <span className="text-[#eaeaf0]/50">
                                {new Date(report.timestamp).toLocaleDateString()}
                              </span>
                            </div>
                            {report.reason && (
                              <p className="mt-1 text-[#eaeaf0]/70">{report.reason}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => handleReview(record.userId, 'permanent')}
                    disabled={reviewing}
                    className="focus-ring flex-1 rounded-xl bg-red-500/80 px-6 py-3 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {reviewing ? 'Processing...' : 'Permanent Ban'}
                  </button>
                  <button
                    onClick={() => handleReview(record.userId, 'vindicated')}
                    disabled={reviewing}
                    className="focus-ring flex-1 rounded-xl bg-green-500/80 px-6 py-3 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {reviewing ? 'Processing...' : 'Vindicate'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="space-y-4">
          {allReports.length === 0 ? (
            <div className="rounded-xl bg-white/5 p-8 text-center">
              <p className="text-[#eaeaf0]/70">No reports found</p>
            </div>
          ) : (
            allReports.map((report) => (
              <div
                key={report.reportId}
                className="rounded-xl bg-white/5 p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-[#eaeaf0]">
                          {report.reportedUserName}
                        </h3>
                        <p className="text-sm text-[#eaeaf0]/50">
                          Reported by {report.reporterName}
                        </p>
                      </div>
                      <span className="text-sm text-[#eaeaf0]/50">
                        {new Date(report.timestamp).toLocaleString()}
                      </span>
                    </div>
                    
                    {report.reason && (
                      <div className="mt-3 rounded-lg bg-white/5 p-3">
                        <p className="text-sm text-[#eaeaf0]/70">{report.reason}</p>
                      </div>
                    )}
                    
                    <div className="mt-3 flex gap-4 text-xs text-[#eaeaf0]/50">
                      <span>Reporter IP: {report.reporterIp}</span>
                      {report.roomId && <span>Room: {report.roomId.substring(0, 8)}...</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'qrcodes' && (
        <div className="space-y-6">
          {/* Generate New Admin Code */}
          <div className="rounded-xl bg-purple-500/10 border border-purple-500/30 p-6">
            <h3 className="text-lg font-bold text-purple-300 mb-3">
              Generate Permanent QR Code
            </h3>
            <p className="text-sm text-[#eaeaf0]/70 mb-4">
              Create unlimited-use QR codes for events, trusted locations, etc.
            </p>
            
            <div className="flex gap-3">
              <input
                type="text"
                value={qrLabel}
                onChange={(e) => setQrLabel(e.target.value)}
                placeholder="Label (e.g., 'Campus Event 2025')"
                className="flex-1 rounded-lg bg-white/10 px-4 py-2.5 text-sm text-[#eaeaf0] placeholder-[#eaeaf0]/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={handleGenerateQRCode}
                disabled={generatingQR}
                className="focus-ring rounded-lg bg-purple-500 px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {generatingQR ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>

          {/* Admin Codes Only */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-[#eaeaf0]">Permanent QR Codes</h3>
            
            {qrCodes.filter(c => c.type === 'admin').length === 0 ? (
              <div className="rounded-xl bg-white/5 p-6 text-center">
                <p className="text-sm text-[#eaeaf0]/70">No permanent codes yet</p>
              </div>
            ) : (
              qrCodes.filter(c => c.type === 'admin').map((code) => (
                <div
                  key={code.code}
                  className={`rounded-xl p-5 ${
                    code.isActive ? 'bg-white/5' : 'bg-red-500/5 opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* QR Code */}
                    <div className="rounded-lg bg-white p-2 flex-shrink-0">
                      <img 
                        src={`${API_BASE}/payment/qr/${code.code}`}
                        alt="QR Code"
                        className="w-24 h-24"
                        onError={(e) => {
                          console.error('QR image failed to load for code:', code.code);
                          e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><text x="10" y="50" fill="red">Error</text></svg>';
                        }}
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-mono text-sm font-bold text-purple-300">
                          {code.code}
                        </h4>
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-500/20 text-purple-300">
                          UNLIMITED
                        </span>
                        {!code.isActive && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-300">
                            INACTIVE
                          </span>
                        )}
                      </div>
                      
                      <div className="text-xs text-[#eaeaf0]/50 mb-3">
                        {code.createdBy} • {new Date(code.createdAt).toLocaleDateString()} • {code.totalUsed} uses
                      </div>

                      <div className="flex gap-2">
                        <a
                          href={`${API_BASE}/payment/qr/${code.code}`}
                          download={`qr-${code.code}.png`}
                          className="focus-ring flex-1 rounded-lg bg-white/10 px-3 py-1.5 text-xs text-center font-medium text-[#eaeaf0] transition-all hover:bg-white/20"
                        >
                          Download
                        </a>
                        {code.isActive && (
                          <button
                            onClick={() => handleDeactivateCode(code.code)}
                            className="focus-ring flex-1 rounded-lg bg-red-500/20 px-3 py-1.5 text-xs font-medium text-red-300 transition-all hover:bg-red-500/30"
                          >
                            Deactivate
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </main>
  );
}

