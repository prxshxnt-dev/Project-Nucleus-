import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Wifi, WifiOff, Smartphone, X, Download, Share2, PlusSquare, ArrowUpRight } from 'lucide-react';

// Declare global type for beforeinstallprompt event support in TS
declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function PwaManager() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showOnlineStatus, setShowOnlineStatus] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [showPwaBanner, setShowPwaBanner] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  // Check if it's iOS
  const isIos = () => {
    return (
      ['iPad Simulator', 'iPhone Simulator', 'iPod Simulator', 'iPad', 'iPhone', 'iPod'].includes(
        navigator.platform
      ) || (navigator.userAgent.includes('Mac') && 'ontouchend' in document)
    );
  };

  useEffect(() => {
    // 1. Detect Offline/Online Network Connection Changes
    const handleOnline = () => {
      setIsOffline(false);
      setShowOnlineStatus(true);
      const timer = setTimeout(() => setShowOnlineStatus(false), 4000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setShowOnlineStatus(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 2. Check standalone mode (already installed or running inside PWA wrapper)
    const checkStandalone = () => {
      const isStandaloneMode = 
        window.matchMedia('(display-mode: standalone)').matches || 
        (navigator as any).standalone === true ||
        document.referrer.includes('android-app://');
      setIsStandalone(isStandaloneMode);
    };
    checkStandalone();

    // 3. Native install prompt handler (Android/Chrome/Desktop)
    const handleInstallPrompt = (e: BeforeInstallPromptEvent) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      setIsInstallable(true);
      
      // Auto show install prompt banner after a short delay if not installed
      const dismissed = localStorage.getItem('nucleus_pwa_dismissed');
      if (!dismissed) {
        const timer = setTimeout(() => {
          setShowPwaBanner(true);
        }, 5000);
        return () => clearTimeout(timer);
      }
    };

    window.addEventListener('beforeinstallprompt', handleInstallPrompt);

    // If iOS and not standalone, we can promote the custom iOS installation tutorial
    if (isIos() && !isStandalone) {
      const dismissed = localStorage.getItem('nucleus_pwa_dismissed');
      if (!dismissed) {
        setIsInstallable(true);
        const timer = setTimeout(() => {
          setShowPwaBanner(true);
        }, 6000);
        return () => clearTimeout(timer);
      }
    }

    // 4. Custom triggering event from header menus / custom buttons
    const handleCustomTrigger = () => {
      if (deferredPrompt) {
        handleInstallApp();
      } else if (isIos()) {
        setShowIosGuide(true);
      } else {
        // Fallback: force show the floating PWA interactive board
        setShowPwaBanner(true);
      }
    };

    window.addEventListener('trigger-nucleus-pwa-install', handleCustomTrigger);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      window.removeEventListener('trigger-nucleus-pwa-install', handleCustomTrigger);
    };
  }, [isStandalone]);

  // Click handler to trigger native PWA installation
  const handleInstallApp = async () => {
    if (deferredPrompt) {
      // Show the install prompt
      await deferredPrompt.prompt();
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to install request: ${outcome}`);
      if (outcome === 'accepted') {
        setIsInstallable(false);
        setShowPwaBanner(false);
      }
      setDeferredPrompt(null);
    } else if (isIos()) {
      // Show custom iOS walkthrough modal
      setShowIosGuide(true);
    }
  };

  const dismissBanner = () => {
    setShowPwaBanner(false);
    localStorage.setItem('nucleus_pwa_dismissed', 'true');
  };

  return (
    <>
      {/* Offline Status Alerts Banner (At the TOP of index scope) */}
      <AnimatePresence>
        {isOffline && (
          <motion.div
            id="pwa-offline-indicator"
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="fixed top-20 left-0 right-0 z-50 px-4 pointer-events-none flex justify-center"
          >
            <div className="bg-zinc-950/95 border border-[#ff7a00]/40 backdrop-blur-md px-4 py-2.5 rounded-full flex items-center gap-2.5 shadow-2xl pointer-events-auto">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff7a00] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#ff7a00]"></span>
              </span>
              <WifiOff className="w-4 h-4 text-[#ff7a00]" />
              <span className="text-xs font-bold text-white tracking-wide">
                Offline Mode: Accessing Offline Encrypted Notes & Lectures
              </span>
            </div>
          </motion.div>
        )}

        {showOnlineStatus && (
          <motion.div
            id="pwa-online-indicator"
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="fixed top-20 left-0 right-0 z-50 px-4 pointer-events-none flex justify-center"
          >
            <div className="bg-zinc-950/95 border border-emerald-500/40 backdrop-blur-md px-4 py-2.5 rounded-full flex items-center gap-2.5 shadow-2xl pointer-events-auto">
              <Wifi className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-white tracking-wide">
                Back Online: Synchronized real-time with Nucleus servers
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating PWA Installer Banner Card */}
      <AnimatePresence>
        {showPwaBanner && isInstallable && !isStandalone && (
          <motion.div
            id="pwa-install-app-banner"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 20 }}
            className="fixed bottom-24 left-4 right-4 sm:left-auto sm:right-6 md:right-12 z-50 sm:w-96 max-w-full"
          >
            <div className="relative overflow-hidden bg-zinc-950/95 border border-white/10 p-5 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl">
              {/* Splash decoration */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#ff7a00]/10 rounded-full blur-[40px] pointer-events-none" />
              
              <button 
                onClick={dismissBanner}
                className="absolute top-3 right-3 text-white/50 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-start gap-4 pr-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#ff7a00] to-amber-400 flex items-center justify-center shadow-lg flex-shrink-0">
                  <Smartphone className="w-6 h-6 text-black" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Convert Site to App!</h4>
                  <p className="text-xs text-white/60 mt-0.5 leading-relaxed">
                    Install <span className="text-[#ff7a00] font-black">Nucleus</span> to your device for dynamic offline lectures, instant notifications, and lightning fast access.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4">
                <button
                  onClick={dismissBanner}
                  className="py-2 text-center rounded-xl font-semibold text-xs border border-white/5 bg-white/[0.02] text-white/70 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                >
                  Later
                </button>
                <button
                  onClick={handleInstallApp}
                  className="py-2 text-center rounded-xl font-bold text-xs bg-gradient-to-r from-[#ff7a00] to-amber-500 text-black hover:opacity-90 active:scale-95 duration-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_4px_16px_rgba(255,122,0,0.3)]"
                >
                  <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Install Now</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* iOS Manual Installation Guide modal */}
      <AnimatePresence>
        {showIosGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-sm bg-zinc-950 border border-white/10 rounded-2xl p-6 shadow-2xl text-left overflow-hidden"
            >
              {/* Water drip shape decor in orange bg */}
              <div className="absolute top-[-30px] right-[-30px] w-24 h-24 bg-[#ff7a00]/15 rounded-full blur-xl pointer-events-none" />

              <button 
                onClick={() => setShowIosGuide(false)}
                className="absolute top-4 right-4 text-white/50 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-[#ff7a00]/30 flex items-center justify-center text-[#ff7a00]">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-md font-bold text-white">IOS Installation Guide</h3>
                  <p className="text-[10px] text-[#ff7a00] font-mono tracking-wider uppercase">Safari browser feature</p>
                </div>
              </div>

              <div className="space-y-4 my-2 text-white/80">
                <p className="text-xs leading-relaxed text-white/60">
                  Apple requires iOS apps to be manually added. Follow this single-step flow to place **Nucleus** right onto your home screen:
                </p>

                <div className="space-y-3">
                  <div className="flex items-start gap-3 bg-white/[0.02] border border-white/5 p-2 rounded-xl">
                    <span className="w-6 h-6 rounded-full bg-[#ff7a00]/20 text-[#ff7a00] font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                      1
                    </span>
                    <div>
                      <p className="text-xs font-bold text-white">Tap Safari's Share Icon</p>
                      <p className="text-[10px] text-white/50 mt-0.5 flex items-center gap-1">
                        Find <Share2 className="w-3 h-3 inline text-[#ff7a00]" /> in Safari navigation menu bar.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-white/[0.02] border border-white/5 p-2 rounded-xl">
                    <span className="w-6 h-6 rounded-full bg-[#ff7a00]/20 text-[#ff7a00] font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                      2
                    </span>
                    <div>
                      <p className="text-xs font-bold text-white">Tap 'Add to Home Screen'</p>
                      <p className="text-[10px] text-white/50 mt-0.5 flex items-center gap-1">
                        Scroll options list & tap <PlusSquare className="w-3 h-3 inline text-[#ff7a00]" /> option.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-white/[0.02] border border-white/5 p-2 rounded-xl">
                    <span className="w-6 h-6 rounded-full bg-[#ff7a00]/20 text-[#ff7a00] font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                      3
                    </span>
                    <div>
                      <p className="text-xs font-bold text-white">Tap 'Add' to Confirm</p>
                      <p className="text-[10px] text-white/50 mt-0.5 flex items-center gap-1">
                        Confirm on top right corner <ArrowUpRight className="w-3 h-3 inline text-emerald-400" /> to complete.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowIosGuide(false)}
                className="w-full mt-4 py-2.5 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-600 text-black active:scale-95 transition-all text-center cursor-pointer"
              >
                Got It, Thank You!
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
