import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { signInWithGoogle, logout } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';

export default function Navbar() {
  const { user, loading } = useAuthStore();
  const { settings } = useSettingsStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <motion.nav 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-6 py-4 md:px-12 backdrop-blur-xl bg-[#070709]/90 border-b border-white/5"
      >
        <Link to="/" className="flex items-center gap-3 xl:gap-4 group">
          {settings.logoImage ? (
            <img src={settings.logoImage} alt="Logo" className="w-8 h-8 md:w-10 md:h-10 object-contain group-hover:scale-105 transition-transform" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#E5D2A5] to-[#f4ecd8] flex items-center justify-center text-[#070709] font-display font-bold text-lg group-hover:scale-105 transition-transform">
              {settings.logoText || 'N'}
            </div>
          )}
          <span className="font-display font-semibold tracking-tight text-lg text-white">
            {settings.websiteName}
          </span>
        </Link>
  
        <div className="hidden md:flex items-center gap-8 justify-center absolute left-1/2 -translate-x-1/2">
           <a href="/#about" className="text-sm font-medium text-white/60 hover:text-white transition-colors">About</a>
           <a href="/#teachers" className="text-sm font-medium text-white/60 hover:text-white transition-colors">Teachers</a>
           <a href="/#review" className="text-sm font-medium text-white/60 hover:text-white transition-colors">Review Form</a>
           <a href="/#classes" className="text-sm font-medium text-white/60 hover:text-white transition-colors">Classes</a>
        </div>
  
        <div className="hidden md:flex items-center gap-4">
          {!loading && (
            user ? (
              <>
                <Link to="/dashboard" className="text-sm font-medium text-white/80 hover:text-white transition-colors">
                  Dashboard
                </Link>
                {(user.role === 'admin' || user.role === 'superadmin') && (
                  <Link to="/admin" className="text-sm font-medium text-[#E5D2A5] hover:text-[#f4ecd8] transition-colors">
                    Admin
                  </Link>
                )}
                <button 
                  onClick={logout}
                  className="px-4 py-2 text-sm font-medium rounded-full bg-white/5 hover:bg-white/10 active:scale-95 transition-all text-white border border-white/10"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <button 
                onClick={signInWithGoogle}
                className="px-5 py-2.5 text-sm font-medium rounded-full bg-[#E5D2A5] text-[#070709] hover:bg-[#f4ecd8] active:scale-95 transition-all shadow-[0_0_20px_rgba(229,210,165,0.2)]"
              >
                Sign In
              </button>
            )
          )}
        </div>
  
        <button 
          className="md:hidden p-2 text-white/80 hover:text-white"
          onClick={() => setMobileMenuOpen(true)}
        >
          <Menu className="w-6 h-6" />
        </button>
      </motion.nav>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-50 bg-[#070709] flex flex-col md:hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <Link to="/" className="flex items-center gap-3" onClick={() => setMobileMenuOpen(false)}>
                {settings.logoImage ? (
                  <img src={settings.logoImage} alt="Logo" className="w-8 h-8 object-contain" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#E5D2A5] to-[#f4ecd8] flex items-center justify-center text-[#070709] font-display font-bold text-lg">
                    {settings.logoText || 'N'}
                  </div>
                )}
                <span className="font-display font-semibold tracking-tight text-lg text-white">
                   {settings.websiteName}
                </span>
              </Link>
              <button 
                className="p-2 text-white/80 hover:text-white"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex flex-col p-6 gap-6 text-lg font-medium">
              <a href="/#about" onClick={() => setMobileMenuOpen(false)} className="text-white/80 hover:text-white">About</a>
              <a href="/#teachers" onClick={() => setMobileMenuOpen(false)} className="text-white/80 hover:text-white">Teachers</a>
              <a href="/#review" onClick={() => setMobileMenuOpen(false)} className="text-white/80 hover:text-white">Review Form</a>
              <a href="/#classes" onClick={() => setMobileMenuOpen(false)} className="text-white/80 hover:text-white">Classes</a>
              
              <div className="h-px bg-white/10 w-full my-2"></div>
              
              {!loading && (
                user ? (
                  <>
                    <Link 
                      to="/dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-white"
                    >
                      Dashboard
                    </Link>
                    {(user.role === 'admin' || user.role === 'superadmin') && (
                      <Link 
                        to="/admin"
                        onClick={() => setMobileMenuOpen(false)}
                        className="text-[#E5D2A5]"
                      >
                        Admin
                      </Link>
                    )}
                    <button 
                      onClick={() => { logout(); setMobileMenuOpen(false); }}
                      className="text-left text-white/60"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => { signInWithGoogle(); setMobileMenuOpen(false); }}
                    className="mt-4 px-5 py-3 text-center rounded-full bg-[#E5D2A5] text-[#070709] font-medium"
                  >
                    Sign In
                  </button>
                )
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
