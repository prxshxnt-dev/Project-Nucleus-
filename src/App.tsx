import { useEffect, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { useAuthStore } from './store/authStore';
import { useSettingsStore } from './store/settingsStore';
import { AnimatePresence } from 'motion/react';
import Lenis from 'lenis';

// Pages
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ThemeProvider from './components/ThemeProvider';
import { SeasonalOverlay } from './components/SeasonalOverlay';
import ScreenProtector from './components/ScreenProtector';
import PwaManager from './components/PwaManager';

export default function App() {
  const { setUser, setLoading, user, loading } = useAuthStore();
  const { setSettings } = useSettingsStore();
  const location = useLocation();

  useEffect(() => {
    const lenis = new Lenis();

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
    return () => {
      lenis.destroy();
    };
  }, []);

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
        if (unsubDoc) unsubDoc();
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      unsubSettings();
      if (unsubDoc) unsubDoc();
    };
  }, [setUser, setLoading, setSettings]);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans transition-colors duration-300 selection:bg-primary/30">
      <ScreenProtector />
      <ThemeProvider />
      <SeasonalOverlay />
      <Navbar />
      <PwaManager />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </AnimatePresence>
      <Footer />
    </div>
  );
}


