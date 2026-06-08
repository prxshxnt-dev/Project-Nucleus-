import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, RefreshCw, KeyRound, ShieldCheck, MailCheck, Timer } from 'lucide-react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { toast } from 'sonner';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const location = useLocation();

  // Retrieve states that might be passed on from code verification
  const state = location.state as {
    email: string;
    otp: string;
    verified: boolean;
  } | null;

  // Forgot password method: 'firebase' | 'otp'
  const [forgotMethod, setForgotMethod] = useState<'firebase' | 'otp'>('firebase');
  // Mode state: 'request' | 'reset' (only used for OTP flow)
  const [mode, setMode] = useState<'request' | 'reset'>('request');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Firebase specific states
  const [firebaseResetSuccess, setFirebaseResetSuccess] = useState(false);

  // Inline OTP states for Forgot Password
  const [isOtpMode, setIsOtpMode] = useState(false);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [simulatedOtpCode, setSimulatedOtpCode] = useState<string | null>(null);
  const [isSimulated, setIsSimulated] = useState(false);
  const [cooldown, setCooldown] = useState(60);
  const [isResending, setIsResending] = useState(false);
  const [alreadyHaveOtp, setAlreadyHaveOtp] = useState(false);

  // Switch mode to reset if already coming verified from VerifyOtp
  useEffect(() => {
    if (state && state.verified && state.email && state.otp) {
      setForgotMethod('otp');
      setMode('reset');
      setEmail(state.email);
      setEnteredOtp(state.otp);
    }
  }, [state]);

  // Cooldown countdown timer for OTP resend
  useEffect(() => {
    let timer: any;
    if (isOtpMode && cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isOtpMode, cooldown]);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailClean = email.toLowerCase().trim();
    if (!emailClean) {
      toast.error('Please enter your email address first.');
      return;
    }

    setIsSubmitting(true);
    
    if (forgotMethod === 'firebase') {
      try {
        await sendPasswordResetEmail(auth, emailClean);
        setFirebaseResetSuccess(true);
        toast.success('Password reset email issued successfully!');
      } catch (err: any) {
        console.error('Firebase Auth Reset Request error:', err);
        let friendlyError = err.message || 'Failed to dispatch Firebase reset email.';
        if (err.code === 'auth/user-not-found' || err.message?.includes('user-not-found')) {
          friendlyError = 'No registered Firebase student account found with this email.';
        } else if (err.code === 'auth/invalid-email' || err.message?.includes('invalid-email')) {
          friendlyError = 'Please provide a valid email format.';
        } else if (err.code === 'auth/too-many-requests' || err.message?.includes('too-many-requests')) {
          friendlyError = 'Too many requests. Please wait a moment before trying again.';
        }
        toast.error(friendlyError);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // OTP-based custom reset
      try {
        const response = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailClean }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to request password reset code.');
        }

        toast.success(data.message || 'Verification email dispatched successfully!');
        
        // Keep state and enter Forgot Password OTP verification inline mode
        setSimulatedOtpCode(data.otp || null);
        setIsSimulated(!!data.simulated);
        setCooldown(60);
        setIsOtpMode(true);
      } catch (err: any) {
        toast.error(err.message || 'An error occurred during verification dispatch.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredOtp.length < 6) {
      toast.error('Please enter the full 6-digit verification PIN.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          otp: enteredOtp,
          type: 'reset'
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Password Reset Verification failed.');
      }

      toast.success('Security identity verified. Set your new password.');
      setIsOtpMode(false);
      setMode('reset');
    } catch (err: any) {
      toast.error(err.message || 'Verification failed. Please retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0 || isResending) return;

    setIsResending(true);
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend verification code.');
      }

      toast.success(data.message || 'Verification PIN sent successfully!');
      setCooldown(60);
      
      setSimulatedOtpCode(data.otp || null);
      setIsSimulated(!!data.simulated);
    } catch (err: any) {
      toast.error(err.message || 'Failed to resend. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error('Password must contain at least 6 characters.');
      return;
    }

    const activeOtp = enteredOtp || state?.otp;
    if (!activeOtp) {
      toast.error('Identity validation code has expired. Please try again.');
      setMode('request');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          otp: activeOtp,
          newPassword
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save new password.');
      }

      toast.success('Your credentials have been updated successfully! Please login with your new password.');
      navigate('/login', { replace: true });
    } catch (err: any) {
      toast.error(err.message || 'Failed to update credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 flex items-center justify-center bg-[#FDF5E6]">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md p-8 bg-[#FFFDF9] rounded-3xl border border-black/10 shadow-xl text-[#1F1F1F]"
      >
        {/* Render Form Request Option */}
        {mode === 'request' ? (
          <>
            {/* Header */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full text-primary mb-4">
                <KeyRound className="w-6 h-6" />
              </div>
              <h2 className="font-display font-extrabold text-3xl">Forgot Password</h2>
              <p className="text-[#7A7A7A] text-sm mt-1.5 px-4">
                Retrieve or reset your coaching portal password.
              </p>
            </div>

            {/* Success feedback screen for Firebase Reset */}
            {firebaseResetSuccess ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6 text-center py-4"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/10 rounded-full text-green-600 mb-2">
                  <MailCheck className="w-9 h-9 animate-bounce" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-bold text-xl text-green-700">Check Your Email</h3>
                  <p className="text-sm text-[#555555] leading-relaxed">
                    A Firebase password reset link has been dispatched to:
                    <span className="block font-bold text-[#1F1F1F] mt-1 break-all bg-[#FDF5E6] p-2 rounded-xl border border-black/5">{email}</span>
                  </p>
                  <p className="text-xs text-[#7A7A7A] leading-relaxed">
                    Please click the secure link in the email to define your new password. Check your spam/junk folder if the reset link does not show up within 2 minutes.
                  </p>
                </div>
                
                <div className="pt-2 flex flex-col gap-2.5">
                  <button
                    onClick={() => {
                      setFirebaseResetSuccess(false);
                      setEmail('');
                    }}
                    className="w-full py-3.5 bg-[#FAF0E4] hover:bg-[#F3E5D4] text-[#1F1F1F] font-bold rounded-2xl text-sm transition-all duration-200 border border-black/5"
                  >
                    Send to another email
                  </button>
                  <Link 
                    to="/login" 
                    className="w-full py-3.5 bg-primary hover:bg-primary-dark text-white font-bold rounded-2xl text-sm transition-all duration-200 flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Return to Login</span>
                  </Link>
                </div>
              </motion.div>
            ) : (
              <AnimatePresence mode="wait">
                {isOtpMode ? (
                  <motion.div
                    key="otp-verification-panel"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                    {/* Back Link */}
                    <button 
                      onClick={() => setIsOtpMode(false)}
                      className="inline-flex items-center gap-1 text-sm font-bold text-[#7A7A7A] hover:text-primary transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back to Email</span>
                    </button>

                    {/* Header */}
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full text-primary mb-3">
                        <ShieldCheck className="w-7 h-7" />
                      </div>
                      <h2 className="font-display font-extrabold text-2xl">Confirm Reset Code</h2>
                      <p className="text-[#7A7A7A] text-xs mt-1.5 leading-relaxed px-2">
                        Enter the verification code sent to <strong className="text-[#1F1F1F] font-bold block mt-0.5">{email}</strong>
                      </p>
                    </div>

                    {/* Sandbox Info */}
                    {isSimulated && simulatedOtpCode && (
                      <div className="p-3.5 bg-[#FFFAEB] border border-[#FFE082] rounded-2xl text-center space-y-2">
                        <p className="text-[10px] text-[#856404] font-medium leading-relaxed">
                          🔑 <strong>Sandbox / Simulation Mode</strong>:<br />
                          Copy the dynamic custom PIN to continue:
                        </p>
                        <div className="flex items-center justify-center gap-2">
                          <span className="font-mono text-sm font-black text-primary tracking-widest px-2.5 py-0.5 bg-white border border-primary/20 rounded-md">
                            {simulatedOtpCode}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setEnteredOtp(simulatedOtpCode);
                              toast.success("Security PIN auto-filled successfully!");
                            }}
                            className="px-2 py-0.5 text-[10px] bg-primary hover:bg-primary/95 text-white rounded-md font-bold transition-all duration-200 shadow-sm"
                          >
                            Auto-fill PIN
                          </button>
                        </div>
                      </div>
                    )}

                    <form onSubmit={handleVerifyOtp} className="space-y-5">
                      <div>
                        <label className="text-[10px] font-bold text-[#1F1F1F] uppercase tracking-wider block mb-1.5 ml-1">Verification Code</label>
                        <input 
                          type="text"
                          maxLength={6}
                          value={enteredOtp}
                          onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, ''))}
                          placeholder="••••••"
                          required
                          className="w-full text-center text-2xl font-black tracking-[0.5em] py-3 bg-[#FDF5E6] border border-black/10 rounded-2xl text-[#1F1F1F] placeholder-[#7A7A7A] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-200"
                        />
                      </div>

                      {/* Verify Action Button */}
                      <motion.button 
                        type="submit" 
                        disabled={isSubmitting}
                        className={`w-full py-4 bg-primary hover:bg-primary-dark text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-md transition-all duration-200 ${isSubmitting ? 'opacity-75 cursor-not-allowed' : ''}`}
                      >
                        {isSubmitting ? (
                          <>
                            <RefreshCw className="w-5 h-5 animate-spin" />
                            <span>Verifying Security Code...</span>
                          </>
                        ) : (
                          <>
                            <span>Verify & Continue</span>
                            <ArrowRight className="w-5 h-5" />
                          </>
                        )}
                      </motion.button>
                    </form>

                    {/* Resend Cooldown Section */}
                    <div className="pt-4 border-t border-black/5 text-center">
                      <p className="text-[#7A7A7A] text-xs">
                        Didn't receive the verification PIN?
                      </p>
                      {cooldown > 0 ? (
                        <div className="inline-flex items-center gap-1 text-[10px] text-primary font-bold mt-1.5 py-1 px-2.5 bg-primary/5 rounded-full">
                          <Timer className="w-3 h-3" />
                          <span>Resend available in {cooldown}s</span>
                        </div>
                      ) : (
                        <button
                          onClick={handleResendOtp}
                          disabled={isResending}
                          type="button"
                          className="mt-1.5 text-primary hover:text-primary-dark font-extrabold select-none text-xs underline transition-colors inline-flex items-center gap-1 mx-auto"
                        >
                          {isResending ? (
                            <>
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              <span>Resending...</span>
                            </>
                          ) : (
                            <span>Resend Security Pin</span>
                          )}
                        </button>
                      )}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="request-email-panel"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                  >
                    {/* Dual Toggle Tabs */}
                    <div className="flex gap-2 mb-6 bg-[#FDF5E6] p-1 rounded-2xl border border-black/10">
                      <button
                        type="button"
                        onClick={() => setForgotMethod('firebase')}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${forgotMethod === 'firebase' ? 'bg-primary text-white shadow-sm' : 'text-[#7A7A7A] hover:text-[#1F1F1F]'}`}
                      >
                        Firebase Reset Link
                      </button>
                      <button
                        type="button"
                        onClick={() => setForgotMethod('otp')}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${forgotMethod === 'otp' ? 'bg-primary text-white shadow-sm' : 'text-[#7A7A7A] hover:text-[#1F1F1F]'}`}
                      >
                        Custom OTP Verification
                      </button>
                    </div>

                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (forgotMethod === 'otp' && alreadyHaveOtp) {
                          handleVerifyOtp(e);
                        } else {
                          handleRequestReset(e);
                        }
                      }} 
                      className="space-y-5"
                    >
                      <div className="relative">
                        <label className="text-xs font-bold text-[#1F1F1F] uppercase tracking-wider block mb-1.5 ml-1">Student Email</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7A7A7A]">
                            <Mail className="w-5 h-5" />
                          </span>
                          <input 
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="student@nucleus.cc"
                            required
                            className="w-full pl-12 pr-4 py-3.5 bg-[#FDF5E6] border border-black/10 rounded-2xl text-[#1F1F1F] placeholder-[#7A7A7A] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-200"
                          />
                        </div>
                      </div>

                      {forgotMethod === 'otp' && (
                        <div className="flex items-center gap-2.5 py-1 ml-1 select-none">
                          <input
                            type="checkbox"
                            id="alreadyHaveOtp"
                            checked={alreadyHaveOtp}
                            onChange={(e) => setAlreadyHaveOtp(e.target.checked)}
                            className="w-4 h-4 text-primary border-black/15 bg-[#FDF5E6] rounded focus:ring-primary focus:ring-offset-0 cursor-pointer accent-primary"
                          />
                          <label htmlFor="alreadyHaveOtp" className="text-xs font-bold text-[#1F1F1F] uppercase tracking-wider cursor-pointer select-none">
                            I already have an OTP code
                          </label>
                        </div>
                      )}

                      {forgotMethod === 'otp' && alreadyHaveOtp && (
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-[#1F1F1F] uppercase tracking-wider block ml-1">
                            Verification Code (6-digit)
                          </label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7A7A7A]">
                              <ShieldCheck className="w-5 h-5" />
                            </span>
                            <input 
                              type="text"
                              maxLength={6}
                              value={enteredOtp}
                              onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, ''))}
                              placeholder="000000"
                              required
                              className="w-full pl-12 pr-4 py-3.5 bg-[#FDF5E6] border border-black/10 rounded-2xl text-center text-xl font-bold tracking-[0.25em] text-[#1F1F1F] placeholder-[#7A7A7A] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-200"
                            />
                          </div>
                        </div>
                      )}

                      {/* Action Button */}
                      <motion.button 
                        type="submit" 
                        disabled={isSubmitting}
                        className={`w-full py-4 bg-primary hover:bg-primary-dark text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-md transition-all duration-200 ${isSubmitting ? 'opacity-75 cursor-not-allowed' : ''}`}
                      >
                        {isSubmitting ? (
                          <>
                            <RefreshCw className="w-5 h-5 animate-spin" />
                            <span>
                              {forgotMethod === 'otp' && alreadyHaveOtp ? 'Verifying security code...' : 'Processing request...'}
                            </span>
                          </>
                        ) : (
                          <>
                            <span>
                              {forgotMethod === 'firebase' 
                                ? 'Send Firebase Reset Email' 
                                : (alreadyHaveOtp ? 'Verify OTP & Continue' : 'Request dynamic OTP code')
                              }
                            </span>
                            <ArrowRight className="w-5 h-5" />
                          </>
                        )}
                      </motion.button>
                    </form>

                    <div className="text-center mt-6">
                      <Link to="/login" className="inline-flex items-center gap-1.5 text-sm font-bold text-[#7A7A7A] hover:text-primary transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        <span>Return to Login</span>
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </>
        ) : (
          <>
            {/* Reset Form Option (only for custom OTP flow) */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-green-500/10 rounded-full text-green-600 mb-4">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h2 className="font-display font-extrabold text-3xl">Set New Password</h2>
              <p className="text-[#7A7A7A] text-sm mt-1.5">
                Identity successfully verified for <strong className="text-black">{email}</strong>. Select your new pass phrase.
              </p>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-5">
              {/* New Password Field */}
              <div className="relative">
                <label className="text-xs font-bold text-[#1F1F1F] uppercase tracking-wider block mb-1.5 ml-1">New Password</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7A7A7A]">
                    <Lock className="w-5 h-5" />
                  </span>
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    required
                    className="w-full pl-12 pr-12 py-3.5 bg-[#FDF5E6] border border-black/10 rounded-2xl text-[#1F1F1F] placeholder-[#7A7A7A] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-200"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#7A7A7A] hover:text-[#1F1F1F] transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Action Button */}
              <motion.button 
                type="submit" 
                disabled={isSubmitting}
                className={`w-full py-4 bg-primary hover:bg-primary-dark text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-md transition-all duration-200 ${isSubmitting ? 'opacity-75' : ''}`}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Saving new key...</span>
                  </>
                ) : (
                  <span>Commit credentials changes</span>
                )}
              </motion.button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
}
