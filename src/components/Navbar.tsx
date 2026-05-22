import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { signInWithGoogle, logout } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { Menu, X, Home as HomeIcon, BookOpen, Sliders, LogIn, LogOut, Sparkles, User, LayoutDashboard, Smartphone } from 'lucide-react';

export default function Navbar() {
  const { user, loading } = useAuthStore();
  const { settings } = useSettingsStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const isHomeActive = location.pathname === '/';
  const isDashboardActive = location.pathname === '/dashboard';
  const isAdminActive = location.pathname === '/admin';

  return (
    <>
      {/* Desktop Top Navbar */}
      <motion.nav 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-6 py-4 md:px-12 backdrop-blur-xl bg-glass-bg border-b border-border-color shadow-sm"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <Link to="/" className="flex items-center gap-3 xl:gap-4 group">
          {settings.logoImage ? (
            <img 
              src={settings.logoImage} 
              alt="Logo" 
              className="w-8 h-8 md:w-10 md:h-10 object-contain group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300" 
            />
          ) : (
            <div 
              className="w-9 h-9 md:w-10 md:h-10 rounded-2xl bg-gradient-to-tr from-[#ff839a] via-accent-primary to-amber-200 flex items-center justify-center text-button-text font-display font-bold text-lg group-hover:rotate-12 group-hover:scale-110 transition-all duration-300 shadow-md"
              style={{ borderRadius: 'var(--theme-card-radius, 16px)' }}
            >
              {settings.logoText || 'N'}
            </div>
          )}
          <span className="font-display font-bold tracking-tight text-lg text-text-primary group-hover:text-accent-primary transition-colors">
            {settings.websiteName}
          </span>
        </Link>
  
        {/* Navigation links with micro hover states */}
        <div className="hidden md:flex items-center gap-8 justify-center absolute left-1/2 -translate-x-1/2">
          <a href="/#about" className="text-sm font-semibold text-text-secondary hover:text-accent-primary transition-colors flex items-center gap-1">
            <span>About</span>
          </a>
          <a href="/#classes" className="text-sm font-semibold text-text-secondary hover:text-accent-primary transition-colors flex items-center gap-1">
            <span>Classes</span>
          </a>
          <a href="/#teachers" className="text-sm font-semibold text-text-secondary hover:text-accent-primary transition-colors flex items-center gap-1">
            <span>Faculty</span>
          </a>
          {settings.reviewFormUrl && (
            <a href="/#review" className="text-sm font-semibold text-text-secondary hover:text-accent-primary transition-colors flex items-center gap-1">
              <span>Feedback</span>
            </a>
          )}
        </div>
  
        {/* Desktop Buttons */}
        <div className="hidden md:flex items-center gap-4">
          <button
            onClick={() => {
              if (settings.pwaBtnLink) {
                window.open(settings.pwaBtnLink, '_blank', 'noopener,noreferrer');
              } else {
                window.dispatchEvent(new Event('trigger-nucleus-pwa-install'));
              }
            }}
            className="text-xs font-semibold text-[#ff7a00] border border-[#ff7a00]/30 hover:border-[#ff7a00]/60 bg-[#ff7a00]/5 hover:bg-[#ff7a00]/10 px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>{settings.pwaBtnText || "Install App"}</span>
          </button>
          {!loading && (
            user ? (
              <>
                <Link 
                  to="/dashboard" 
                  className={`text-sm font-semibold px-4 py-2 rounded-xl transition-all ${
                    isDashboardActive ? 'text-accent-primary bg-accent-primary/10' : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  My Dashboard
                </Link>
                {(user.role === 'admin' || user.role === 'superadmin') && (
                  <Link 
                    to="/admin" 
                    className={`text-sm font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                      isAdminActive ? 'text-[#ff8a9e] bg-red-500/5' : 'text-accent-primary hover:opacity-80'
                    }`}
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Control Panel</span>
                  </Link>
                )}
                
                {/* User avatar or logout */}
                <div className="relative group">
                  <div className="flex items-center gap-2 pl-3 border-l border-border-color cursor-pointer">
                    <div className="w-8 h-8 rounded-full bg-accent-primary/10 border border-accent-primary/30 overflow-hidden flex items-center justify-center text-accent-primary font-bold text-sm">
                      {user.photoURL ? (
                        <img src={user.photoURL} alt={user?.displayName || 'User'} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        user.displayName?.charAt(0) || user.email?.charAt(0)
                      )}
                    </div>
                  </div>
                  <div className="absolute right-0 top-full pt-2 opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 pointer-events-none group-hover:pointer-events-auto transition-all duration-200">
                    <div className="bg-bg-secondary border border-border-color rounded-2xl p-4 shadow-xl min-w-[200px] space-y-3">
                      <div className="text-left">
                        <p className="text-xs text-text-muted">Logged in as</p>
                        <p className="text-sm font-bold text-text-primary truncate">{user.displayName || user.email}</p>
                      </div>
                      <div className="h-px bg-border-color" />
                      <button 
                        onClick={logout}
                        className="w-full py-2 px-3 text-xs font-semibold rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors text-left flex items-center gap-1.5 cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <button 
                onClick={signInWithGoogle}
                className="theme-btn-themed px-5 py-2.5 text-sm font-semibold rounded-full bg-accent-primary text-button-text hover:scale-105 active:scale-95 transition-all shadow-[0_4px_15px_rgba(0,0,0,0.1)] hover:shadow-lg cursor-pointer flex items-center gap-2"
                style={{ borderRadius: 'var(--theme-btn-radius, 9999px)' }}
              >
                <Sparkles className="w-4 h-4 text-button-text animate-pulse" />
                <span>Join Now</span>
              </button>
            )
          )}
        </div>
  
        {/* Mobile menu trigger */}
        <button 
          className="md:hidden p-2 text-text-secondary hover:text-text-primary rounded-xl hover:bg-white/5 active:scale-95 transition-all"
          onClick={() => setMobileMenuOpen(true)}
        >
          <Menu className="w-6 h-6" />
        </button>
      </motion.nav>

      {/* Floating Bottom Navigation Bar for Mobile */}
      <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-sm bg-glass-bg/95 backdrop-blur-lg border border-border-color rounded-full py-2.5 px-6 shadow-[0_10px_40px_rgba(0,0,0,0.2)] flex items-center justify-between">
        <Link 
          to="/" 
          className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-all ${
            isHomeActive ? 'text-accent-primary scale-110' : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <HomeIcon className="w-5 h-5" />
          <span>Home</span>
        </Link>
        <Link 
          to="/dashboard" 
          className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-all ${
            isDashboardActive ? 'text-accent-primary scale-110' : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <BookOpen className="w-5 h-5" />
          <span>Learn</span>
        </Link>
        {(user?.role === 'admin' || user?.role === 'superadmin') && (
          <Link 
            to="/admin" 
            className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-all ${
              isAdminActive ? 'text-[#ff8a9e] scale-110' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <Sliders className="w-5 h-5" />
            <span>Admin</span>
          </Link>
        )}
        <Link 
          to="/dashboard" 
          className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-all ${
            isDashboardActive ? 'text-accent-primary scale-110 font-black' : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span>Dashboard</span>
        </Link>
        {!loading && (
          user ? (
            <button 
              onClick={logout}
              className="flex flex-col items-center gap-1 text-[10px] font-bold text-text-muted hover:text-text-primary transition-all cursor-pointer"
            >
              <div className="w-5 h-5 rounded-full bg-accent-primary/10 border border-accent-primary/30 flex items-center justify-center text-accent-primary text-[8px] font-black overflow-hidden select-none">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
                ) : (
                  user.displayName?.charAt(0) || <User className="w-3.5 h-3.5" />
                )}
              </div>
              <span>Out</span>
            </button>
          ) : (
            <button 
              onClick={signInWithGoogle}
              className="flex flex-col items-center gap-1 text-[10px] font-bold text-accent-primary animate-pulse transition-all cursor-pointer"
            >
              <LogIn className="w-5 h-5" />
              <span>Join</span>
            </button>
          )
        )}
      </div>

      {/* Mobile Drawer Slide-out menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-50 bg-bg-primary flex flex-col md:hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-color">
              <Link to="/" className="flex items-center gap-3" onClick={() => setMobileMenuOpen(false)}>
                {settings.logoImage ? (
                  <img src={settings.logoImage} alt="Logo" className="w-8 h-8 object-contain" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#ff82a0] to-accent-primary flex items-center justify-center text-button-text font-display font-bold text-lg">
                    {settings.logoText || 'N'}
                  </div>
                )}
                <span className="font-display font-bold tracking-tight text-lg text-text-primary">
                   {settings.websiteName}
                </span>
              </Link>
              <button 
                className="p-2 text-text-secondary hover:text-text-primary rounded-xl"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex flex-col p-6 gap-6 text-lg font-bold">
              <a href="/#about" onClick={() => setMobileMenuOpen(false)} className="text-text-secondary hover:text-text-primary">About</a>
              <a href="/#classes" onClick={() => setMobileMenuOpen(false)} className="text-text-secondary hover:text-text-primary">Classes</a>
              <a href="/#teachers" onClick={() => setMobileMenuOpen(false)} className="text-text-secondary hover:text-text-primary">Faculty</a>
              {settings.reviewFormUrl && (
                <a href="/#review" onClick={() => setMobileMenuOpen(false)} className="text-text-secondary hover:text-text-primary">Feedback Form</a>
              )}
              
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  if (settings.pwaBtnLink) {
                    window.open(settings.pwaBtnLink, '_blank', 'noopener,noreferrer');
                  } else {
                    window.dispatchEvent(new Event('trigger-nucleus-pwa-install'));
                  }
                }}
                className="text-left text-[#ff7a00] hover:text-[#ff7a00]/80 flex items-center gap-2 cursor-pointer pt-1"
              >
                <Smartphone className="w-5 h-5 text-[#ff7a00]" />
                <span>{settings.pwaBtnText || "Install Native App"}</span>
              </button>
              
              <div className="h-px bg-border-color w-full my-2"></div>
              
              {!loading && (
                user ? (
                  <>
                    <Link 
                      to="/dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-text-primary flex items-center gap-2"
                    >
                      <BookOpen className="w-5 h-5 text-accent-primary" />
                      <span>My Dashboard</span>
                    </Link>
                    {(user.role === 'admin' || user.role === 'superadmin') && (
                      <Link 
                        to="/admin"
                        onClick={() => setMobileMenuOpen(false)}
                        className="text-[#ff8a9e] flex items-center gap-2"
                      >
                        <Sliders className="w-5 h-5 text-[#ff8a9e]" />
                        <span>Control Panel</span>
                      </Link>
                    )}
                    <button 
                      onClick={() => { logout(); setMobileMenuOpen(false); }}
                      className="text-left text-text-muted flex items-center gap-2 cursor-pointer mt-4"
                    >
                      <LogOut className="w-5 h-5" />
                      <span>Sign Out</span>
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => { signInWithGoogle(); setMobileMenuOpen(false); }}
                    className="mt-4 px-5 py-3 text-center rounded-2xl bg-accent-primary text-button-text font-bold flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-5 h-5" />
                    <span>Join Free App</span>
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

