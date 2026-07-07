import { useEffect, useRef, useState, lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { useAuthStore } from './store/authStore';
import { useSettingsStore } from './store/settingsStore';
import { motion, AnimatePresence } from 'motion/react';
import Lenis from 'lenis';

// Lazy loaded page components for optimal performance & instant loading
const Home = lazy(() => import('./pages/Home'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Learn = lazy(() => import('./pages/Learn'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const SelectStandard = lazy(() => import('./pages/SelectStandard'));
const Library = lazy(() => import('./pages/Library'));
const Terms = lazy(() => import('./pages/Terms'));
const Privacy = lazy(() => import('./pages/Privacy'));

import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ThemeProvider from './components/ThemeProvider';
import { SeasonalOverlay } from './components/SeasonalOverlay';
import ScreenProtector from './components/ScreenProtector';
import { AIAssistantBot } from './components/AIAssistantBot';
import PwaManager from './components/PwaManager';
import LiquidGlassDock from './components/LiquidGlassDock';
import OrbitalLoader from './components/OrbitalLoader';
import LoadingScreen from './components/LoadingScreen';
import OnboardingWizard from './components/OnboardingWizard';

function AppContent() {
  const { setUser, setLoading, user, loading } = useAuthStore();
  const { settings, setSettings } = useSettingsStore();
  const location = useLocation();

  useEffect(() => {
    // Check if device supports touch input or maxTouchPoints is active to bypass Lenis
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouchDevice) {
      // Allow pure native inertial momentum scrolling on mobile to completely prevent standard jitter/lag
      return;
    }

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });
    (window as any).lenisInstance = lenis;

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    let rafId = requestAnimationFrame(raf);
    return () => {
      cancelAnimationFrame(rafId);
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
              onboardingCompleted: userData.onboardingCompleted || false,
              privacyAccepted: userData.privacyAccepted || false,
              termsAccepted: userData.termsAccepted || false,
              acceptedAt: userData.acceptedAt || null,
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
                    onboardingCompleted: userData.onboardingCompleted || false,
                    privacyAccepted: userData.privacyAccepted || false,
                    termsAccepted: userData.termsAccepted || false,
                    acceptedAt: userData.acceptedAt || null,
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
        {loading && <LoadingScreen key="global-auth-loading" />}
      </AnimatePresence>
      <div className={`min-h-screen bg-background text-foreground font-sans transition-colors duration-300 selection:bg-primary/30 ${loading ? 'invisible h-0 overflow-hidden' : 'visible'}`}>
        <ScreenProtector />
        <ThemeProvider />
        <SeasonalOverlay />
        <Navbar />
        <PwaManager />
        {user && (!user.onboardingCompleted || (settings?.requiredTermsTimestamp && (!user.acceptedAt || new Date(user.acceptedAt) < new Date(settings.requiredTermsTimestamp)))) && (
          <OnboardingWizard onComplete={() => console.log('Onboarding Wizard Completed Successfully')} />
        )}
        <AnimatePresence mode="wait">
          <Suspense fallback={
            <div className="flex min-h-[60vh] items-center justify-center p-12">
              <OrbitalLoader size="md" text="Loading study portal..." />
            </div>
          }>
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/select-standard" element={<SelectStandard />} />
              <Route path="/learn" element={<Learn />} />
              <Route path="/library" element={<Library />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
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


