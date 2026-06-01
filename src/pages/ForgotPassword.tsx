import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, RefreshCw, KeyRound, ShieldCheck } from 'lucide-react';
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

  // Mode state: 'request' | 'reset'
  const [mode, setMode] = useState<'request' | 'reset'>('request');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Switch mode to reset if already coming verified from VerifyOtp
  useEffect(() => {
    if (state && state.verified && state.email && state.otp) {
      setMode('reset');
      setEmail(state.email);
    }
  }, [state]);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailClean = email.toLowerCase().trim();
    if (!emailClean) {
      toast.error('Please enter your email address first.');
      return;
    }

    setIsSubmitting(true);
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
      
      // Navigate to verifyOTP on reset path
      navigate('/verify-otp', {
        state: {
          email: emailClean,
          type: 'reset',
          simulated: data.simulated,
          simulatedOtp: data.otp
        }
      });
    } catch (err: any) {
      toast.error(err.message || 'An error occurred during verification dispatch.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error('Password must contain at least 6 characters.');
      return;
    }

    if (!state?.otp) {
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
          email: email,
          otp: state.otp,
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
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full text-primary mb-4">
                <KeyRound className="w-6 h-6" />
              </div>
              <h2 className="font-display font-extrabold text-3xl">Forgot Password</h2>
              <p className="text-[#7A7A7A] text-sm mt-1.5 px-4">
                Enter your registered student email below. We'll send an active verification code to recover credentials.
              </p>
            </div>

            <form onSubmit={handleRequestReset} className="space-y-5">
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

              {/* Action Button */}
              <motion.button 
                type="submit" 
                disabled={isSubmitting}
                className={`w-full py-4 bg-primary hover:bg-primary-dark text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-md transition-all duration-200 ${isSubmitting ? 'opacity-75 cursor-not-allowed' : ''}`}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Locating record...</span>
                  </>
                ) : (
                  <>
                    <span>Request verification key</span>
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
          </>
        ) : (
          <>
            {/* Reset Form Option */}
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
