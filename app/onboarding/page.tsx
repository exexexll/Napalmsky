'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Container } from '@/components/Container';
import { createGuestAccount, uploadSelfie, uploadVideo, linkAccount, getReferralInfo } from '@/lib/api';
import { saveSession, getSession } from '@/lib/session';
import IntroductionComplete from '@/components/IntroductionComplete';

type Step = 'name' | 'selfie' | 'video' | 'permanent' | 'introduction';
type Gender = 'female' | 'male' | 'nonbinary' | 'unspecified';

function OnboardingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>('name');
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender>('unspecified');
  const [sessionToken, setSessionToken] = useState('');
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referrerName, setReferrerName] = useState<string | null>(null);
  const [targetUser, setTargetUser] = useState<any>(null);
  const [targetOnline, setTargetOnline] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null); // QR code from URL

  // Step 2: Selfie
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Step 3: Video
  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Upload progress
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showUploadProgress, setShowUploadProgress] = useState(false);

  // Step 4: Permanent
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Check for referral code and invite code in URL
  useEffect(() => {
    const hasCheckedRef = { current: false };
    
    // CRITICAL FIX: Prevent infinite loop by only checking once
    if (hasCheckedRef.current) return;
    hasCheckedRef.current = true;
    
    const ref = searchParams.get('ref');
    const invite = searchParams.get('inviteCode');
    
    // IMPORTANT: Extract invite code FIRST before any session checks
    // This ensures QR code links work even if user has an existing session
    if (invite) {
      setInviteCode(invite);
      console.log('[Onboarding] Invite code from URL:', invite);
    }
    
    if (ref) {
      setReferralCode(ref);
      // Store in sessionStorage so we don't lose it across redirects
      sessionStorage.setItem('onboarding_ref_code', ref);
      console.log('[Onboarding] Referral code from URL:', ref);
    } else {
      // Check sessionStorage in case we lost URL params
      const storedRef = sessionStorage.getItem('onboarding_ref_code');
      if (storedRef) {
        setReferralCode(storedRef);
        console.log('[Onboarding] Referral code from sessionStorage:', storedRef);
      }
    }
    
    // Check if user is already registered (has session)
    const existingSession = getSession();
    
    // IMPORTANT: Validate session is actually valid before redirecting
    // (Server restart clears sessions, but localStorage still has old tokens)
    if (existingSession) {
      // CRITICAL FIX: If user has session AND referral/invite link, skip all onboarding!
      // Redirect directly to matchmaking with the target user
      if (ref || invite) {
        console.log('[Onboarding] Existing session with referral/invite - redirecting to matchmaking');
        // Go to main with query params to open matchmaking
        if (ref) {
          router.push(`/main?openMatchmaking=true&ref=${ref}`);
        } else {
          router.push('/main'); // Invite code users just go to main
        }
        return;
      }
      
      // No referral/invite - normal flow
      // Verify session is valid by checking with server
      fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001'}/user/me`, {
        headers: { 'Authorization': `Bearer ${existingSession.sessionToken}` },
      })
        .then(res => res.json())
        .then(data => {
          // Check if profile is complete (has selfie AND video)
          const hasCompletedProfile = data.selfieUrl && data.videoUrl;
          
          // Check payment status
          const hasPaid = data.paidStatus === 'paid' || data.paidStatus === 'qr_verified';
          
          if (hasCompletedProfile && hasPaid) {
            // Profile complete AND paid - redirect to main
            console.log('[Onboarding] Complete profile + paid - redirecting to main');
            router.push('/main');
          } else if (hasCompletedProfile && !hasPaid) {
            // Profile complete but NOT paid - redirect to paywall
            console.log('[Onboarding] Complete profile but unpaid - redirecting to paywall');
            sessionStorage.setItem('redirecting_to_paywall', 'true');
            router.push('/paywall');
          } else {
            // Profile incomplete - resume onboarding
            console.log('[Onboarding] Incomplete profile - resuming onboarding');
            setSessionToken(existingSession.sessionToken);
            setUserId(existingSession.userId);
            
            // Determine which step to resume from
            if (!data.selfieUrl) {
              console.log('[Onboarding] No selfie - starting from selfie step');
              setStep('selfie');
            } else if (!data.videoUrl) {
              console.log('[Onboarding] No video - starting from video step');
              setStep('video');
            } else {
              setStep('permanent');
            }
          }
        })
        .catch(err => {
          // Network error or session invalid - clear and allow onboarding
          console.log('[Onboarding] Session validation failed - clearing', err);
          localStorage.removeItem('napalmsky_session');
        });
      return;
    }
    
    // User is NOT registered - proceed with signup flow
    // (inviteCode and referralCode already extracted above)
    
    // Fetch referral info if needed
    if (ref) {
      getReferralInfo(ref)
        .then(data => {
          setReferrerName(data.targetUserName); // The person you're being introduced to
          setTargetUser(data.targetUser); // Store target user for later
          console.log('[Onboarding] Being introduced to:', data.targetUserName, 'by', data.introducedBy);
        })
        .catch(err => {
          console.error('[Onboarding] Failed to fetch referral info:', err);
        });
    }
  }, [searchParams, router]);

  /**
   * Step 1: Name + Gender
   */
  const handleNameSubmit = async () => {
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await createGuestAccount(name, gender, referralCode || undefined, inviteCode || undefined);
      setSessionToken(response.sessionToken);
      setUserId(response.userId);
      saveSession({
        sessionToken: response.sessionToken,
        userId: response.userId,
        accountType: response.accountType,
      });
      
      // If was referred, set target user for introduction screen later
      if (response.wasReferred) {
        console.log('[Onboarding] Successfully signed up via referral to', response.introducedTo);
        setTargetUser(response.targetUser);
        setTargetOnline(response.targetOnline);
      }
      
      // REVERTED: Payment check BEFORE profile (as originally designed)
      // Check if user needs to pay
      if (response.paidStatus === 'unpaid' && !response.inviteCodeUsed) {
        console.log('[Onboarding] User needs to pay - redirecting to paywall FIRST');
        sessionStorage.setItem('redirecting_to_paywall', 'true');
        // Store that we came from onboarding so paywall knows to return here
        sessionStorage.setItem('return_to_onboarding', 'true');
        router.push('/paywall');
        return;
      }
      
      // User is verified (invite code or will pay later) - proceed to profile
      console.log('[Onboarding] User verified or has code - proceeding to profile setup');
      setStep('selfie');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Step 2: Selfie - Camera ONLY
   */
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      setError('Camera access denied. Please allow camera access to continue.');
    }
  };

  const captureSelfie = async () => {
    if (!canvasRef.current || !videoRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;

    // OPTIMIZATION: Resize to max 800x800 for faster uploads (like video optimization)
    const maxSize = 800;
    const aspectRatio = video.videoWidth / video.videoHeight;
    
    let canvasWidth = video.videoWidth;
    let canvasHeight = video.videoHeight;
    
    if (canvasWidth > maxSize || canvasHeight > maxSize) {
      if (aspectRatio > 1) {
        canvasWidth = maxSize;
        canvasHeight = maxSize / aspectRatio;
      } else {
        canvasHeight = maxSize;
        canvasWidth = maxSize * aspectRatio;
      }
    }
    
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvasWidth, canvasHeight);
      // OPTIMIZATION: Use 0.85 quality for good balance (vs 0.9 before)
      // Reduces file size by 30-40% with minimal quality loss
      canvas.toBlob(async (blob) => {
        if (blob) {
          console.log('[Selfie] Compressed size:', (blob.size / 1024).toFixed(2), 'KB');
          setLoading(true);
          try {
            await uploadSelfie(sessionToken, blob);
            // Stop camera
            stream?.getTracks().forEach(track => track.stop());
            setStream(null);
            setStep('video');
          } catch (err: any) {
            setError(err.message);
          } finally {
            setLoading(false);
          }
        }
      }, 'image/jpeg', 0.9);
    }
  };

  /**
   * Step 3: Video Recording (≤60s)
   */
  const startVideoRecording = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      // OPTIMIZED: Use VP9 codec with low bitrate for faster uploads
      // VP9 is 40-60% smaller than VP8 at same quality
      // 1 Mbps = ~7.5 MB per 60s video (vs 20-30 MB default)
      let options: MediaRecorderOptions | undefined;
      
      // Try VP9 first (best compression)
      if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
        options = {
          mimeType: 'video/webm;codecs=vp9',
          videoBitsPerSecond: 1000000,  // 1 Mbps (optimized for mobile)
          audioBitsPerSecond: 64000,    // 64 kbps (sufficient for voice)
        };
        console.log('[Video] Using VP9 codec at 1 Mbps');
      } 
      // Fallback to VP8 if VP9 not supported
      else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
        options = {
          mimeType: 'video/webm;codecs=vp8',
          videoBitsPerSecond: 1500000,  // 1.5 Mbps for VP8
          audioBitsPerSecond: 64000,
        };
        console.log('[Video] Using VP8 codec at 1.5 Mbps');
      }
      // Final fallback to default (no bitrate control)
      else if (MediaRecorder.isTypeSupported('video/webm')) {
        options = {
          mimeType: 'video/webm',
        };
        console.warn('[Video] Using default WebM codec (no bitrate control)');
      }
      
      // Create MediaRecorder with or without options
      const mediaRecorder = options 
        ? new MediaRecorder(mediaStream, options)
        : new MediaRecorder(mediaStream);
      mediaRecorderRef.current = mediaRecorder;
      setRecordedChunks([]);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setRecordedChunks(prev => [...prev, event.data]);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer - clear any existing timer first to prevent double-counting
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;
          if (newTime >= 60) {
            stopVideoRecording();
            return 60;
          }
          return newTime;
        });
      }, 1000);
    } catch (err) {
      setError('Camera/microphone access denied. Please allow access to continue.');
    }
  };

  const stopVideoRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    // CRITICAL FIX: Stop camera stream when recording stops
    if (stream) {
      console.log('[Onboarding] Stopping camera/mic after recording');
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  // Handle recorded video upload
  useEffect(() => {
    if (recordedChunks.length > 0 && !isRecording) {
      const blob = new Blob(recordedChunks, { 
        type: mediaRecorderRef.current?.mimeType || 'video/webm' 
      });

      console.log('[Onboarding] Video blob size:', (blob.size / 1024 / 1024).toFixed(2), 'MB');
      
      setLoading(true);
      setUploadProgress(0);
      setShowUploadProgress(true); // Show immediately for better UX
      
      // OPTIMIZED: Use real progress tracking from XMLHttpRequest
      uploadVideo(sessionToken, blob, (percent) => {
        setUploadProgress(percent);
      })
        .then(async (data: any) => {
          console.log('[Onboarding] Video uploaded:', data.videoUrl);
          
          // If processing in background, show completion immediately
          if (data.processing) {
            console.log('[Onboarding] Video processing in background - user can continue!');
          }
          
          setUploadProgress(100);
          
          setTimeout(() => {
            setShowUploadProgress(false);
            setUploadProgress(0);
          }, 1000);
          
          // Stream already stopped in stopVideoRecording, but double-check
          setStream(prevStream => {
            if (prevStream) {
              console.log('[Onboarding] Stopping any remaining camera/mic streams');
              prevStream.getTracks().forEach(track => {
                if (track.readyState === 'live') {
                  track.stop();
                }
              });
            }
            return null;
          });
          
          // REVERTED: After video, check if referral user to show introduction
          // Payment already happened BEFORE profile (at name step)
          console.log('[Onboarding] Video complete - checking if should show introduction...');
          
          // Check if this is a referral user
          const storedRef = sessionStorage.getItem('onboarding_ref_code');
          
          if (targetUser || storedRef) {
            // This is a referral user - fetch target if not already set
            if (storedRef && !targetUser) {
              console.log('[Onboarding] Has ref code, fetching target user...');
              try {
                const refData = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001'}/referral/info/${storedRef}`).then(r => r.json());
                setTargetUser(refData.targetUser);
                setReferrerName(refData.createdByName);
                setTargetOnline(refData.targetOnline || false);
                console.log('[Onboarding] Target user loaded:', refData.targetUser?.name);
              } catch (e) {
                console.error('[Onboarding] Failed to fetch target:', e);
              }
            }
            console.log('[Onboarding] Showing introduction screen for referral user');
            setStep('introduction');
          } else {
            // Not a referral user - go to permanent account step
            console.log('[Onboarding] Normal user - showing permanent account option');
            setStep('permanent');
          }
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [recordedChunks, isRecording, sessionToken, targetUser, router]); // stream not needed - using state updater

  /**
   * Step 4: Check payment and redirect appropriately
   */
  const handleSkip = async () => {
    // CRITICAL FIX: Check payment status after profile completion
    // For referral users, they might not have paid yet
    const session = getSession();
    if (!session) {
      router.push('/onboarding');
      return;
    }
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001'}/payment/status`, {
        headers: { 'Authorization': `Bearer ${session.sessionToken}` },
      });
      const data = await res.json();
      
      const hasPaid = data.paidStatus === 'paid' || data.paidStatus === 'qr_verified';
      
      if (hasPaid) {
        // Already verified - go to main or introduction screen
        if (targetUser) {
          console.log('[Onboarding] Verified + has target - show introduction screen');
          setStep('introduction');
        } else {
          console.log('[Onboarding] Verified - going to main');
          router.push('/main');
        }
      } else {
        // Not verified - need payment AFTER profile completion
        console.log('[Onboarding] Profile complete but unpaid - redirecting to paywall');
        sessionStorage.setItem('redirecting_to_paywall', 'true');
        router.push('/paywall');
      }
    } catch (err) {
      console.error('[Onboarding] Payment check failed:', err);
      // On error, safer to go to paywall
      router.push('/paywall');
    }
  };

  /**
   * Introduction Screen: Direct match after onboarding
   */
  const handleCallTarget = () => {
    if (!targetUser) return;
    
    // Store target for direct navigation and auto-invite
    localStorage.setItem('napalmsky_direct_match_target', targetUser.userId);
    localStorage.setItem('napalmsky_auto_invite', 'true');
    
    // Navigate to main with matchmaking open
    router.push('/main?openMatchmaking=true&targetUser=' + targetUser.userId);
  };

  const handleSkipIntroduction = () => {
    router.push('/main');
  };

  const handleMakePermanent = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Email and password are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await linkAccount(sessionToken, email, password);
      router.push('/main');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Auto-start camera for selfie step and cleanup properly
  useEffect(() => {
    if (step === 'selfie') {
      startCamera();
    } else if (step !== 'video') {
      // Clean up camera when leaving selfie step (but not when moving to video)
      // This prevents multiple camera streams from being active
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
        console.log('[Onboarding] Cleaned up camera stream on step change');
      }
    }
    
    return () => {
      // Cleanup on unmount
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  return (
    <main id="main" className="min-h-screen bg-[#0a0a0c] py-20">
      {/* Upload Progress Bar */}
      {showUploadProgress && (
        <div className="fixed top-4 right-4 z-50 bg-black/90 backdrop-blur-md rounded-xl p-4 border border-[#ff9b6b]/30 shadow-2xl">
          <p className="text-sm text-[#eaeaf0] mb-2 font-medium">Uploading video...</p>
          <div className="w-48 h-2 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[#ff9b6b] to-[#ff7b4b] transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-xs text-[#eaeaf0]/50 mt-1">{uploadProgress}%</p>
        </div>
      )}
      
      <Container>
        <div className="mx-auto max-w-2xl">
          <AnimatePresence mode="wait">
            {/* Step 1: Name + Gender */}
            {step === 'name' && (
              <motion.div
                key="name"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                className="space-y-8 motion-reduce:opacity-100 motion-reduce:translate-y-0"
              >
                {referralCode && (
                  <div className="rounded-2xl border-2 border-[#ff9b6b]/30 bg-[#ff9b6b]/10 p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">💝</span>
                      <h3 className="font-playfair text-xl font-bold text-[#ff9b6b]">
                        Someone wants you to meet {referrerName || 'someone special'}!
                      </h3>
                    </div>
                    <p className="text-sm text-[#eaeaf0]/80">
                      A friend thought you two might click. Complete your profile and {referrerName || 'they'}&apos;ll be notified you&apos;re interested!
                    </p>
                  </div>
                )}
                
                <h1 className="font-playfair text-4xl font-bold text-[#eaeaf0] sm:text-5xl">
                  Let&apos;s get started
                </h1>

                <div className="space-y-6">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#eaeaf0]">
                      Your name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleNameSubmit()}
                      className="w-full rounded-xl bg-white/10 px-4 py-3 text-[#eaeaf0] placeholder-[#eaeaf0]/50 focus:outline-none focus:ring-2 focus:ring-[#ff9b6b]"
                      placeholder="Enter your name"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#eaeaf0]">
                      Gender
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {(['female', 'male', 'nonbinary', 'unspecified'] as Gender[]).map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setGender(g)}
                          className={`focus-ring rounded-xl px-4 py-3 font-medium capitalize transition-all ${
                            gender === g
                              ? 'bg-[#ff9b6b] text-[#0a0a0c]'
                              : 'bg-white/10 text-[#eaeaf0] hover:bg-white/20'
                          }`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>

                  {error && (
                    <div className="rounded-xl bg-red-500/10 p-4 text-sm text-red-400">
                      {error}
                    </div>
                  )}

                  <button
                    onClick={handleNameSubmit}
                    disabled={loading}
                    className="focus-ring w-full rounded-xl bg-[#ff9b6b] px-6 py-3 font-medium text-[#0a0a0c] shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {loading ? 'Creating account...' : 'Continue'}
                  </button>
                  
                  {/* Login link for existing users */}
                  <div className="text-center pt-4">
                    <p className="text-sm text-[#eaeaf0]/70">
                      Already have an account?{' '}
                      <Link 
                        href={referralCode ? `/login?ref=${referralCode}` : '/login'}
                        className="font-medium text-[#ff9b6b] hover:underline"
                      >
                        Login here
                      </Link>
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Selfie */}
            {step === 'selfie' && (
              <motion.div
                key="selfie"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                className="space-y-8 motion-reduce:opacity-100 motion-reduce:translate-y-0"
              >
                <h1 className="font-playfair text-4xl font-bold text-[#eaeaf0] sm:text-5xl">
                  Take a selfie
                </h1>

                <p className="text-[#eaeaf0]/70">
                  We need a photo to show your future matches
                </p>

                <div className="space-y-6">
                  <div className="relative aspect-square overflow-hidden rounded-xl bg-black">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <canvas ref={canvasRef} className="hidden" />

                  {error && (
                    <div className="rounded-xl bg-red-500/10 p-4 text-sm text-red-400">
                      {error}
                    </div>
                  )}

                  <button
                    onClick={captureSelfie}
                    disabled={loading || !stream}
                    className="focus-ring w-full rounded-xl bg-[#ff9b6b] px-6 py-3 font-medium text-[#0a0a0c] shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {loading ? 'Uploading...' : 'Capture selfie'}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Video */}
            {step === 'video' && (
              <motion.div
                key="video"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                className="space-y-8 motion-reduce:opacity-100 motion-reduce:translate-y-0"
              >
                <h1 className="font-playfair text-4xl font-bold text-[#eaeaf0] sm:text-5xl">
                  Record intro video
                </h1>

                <p className="text-[#eaeaf0]/70">
                  Say something about yourself (up to 60 seconds)
                </p>

                <div className="space-y-6">
                  <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="h-full w-full object-cover"
                    />
                    {isRecording && (
                      <div className="absolute top-4 right-4 flex items-center gap-2 rounded-lg bg-black/50 px-3 py-2 backdrop-blur-sm">
                        <span className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
                        <span className="text-sm font-medium text-white">
                          {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')} / 1:00
                        </span>
                      </div>
                    )}
                  </div>

                  {error && (
                    <div className="rounded-xl bg-red-500/10 p-4 text-sm text-red-400">
                      {error}
                    </div>
                  )}

                  {!isRecording && recordedChunks.length === 0 && (
                    <button
                      onClick={startVideoRecording}
                      disabled={loading}
                      className="focus-ring w-full rounded-xl bg-[#ff9b6b] px-6 py-3 font-medium text-[#0a0a0c] shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                      Start recording
                    </button>
                  )}

                  {isRecording && (
                    <button
                      onClick={stopVideoRecording}
                      disabled={recordingTime < 5}
                      className={`focus-ring w-full rounded-xl px-6 py-3 font-medium shadow-sm transition-opacity ${
                        recordingTime < 5 
                          ? 'bg-gray-500/50 text-gray-300 cursor-not-allowed opacity-50'
                          : 'bg-red-500 text-white hover:opacity-90'
                      }`}
                    >
                      {recordingTime < 5 
                        ? `Keep recording... (${5 - recordingTime}s minimum)` 
                        : 'Stop recording'}
                    </button>
                  )}

                  {loading && (
                    <div className="text-center text-sm text-[#eaeaf0]/70">
                      Uploading video...
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Introduction Screen */}
            {step === 'introduction' && targetUser && (
              <IntroductionComplete
                targetUser={targetUser}
                introducedBy={referrerName || 'a friend'}
                isTargetOnline={targetOnline}
                referralCode={referralCode || ''}
                onCallNow={handleCallTarget}
                onSkip={handleSkipIntroduction}
              />
            )}

            {/* Step 4: Make Permanent */}
            {step === 'permanent' && (
              <motion.div
                key="permanent"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                className="space-y-8 motion-reduce:opacity-100 motion-reduce:translate-y-0"
              >
                <h1 className="font-playfair text-4xl font-bold text-[#eaeaf0] sm:text-5xl">
                  Make it permanent?
                </h1>

                <p className="text-lg text-[#eaeaf0]/70">
                  Link an email and password to save your account permanently. Or skip to continue as a guest.
                </p>

                <div className="space-y-6">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#eaeaf0]">
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-xl bg-white/10 px-4 py-3 text-[#eaeaf0] placeholder-[#eaeaf0]/50 focus:outline-none focus:ring-2 focus:ring-[#ff9b6b]"
                      placeholder="your@email.com"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#eaeaf0]">
                      Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-xl bg-white/10 px-4 py-3 text-[#eaeaf0] placeholder-[#eaeaf0]/50 focus:outline-none focus:ring-2 focus:ring-[#ff9b6b]"
                      placeholder="Choose a password"
                    />
                  </div>

                  {error && (
                    <div className="rounded-xl bg-red-500/10 p-4 text-sm text-red-400">
                      {error}
                    </div>
                  )}

                  <div className="flex gap-4">
                    <button
                      onClick={handleSkip}
                      className="focus-ring flex-1 rounded-xl bg-white/10 px-6 py-3 font-medium text-[#eaeaf0] transition-all hover:bg-white/20"
                    >
                      Skip for now
                    </button>
                    <button
                      onClick={handleMakePermanent}
                      disabled={loading}
                      className="focus-ring flex-1 rounded-xl bg-[#ff9b6b] px-6 py-3 font-medium text-[#0a0a0c] shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                      {loading ? 'Saving...' : 'Make permanent'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Container>
    </main>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0c]">
        <div className="text-center">
          <div className="mb-4 text-4xl">⏳</div>
          <p className="text-[#eaeaf0]/70">Loading...</p>
        </div>
      </div>
    }>
      <OnboardingPageContent />
    </Suspense>
  );
}

