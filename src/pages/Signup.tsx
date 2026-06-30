import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
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
  RefreshCw
} from 'lucide-react';
import { signInWithGoogle, signInWithGoogleToken } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import { toast } from 'sonner';
import FloatingLabelInput from '../components/FloatingLabelInput';

export default function Signup() {
  const { user, loading, setLoading } = useAuthStore();
  const navigate = useNavigate();

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [classGroup, setClassGroup] = useState('11');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Google Identity Services (GIS) Callback
  const handleCredentialResponse = async (response: any) => {
    if (!response || !response.credential) {
      toast.error('Google portal credentials not received.');
      return;
    }
    try {
      if (setLoading) setLoading(true);
      const authenticatedUser = await signInWithGoogleToken(response.credential);
      toast.success(`Welcome back, ${authenticatedUser.displayName || 'Student'}!`);
    } catch (err: any) {
      console.error('GIS authentication error:', err);
      toast.error(err.message || 'Google portal authentication failed.');
    } finally {
      if (setLoading) setLoading(false);
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
      const btnEl = document.getElementById("google-signup-gsi-button");
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

  // Auto-redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'admin' || user.role === 'superadmin') {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, loading, navigate]);

  const validate = (): boolean => {
    if (!name.trim()) {
      toast.error('Please enter your full name.');
      return false;
    }
    const emailClean = email.trim().toLowerCase();
    if (!emailClean) {
      toast.error('Please enter your email.');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailClean)) {
      toast.error('Please enter a valid email address.');
      return false;
    }
    if (!phone.trim()) {
      toast.error('Mobile Phone Number is required.');
      return false;
    }
    if (phone.trim().length < 8) {
      toast.error('Please enter a valid phone number.');
      return false;
    }
    if (password.length < 6) {
      toast.error('Password must contain at least 6 characters.');
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
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: email.toLowerCase().trim(), 
          phone: phone.trim(),
          type: 'register' 
        }),
      });

      let data: any = {};
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        try {
          data = await response.json();
        } catch (jsonErr) {
          console.warn("Failed to parse response as JSON:", jsonErr);
        }
      } else {
        const textResponse = await response.text();
        console.warn("Non-JSON response received:", textResponse);
      }

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to dispatch verification security code.');
      }

      toast.success(data.message || 'Verification PIN sent successfully!');
      
      // Cleanly navigate to separate verify standalone screen
      navigate('/verify-otp', {
        state: {
          email: email.toLowerCase().trim(),
          phone: phone.trim(),
          name: name.trim(),
          password: password,
          classGroup: classGroup,
          type: 'register'
        }
      });
    } catch (err: any) {
      const errMsg = err.message || '';
      const isAlreadyRegistered = 
        errMsg.toLowerCase().includes('already registered') || 
        errMsg.toLowerCase().includes('already linked') || 
        errMsg.toLowerCase().includes('login');
        
      if (isAlreadyRegistered) {
        toast.error(errMsg, {
          duration: 10000,
          action: {
            label: "Log In Now",
            onClick: () => navigate('/login', { state: { email: email.toLowerCase().trim() } })
          }
        });
      } else {
        toast.error(errMsg || 'An error occurred during registration. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleRegister = async () => {
    try {
      await signInWithGoogle();
    } catch (err: any) {
      toast.error(err.message || 'Google signup connection failed.');
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
          <h2 className="font-display font-extrabold text-3xl text-[#1F1F1F]">Create Account</h2>
          <p className="text-[#7A7A7A] text-sm mt-1">Managed & taught by elite IITians and Doctors</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name Field */}
          <FloatingLabelInput
            label="Full Name"
            icon={<User className="w-5 h-5" />}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            id="register-name-field"
          />

          {/* Email Field */}
          <FloatingLabelInput
            label="Email Address"
            icon={<Mail className="w-5 h-5" />}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            id="register-email-field"
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
                <option value="11 font-bold text-primary">Class 11th (JEE / NEET Main prep)</option>
                <option value="12">Class 12th Board & Competitive Focus</option>
                <option value="dropper">Droppers Batch (Repeaters Focus)</option>
              </select>
            </div>
          </div>

          {/* Guard Statement */}
          <div className="p-3.5 bg-primary/5 rounded-2xl border border-primary/10 flex gap-2 w-full text-xs text-[#1F1F1F]/80">
            <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <p>A 6-digit verification code will be sent instantly to confirm your student email account.</p>
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
                <span>Sending Verification...</span>
              </>
            ) : (
              <>
                <span>Register & Send Verification Code</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </motion.button>
        </form>

        {/* Third Party Divider */}
        <div className="relative flex items-center my-6">
          <div className="flex-grow border-t border-black/10"></div>
          <span className="flex-shrink mx-4 text-[#7A7A7A] text-xs uppercase font-bold tracking-wider">Or register with</span>
          <div className="flex-grow border-t border-black/10"></div>
        </div>

        {/* Google Registration trigger */}
        <motion.button 
          onClick={handleGoogleRegister}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="relative w-full py-3 px-4 bg-transparent hover:bg-black/5 border border-black/10 rounded-2xl text-[#1F1F1F] font-semibold flex items-center justify-center gap-2.5 transition-all duration-200 cursor-pointer overflow-hidden"
        >
          <Chrome className="w-5 h-5 text-red-500 fill-current" />
          <span>Register with Google Portal</span>
          <div 
            id="google-signup-gsi-button" 
            className="absolute inset-0 opacity-0 cursor-pointer z-10 [&_iframe]:!w-full [&_iframe]:!h-full [&_iframe]:!absolute [&_iframe]:!top-0 [&_iframe]:!left-0"
          />
        </motion.button>

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
