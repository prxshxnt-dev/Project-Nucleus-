import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  Chrome,
  Mail,
  Lock,
  User as UserIcon,
  Phone,
  GraduationCap,
  ArrowRight,
  Eye,
  EyeOff
} from 'lucide-react';
import { 
  signInWithGoogle, 
  signInWithGoogleToken,
  loginWithEmailAndPassword,
  signUpWithEmailAndPassword
} from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import { toast } from 'sonner';

export default function Login() {
  const { user, setUser, setLoading, loading } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  // Authentication State Toggle: 'login' | 'register'
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Input states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [classGroup, setClassGroup] = useState('11');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Google Identity Services (GIS) Callback
  const handleCredentialResponse = async (response: any) => {
    if (!response || !response.credential) {
      toast.error('Google credentials not received.');
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

      if (window.self === window.top) {
        google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed()) {
            console.debug('One tap not displayed:', notification.getNotDisplayedReason());
          }
        });
      }

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
  }, [authMode]);

  // Auto-redirect if user already logged in
  useEffect(() => {
    if (!loading && user) {
      const from = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [user, loading, navigate, location]);

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (err: any) {
      toast.error(err.message || 'Google portal authentication failed.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!email || !password) {
      toast.error('Please enter email and password.');
      return;
    }

    if (authMode === 'register' && (!name || !phone)) {
      toast.error('All registration fields are required.');
      return;
    }

    setIsSubmitting(true);
    setLoading(true);

    try {
      if (authMode === 'login') {
        const loggedUser = await loginWithEmailAndPassword(email, password);
        toast.success(`Welcome back, ${loggedUser.displayName || 'Student'}!`);
      } else {
        const registeredUser = await signUpWithEmailAndPassword(email, password, name, phone, classGroup);
        toast.success(`Account created successfully! Welcome, ${registeredUser.displayName || 'Student'}!`);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Authentication operation failed.');
    } finally {
      setIsSubmitting(false);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 flex items-center justify-center bg-background text-foreground transition-colors duration-300">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md p-8 bg-card rounded-3xl border border-border shadow-xl text-foreground"
      >
        {/* Academic branding card header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#FF8C42]/10 rounded-full text-[#FF8C42] text-xs font-semibold mb-3">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Nucleus Era IIT & Medical</span>
          </div>
          <h2 className="font-display font-extrabold text-3xl">
            {authMode === 'login' ? 'Student Entry' : 'Create Account'}
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Managed and taught by elite IITians & Doctors
          </p>
        </div>

        {/* Dynamic Auth Forms */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <AnimatePresence mode="wait">
            {authMode === 'register' && (
              <motion.div
                key="register-fields"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-4 overflow-hidden"
              >
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">Full Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      required={authMode === 'register'}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your full name"
                      className="w-full pl-10 pr-4 py-2.5 bg-secondary border border-border rounded-xl text-sm focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">Mobile Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="tel"
                      required={authMode === 'register'}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="10-digit phone number"
                      className="w-full pl-10 pr-4 py-2.5 bg-secondary border border-border rounded-xl text-sm focus:outline-none focus:border-primary transition-colors font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">Class / Standard</label>
                  <div className="relative">
                    <GraduationCap className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <select
                      value={classGroup}
                      onChange={(e) => setClassGroup(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-secondary border border-border rounded-xl text-sm focus:outline-none focus:border-primary transition-colors appearance-none"
                    >
                      <option value="6">Class 6</option>
                      <option value="7">Class 7</option>
                      <option value="8">Class 8</option>
                      <option value="9">Class 9</option>
                      <option value="10">Class 10</option>
                      <option value="11">Class 11</option>
                      <option value="12">Class 12</option>
                      <option value="dropper">Dropper</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-2.5 bg-secondary border border-border rounded-xl text-sm focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Password</label>
              {authMode === 'login' && (
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  className="text-xs text-[#FF8C42] hover:underline font-semibold"
                >
                  Forgot?
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 bg-secondary border border-border rounded-xl text-sm focus:outline-none focus:border-primary transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <motion.button
            type="submit"
            disabled={isSubmitting}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="w-full py-3 px-4 bg-[#FF8C42] hover:bg-[#E0732C] hover-glow text-black font-extrabold rounded-2xl flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer shadow-md mt-6"
          >
            <span>{authMode === 'login' ? 'Sign In' : 'Register Account'}</span>
            <ArrowRight className="w-4 h-4 text-black" />
          </motion.button>
        </form>

        {/* Separator */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-3 text-muted-foreground font-bold tracking-wider">Or continue with</span>
          </div>
        </div>

        {/* Large Continue with Google Button */}
        <div className="mb-6">
          <motion.button 
            type="button"
            onClick={handleGoogleLogin}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="relative w-full py-3.5 px-4 bg-secondary hover:bg-border/50 text-foreground font-bold rounded-2xl flex items-center justify-center gap-2.5 transition-all duration-200 cursor-pointer border border-border overflow-hidden"
            id="google-continue-btn"
          >
            <Chrome className="w-4 h-4 text-primary" />
            <span>Continue with Google</span>
            <div 
              id="google-gsi-button" 
              className="absolute inset-0 opacity-0 cursor-pointer z-10 [&_iframe]:!w-full [&_iframe]:!h-full [&_iframe]:!absolute [&_iframe]:!top-0 [&_iframe]:!left-0"
            />
          </motion.button>
          <p className="text-[10px] text-center text-muted-foreground mt-2">
            Secure, instant one-click access. New users will be guided to setup.
          </p>
        </div>

        {/* State Toggle Button */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          {authMode === 'login' ? "Don't have an account yet? " : "Already have an account? "}
          <button 
            type="button"
            onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
            className="text-[#FF8C42] font-bold hover:underline cursor-pointer bg-transparent border-none p-0 inline font-sans"
          >
            {authMode === 'login' ? 'Create Account' : 'Sign In'}
          </button>
        </p>

        <div className="text-center mt-8 text-[10px] text-muted-foreground">
          © 2026 Nucleus.CC (Coaching Centre managed by IITians and Doctors)
        </div>
      </motion.div>
    </div>
  );
}
