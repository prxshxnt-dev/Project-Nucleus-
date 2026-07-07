import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowRight, 
  Lock, 
  User, 
  Mail, 
  Smartphone,
  Eye, 
  EyeOff, 
  GraduationCap, 
  BookOpen, 
  ShieldCheck, 
  Chrome,
  RefreshCw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import { toast } from 'sonner';
import FloatingLabelInput from '../components/FloatingLabelInput';

export default function Signup() {
  const { user, setUser, loading, setLoading } = useAuthStore();
  const navigate = useNavigate();

  // Verification States
  const [email, setEmail] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [photoURL, setPhotoURL] = useState<string | null>(null);

  // Form Registration States
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [classGroup, setClassGroup] = useState('11');
  
  // UI States
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if logged in
  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, navigate]);

  const handleVerifyWithGoogle = async () => {
    const emailClean = email.toLowerCase().trim();
    if (!emailClean) {
      toast.error('Please enter your email address first before verifying.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailClean)) {
      toast.error('Please enter a valid email address structure.');
      return;
    }

    setIsVerifying(true);
    try {
      // Use signInWithPopup from Firebase for the most robust iframe authentication
      const result = await signInWithPopup(auth, googleProvider);
      const googleUser = result.user;
      const googleEmail = googleUser.email?.toLowerCase().trim();

      if (googleEmail !== emailClean) {
        toast.error(`Verification Mismatch: The selected Google account (${googleEmail || 'unknown'}) does not match your entered email (${emailClean}).`, {
          duration: 6000
        });
        setIsVerified(false);
        setVerificationToken(null);
        await auth.signOut();
      } else {
        const idToken = await googleUser.getIdToken();
        setVerificationToken(idToken);
        setIsVerified(true);
        setPhotoURL(googleUser.photoURL || null);
        if (!name) {
          setName(googleUser.displayName || '');
        }
        // Sign out from Firebase Auth so it doesn't conflict with custom password credentials session
        await auth.signOut();
        toast.success('Email successfully verified with Google!');
      }
    } catch (err: any) {
      console.error('Google verification popup error:', err);
      if (err.code === 'auth/cancelled-popup-request' || err.code === 'auth/popup-closed-by-user') {
        toast.error('Google verification window closed. Please try again.');
      } else if (err.code === 'auth/network-request-failed' || err.message?.includes('network-request-failed')) {
        toast.error('Google popup blocked by browser/iframe rules. Please click "Open in new tab" at the top right of the screen to sign up successfully.');
      } else {
        toast.error(err.message || 'Google Auth verification failed. Please try again.');
      }
      setIsVerified(false);
      setVerificationToken(null);
    } finally {
      setIsVerifying(false);
    }
  };

  const validateForm = (): boolean => {
    if (!isVerified || !verificationToken) {
      toast.error('Please verify your email address with Google first.');
      return false;
    }
    if (!name.trim()) {
      toast.error('Please enter your full name.');
      return false;
    }
    if (!phone.trim()) {
      toast.error('Mobile Phone Number is required.');
      return false;
    }
    if (phone.trim().length < 8) {
      toast.error('Please provide a valid phone number.');
      return false;
    }
    if (password.length < 6) {
      toast.error('Password must contain at least 6 characters.');
      return false;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match. Please verify.');
      return false;
    }
    return true;
  };

  const getPasswordStrength = (pass: string) => {
    if (!pass) return { label: '', color: 'bg-transparent', width: 'w-0' };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 1) return { label: 'Weak Account Security', color: 'bg-red-500', width: 'w-1/3' };
    if (score <= 3) return { label: 'Medium Account Security', color: 'bg-amber-500', width: 'w-2/3' };
    return { label: 'Strong Account Security', color: 'bg-green-500', width: 'w-full' };
  };

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          name: name.trim(),
          phone: phone.trim(),
          password,
          idToken: verificationToken,
          classGroup
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete registration.');
      }

      // Save credentials locally
      localStorage.setItem('currentUser', JSON.stringify(data.user));
      localStorage.setItem('accessToken', data.token);
      localStorage.setItem('isLoggedIn', 'true');

      // Update state store
      setUser(data.user);
      setLoading(false);

      toast.success(`Welcome to Nucleus Coaching Centre, ${data.user.displayName}!`);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      toast.error(err.message || 'An error occurred during registration.');
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
        className="w-full max-w-md p-8 bg-[#FFFDF9] rounded-3xl border border-black/10 shadow-xl"
      >
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full text-primary text-xs font-semibold mb-3">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Nucleus.CC Coaching Centre</span>
          </div>
          <h2 className="font-display font-extrabold text-3xl text-[#1F1F1F]">Student Register</h2>
          <p className="text-[#7A7A7A] text-sm mt-1">Managed & taught by elite IITians and Doctors</p>
        </div>

        {/* Step 1: Email Input and Google Verification */}
        <div className="space-y-4 mb-6">
          <div className="relative">
            <FloatingLabelInput
              label="Student Email Address"
              icon={<Mail className="w-5 h-5" />}
              type="email"
              value={email}
              onChange={(e) => {
                if (!isVerified) setEmail(e.target.value);
              }}
              required
              disabled={isVerified}
              id="register-email-field"
            />
            {isVerified && (
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-green-600 flex items-center gap-1 text-xs font-bold bg-green-50 px-2.5 py-1 rounded-full border border-green-200">
                <CheckCircle2 className="w-4 h-4" />
                <span>Verified</span>
              </span>
            )}
          </div>

          <AnimatePresence mode="wait">
            {!isVerified ? (
              <motion.button
                type="button"
                onClick={handleVerifyWithGoogle}
                disabled={isVerifying || !email}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className={`w-full py-3.5 bg-white hover:bg-black/5 border border-black/15 text-[#1F1F1F] rounded-2xl font-bold flex items-center justify-center gap-2.5 transition-all duration-200 ${(!email || isVerifying) ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin text-primary" />
                    <span>Verifying with Google...</span>
                  </>
                ) : (
                  <>
                    <Chrome className="w-5 h-5 text-red-500 fill-current" />
                    <span>Verify with Google</span>
                  </>
                )}
              </motion.button>
            ) : null}
          </AnimatePresence>
        </div>

        {/* Step 2: Form Fields (Unlocked after Google Verification) */}
        <AnimatePresence>
          {isVerified ? (
            <motion.form 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              onSubmit={handleSubmit} 
              className="space-y-4 pt-2 border-t border-black/5"
            >
              <div className="bg-green-50 border border-green-200 text-green-950 p-3.5 rounded-2xl text-xs flex gap-2 mb-2">
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-extrabold text-green-800">Email Verified Successfully</p>
                  <p className="opacity-90 mt-0.5">Please fill out your unique student profile credentials below to register your account.</p>
                </div>
              </div>

              {/* Name Field */}
              <FloatingLabelInput
                label="Full Name"
                icon={<User className="w-5 h-5" />}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                id="register-name-field"
              />

              {/* Phone Field */}
              <FloatingLabelInput
                label="Mobile Phone Number"
                icon={<Smartphone className="w-5 h-5" />}
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                id="register-phone-field"
              />

              {/* Password Field */}
              <div className="relative">
                <FloatingLabelInput
                  label="Password Security Key"
                  icon={<Lock className="w-5 h-5" />}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  id="register-password-field"
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 mt-1 text-[#7A7A7A] hover:text-[#1F1F1F] transition-all"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {/* Real-time Password Strength feedback bar */}
              {password && (
                <div className="px-1 space-y-1.5 animate-fadeIn">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider">
                    <span className="text-[#7A7A7A]">Password Strength</span>
                    <span className={strength.label.includes('Strong') ? 'text-green-600' : strength.label.includes('Medium') ? 'text-amber-600' : 'text-red-500'}>
                      {strength.label}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-black/5 rounded-full overflow-hidden">
                    <div className={`h-full ${strength.color} ${strength.width} transition-all duration-500 ease-in-out`} />
                  </div>
                </div>
              )}

              {/* Confirm Password Field */}
              <div className="relative">
                <FloatingLabelInput
                  label="Confirm Password"
                  icon={<Lock className="w-5 h-5" />}
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  id="register-confirm-password-field"
                />
                <button 
                  type="button" 
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 mt-1 text-[#7A7A7A] hover:text-[#1F1F1F] transition-all"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {/* Target prep segment */}
              <div>
                <label className="text-xs font-bold text-[#1F1F1F] uppercase tracking-wider block mb-1.5 ml-1">Target Academic Segment</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7A7A7A] pointer-events-none">
                    <GraduationCap className="w-5 h-5" />
                  </span>
                  <select 
                    value={classGroup}
                    onChange={(e) => setClassGroup(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-[#F8FAFC] border border-black/10 rounded-2xl text-[#1F1F1F] appearance-none focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-medium cursor-pointer"
                  >
                    <option value="6">Class 6th Foundation</option>
                    <option value="7">Class 7th Foundation</option>
                    <option value="8">Class 8th Foundation</option>
                    <option value="9">Class 9th Foundation</option>
                    <option value="10">Class 10th Foundation</option>
                    <option value="11">Class 11th (JEE / NEET Main prep)</option>
                    <option value="12">Class 12th Board & Competitive Focus</option>
                    <option value="dropper">Droppers Batch (Repeaters Focus)</option>
                  </select>
                </div>
              </div>

              {/* Submit Action CTA */}
              <motion.button 
                type="submit" 
                disabled={isSubmitting}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className={`w-full py-4 bg-primary text-[#F8FAFC] rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-[#3730A3] transition-colors shadow-md ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Completing Registration...</span>
                  </>
                ) : (
                  <>
                    <span>Complete Registration</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </motion.button>
            </motion.form>
          ) : (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex gap-2 text-xs text-amber-950">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed">To safeguard our premium study content and ensure authentic profiles, email validation with a Google Account is required before registration form access.</p>
            </div>
          )}
        </AnimatePresence>

        {/* Back navigation */}
        <p className="text-center text-sm text-[#7A7A7A] mt-6">
          Already registered?{' '}
          <Link to="/login" className="text-primary font-bold hover:underline">
            Log In here
          </Link>
        </p>

        <div className="text-center mt-6 text-[10px] text-[#7A7A7A]">
          © 2026 Nucleus.CC (Coaching Centre managed by IITians and Doctors)
        </div>
      </motion.div>
    </div>
  );
}
