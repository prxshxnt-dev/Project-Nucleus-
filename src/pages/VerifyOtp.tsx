import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { ShieldCheck, Timer, RefreshCw, ArrowLeft, BookOpen, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { toast } from 'sonner';

export default function VerifyOtp() {
  const { setUser, setLoading } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  // Retrieve routing state (passed from SignUp / Resets or recovered from session cache)
  const stateFromLocation = location.state as {
    email: string;
    phone?: string;
    name?: string;
    password?: string;
    classGroup?: string;
    type: 'register' | 'login' | 'reset';
    simulated?: boolean;
    simulatedOtp?: string;
  } | null;

  const [state, setState] = useState<{
    email: string;
    phone?: string;
    name?: string;
    password?: string;
    classGroup?: string;
    type: 'register' | 'login' | 'reset';
    simulated?: boolean;
    simulatedOtp?: string;
  } | null>(() => {
    if (stateFromLocation) {
      sessionStorage.setItem('temp_otp_state', JSON.stringify(stateFromLocation));
      return stateFromLocation;
    }
    const cached = sessionStorage.getItem('temp_otp_state');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(60); // 60s cooldown countdown
  const [currentSimulatedOtp, setCurrentSimulatedOtp] = useState<string | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Safe checks: If no credentials passed, navigate back to Signup/Login
  useEffect(() => {
    if (!state || (!state.email && !state.phone)) {
      toast.error('Identity detail (Email or Phone) is missing. Starting over.');
      navigate('/signup', { replace: true });
      return;
    }
    if (state.simulated && state.simulatedOtp) {
      setCurrentSimulatedOtp(state.simulatedOtp);
    } else if (state.simulatedOtp) {
      setCurrentSimulatedOtp(state.simulatedOtp);
    } else {
      // Default sandbox bypass key
      setCurrentSimulatedOtp('123456');
    }
  }, [state, navigate]);

  // Cooldown countdown timer
  useEffect(() => {
    let timer: any;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  // Focus helper on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  // Log simulated OTP quietly to console for easy developer bypass without visual noise in UI
  useEffect(() => {
    if (currentSimulatedOtp) {
      console.log(`[STATION PROTOCOL SIMULATION]: Received dynamic verification code: ${currentSimulatedOtp}`);
    }
  }, [currentSimulatedOtp]);

  // Handle Box Keyboard Typing Input
  const handleChange = (index: number, value: string) => {
    if (isNaN(Number(value))) return; // only digits permitted

    const newOtp = [...otp];
    // Keep only the last character entered
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // If a value is typed and a next input is available, focus it
    if (value && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle Box Clipboard Paste Event
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim();
    
    // Automatically strip any non-digit characters like spaces, letters, or hyphens
    const cleanedDigits = pasteData.replace(/\D/g, '');
    if (cleanedDigits.length === 0) {
      toast.error('Could not find any numeric digits in the pasted text.');
      return;
    }
    
    const digits = cleanedDigits.slice(0, 6).split('');
    const newOtp = [...otp];
    for (let i = 0; i < 6; i++) {
      newOtp[i] = digits[i] || '';
    }
    setOtp(newOtp);
    // Focus the last filled input box
    const focusIndex = Math.min(digits.length - 1, 5);
    inputRefs.current[focusIndex]?.focus();
    toast.success(`Successfully pasted ${digits.length}-digit code!`);
  };

  // Handle Box Backspace / Navigation keys
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0 && inputRefs.current[index - 1]) {
        // focus preceding index if empty
        const newOtp = [...otp];
        newOtp[index - 1] = '';
        setOtp(newOtp);
        inputRefs.current[index - 1]?.focus();
      } else if (otp[index]) {
        // delete self value
        const newOtp = [...otp];
        newOtp[index] = '';
        setOtp(newOtp);
      }
    }
  };

  // Resend OTP trigger
  const handleResend = async () => {
    if (cooldown > 0 || isResending) return;

    setIsResending(true);
    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: state?.email, phone: state?.phone, type: state?.type }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to dispatch new OTP code.');
      }

      toast.success(data.message || 'Verification PIN sent successfully!');
      setCooldown(60); // reset cooldown limit
      
      if (data.simulated && data.otp) {
        setCurrentSimulatedOtp(data.otp);
        if (state) {
          const updatedState = { ...state, simulatedOtp: data.otp, simulated: true };
          setState(updatedState);
          sessionStorage.setItem('temp_otp_state', JSON.stringify(updatedState));
        }
      } else {
        setCurrentSimulatedOtp(null);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to trigger OTP delivery.');
    } finally {
      setIsResending(false);
    }
  };

  // Final validation & state save
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const joinedOtp = otp.join('');
    if (joinedOtp.length < 6) {
      toast.error('Please enter the full 6-digit verification PIN.');
      return;
    }

    if (!state) return;

    setIsVerifying(true);
    try {
      if (state.type === 'register') {
        // Registering a new account
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: state.name,
            email: state.email,
            phone: state.phone,
            password: state.password,
            classGroup: state.classGroup,
            otp: joinedOtp
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Account Registration verification failed.');
        }

        // Save session state locally
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        localStorage.setItem('accessToken', data.token);
        localStorage.setItem('isLoggedIn', 'true');

        // Update global auth store
        setUser(data.user);
        setLoading(false);

        toast.success(`Welcome to Nucleus Coaching, ${data.user.displayName}!`);
        navigate('/select-standard', { replace: true });

      } else if (state.type === 'login') {
        // Passwordless OTP Login verification
        const response = await fetch('/api/auth/login-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: state.email,
            phone: state.phone,
            otp: joinedOtp
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Identity Verification failed.');
        }

        localStorage.setItem('currentUser', JSON.stringify(data.user));
        localStorage.setItem('accessToken', data.token);
        localStorage.setItem('isLoggedIn', 'true');

        setUser(data.user);
        setLoading(false);

        toast.success(`Welcome back, ${data.user.displayName}!`);
        navigate('/dashboard', { replace: true });

      } else if (state.type === 'reset') {
        // Forgot Password step: Verify first, then proceed to credentials update page
        const response = await fetch('/api/auth/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: state.email,
            phone: state.phone,
            otp: joinedOtp,
            type: 'reset'
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Password Reset Verification failed.');
        }

        toast.success('Security identity verified. Set your new password.');
        
        // Pass to forgot password form for changing password
        navigate('/forgot-password', { 
          state: { 
            email: state.email,
            otp: joinedOtp,
            verified: true
          } 
        });
      }
    } catch (err: any) {
      toast.error(err.message || 'Verification failed. Please retry.');
    } finally {
      setIsVerifying(false);
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
        {/* Back Link / Change Email */}
        <button 
          onClick={() => navigate(state?.type === 'register' ? '/signup' : '/login')}
          className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-primary hover:text-[#D4471B] mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Change Email Address / Start Over</span>
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full text-primary mb-4">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h2 className="font-display font-extrabold text-3xl">Enter Verification Code</h2>
          <p className="text-[#7A7A7A] text-sm mt-1.5 px-2 leading-relaxed">
            We have sent a 6-digit verification code to:
            {state?.email && <span className="block mt-1 font-bold text-black">{state.email}</span>}
            {state?.phone && <span className="block mt-0.5 font-bold text-black">{state.phone}</span>}
          </p>
        </div>

        {/* Verification Form */}
        <form onSubmit={handleVerify} className="space-y-6">
          {/* OTP Number Boxes Input Row */}
          <div className="flex justify-between gap-2 max-w-xs mx-auto">
            {otp.map((data, index) => (
              <input
                key={index}
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                maxLength={1}
                ref={(el) => { inputRefs.current[index] = el; }}
                value={data}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                className="w-12 h-14 text-center text-2xl font-extrabold bg-[#FDF5E6] border border-black/15 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all duration-200"
              />
            ))}
          </div>

          {/* Controls button verification */}
          <motion.button 
            type="submit" 
            disabled={isVerifying}
            className={`w-full py-4 bg-primary hover:bg-primary-dark text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-md transition-all duration-200 ${isVerifying ? 'opacity-75 cursor-not-allowed' : ''}`}
          >
            {isVerifying ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Verifying code...</span>
              </>
            ) : (
              <span>Verify & Continue</span>
            )}
          </motion.button>
        </form>

        {/* Cooldown control resends */}
        <div className="mt-8 pt-6 border-t border-black/5 text-center">
          <p className="text-[#7A7A7A] text-sm">
            Didn't receive the code?
          </p>
          {cooldown > 0 ? (
            <div className="inline-flex items-center gap-1.5 text-xs text-primary font-bold mt-2 py-1.5 px-3 bg-primary/5 rounded-full">
              <Timer className="w-3.5 h-3.5" />
              <span>Resend available in {cooldown}s</span>
            </div>
          ) : (
            <button
              onClick={handleResend}
              disabled={isResending}
              className="mt-2 text-primary hover:text-primary-dark font-extrabold select-none text-sm underline shrink-0 transition-colors flex items-center justify-center gap-1 mx-auto"
            >
              {isResending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Resending...</span>
                </>
              ) : (
                <span>Resend Code</span>
              )}
            </button>
          )}
        </div>

        <div className="text-center mt-6 text-[11px] text-[#7A7A7A]">
          © 2026 Nucleus.CC (Educational coaching managed by IITians and Doctors)
        </div>
      </motion.div>
    </div>
  );
}
