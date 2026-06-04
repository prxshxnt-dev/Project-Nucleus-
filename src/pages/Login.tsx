import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  ArrowRight, 
  Lock, 
  Mail, 
  Smartphone,
  Eye, 
  EyeOff, 
  BookOpen, 
  Chrome, 
  RefreshCw 
} from 'lucide-react';
import { signInWithGoogle } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import { toast, Toaster } from 'sonner';

export default function Login() {
  const { user, setUser, setLoading, loading } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  // Switch between 'password' and 'otp'
  const [loginMethod, setLoginMethod] = useState<'password' | 'otp'>('password');
  
  // OTP sub-targets
  const [otpTarget, setOtpTarget] = useState<'email' | 'phone'>('email');
  const [otpIdentifier, setOtpIdentifier] = useState('');

  // Password Login Inputs State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-fill email/phone identifier if passed from Signup or password resets
  useEffect(() => {
    if (location.state && (location.state as any).email) {
      const stateEmail = (location.state as any).email;
      setEmail(stateEmail);
      setOtpIdentifier(stateEmail);
    }
  }, [location.state]);

  // Auto-redirect if user already logged in
  useEffect(() => {
    if (!loading && user) {
      const from = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [user, loading, navigate, location]);

  const validatePasswordMode = (): boolean => {
    const emailClean = email.trim();
    if (!emailClean) {
      toast.error('Email address is required.');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailClean)) {
      toast.error('Please provide a valid email structure.');
      return false;
    }
    if (!password) {
      toast.error('Password is required.');
      return false;
    }
    return true;
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePasswordMode()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          password
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to authenticate student.');
      }

      // Store custom email login session credentials locally
      localStorage.setItem('currentUser', JSON.stringify(data.user));
      localStorage.setItem('accessToken', data.token);
      localStorage.setItem('isLoggedIn', 'true');

      // Update auth store
      setUser(data.user);
      setLoading(false);

      toast.success(`Welcome back, ${data.user.displayName}!`);
      
      const from = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });

    } catch (err: any) {
      toast.error(err.message || 'Incorrect credentials or connectivity issue.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpLoginRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetClean = otpIdentifier.trim();
    if (!targetClean) {
      toast.error(`Please enter your registered ${otpTarget === 'email' ? 'email address' : 'phone number'}.`);
      return;
    }

    if (otpTarget === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(targetClean)) {
        toast.error('Please provide a valid email address structure.');
        return;
      }
    } else {
      if (targetClean.length < 8) {
        toast.error('Please enter a valid phone number.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload: any = { type: 'login' };
      if (otpTarget === 'email') {
        payload.email = targetClean.toLowerCase();
      } else {
        payload.phone = targetClean;
      }

      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send verification code.');
      }

      toast.success(data.message || 'Dynamic login code dispatched!');
      
      // Navigate to verify page with identity details
      navigate('/verify-otp', {
        state: {
          email: data.email || (otpTarget === 'email' ? targetClean.toLowerCase() : ''),
          phone: otpTarget === 'phone' ? targetClean : '',
          type: 'login',
          simulated: data.simulated,
          simulatedOtp: data.otp
        }
      });
    } catch (err: any) {
      toast.error(err.message || 'An error occurred during OTP request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (err: any) {
      toast.error(err.message || 'Google portal authentication failed.');
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 flex items-center justify-center bg-[#FDF5E6]">
      <Toaster richColors position="bottom-right" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md p-8 bg-[#FFFDF9] rounded-3xl border border-black/10 shadow-xl text-[#1F1F1F]"
      >
        {/* Academic branding card header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full text-primary text-xs font-semibold mb-3">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Nucleus.CC IIT & Medical</span>
          </div>
          <h2 className="font-display font-extrabold text-3xl">Student Entry</h2>
          <p className="text-[#7A7A7A] text-sm mt-1">Managed and taught by elite IITians & Doctors</p>
        </div>

        {/* First Create Account CTA */}
        <div className="mb-6 p-4 bg-[#F15A29]/5 border border-[#F15A29]/15 rounded-2xl text-center space-y-2">
          <p className="text-xs text-[#7A7A7A] font-medium leading-[1.4]">
            Don't have a student account yet? Get instant access to online live modules.
          </p>
          <Link
            to="/signup"
            className="inline-flex items-center justify-center gap-2 w-full py-2.5 bg-[#F15A29]/10 hover:bg-[#F15A29]/20 text-[#F15A29] font-extrabold text-[#F15A29] text-[11px] uppercase tracking-wider rounded-xl border border-[#F15A29]/20 transition-all duration-200"
          >
            <span>First Create Account</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Password Login form container exclusively */}
        <div className="space-y-4">
          {/* Form controls for Email/Password */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            {/* Email input field */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider block mb-1.5 ml-1">Student Email</label>
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

            {/* Password field */}
            <div>
              <div className="flex justify-between items-center mb-1.5 ml-1">
                <label className="text-xs font-bold uppercase tracking-wider block">Password</label>
                <Link to="/forgot-password" className="text-xs text-primary font-bold hover:underline">
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7A7A7A]">
                  <Lock className="w-5 h-5" />
                </span>
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-12 pr-12 py-3.5 bg-[#FDF5E6] border border-black/10 rounded-2xl text-[#1F1F1F] placeholder-[#7A7A7A] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-200"
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#7A7A7A] hover:text-black transition-colors"
                  id="password-toggle-btn"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Submit element */}
            <motion.button 
              type="submit" 
              disabled={isSubmitting}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className={`w-full py-4 bg-primary text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-primary-dark transition-all duration-200 shadow-md ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
              id="login-submit-btn"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Verifying credentials...</span>
                </>
              ) : (
                <>
                  <span>Enter Classroom Portal</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </motion.button>
          </form>
        </div>

        {/* Third Party Divider */}
        <div className="relative flex items-center my-6">
          <div className="flex-grow border-t border-black/10"></div>
          <span className="flex-shrink mx-4 text-[#7A7A7A] text-xs uppercase font-bold tracking-wider">Or continue with</span>
          <div className="flex-grow border-t border-black/10"></div>
        </div>

        {/* Google Authentication popup */}
        <motion.button 
          onClick={handleGoogleLogin}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="w-full py-3 px-4 bg-transparent hover:bg-black/5 border border-black/10 rounded-2xl text-[#1F1F1F] font-semibold flex items-center justify-center gap-2.5 transition-all duration-200 cursor-pointer"
          id="google-login-btn"
        >
          <Chrome className="w-5 h-5 text-red-500 fill-current" />
          <span>Google Access Desk</span>
        </motion.button>

        {/* Link to SignUp */}
        <p className="text-center text-sm text-[#7A7A7A] mt-6">
          New student to Nucleus?{' '}
          <Link to="/signup" className="text-primary font-bold hover:underline">
            Register here
          </Link>
        </p>

        <div className="text-center mt-6 text-[11px] text-[#7A7A7A]">
          © 2026 Nucleus.CC (Coaching Centre managed by IITians and Doctors)
        </div>
      </motion.div>
    </div>
  );
}
