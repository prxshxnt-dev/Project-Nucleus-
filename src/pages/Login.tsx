import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Chrome, 
  ArrowRight, 
  Lock, 
  User, 
  Mail, 
  Phone, 
  ShieldCheck, 
  CheckCircle, 
  AlertCircle,
  Sparkles,
  BookOpen,
  GraduationCap
} from 'lucide-react';
import { signInWithGoogle, auth, db } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { toast, Toaster } from 'sonner';

declare global {
  interface Window {
    recaptchaVerifier: any;
    confirmationResult: any;
  }
}

export default function Login() {
  const { user, setUser, setLoading, loading } = useAuthStore();
  const { settings } = useSettingsStore();
  const navigate = useNavigate();
  const location = useLocation();

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [selectedClassGroup, setSelectedClassGroup] = useState<string>('11');
  
  // Tab states: 'login' | 'register'
  const [mode, setMode] = useState<'login' | 'register'>('login');
  
  // OTP States
  const [showOtp, setShowOtp] = useState(false);
  const [phoneOtpInput, setPhoneOtpInput] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [timer, setTimer] = useState(0);

  // Visual states
  const [authError, setAuthError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const COUNTRY_CODES = [
    { code: '+91', country: 'IN', name: 'India' },
    { code: '+1', country: 'US', name: 'USA/Canada' },
    { code: '+44', country: 'GB', name: 'UK' },
    { code: '+61', country: 'AU', name: 'Australia' },
    { code: '+65', country: 'SG', name: 'Singapore' },
    { code: '+971', country: 'AE', name: 'UAE' },
    { code: '+966', country: 'SA', name: 'Saudi Arabia' },
  ];

  // Auto redirect to dashboard index or home if already logged in
  useEffect(() => {
    if (!loading && user) {
      const from = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [user, loading, navigate, location]);

  // Countdown timer for Resend OTP
  useEffect(() => {
    let interval: any;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  // Clean up reCAPTCHA verifier on unmount
  useEffect(() => {
    return () => {
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (e) {
          console.error(e);
        }
        delete window.recaptchaVerifier;
      }
    };
  }, []);

  const initRecaptcha = () => {
    if (window.recaptchaVerifier) {
      return window.recaptchaVerifier;
    }
    try {
      const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: (response: any) => {
          console.log("reCAPTCHA solved:", response);
        },
        'expired-callback': () => {
          setAuthError('reCAPTCHA expired. Please try again.');
          toast.error('reCAPTCHA expired. Please try again.');
        }
      });
      window.recaptchaVerifier = verifier;
      return verifier;
    } catch (err: any) {
      console.error("Recaptcha initialization error:", err);
      toast.error('Failed to initialize security verifier. Please refresh the page.');
      return null;
    }
  };

  const validateInputs = (): boolean => {
    setAuthError(null);
    setSuccessMsg(null);

    // Name validation (only on register)
    if (mode === 'register' && !name.trim()) {
      setAuthError('Please enter your Name before proceeding.');
      toast.error('Please enter your Name before proceeding.');
      return false;
    }

    // Email validation
    const emailClean = email.trim();
    if (!emailClean) {
      setAuthError('Please enter your Email Address.');
      toast.error('Please enter your Email Address.');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailClean)) {
      setAuthError('Please enter a valid Email Address (e.g. name@example.com).');
      toast.error('Please enter a valid Email Address.');
      return false;
    }

    // Phone validation
    const phoneClean = phone.trim();
    if (!phoneClean) {
      setAuthError('Please enter your Mobile Number.');
      toast.error('Please enter your Mobile Number.');
      return false;
    }
    const numericOnly = phoneClean.replace(/\D/g, '');
    if (numericOnly.length < 8) {
      setAuthError('Please enter a valid Mobile Number.');
      toast.error('Please enter a valid Mobile Number.');
      return false;
    }

    // Terms and Conditions checkbox validation
    if (!agreedToTerms) {
      setAuthError('You must agree to the Terms & Conditions and Privacy Policy to access Nucleus.CC.');
      toast.error('Please accept the Terms & Conditions.');
      return false;
    }

    return true;
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInputs()) return;

    setIsSubmitting(true);
    setAuthError(null);
    setSuccessMsg(null);

    const fullPhoneNumber = `${countryCode}${phone.trim()}`;
    
    try {
      const appVerifier = initRecaptcha();
      if (!appVerifier) {
        throw new Error('Failed to initialize recaptcha verification panel.');
      }

      const confirmationResult = await signInWithPhoneNumber(
        auth,
        fullPhoneNumber,
        appVerifier
      );

      window.confirmationResult = confirmationResult;
      setSuccessMsg(`OTP Sent Successfully to ${fullPhoneNumber}`);
      toast.success(`OTP Sent Successfully to ${fullPhoneNumber}`);
      setShowOtp(true);
      setTimer(30);
    } catch (error: any) {
      console.error(error);
      const friendlyMsg = error.message || 'Failed to dispatch Phone OTP code.';
      setAuthError(friendlyMsg);
      toast.error(friendlyMsg);
      
      // Clear verifier on failure so we rewrite/recreate on retry
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (e) {
          console.error(e);
        }
        delete window.recaptchaVerifier;
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (timer > 0 || isResending) return;
    setIsResending(true);
    setAuthError(null);
    setSuccessMsg(null);
    
    const fullPhoneNumber = `${countryCode}${phone.trim()}`;
    try {
      const appVerifier = initRecaptcha();
      if (!appVerifier) {
        throw new Error('Verification system not ready.');
      }

      const confirmationResult = await signInWithPhoneNumber(
        auth,
        fullPhoneNumber,
        appVerifier
      );

      window.confirmationResult = confirmationResult;
      setSuccessMsg(`A fresh verification code has been dispatched to ${fullPhoneNumber}.`);
      toast.success('OTP Resent Successfully');
      setTimer(30);
    } catch (error: any) {
      console.error(error);
      const friendlyMsg = error.message || 'Failed to dispatch fresh SMS token.';
      setAuthError(friendlyMsg);
      toast.error(friendlyMsg);
    } finally {
      setIsResending(false);
    }
  };

  const handleGoogleLogin = async () => {
    setAuthError(null);
    setSuccessMsg(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setAuthError(err.message || 'Google Sign-In failed');
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneOtpInput || phoneOtpInput.length !== 6) {
      setAuthError('Please enter the 6-digit OTP code.');
      toast.error('Please enter the 6-digit OTP code.');
      return;
    }

    setIsSubmitting(true);
    setAuthError(null);
    setSuccessMsg(null);

    const emailClean = email.trim();
    const phoneClean = `${countryCode}${phone.trim()}`;
    const nameClean = mode === 'register' ? name.trim() : (name.trim() || 'Student');

    try {
      const confirmationResult = window.confirmationResult;
      if (!confirmationResult) {
        throw new Error('Verification session has expired. Please request a new OTP.');
      }

      const result = await confirmationResult.confirm(phoneOtpInput);
      const fbUser = result.user;

      toast.success('Phone Number Verified Successfully');
      setSuccessMsg('Phone Number Verified Successfully! Setting up student hub...');

      // 2. Provision or update student user profile in Firestore db
      const userRef = doc(db, 'users', fbUser.uid);
      
      const payload = {
        displayName: nameClean,
        email: emailClean,
        mobile: phoneClean,
        role: 'student' as const,
        planId: 'free' as const,
        classGroup: selectedClassGroup,
        unlockedMaterials: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(userRef, payload, { merge: true });

      // Force instant client-side update with complete profile
      setUser({
        uid: fbUser.uid,
        email: payload.email,
        displayName: payload.displayName,
        role: 'student',
        planId: 'free',
        classGroup: selectedClassGroup,
        unlockedMaterials: [],
        streak: 1,
      });

      localStorage.setItem("isLoggedIn", "true");

      setTimeout(() => {
        navigate('/dashboard');
      }, 1200);

    } catch (err: any) {
      console.error(err);
      const friendlyMsg = err.code === 'auth/invalid-verification-code' 
        ? 'Invalid OTP code. Please enter the correct code received on your mobile device.'
        : err.message || 'Verification failed.';
      setAuthError(friendlyMsg);
      toast.error(friendlyMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      id="login-page-container"
      initial={{ opacity: 0, filter: "blur(4px)" }}
      animate={{ opacity: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, filter: "blur(4px)" }}
      className="min-h-screen bg-[#FDFBF7] text-black flex items-center justify-center pt-24 pb-16 px-4 sm:px-6 lg:px-8 font-sans relative overflow-hidden"
    >
      {/* Background Aesthetic Overlays for Beige Canvas */}
      <div className="absolute inset-0 pointer-events-none select-none">
        {/* Soft elegant warm ambient glow */}
        <div className="absolute top-[10%] left-[5%] w-[450px] h-[450px] rounded-full bg-[#F15A29]/5 blur-[120px]" />
        <div className="absolute bottom-[10%] right-[5%] w-[500px] h-[500px] rounded-full bg-amber-500/5 blur-[140px]" />
        {/* Subtle graph grid patterns for technical background aesthetic */}
        <div className="absolute inset-0 bg-[radial-gradient(rgba(241,90,41,0.04)_1px,transparent_1px)] [background-size:24px_24px]" />
      </div>

      <div className="w-full max-w-5xl bg-[#FAF6EE] border border-zinc-200/60 rounded-[2.5rem] shadow-[0_32px_120px_-20px_rgba(241,90,41,0.08)] overflow-hidden grid grid-cols-1 md:grid-cols-12 relative z-10">
        
        {/* LEFT PANEL: Branding & Friendly Welcoming Message (6 cols on large screen) */}
        <div className="md:col-span-5 bg-gradient-to-br from-[#1E1916] to-[#0A0807] text-[#FAF6EE] p-8 sm:p-12 flex flex-col justify-between relative overflow-hidden">
          {/* Subtle warm aesthetic flare on left panel */}
          <div className="absolute -top-12 -left-12 w-64 h-64 rounded-full bg-[#F15A29]/15 blur-[60px]" />
          <div className="absolute -bottom-16 -right-16 w-80 h-80 rounded-full bg-amber-500/10 blur-[80px]" />

          <div className="relative z-10 text-left">
            {/* Site Name and Logo Badge */}
            <Link to="/" className="inline-flex items-center gap-2 mb-8 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#F15A29] to-amber-500 flex items-center justify-center text-black font-display font-black text-sm group-hover:rotate-12 transition-all shadow-md">
                {settings.logoText || 'N'}
              </div>
              <span className="font-display font-black tracking-tight text-xl text-white group-hover:text-[#F15A29] transition-colors uppercase">
                Nucleus.CC
              </span>
            </Link>

            {/* Main Greeting Typography */}
            <div className="space-y-4 mt-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F15A29]/10 border border-[#F15A29]/20 text-[10px] font-bold tracking-widest text-[#F15A29] uppercase font-mono">
                ✦ PHYSICS CONTROL CENTRE
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight font-display text-white leading-tight">
                Accelerate <br />
                Your <span className="text-[#F15A29] relative inline-block">Learning<span className="absolute left-0 bottom-1 w-full h-[6px] bg-[#F15A29]/20 -skew-x-12" /></span>
              </h2>
              <p className="text-zinc-400 text-sm leading-relaxed max-w-sm font-medium">
                Welcome back, future IITian! Access premium notes, test metrics, and get instant chat feedback from our AI physics solver nodes.
              </p>
            </div>
          </div>

          {/* Educational Highlights Illustration Block */}
          <div className="relative z-10 mt-12 md:mt-24 space-y-4">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm flex items-start gap-3 text-left">
              <div className="w-8 h-8 rounded-lg bg-[#F15A29]/10 border border-[#F15A29]/20 flex items-center justify-center text-[#F15A29] shrink-0">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-xs text-zinc-100 uppercase tracking-wider font-mono">Structured Physics Hub</p>
                <p className="text-[11px] text-zinc-400 mt-0.5 leading-normal">Interactive modules built for competitive prep and class boards.</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm flex items-start gap-3 text-left">
              <div className="w-8 h-8 rounded-lg bg-[#F15A29]/10 border border-[#F15A29]/20 flex items-center justify-center text-[#F15A29] shrink-0">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-xs text-zinc-100 uppercase tracking-wider font-mono">IIT Alumnus Material</p>
                <p className="text-[11px] text-zinc-400 mt-0.5 leading-normal">Deep explanations curated alongside veteran board lecturers.</p>
              </div>
            </div>

            <div className="text-[11px] text-zinc-500 font-mono flex items-center gap-2 mt-4 ml-1 justify-start">
              <ShieldCheck className="w-4 h-4 text-[#F15A29]" />
              <span>Verified SSO Student System v2.0</span>
            </div>
          </div>

        </div>

        {/* RIGHT PANEL: Center-styled Login Form Card */}
        <div className="md:col-span-7 p-8 sm:p-12 lg:p-16 flex flex-col justify-center bg-[#FAF6EE] text-black">
          
          <div className="max-w-md w-full mx-auto text-left">
            {/* Header section */}
            <div className="mb-8">
              <div className="flex bg-zinc-200/50 p-1.5 rounded-full mb-6 w-fit border border-zinc-300/30">
                <button
                  type="button"
                  onClick={() => { setMode('login'); setAuthError(null); setSuccessMsg(null); setShowOtp(false); }}
                  className={`px-6 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    mode === 'login' 
                      ? 'bg-[#F15A29] text-black shadow-md' 
                      : 'text-zinc-600 hover:text-black'
                  }`}
                >
                  Student Login
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('register'); setAuthError(null); setSuccessMsg(null); setShowOtp(false); }}
                  className={`px-6 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    mode === 'register' 
                      ? 'bg-[#F15A29] text-black shadow-md' 
                      : 'text-zinc-600 hover:text-black'
                  }`}
                >
                  Create Account
                </button>
              </div>

              <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950">
                {mode === 'login' ? 'Welcome Back!' : 'Begin Mastery Flow'}
              </h3>
              <p className="text-xs text-zinc-500 mt-1">
                {mode === 'login' 
                  ? 'Access your active workspace metrics using your registered name and primary contact.' 
                  : 'Register your secure student profile to track lesson streaks and save mock score records.'}
              </p>
            </div>

            {/* Error / Success Notifications */}
            <AnimatePresence mode="wait">
              {authError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-6 p-4 rounded-xl bg-red-50 text-red-700 text-xs flex items-start gap-2.5 border border-red-200"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 text-[#F15A29] mt-0.5" />
                  <span>{authError}</span>
                </motion.div>
              )}

              {successMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-6 p-4 rounded-xl bg-emerald-50 text-emerald-800 text-xs flex items-start gap-2.5 border border-emerald-200"
                >
                  <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                  <span>{successMsg}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Pure CSS Inputs styling explicitly tailored for clean beige/orange focus boundaries */}
            {!showOtp ? (
              <form onSubmit={handleRequestOtp} className="space-y-5">
                
                {/* Field 1: Name Input */}
                {mode === 'register' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-1.5 matches-focus overflow-hidden"
                  >
                    <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-700 font-mono">
                      Full Name <span className="text-[#F15A29]">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-zinc-400" />
                      <input
                        type="text"
                        required
                        placeholder="Enter full name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-[#FDFBF7] text-black placeholder-zinc-400/80 text-sm pl-11 pr-4 py-3 rounded-2xl border border-zinc-300 focus:outline-none focus:border-[#F15A29] focus:ring-2 focus:ring-[#F15A29]/15 transition-all text-left"
                      />
                    </div>
                  </motion.div>
                )}

                {/* Field 2: Class Selection Grade */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-700 font-mono">
                    Select Your Class / Grade <span className="text-[#F15A29]">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: '8', label: 'Class 8' },
                      { key: '9', label: 'Class 9' },
                      { key: '10', label: 'Class 10' },
                      { key: '11', label: 'Class 11' },
                      { key: '12', label: 'Class 12' },
                      { key: 'dropper', label: 'Dropper' },
                    ].map((cls) => (
                      <button
                        key={cls.key}
                        type="button"
                        onClick={() => setSelectedClassGroup(cls.key)}
                        className={`py-2.5 px-2 rounded-xl text-[11px] font-bold border transition-all text-center cursor-pointer ${
                          selectedClassGroup === cls.key
                            ? 'bg-[#F15A29] text-black border-[#F15A29] shadow-sm font-extrabold'
                            : 'bg-[#FDFBF7] text-zinc-700 border-zinc-300 hover:border-[#F15A29]/50 hover:bg-[#FAF6EE]'
                        }`}
                      >
                        {cls.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Field 3: Email Address Input */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-700 font-mono">
                    Email Address <span className="text-[#F15A29]">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-zinc-400" />
                    <input
                      type="email"
                      required
                      placeholder="e.g. name@domain.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[#FDFBF7] text-black placeholder-zinc-400/80 text-sm pl-11 pr-4 py-3 rounded-2xl border border-zinc-300 focus:outline-none focus:border-[#F15A29] focus:ring-2 focus:ring-[#F15A29]/15 transition-all text-left"
                    />
                  </div>
                </div>

                {/* Field 4: Mobile Phone Number */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-700 font-mono">
                    Mobile Phone Number <span className="text-[#F15A29]">*</span>
                  </label>
                  <div className="flex gap-2">
                    <div className="relative w-32 shrink-0">
                      <select
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="w-full h-[46px] bg-[#FDFBF7] text-black text-xs px-3 py-2 rounded-2xl border border-zinc-300 focus:outline-none focus:border-[#F15A29] focus:ring-2 focus:ring-[#F15A29]/15 transition-all appearance-none cursor-pointer font-bold text-center"
                      >
                        {COUNTRY_CODES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.country} ({c.code})
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500 font-mono text-[9px] font-extrabold">
                        ▼
                      </div>
                    </div>
                    <div className="relative flex-grow">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-zinc-400" />
                      <input
                        type="tel"
                        id="phone-number"
                        required
                        placeholder="+91 Enter Phone Number"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                        className="w-full h-[46px] bg-[#FDFBF7] text-black placeholder-zinc-400/80 text-sm pl-11 pr-4 py-3 rounded-2xl border border-zinc-300 focus:outline-none focus:border-[#F15A29] focus:ring-2 focus:ring-[#F15A29]/15 transition-all text-left"
                      />
                    </div>
                  </div>
                </div>

                {/* Checkbox for T&C agreement */}
                <div className="flex items-start gap-2.5 pt-1.5 pb-2 text-left">
                  <div className="flex items-center h-5">
                    <input
                      id="agreed-to-terms-checkbox"
                      type="checkbox"
                      required
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="w-4 h-4 rounded border-zinc-300 text-[#F15A29] focus:ring-[#F15A29] accent-[#F15A29] cursor-pointer"
                    />
                  </div>
                  <label htmlFor="agreed-to-terms-checkbox" className="text-xs text-zinc-600 select-none leading-normal cursor-pointer">
                    I agree to the <span className="text-[#F15A29] hover:underline font-semibold">Terms & Conditions</span> and <span className="text-[#F15A29] hover:underline font-semibold">Privacy Policy</span> of Nucleus.CC
                  </label>
                </div>

                {/* Main Submit Button: Orange background, black text with micro-interaction shadow */}
                <button
                  type="submit"
                  id="send-otp"
                  disabled={isSubmitting}
                  className="w-full h-[46px] rounded-2xl bg-[#F15A29] hover:bg-[#d84817] text-black font-extrabold text-xs uppercase tracking-wider transition-all duration-250 cursor-pointer flex items-center justify-center gap-2 shadow-[0_8px_25px_-4px_rgba(241,90,41,0.35)] hover:shadow-[0_12px_30px_rgba(241,90,41,0.45)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
                >
                  <span>
                    {isSubmitting ? 'Sending OTP...' : mode === 'login' ? 'Send OTP' : 'Register & Send OTP'}
                  </span>
                  <ArrowRight className="w-4 h-4 shrink-0 stroke-[2.5]" />
                </button>

              </form>
            ) : (
              <form onSubmit={handleAuthSubmit} id="otp-section" className="space-y-5">

                {/* OTP Input Field: Phone Code */}
                <div className="space-y-1.5 matches-focus">
                  <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-700 font-mono">
                    Enter SMS Verification Code <span className="text-[#F15A29]">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-zinc-400" />
                    <input
                      type="text"
                      id="otp-code"
                      required
                      maxLength={6}
                      placeholder="Enter OTP"
                      value={phoneOtpInput}
                      onChange={(e) => setPhoneOtpInput(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-[#FDFBF7] text-black placeholder-zinc-400/80 text-sm pl-11 pr-4 py-3 rounded-2xl border border-zinc-300 focus:outline-none focus:border-[#F15A29] focus:ring-2 focus:ring-[#F15A29]/15 transition-all text-center tracking-widest font-extrabold font-mono text-[#F15A29]"
                    />
                  </div>
                </div>

                {/* Actions: Verify and Resend/Cancel */}
                <div className="space-y-3">
                  <button
                    type="submit"
                    id="verify-otp"
                    disabled={isSubmitting}
                    className="w-full py-3.5 px-6 rounded-2xl bg-[#F15A29] hover:bg-[#d84817] text-black font-extrabold text-xs uppercase tracking-wider transition-all duration-250 cursor-pointer flex items-center justify-center gap-2 shadow-[0_8px_25px_-4px_rgba(241,90,41,0.35)] hover:shadow-[0_12px_30px_rgba(241,90,41,0.45)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
                  >
                    <span>
                      {isSubmitting ? 'Verifying...' : 'Verify OTP'}
                    </span>
                    <CheckCircle className="w-4 h-4 shrink-0 stroke-[2.5]" />
                  </button>

                  <div className="flex justify-between items-center px-1 text-xs font-mono font-bold text-zinc-500">
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={timer > 0 || isResending}
                      className="hover:text-[#F15A29] transition-colors cursor-pointer disabled:opacity-50 uppercase tracking-wider"
                    >
                      {timer > 0 ? `Resend in ${timer}s` : isResending ? 'Resending...' : 'Resend OTP'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowOtp(false); setAuthError(null); }}
                      className="hover:text-black transition-colors cursor-pointer uppercase tracking-wider"
                    >
                      Edit details
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Divider and Google SSO Linkage */}
            <div className="flex items-center gap-3 my-8">
              <div className="h-px bg-zinc-300 flex-grow" />
              <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-mono font-bold">Or sync identity</span>
              <div className="h-px bg-zinc-300 flex-grow" />
            </div>

            {/* "Continue with Google" at the bottom */}
            <p className="text-center text-[11px] text-zinc-500 mb-2 font-semibold">
              Already have school-linked Google credentials?
            </p>
            <button
              onClick={handleGoogleLogin}
              type="button"
              className="w-full py-3.5 px-5 rounded-2xl bg-white hover:bg-zinc-150 border border-zinc-300/85 text-zinc-800 font-bold text-xs uppercase tracking-wider hover:border-zinc-400 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2.5 shadow-sm"
            >
              <Chrome className="w-4.5 h-4.5 text-[#F15A29] stroke-[2.5]" />
              <span>Continue with Google</span>
            </button>

          </div>

        </div>

      </div>
      {/* Invisible reCAPTCHA container */}
      <div id="recaptcha-container" className="hidden"></div>
      <Toaster position="top-right" richColors />
    </motion.div>
  );
}
