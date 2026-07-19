import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  BookOpen, 
  Chrome 
} from 'lucide-react';
import { signInWithGoogle, signInWithGoogleToken } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import { toast } from 'sonner';

export default function Login() {
  const { user, setUser, setLoading, loading } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

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

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (err: any) {
      toast.error(err.message || 'Google portal authentication failed.');
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
        {/* Academic branding card header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full text-primary text-xs font-semibold mb-3">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Nucleus Era IIT & Medical</span>
          </div>
          <h2 className="font-display font-extrabold text-3xl">Student Entry</h2>
          <p className="text-[#7A7A7A] text-sm mt-1">Managed and taught by elite IITians & Doctors</p>
        </div>

        {/* Large Continue with Google Button */}
        <div className="mb-6">
          <motion.button 
            type="button"
            onClick={handleGoogleLogin}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="relative w-full py-4 px-4 bg-primary hover:bg-[#3730A3] text-white font-bold rounded-2xl flex items-center justify-center gap-2.5 transition-all duration-200 cursor-pointer shadow-md overflow-hidden"
            id="google-continue-btn"
          >
            <Chrome className="w-5 h-5 text-white fill-current" />
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

        {/* Info/Support Text */}
        <p className="text-center text-sm text-[#7A7A7A] mt-8">
          Don't have an account yet?{' '}
          <button 
            type="button"
            onClick={handleGoogleLogin}
            className="text-primary font-bold hover:underline cursor-pointer bg-transparent border-none p-0 inline font-sans"
          >
            Create Account
          </button>
        </p>

        <div className="text-center mt-8 text-[10px] text-[#7A7A7A]">
          © 2026 Nucleus.CC (Coaching Centre managed by IITians and Doctors)
        </div>
      </motion.div>
    </div>
  );
}
