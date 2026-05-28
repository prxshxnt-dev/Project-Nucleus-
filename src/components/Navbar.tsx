import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore, THEME_PRESETS } from '../store/settingsStore';
import { signInWithGoogle, logout } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { Menu, X, Home as HomeIcon, BookOpen, Sliders, LogIn, LogOut, Sparkles, User, LayoutDashboard, Smartphone } from 'lucide-react';

// Parse site's active theme or custom primary color to decimal values
const parseHexToRgbDecimals = (hex?: string) => {
  if (!hex) return [0.945, 0.353, 0.161];
  const cleanHex = hex.trim().replace('#', '');
  if (cleanHex.length === 3) {
    const r = parseInt(cleanHex[0] + cleanHex[0], 16) / 255;
    const g = parseInt(cleanHex[1] + cleanHex[1], 16) / 255;
    const b = parseInt(cleanHex[2] + cleanHex[2], 16) / 255;
    return [
      isNaN(r) ? 0.945 : r,
      isNaN(g) ? 0.353 : g,
      isNaN(b) ? 0.161 : b
    ];
  }
  if (cleanHex.length === 6) {
    const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
    const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
    const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
    return [
      isNaN(r) ? 0.945 : r,
      isNaN(g) ? 0.353 : g,
      isNaN(b) ? 0.161 : b
    ];
  }
  return [0.945, 0.353, 0.161];
};

