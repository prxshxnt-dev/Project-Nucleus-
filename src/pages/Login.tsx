import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  ArrowRight, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  BookOpen, 
  Chrome, 
  RefreshCw,
  ArrowLeft
} from 'lucide-react';
import { signInWithGoogle, signInWithGoogleToken } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import { toast, Toaster } from 'sonner';
import FloatingLabelInput from '../components/FloatingLabelInput';

export default function Login() {
  const { user, setUser, setLoading, loading } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  // Switch between 'password' and 'otp' login method
  const [loginMethod, setLoginMethod] = useState<'password' | 'otp'>('password');
  
  // Password Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // OTP Login identifier - Email
  const [otpEmail, setOtpEmail] = useState('');

  // Pre-fill email identifier if passed from Signup or password resets
  useEffect(() => {
    if (location.state && (location.state as any).email) {
      const stateEmail = (location.state as any).email;
      setEmail(stateEmail);
      setOtpEmail(stateEmail);
    }
  }, [location.state]);

  // Google Identity Services (GIS) Callback
  const handleCredentialResponse = async (response: any) => {
    if (!response || !response.credential) {
      toast.error('Google portal credentials not received.');
      return;
    }
    try {
      setLoading(true);
      const authenticatedUser = await signInWithGoogleToken(response.credential);
      toast.success(`Welcome back, ${authenticatedUser.displayName || 'Student'}!`);
    } catch (err: any) {
      console.error('GIS authentication error:', err);
      toast.error(err.message || 'Google portal authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  // Google Identity Services (GIS) Initialization
  useEffect(() => {
    let checkInterval: NodeJS.Timeout;
    const initGis = () => {
      const google = (window as any).google;
      if (!google || !google.accounts || !google.accounts.id) return;

      const clientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '575632888280-9g0v0v8v796n03h061vfe8k9b5j6d78u.apps.googleusercontent.com';

      google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
        use_fedcm_for_prompt: false,
      });

      // Show One Tap only if we are not inside an iframe to prevent FedCM console errors
      if (window.self === window.top) {
        google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed()) {
            console.debug('One tap not displayed:', notification.getNotDisplayedReason());
          }
        });
      }

      // Render hidden native sign-in button over custom design
      const btnEl = document.getElementById("google-gsi-button");
      if (btnEl) {
        google.accounts.id.renderButton(
          btnEl,
          { 
            theme: "outline", 
            size: "large", 
            type: "standard", 
            width: btnEl.clientWidth || 382 
          }
        );
      }
    };

    if ((window as any).google?.accounts?.id) {
      initGis();
    } else {
      checkInterval = setInterval(() => {
        if ((window as any).google?.accounts?.id) {
          clearInterval(checkInterval);
          initGis();
        }
      }, 500);
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval);
    };
  }, []);

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

      // Store credentials locally
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
    const targetClean = otpEmail.trim();
    if (!targetClean) {
      toast.error('Please enter your registered email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(targetClean)) {
      toast.error('Please provide a valid email address structure.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'login', email: targetClean.toLowerCase() }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send verification code.');
      }

      toast.success(data.message || 'Verification login PIN dispatched!');
      
      // Standalone redirect to `/verify-otp` with state
      navigate('/verify-otp', {
        state: {
          email: targetClean.toLowerCase(),
          type: 'login',
          simulated: !!data.simulated,
          simulatedOtp: data.otp || null
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
    <div className="min-h-screen pt-24 pb-16 px-4 flex items-center justify-center bg-[#F8FAFC]">
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
            <span>Nucleus Era IIT & Medical</span>
          </div>
          <h2 className="font-display font-extrabold text-3xl">Student Entry</h2>
          <p className="text-[#7A7A7A] text-sm mt-1">Managed and taught by elite IITians & Doctors</p>
        </div>

        {/* First Create Account CTA */}
        <div className="mb-6 p-4 bg-[#4F46E5]/5 border border-[#4F46E5]/15 rounded-2xl text-center space-y-2">
          <p className="text-xs text-[#7A7A7A] font-medium leading-[1.4]">
            Don't have a student account yet? Get instant access to online live modules.
          </p>
          <Link
            to="/signup"
            className="inline-flex items-center justify-center gap-2 w-full py-2.5 bg-[#4F46E5]/10 hover:bg-[#4F46E5]/20 text-[#4F46E5] font-extrabold text-[11px] uppercase tracking-wider rounded-xl border border-[#4F46E5]/20 transition-all"
          >
            <span>First Create Account</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Login Method Toggle Tabs */}
        <div className="flex gap-2 mb-6 bg-[#F8FAFC] p-1 rounded-2xl border border-black/10">
          <button
            type="button"
            onClick={() => setLoginMethod('password')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${loginMethod === 'password' ? 'bg-primary text-white shadow-sm font-black' : 'text-[#7A7A7A] hover:text-[#1F1F1F]'}`}
          >
            Password Login
          </button>
          <button
            type="button"
            onClick={() => setLoginMethod('otp')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${loginMethod === 'otp' ? 'bg-primary text-white shadow-sm font-black' : 'text-[#7A7A7A] hover:text-[#1F1F1F]'}`}
          >
            Email OTP Login
          </button>
        </div>

        {/* Logins Container */}
        <div className="space-y-4">
          {loginMethod === 'password' ? (
            /* Email / Password Form */
            <form onSubmit={handleEmailLogin} className="space-y-4">
              {/* Email Input */}
              <FloatingLabelInput 
                id="login-email-field"
                label="Student Email"
                icon={<Mail className="w-5 h-5" />}
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setOtpEmail(e.target.value); // keep in sync
                }}
                required
              />

              {/* Password Input with Forgot link & Show Button */}
              <div className="space-y-1">
                <div className="flex justify-between items-center px-1">
                  <Link to="/forgot-password" className="text-xs text-primary font-bold hover:underline ml-auto">
                    Forgot Password?
                  </Link>
                </div>
                
                <div className="relative">
                  <FloatingLabelInput 
                    id="login-password-field"
                    label="Account Password"
                    icon={<Lock className="w-5 h-5" />}
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 mt-1 text-[#7A7A7A] hover:text-[#1F1F1F] transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <motion.button 
                type="submit" 
                disabled={isSubmitting}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className={`w-full py-4 bg-primary text-[#F8FAFC] rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-[#3730A3] transition-colors shadow-md ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                id="login-submit-btn"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <span>Enter Classroom Portal</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </motion.button>
            </form>
          ) : (
            /* Email OTP Request Form */
            <form onSubmit={handleOtpLoginRequest} className="space-y-4">
              <FloatingLabelInput 
                id="login-otp-email-field"
                label="Student Email Address"
                icon={<Mail className="w-5 h-5" />}
                type="email"
                value={otpEmail}
                onChange={(e) => {
                  setOtpEmail(e.target.value);
                  setEmail(e.target.value); // keep in sync
                }}
                required
              />

              {/* Submit Button */}
              <motion.button 
                type="submit" 
                disabled={isSubmitting}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className={`w-full py-4 bg-primary text-[#F8FAFC] rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-[#3730A3] transition-colors shadow-md ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                id="login-otp-request-btn"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Sending Verification code...</span>
                  </>
                ) : (
                  <>
                    <span>Send Login OTP Code</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </motion.button>
            </form>
          )}
        </div>

        {/* Third Party Divider */}
        <div className="relative flex items-center my-6">
          <div className="flex-grow border-t border-black/10"></div>
          <span className="flex-shrink mx-4 text-[#7A7A7A] text-xs uppercase font-bold tracking-wider">Or continue with</span>
          <div className="flex-grow border-t border-black/10"></div>
        </div>

        {/* Google Authentication Portal Popup */}
        <motion.button 
          onClick={handleGoogleLogin}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="relative w-full py-3 px-4 bg-transparent hover:bg-black/5 border border-black/10 rounded-2xl text-[#1F1F1F] font-semibold flex items-center justify-center gap-2.5 transition-all duration-200 cursor-pointer overflow-hidden"
          id="google-login-btn"
        >
          <Chrome className="w-5 h-5 text-red-500 fill-current" />
          <span>Google Access Desk</span>
          <div 
            id="google-gsi-button" 
            className="absolute inset-0 opacity-0 cursor-pointer z-10 [&_iframe]:!w-full [&_iframe]:!h-full [&_iframe]:!absolute [&_iframe]:!top-0 [&_iframe]:!left-0"
          />
        </motion.button>

        {/* Link to SignUp */}
        <p className="text-center text-sm text-[#7A7A7A] mt-6">
          New student to Nucleus?{' '}
          <Link to="/signup" className="text-primary font-bold hover:underline">
            Register here
          </Link>
        </p>

        <div className="text-center mt-6 text-[10px] text-[#7A7A7A]">
          © 2026 Nucleus.CC (Coaching Centre managed by IITians and Doctors)
        </div>
      </motion.div>
    </div>
  );
}
