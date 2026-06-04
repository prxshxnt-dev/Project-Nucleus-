import { useEffect, useRef, useState } from 'react';
import { HashRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { useAuthStore } from './store/authStore';
import { useSettingsStore } from './store/settingsStore';
import { motion, AnimatePresence } from 'motion/react';
import Lenis from 'lenis';

// Pages
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Learn from './pages/Learn';
import AdminDashboard from './pages/AdminDashboard';
import Login from './pages/Login';
import Signup from './pages/Signup';
import VerifyOtp from './pages/VerifyOtp';
import ForgotPassword from './pages/ForgotPassword';
import SelectStandard from './pages/SelectStandard';
import Library from './pages/Library';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ThemeProvider from './components/ThemeProvider';
import { SeasonalOverlay } from './components/SeasonalOverlay';
import ScreenProtector from './components/ScreenProtector';
import { AIAssistantBot } from './components/AIAssistantBot';
import PwaManager from './components/PwaManager';
import LiquidGlassDock from './components/LiquidGlassDock';
import GlobalLoader from './components/GlobalLoader';
import OrbitalLoader from './components/OrbitalLoader';

function AppContent() {
  const { setUser, setLoading, user, loading } = useAuthStore();
  const { setSettings } = useSettingsStore();
  const [localLoading, setLocalLoading] = useState(true);
  const [routeTransitioning, setRouteTransitioning] = useState(false);
  const location = useLocation();
  const prevPathRef = useRef(location.pathname);

  useEffect(() => {
    if (prevPathRef.current !== location.pathname) {
      prevPathRef.current = location.pathname;
      setRouteTransitioning(true);
      const timer = setTimeout(() => {
        setRouteTransitioning(false);
      }, 750);
      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  useEffect(() => {
    const lenis = new Lenis();
    (window as any).lenisInstance = lenis;

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
    return () => {
      lenis.destroy();
      delete (window as any).lenisInstance;
    };
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    const lenis = (window as any).lenisInstance;
    if (lenis) {
      lenis.scrollTo(0, { immediate: true });
    }
  }, [location.pathname]);

  // Trigger the premium loader for all internal routing page/section transitions
  useEffect(() => {
    setLocalLoading(true);
  }, [location.pathname, location.search, location.hash]);

  useEffect(() => {
    // Fetch global settings
    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setSettings({ ...useSettingsStore.getState().settings, ...data });
        
        if (data.documentTitle) {
          document.title = data.documentTitle;
        }
        if (data.faviconUrl) {
          let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
          if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.head.appendChild(link);
          }
          link.href = data.faviconUrl;
        }
      }
    });

    let unsubDoc: () => void;
    
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.uid);
        
        // Listen changes in real-time
        unsubDoc = onSnapshot(userRef, (userSnap) => {
          if (userSnap.exists()) {
            const userData = userSnap.data();
            setUser({
              uid: firebaseUser.uid,
              email: userData.email,
              displayName: userData.displayName,
              role: userData.role,
              planId: userData.planId,
              classGroup: userData.classGroup,
              unlockedMaterials: userData.unlockedMaterials || [],
              streak: userData.streak || 0,
              lastStudyDate: userData.lastStudyDate,
              todayStudyMinutes: userData.todayStudyMinutes,
              lastStreakDate: userData.lastStreakDate,
              photoURL: userData.photoURL || firebaseUser.photoURL || null,
            });
          }
          setLoading(false);
        });
      } else {
        const localIsLoggedIn = localStorage.getItem("isLoggedIn") === "true";
        const customUserStr = localStorage.getItem("currentUser");
        if (localIsLoggedIn && customUserStr) {
          try {
            const customUser = JSON.parse(customUserStr);
            setUser(customUser);
            setLoading(false);
            
            if (customUser.uid) {
              const userRef = doc(db, 'users', customUser.uid);
              if (unsubDoc) unsubDoc();
              unsubDoc = onSnapshot(userRef, (userSnap) => {
                if (userSnap.exists()) {
                  const userData = userSnap.data();
                  setUser({
                    uid: customUser.uid,
                    email: userData.email || customUser.email,
                    displayName: userData.displayName || customUser.displayName,
                    role: userData.role || customUser.role,
                    planId: userData.planId || customUser.planId,
                    classGroup: userData.classGroup || customUser.classGroup,
                    unlockedMaterials: userData.unlockedMaterials || [],
                    streak: userData.streak || 0,
                    lastStudyDate: userData.lastStudyDate,
                    todayStudyMinutes: userData.todayStudyMinutes,
                    lastStreakDate: userData.lastStreakDate,
                    photoURL: userData.photoURL || null,
                  });
                }
              });
            }
          } catch (e) {
            console.error("Custom session restore failed:", e);
            if (unsubDoc) unsubDoc();
            setUser(null);
            setLoading(false);
          }
        } else {
          if (unsubDoc) unsubDoc();
          setUser(null);
          setLoading(false);
        }
      }
    });

    return () => {
      unsubscribe();
      unsubSettings();
      if (unsubDoc) unsubDoc();
    };
  }, [setUser, setLoading, setSettings]);

  return (
    <>
      <AnimatePresence mode="wait">
        {(loading || localLoading) && (
          <GlobalLoader key="global-app-loader" onFullyLoaded={() => setLocalLoading(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {routeTransitioning && (
          <motion.div
            key="route-loader-layer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[999999] pointer-events-auto"
          >
            <OrbitalLoader size="fullscreen" text="Switching study sections..." />
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`min-h-screen bg-background text-foreground font-sans transition-colors duration-300 selection:bg-primary/30 ${(loading || localLoading) ? 'invisible h-0 overflow-hidden' : 'visible'}`}>
        <ScreenProtector />
        <ThemeProvider />
        <SeasonalOverlay />
        <Navbar />
        <PwaManager />
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/verify-otp" element={<VerifyOtp />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/select-standard" element={<SelectStandard />} />
            <Route path="/learn" element={<Learn />} />
            <Route path="/library" element={<Library />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
        <LiquidGlassDock />
        <AIAssistantBot />
        <Footer />
      </div>
    </>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
}


