import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore, THEME_PRESETS, ThemeConfig } from '../store/settingsStore';
import { Home, BookOpen, Library as LibraryIcon, Users, Smartphone, Sliders, Share2, HelpCircle, LayoutDashboard } from 'lucide-react';
import { signInWithGoogle } from '../lib/firebase';

export default function LiquidGlassDock() {
  const { user } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const { settings, previewSettings } = useSettingsStore();

  const currentSettings = previewSettings || settings;
  const activeTheme = currentSettings.activeTheme || 'default';

  // Resolve active ThemeConfig
  let themeConfig: ThemeConfig = THEME_PRESETS.default;
  if (activeTheme === 'custom') {
    themeConfig = currentSettings.themeCustomizations || THEME_PRESETS.default;
  } else if (THEME_PRESETS[activeTheme]) {
    themeConfig = { ...THEME_PRESETS[activeTheme], ...(currentSettings.themeCustomizations || {}) };
  } else {
    themeConfig = currentSettings.themeCustomizations || THEME_PRESETS.default;
  }

  const isSolid = themeConfig.dockBackgroundStyle === 'solid';
  const dockBgClass = isSolid 
    ? 'bg-zinc-950/95 dark:bg-zinc-950/95 border-white/20 dark:border-white/10 [backdrop-blur-none]' 
    : 'bg-zinc-900/35 dark:bg-zinc-950/45 backdrop-blur-3xl border-white/10 dark:border-white/5';

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const isHomeActive = location.pathname === '/';

  const handleInstallClick = () => {
    if (settings.pwaBtnLink) {
      window.open(settings.pwaBtnLink, '_blank', 'noopener,noreferrer');
    } else {
      window.dispatchEvent(new Event('trigger-nucleus-pwa-install'));
    }
  };

  const dockApps = [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      to: '/',
      isAnchor: false,
    },
    {
      id: 'library',
      label: 'Library',
      icon: LibraryIcon,
      to: '/library',
      isAnchor: false,
    },
    {
      id: 'learn',
      label: currentSettings.syllabusSectionName || 'Syllabus',
      icon: BookOpen,
      to: '/learn',
      isAnchor: false,
    },
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      to: '/dashboard',
      isAnchor: false,
    },
    {
      id: 'faculty',
      label: 'Faculty',
      icon: Users,
      to: isHomeActive ? '#teachers' : '/#teachers',
      isAnchor: true,
    },
    {
      id: 'community',
      label: 'Community',
      icon: Share2,
      to: isHomeActive ? '#social-connect' : '/#social-connect',
      isAnchor: true,
    },
    {
      id: 'install',
      label: settings.pwaBtnText || 'Install App',
      icon: Smartphone,
      onClick: handleInstallClick,
    },
  ];

  // If user is admin/superadmin, append control panel
  if (user && (user.role === 'admin' || user.role === 'superadmin')) {
    dockApps.push({
      id: 'admin',
      label: 'Admin',
      icon: Sliders,
      to: '/admin',
      isAnchor: false,
    });
  }

  return (
    <div className="hidden lg:flex fixed bottom-6 left-1/2 -translate-x-1/2 z-50 items-end justify-center pointer-events-none select-none">
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.8, type: 'spring', stiffness: 100, damping: 15 }}
        className={`flex items-end gap-3 px-5 py-3.5 border rounded-[24px] pointer-events-auto shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] hover:shadow-[0_25px_80px_rgba(99, 102, 241,0.15)] transition-all duration-500 relative ${dockBgClass}`}
      >
        {/* Sleek top highlighting border for metallic look */}
        <div className="absolute top-0 inset-x-5 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        
        {dockApps.map((app, index) => {
          const IconComponent = app.icon;
          const isHovered = hoveredIndex === index;
          const isNeighbor = hoveredIndex !== null && Math.abs(hoveredIndex - index) === 1;
          
          let scale = 1;
          let yTranslate = 0;
          
          if (isHovered) {
            scale = 1.25;
            yTranslate = -12;
          } else if (isNeighbor) {
            scale = 1.1;
            yTranslate = -4;
          }

          const renderIcon = () => (
            <motion.div
              style={{ originY: 1 }}
              animate={{ scale, y: yTranslate }}
              transition={{ type: 'spring', stiffness: 350, damping: 20 }}
              className="relative p-3 rounded-2xl bg-zinc-800/40 dark:bg-zinc-900/40 border border-white/10 group flex items-center justify-center cursor-pointer select-none"
            >
              {/* Highlight flash */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-transparent via-white/5 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <IconComponent className="w-5.5 h-5.5 text-text-primary group-hover:text-accent-primary transition-colors" />
              
              {/* Active Dot under current tab */}
              {((app.to === '/' && location.pathname === '/') || 
                (app.to === '/learn' && location.pathname === '/learn') ||
                (app.to === '/library' && location.pathname === '/library') ||
                (app.to === '/dashboard' && location.pathname === '/dashboard') ||
                (app.to === '/admin' && location.pathname === '/admin')) && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-accent-primary rounded-full shadow-[0_0_8px_rgba(99, 102, 241,0.8)]" />
              )}
            </motion.div>
          );

          return (
            <div
              key={app.id}
              className="relative flex flex-col items-center"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {/* Tooltip text bubble above */}
              <AnimatePresence>
                {isHovered && (
                  <motion.div
                    initial={{ opacity: 0, y: 15, scale: 0.8 }}
                    animate={{ 
                      opacity: 1, 
                      y: -24, 
                      scale: 1,
                      transition: { type: 'spring', stiffness: 400, damping: 20, delay: 0.22 }
                    }}
                    exit={{ 
                      opacity: 0, 
                      y: 15, 
                      scale: 0.8,
                      transition: { duration: 0.1 }
                    }}
                    className="absolute bottom-full mb-1 px-3 py-1 bg-zinc-950/95 text-white/95 text-[10px] font-black uppercase tracking-wider rounded-xl border border-white/10 shadow-2xl whitespace-nowrap pointer-events-none select-none z-50 font-mono"
                  >
                    {app.label}
                  </motion.div>
                )}
              </AnimatePresence>

              {app.onClick ? (
                <button onClick={app.onClick} className="bg-transparent border-0 p-0 m-0 outline-none select-none pointer-events-auto">
                  {renderIcon()}
                </button>
              ) : app.isAnchor ? (
                <a href={app.to} className="select-none pointer-events-auto">
                  {renderIcon()}
                </a>
              ) : (
                <Link 
                  to={app.to || '/'} 
                  onClick={(e) => {
                    if ((app.to === '/dashboard' || app.to === '/learn') && !user) {
                      e.preventDefault();
                      navigate('/login');
                    }
                  }}
                  className="select-none pointer-events-auto"
                >
                  {renderIcon()}
                </Link>
              )}
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}
