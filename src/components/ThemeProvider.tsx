import { createContext, useContext, useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { db } from '../lib/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';

export type ThemeMode = 'warm' | 'dark' | 'system';

interface ThemeContextType {
  themeMode: ThemeMode;
  resolvedTheme: 'warm' | 'dark';
  setThemeMode: (mode: ThemeMode) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export default function ThemeProvider({ children }: { children?: React.ReactNode }) {
  const { user } = useAuthStore();
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    const localMode = localStorage.getItem('theme-preference') as ThemeMode;
    return localMode || 'system';
  });

  const [resolvedTheme, setResolvedTheme] = useState<'warm' | 'dark'>('warm');

  // Load theme preference from Firestore on login
  useEffect(() => {
    if (user?.uid) {
      const fetchThemePreference = async () => {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            const savedTheme = data.themePreference as ThemeMode;
            if (savedTheme && ['warm', 'dark', 'system'].includes(savedTheme)) {
              setThemeModeState(savedTheme);
              localStorage.setItem('theme-preference', savedTheme);
            }
          }
        } catch (err) {
          console.error('Failed to load theme preference from Firestore:', err);
        }
      };
      fetchThemePreference();
    }
  }, [user?.uid]);

  // Handle System theme changes & resolve active theme
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const resolveAndApplyTheme = () => {
      let active: 'warm' | 'dark' = 'warm';
      if (themeMode === 'system') {
        active = mediaQuery.matches ? 'dark' : 'warm';
      } else {
        active = themeMode === 'dark' ? 'dark' : 'warm';
      }
      setResolvedTheme(active);

      const root = document.documentElement;

      if (active === 'dark') {
        root.classList.add('dark');
        
        // Dark Theme Variables
        root.style.setProperty('--background', '#0F0F0F');
        root.style.setProperty('--background-custom', '#0F0F0F');
        root.style.setProperty('--foreground', '#FFF8F0');
        root.style.setProperty('--foreground-custom', '#FFF8F0');
        root.style.setProperty('--card', '#232323');
        root.style.setProperty('--card-foreground', '#FFF8F0');
        root.style.setProperty('--popover', '#232323');
        root.style.setProperty('--popover-foreground', '#FFF8F0');
        root.style.setProperty('--primary', '#FF8C42');
        root.style.setProperty('--primary-foreground', '#0F0F0F');
        root.style.setProperty('--secondary', '#181818');
        root.style.setProperty('--secondary-foreground', '#FFF8F0');
        root.style.setProperty('--muted', '#181818');
        root.style.setProperty('--muted-foreground', '#D6D6D6');
        root.style.setProperty('--muted-custom', '#D6D6D6');
        root.style.setProperty('--accent', '#F59E0B');
        root.style.setProperty('--accent-foreground', '#0F0F0F');
        root.style.setProperty('--border', '#3A3A3A');
        root.style.setProperty('--border-color', '#3A3A3A');
        root.style.setProperty('--input', '#3A3A3A');
        root.style.setProperty('--ring', '#FF8C42');

        // Backward compatibility adaptive fields
        root.style.setProperty('--bg-primary', '#0F0F0F');
        root.style.setProperty('--bg-secondary', '#181818');
        root.style.setProperty('--text-primary', '#FFF8F0');
        root.style.setProperty('--text-secondary', '#D6D6D6');
        root.style.setProperty('--text-muted', '#9CA3AF');
        root.style.setProperty('--accent-primary', '#FF8C42');
        root.style.setProperty('--accent-contrast', '#0F0F0F');
        root.style.setProperty('--card-bg', '#232323');
        root.style.setProperty('--glass-bg', 'rgba(35, 35, 35, 0.85)');
        root.style.setProperty('--button-text', '#0F0F0F');
        root.style.setProperty('--navbar-text', '#FFF8F0');

        root.style.setProperty('--theme-card-border', '#3A3A3A');
        root.style.setProperty('--theme-card-blur', 'blur(12px)');
        root.style.setProperty('--theme-shadow-glow', '0 4px 20px rgba(255, 140, 66, 0.15)');
      } else {
        root.classList.remove('dark');

        // Warm Theme Variables
        root.style.setProperty('--background', '#FFF8F0');
        root.style.setProperty('--background-custom', '#FFF8F0');
        root.style.setProperty('--foreground', '#1F1F1F');
        root.style.setProperty('--foreground-custom', '#1F1F1F');
        root.style.setProperty('--card', '#FFFFFF');
        root.style.setProperty('--card-foreground', '#1F1F1F');
        root.style.setProperty('--popover', '#FFFFFF');
        root.style.setProperty('--popover-foreground', '#1F1F1F');
        root.style.setProperty('--primary', '#FF8C42');
        root.style.setProperty('--primary-foreground', '#1F1F1F');
        root.style.setProperty('--secondary', '#F8F3EB');
        root.style.setProperty('--secondary-foreground', '#1F1F1F');
        root.style.setProperty('--muted', '#F8F3EB');
        root.style.setProperty('--muted-foreground', '#666666');
        root.style.setProperty('--muted-custom', '#666666');
        root.style.setProperty('--accent', '#F59E0B');
        root.style.setProperty('--accent-foreground', '#1F1F1F');
        root.style.setProperty('--border', '#E8DCCB');
        root.style.setProperty('--border-color', '#E8DCCB');
        root.style.setProperty('--input', '#E8DCCB');
        root.style.setProperty('--ring', '#FF8C42');

        // Backward compatibility adaptive fields
        root.style.setProperty('--bg-primary', '#FFF8F0');
        root.style.setProperty('--bg-secondary', '#F8F3EB');
        root.style.setProperty('--text-primary', '#1F1F1F');
        root.style.setProperty('--text-secondary', '#666666');
        root.style.setProperty('--text-muted', '#7A7A7A');
        root.style.setProperty('--accent-primary', '#FF8C42');
        root.style.setProperty('--accent-contrast', '#1F1F1F');
        root.style.setProperty('--card-bg', '#FFFFFF');
        root.style.setProperty('--glass-bg', 'rgba(255, 255, 255, 0.82)');
        root.style.setProperty('--button-text', '#1F1F1F');
        root.style.setProperty('--navbar-text', '#1F1F1F');

        root.style.setProperty('--theme-card-border', '#E8DCCB');
        root.style.setProperty('--theme-card-blur', 'none');
        root.style.setProperty('--theme-shadow-glow', '0 4px 20px rgba(255, 140, 66, 0.08)');
      }

      root.style.setProperty('--theme-btn-radius', '12px');
      root.style.setProperty('--theme-card-radius', '20px');
      root.style.setProperty('--primary-custom', '#FF8C42');
      root.style.setProperty('--primary-dark-custom', '#CC5A14');
    };

    resolveAndApplyTheme();
    
    if (themeMode === 'system') {
      mediaQuery.addEventListener('change', resolveAndApplyTheme);
      return () => mediaQuery.removeEventListener('change', resolveAndApplyTheme);
    }
  }, [themeMode]);

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    localStorage.setItem('theme-preference', mode);

    if (user?.uid) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          themePreference: mode
        });
      } catch (err) {
        console.error('Failed to sync theme preference with Firestore:', err);
      }
    }
  };

  return (
    <ThemeContext.Provider value={{ themeMode, resolvedTheme, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}
