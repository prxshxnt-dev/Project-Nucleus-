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
  Chrome 
} from 'lucide-react';
import { signInWithGoogle, auth } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import { toast } from 'sonner';

export default function Signup() {
  const { user, loading } = useAuthStore();
  const navigate = useNavigate();

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [classGroup, setClassGroup] = useState('11');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true });
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

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to dispatch verification security code.');
      }

      toast.success(data.message || 'OTP sent successfully!');
      
      // Navigate to OTP verification page and pass the registration state
      navigate('/verify-otp', { 
        state: { 
          email: email.toLowerCase().trim(),
          phone: phone.trim(),
          name: name.trim(),
          password,
          classGroup,
          type: 'register',
          simulated: data.simulated,
          simulatedOtp: data.otp
        } 
      });
    } catch (err: any) {
      toast.error(err.message || 'An error occurred. Please try again.');
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
        className="w-full max-w-md p-8 bg-[#FFFDF9] rounded-3xl border border-black/10 shadow-xl"
      >
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full text-primary text-xs font-semibold mb-3">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Nucleus.CC Coaching Centre</span>
          </div>
          <h2 className="font-display font-extrabold text-3xl text-[#1F1F1F]">Create Account</h2>
          <p className="text-[#7A7A7A] text-sm mt-1">Managed by Academic experts (IITians & Doctors)</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name Field */}
          <div className="relative">
            <label className="text-xs font-bold text-[#1F1F1F] uppercase tracking-wider block mb-1.5 ml-1">Full Name</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7A7A7A]">
                <User className="w-5 h-5" />
              </span>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Prashant Kumar"
                required
                className="w-full pl-12 pr-4 py-3.5 bg-[#FDF5E6] border border-black/10 rounded-2xl text-[#1F1F1F] placeholder-[#7A7A7A] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-200"
              />
            </div>
          </div>

          {/* Email Field */}
          <div className="relative">
            <label className="text-xs font-bold text-[#1F1F1F] uppercase tracking-wider block mb-1.5 ml-1">Email Address</label>
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

          {/* Phone Field */}
          <div className="relative">
            <label className="text-xs font-bold text-[#1F1F1F] uppercase tracking-wider block mb-1.5 ml-1">Mobile Phone Number</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7A7A7A]">
                <Smartphone className="w-5 h-5" />
              </span>
              <input 
                type="tel" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                required
                className="w-full pl-12 pr-4 py-3.5 bg-[#FDF5E6] border border-black/10 rounded-2xl text-[#1F1F1F] placeholder-[#7A7A7A] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-200"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="relative">
            <label className="text-xs font-bold text-[#1F1F1F] uppercase tracking-wider block mb-1.5 ml-1">Password</label>
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
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#7A7A7A] hover:text-[#1F1F1F] transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Target Prep Batch / Class Group */}
          <div>
            <label className="text-xs font-bold text-[#1F1F1F] uppercase tracking-wider block mb-1.5 ml-1">Target Academic Segment</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7A7A7A]">
                <GraduationCap className="w-5 h-5" />
              </span>
              <select 
                value={classGroup}
                onChange={(e) => setClassGroup(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-[#FDF5E6] border border-black/10 rounded-2xl text-[#1F1F1F] appearance-none focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-medium"
              >
                <option value="6">Class 6th Foundation</option>
                <option value="7">Class 7th Foundation</option>
                <option value="8">Class 8th Foundation</option>
                <option value="9">Class 9th Foundation</option>
                <option value="10">Class 10th Foundation</option>
                <option value="11">Class 11th (JEE / NEET Main prep)</option>
                <option value="12">Class 12th Board & Competitive</option>
                <option value="dropper">Droppers Batch (Repeaters Focus)</option>
              </select>
            </div>
          </div>

          {/* Guidelines info */}
          <div className="p-3.5 bg-primary/5 rounded-2xl border border-primary/10 flex gap-2 w-full text-xs text-[#1F1F1F]/80">
            <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <p>We respect your privacy. A dynamic 6-digit cryptographic registration key will be sent instantly to check your email active status.</p>
          </div>

          {/* Register Button */}
          <motion.button 
            type="submit" 
            disabled={isSubmitting}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className={`w-full py-4 bg-primary text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-primary-dark transition-all duration-200 shadow-md ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            <span>{isSubmitting ? 'Sending Security PIN...' : 'Register & Send OTP'}</span>
            {!isSubmitting && <ArrowRight className="w-5 h-5" />}
          </motion.button>
        </form>

        {/* Third Party Divider */}
        <div className="relative flex items-center my-6">
          <div className="flex-grow border-t border-black/10"></div>
          <span className="flex-shrink mx-4 text-[#7A7A7A] text-xs uppercase font-bold tracking-wider">Or register with</span>
          <div className="flex-grow border-t border-black/10"></div>
        </div>

        {/* Google Register */}
        <motion.button 
          onClick={() => signInWithGoogle()}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="w-full py-3 px-4 bg-transparent hover:bg-black/5 border border-black/10 rounded-2xl text-[#1F1F1F] font-semibold flex items-center justify-center gap-2.5 transition-all duration-200 cursor-pointer"
        >
          <Chrome className="w-5 h-5 text-red-500 fill-current" />
          <span>Register with Google Portal</span>
        </motion.button>

        {/* Navigation back */}
        <p className="text-center text-sm text-[#7A7A7A] mt-6">
          Already part of Nucleus?{' '}
          <Link to="/login" className="text-primary font-bold hover:underline">
            Log In here
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
