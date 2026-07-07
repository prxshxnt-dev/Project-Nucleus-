import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Mail, ArrowLeft, RefreshCw, KeyRound, MailCheck } from 'lucide-react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { toast } from 'sonner';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [firebaseResetSuccess, setFirebaseResetSuccess] = useState(false);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailClean = email.toLowerCase().trim();
    if (!emailClean) {
      toast.error('Please enter your email address first.');
      return;
    }

    setIsSubmitting(true);
    try {
      await sendPasswordResetEmail(auth, emailClean);
      setFirebaseResetSuccess(true);
      toast.success('Password reset email issued successfully!');
    } catch (err: any) {
      console.error('Firebase Auth Reset Request error:', err);
      let friendlyError = err.message || 'Failed to dispatch Firebase reset email.';
      if (err.code === 'auth/user-not-found' || err.message?.includes('user-not-found')) {
        friendlyError = 'No registered student account found with this email.';
      } else if (err.code === 'auth/invalid-email' || err.message?.includes('invalid-email')) {
        friendlyError = 'Please provide a valid email format.';
      } else if (err.code === 'auth/too-many-requests' || err.message?.includes('too-many-requests')) {
        friendlyError = 'Too many requests. Please wait a moment before trying again.';
      }
      toast.error(friendlyError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 flex items-center justify-center bg-[#F8FAFC]">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md p-8 bg-[#FFFDF9] rounded-3xl border border-black/10 shadow-xl text-[#1F1F1F]"
      >
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
                A password reset link has been dispatched to:
                <span className="block font-bold text-[#1F1F1F] mt-1 break-all bg-[#F8FAFC] p-2 rounded-xl border border-black/5">{email}</span>
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
                  className="w-full pl-12 pr-4 py-3.5 bg-[#F8FAFC] border border-black/10 rounded-2xl text-[#1F1F1F] placeholder-[#7A7A7A] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-200"
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
                  <span>Processing request...</span>
                </>
              ) : (
                <>
                  <span>Send Reset Email</span>
                  <Mail className="w-5 h-5" />
                </>
              )}
            </motion.button>
            
            <div className="text-center mt-6">
              <Link to="/login" className="inline-flex items-center gap-1.5 text-sm font-bold text-[#7A7A7A] hover:text-primary transition-colors">
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Login</span>
              </Link>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