export default function Navbar() {
  const { user, loading } = useAuthStore();
  const { settings } = useSettingsStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const activeTheme = settings?.activeTheme || 'default';
  let themeConfig = THEME_PRESETS[activeTheme] || THEME_PRESETS.default;
  if (activeTheme === 'custom' && settings?.themeCustomizations) {
    themeConfig = settings.themeCustomizations;
  }
  const [themeR, themeG, themeB] = parseHexToRgbDecimals(themeConfig.primaryColor);

  const handleScrollToSection = (sectionId: string, event: React.MouseEvent) => {
    event.preventDefault();
    setMobileMenuOpen(false);
    
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 150);
    } else {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const isHomeActive = location.pathname === '/';
  const isLearnActive = location.pathname === '/learn';
  const isDashboardActive = location.pathname === '/dashboard';
  const isAdminActive = location.pathname === '/admin';

  return (
    <>
      {/* Dynamic SVG Filter to colorize logos perfectly to the dynamic active theme color */}
      <svg style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }} aria-hidden="true">
        <filter id="logo-theme-tint" colorInterpolationFilters="sRGB">
          <feColorMatrix
            type="matrix"
            values={`0 0 0 0 ${themeR}
                    0 0 0 0 ${themeG}
                    0 0 0 0 ${themeB}
                    0 0 0 1 0`}
          />
        </filter>
      </svg>

      {/* Desktop Top Navbar */}
      <motion.nav 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-6 py-4 lg:px-12 backdrop-blur-xl bg-glass-bg border-b border-border-color shadow-sm"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <Link to="/" className="flex items-center gap-3 xl:gap-4 group shrink-0">
          {settings.logoImage ? (
            <img 
              src={settings.logoImage} 
              alt="Logo" 
              className="w-8 h-8 md:w-10 md:h-10 object-contain transition-all"
              style={{ filter: "url(#logo-theme-tint)" }}
            />
          ) : (
            <div 
              className="w-9 h-9 md:w-10 md:h-10 rounded-2xl bg-accent-primary flex items-center justify-center text-button-text font-display font-bold text-lg shadow-md transition-all"
              style={{ borderRadius: 'var(--theme-card-radius, 16px)' }}
            >
              {settings.logoText || 'N'}
            </div>
          )}
          <span className="font-display font-bold tracking-tight text-lg text-text-primary group-hover:text-accent-primary transition-colors">
            {settings.websiteName}
          </span>
        </Link>
  
        {/* Navigation links - hidden below xl (1280px) to prevent overlapping on standard desktop/tablet viewports */}
        <div className="hidden xl:flex items-center gap-6 xl:gap-8 justify-center absolute left-1/2 -translate-x-1/2">
          <button onClick={(e) => handleScrollToSection('about', e)} className="text-xs xl:text-sm font-semibold text-text-secondary hover:text-accent-primary transition-colors flex items-center gap-1 cursor-pointer">
            <span>About</span>
          </button>
          <button onClick={(e) => handleScrollToSection('classes', e)} className="text-xs xl:text-sm font-semibold text-text-secondary hover:text-accent-primary transition-colors flex items-center gap-1 cursor-pointer">
            <span>Classes</span>
          </button>
          <button onClick={(e) => handleScrollToSection('teachers', e)} className="text-xs xl:text-sm font-semibold text-text-secondary hover:text-[#ff839a] transition-colors flex items-center gap-1 cursor-pointer">
            <span>Faculty</span>
          </button>
          {settings.reviewFormUrl && (
            <button onClick={(e) => handleScrollToSection('review', e)} className="text-xs xl:text-sm font-semibold text-text-secondary hover:text-[#ff839a] transition-colors flex items-center gap-1 cursor-pointer">
              <span>Feedback</span>
            </button>
          )}
        </div>
  
        {/* Desktop Buttons */}
        <div className="hidden lg:flex items-center gap-3 xl:gap-4 shrink-0">
          <button
            onClick={() => {
              if (settings.pwaBtnLink) {
                window.open(settings.pwaBtnLink, '_blank', 'noopener,noreferrer');
              } else {
                window.dispatchEvent(new Event('trigger-nucleus-pwa-install'));
              }
            }}
            className="text-xs font-semibold text-[#ff7a00] border border-[#ff7a00]/30 hover:border-[#ff7a00]/60 bg-[#ff7a00]/5 hover:bg-[#ff7a00]/10 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 shrink-0"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>{settings.pwaBtnText || "Install App"}</span>
          </button>
          {!loading && (
            user ? (
              <>
                <Link 
                  to="/learn" 
                  className={`text-xs xl:text-sm font-semibold px-3 py-2 xl:px-4 rounded-xl transition-all shrink-0 ${
                    isLearnActive ? 'text-accent-primary bg-accent-primary/10 font-bold' : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {settings.syllabusSectionName || 'Syllabus'}
                </Link>
                <Link 
                  to="/dashboard" 
                  className={`text-xs xl:text-sm font-semibold px-3 py-2 xl:px-4 rounded-xl transition-all shrink-0 ${
                    isDashboardActive ? 'text-accent-primary bg-accent-primary/10 font-bold' : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  My Dashboard
                </Link>
                {(user.role === 'admin' || user.role === 'superadmin') && (
                  <Link 
                    to="/admin" 
                    className={`text-xs xl:text-sm font-bold px-3 py-2 xl:px-4 rounded-xl transition-all flex items-center gap-1.5 shrink-0 ${
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
              <Link 
                to="/login"
                className="theme-btn-themed px-5 py-2.5 text-sm font-semibold rounded-full bg-accent-primary text-button-text hover:scale-105 active:scale-95 transition-all shadow-[0_4px_15px_rgba(0,0,0,0.1)] hover:shadow-lg cursor-pointer flex items-center gap-2"
                style={{ borderRadius: 'var(--theme-btn-radius, 9999px)' }}
              >
                <Sparkles className="w-4 h-4 text-button-text animate-pulse" />
                <span>Join Now</span>
              </Link>
            )
          )}
        </div>
  
        {/* Mobile menu trigger */}
        <button 
          className="lg:hidden p-2 text-text-secondary hover:text-text-primary rounded-xl hover:bg-white/5 active:scale-95 transition-all"
          onClick={() => setMobileMenuOpen(true)}
        >
          <motion.div
            initial={{ rotate: 0 }}
            whileHover={{ scale: 1.1, rotate: 180 }}
            whileTap={{ scale: 0.9, rotate: -45 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <Menu className="w-6 h-6" />
          </motion.div>
        </button>
      </motion.nav>

      {/* Floating Bottom Navigation Bar for Mobile */}
      <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-sm bg-glass-bg/95 backdrop-blur-lg border border-border-color rounded-full py-2.5 px-6 shadow-[0_10px_40px_rgba(0,0,0,0.2)] flex items-center justify-between">
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
          to="/learn" 
          onClick={(e) => {
            if (!user) {
              e.preventDefault();
              alert("login first to unlock this");
            }
          }}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-all ${
            isLearnActive ? 'text-accent-primary scale-110' : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <BookOpen className="w-5 h-5" />
          <span>{settings.syllabusSectionName || 'Syllabus'}</span>
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
          onClick={(e) => {
            if (!user) {
              e.preventDefault();
              alert("login first to unlock this");
            }
          }}
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
            <Link 
              to="/login"
              className="flex flex-col items-center gap-1 text-[10px] font-bold text-accent-primary animate-pulse transition-all cursor-pointer"
            >
              <LogIn className="w-5 h-5" />
              <span>Join</span>
            </Link>
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
            className="fixed inset-0 z-50 bg-bg-primary flex flex-col lg:hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-color">
              <Link to="/" className="flex items-center gap-3" onClick={() => setMobileMenuOpen(false)}>
                {settings.logoImage ? (
                  <img 
                    src={settings.logoImage} 
                    alt="Logo" 
                    className="w-8 h-8 object-contain" 
                    style={{ filter: "url(#logo-theme-tint)" }}
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-accent-primary flex items-center justify-center text-button-text font-display font-bold text-lg">
                    {settings.logoText || 'N'}
                  </div>
                )}
                <span className="font-display font-bold tracking-tight text-lg text-text-primary">
                   {settings.websiteName}
                </span>
              </Link>
              <button 
                className="p-2 text-text-secondary hover:text-text-primary rounded-xl transition-all duration-200 hover:bg-white/5 active:scale-95"
                onClick={() => setMobileMenuOpen(false)}
              >
                <motion.div
                  initial={{ rotate: -180, scale: 0.3 }}
                  animate={{ rotate: 0, scale: 1 }}
                  exit={{ rotate: 180, scale: 0.3 }}
                  whileHover={{ rotate: 90, scale: 1.1 }}
                  whileTap={{ scale: 0.9, rotate: -45 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                >
                  <X className="w-6 h-6" />
                </motion.div>
              </button>
            </div>
            
            <div className="flex flex-col p-6 gap-6 text-lg font-bold text-left">
              <button onClick={(e) => handleScrollToSection('about', e)} className="text-left text-text-secondary hover:text-text-primary cursor-pointer w-full">About</button>
              <button onClick={(e) => handleScrollToSection('classes', e)} className="text-left text-text-secondary hover:text-text-primary cursor-pointer w-full">Classes</button>
              <button onClick={(e) => handleScrollToSection('teachers', e)} className="text-left text-text-secondary hover:text-text-primary cursor-pointer w-full">Faculty</button>
              {settings.reviewFormUrl && (
                <button onClick={(e) => handleScrollToSection('review', e)} className="text-left text-text-secondary hover:text-text-primary cursor-pointer w-full">Feedback Form</button>
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
                      to="/learn"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-text-primary flex items-center gap-2"
                    >
                      <BookOpen className="w-5 h-5 text-accent-primary" />
                      <span>{settings.syllabusSectionName || 'Syllabus'}</span>
                    </Link>
                    <Link 
                      to="/dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-text-primary flex items-center gap-2"
                    >
                      <LayoutDashboard className="w-5 h-5 text-accent-primary" />
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
                  <Link 
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="mt-4 px-5 py-3 text-center rounded-2xl bg-accent-primary text-button-text font-bold flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-5 h-5" />
                    <span>Join Free App</span>
                  </Link>
                )
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

