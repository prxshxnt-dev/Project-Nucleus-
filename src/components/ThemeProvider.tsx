import { useEffect } from 'react';
import { useSettingsStore, THEME_PRESETS, ThemeConfig } from '../store/settingsStore';

// Parse color to RGB values
function parseColor(colorStr: string): { r: number; g: number; b: number } {
  if (!colorStr) return { r: 7, g: 7, b: 9 };
  const hex = colorStr.trim().replace(/^#/, '');
  if (hex.length === 3) {
    const r = parseInt(hex[0] + hex[0], 16);
    const g = parseInt(hex[1] + hex[1], 16);
    const b = parseInt(hex[2] + hex[2], 16);
    return { r, g, b };
  }
  if (hex.length === 6) {
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return { r, g, b };
  }
  // Fallback if not a hex string (handles rgb or defaults)
  return { r: 7, g: 7, b: 9 };
}

// Convert Hex to HSL for precise Saturation & Lightness assessment
function parseToHsl(colorStr: string) {
  const { r, g, b } = parseColor(colorStr);
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rNorm: h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0); break;
      case gNorm: h = (bNorm - rNorm) / d + 2; break;
      case bNorm: h = (rNorm - gNorm) / d + 4; break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

// Helper to expand/diminish light values relative to key color
function adjustLuminance(hex: string, multiplier: number): string {
  const { r, g, b } = parseColor(hex);
  const adjust = (val: number) => {
    const res = Math.min(255, Math.max(0, val + Math.round(multiplier * 255)));
    return res.toString(16).padStart(2, '0');
  };
  return `#${adjust(r)}${adjust(g)}${adjust(b)}`;
}

// Compute standard RGB string for transparency utilities
function hexToRgbStr(hex: string): string {
  const { r, g, b } = parseColor(hex);
  return `${r}, ${g}, ${b}`;
}

export default function ThemeProvider() {
  const { settings, previewSettings } = useSettingsStore();

  const currentSettings = previewSettings || settings;
  const activeTheme = currentSettings.activeTheme || 'default';
  
  // Resolve base config from preset or customizations
  let config: ThemeConfig = THEME_PRESETS.default;

  if (activeTheme === 'custom') {
    config = currentSettings.themeCustomizations || THEME_PRESETS.default;
  } else if (THEME_PRESETS[activeTheme]) {
    config = { ...THEME_PRESETS[activeTheme], ...(currentSettings.themeCustomizations || {}) };
  } else {
    config = currentSettings.themeCustomizations || THEME_PRESETS.default;
  }

  useEffect(() => {
    const root = document.documentElement;

    // --- SMART CONTRAST ENGINE ANALYSIS ---
    const bgHsl = parseToHsl(config.backgroundColor || '#070709');
    const primaryHsl = parseToHsl(config.primaryColor || '#E5D2A5');
    
    // Background light check: is background dark or light?
    const isBgDark = bgHsl.l < 55;
    // Primary/Accent light check: for button contents, indicators
    const isPrimaryDark = primaryHsl.l < 52; 

    // Generate Adaptive Texts & Overlays
    const textPrimary = config.enableManualOverrides && config.overrideTextPrimary
      ? config.overrideTextPrimary
      : (isBgDark ? '#fafafa' : '#09090b');

    const textSecondary = config.enableManualOverrides && config.overrideTextSecondary
      ? config.overrideTextSecondary
      : (isBgDark ? '#d4d4d8' : '#3f3f46');

    const textMuted = config.enableManualOverrides && config.overrideTextMuted
      ? config.overrideTextMuted
      : (isBgDark ? '#8e8e93' : '#71717a');

    const bgSecondary = isBgDark 
      ? adjustLuminance(config.backgroundColor, 0.05) 
      : adjustLuminance(config.backgroundColor, -0.06);

    const borderColor = isBgDark 
      ? 'rgba(255, 255, 255, 0.08)' 
      : 'rgba(0, 0, 0, 0.06)';

    const cardBg = isBgDark 
      ? `rgba(${hexToRgbStr(config.backgroundColor)}, 0.4)` 
      : `rgba(${hexToRgbStr(config.backgroundColor)}, 0.9)`;

    const glassBg = isBgDark 
      ? `rgba(${hexToRgbStr(config.backgroundColor)}, 0.65)` 
      : `rgba(${hexToRgbStr(config.backgroundColor)}, 0.75)`;

    const buttonText = isPrimaryDark ? '#ffffff' : '#09090b';
    const accentContrast = isPrimaryDark ? '#ffffff' : '#09090b';

    // Navbar Adaptive colors
    const navbarText = textPrimary;

    // Apply Smart Dynamic Variables
    root.style.setProperty('--bg-primary', config.backgroundColor);
    root.style.setProperty('--bg-secondary', bgSecondary);
    root.style.setProperty('--text-primary', textPrimary);
    root.style.setProperty('--text-secondary', textSecondary);
    root.style.setProperty('--text-muted', textMuted);
    root.style.setProperty('--accent-primary', config.primaryColor);
    root.style.setProperty('--accent-contrast', accentContrast);
    root.style.setProperty('--border-color', borderColor);
    root.style.setProperty('--card-bg', cardBg);
    root.style.setProperty('--glass-bg', glassBg);
    root.style.setProperty('--button-text', buttonText);
    root.style.setProperty('--navbar-text', navbarText);

    // Backward Compatibility support
    root.style.setProperty('--background-custom', config.backgroundColor);
    root.style.setProperty('--foreground-custom', textPrimary);
    root.style.setProperty('--primary-custom', config.primaryColor);
    root.style.setProperty('--primary-dark-custom', config.secondaryColor);
    root.style.setProperty('--theme-accent-glow', config.accentGlowColor || config.primaryColor);
    root.style.setProperty('--muted-custom', textSecondary);

    // --- THEME-BASED SMART TYPOGRAPHY PRESETS ---
    const fontFallback = 'ui-sans-serif, system-ui, sans-serif';
    let currentFont = config.fontFamily || 'Inter';
    
    // Default dynamic properties
    let headingWeight = '600';
    let headingLetterSpacing = '-0.02em';
    let headingCase = 'none';
    let headingLineHeight = '1.25';
    let textShadow = 'none';
    let textGlow = 'none';

    if (currentFont === 'JetBrains Mono') {
      root.style.setProperty('--font-sans-custom', `"JetBrains Mono", ui-monospace, monospace`);
      root.style.setProperty('--font-display-custom', `"JetBrains Mono", monospace`);
      headingWeight = '500';
      headingLetterSpacing = '-0.01em';
      headingCase = 'none';
      headingLineHeight = '1.35';
    } else if (currentFont === 'Space Grotesk') {
      root.style.setProperty('--font-sans-custom', `"Space Grotesk", ${fontFallback}`);
      root.style.setProperty('--font-display-custom', `"Space Grotesk", ${fontFallback}`);
      headingWeight = '700';
      headingLetterSpacing = '-0.03em';
      headingCase = 'none';
      headingLineHeight = '1.2';
    } else if (currentFont === 'Playfair Display') {
      root.style.setProperty('--font-sans-custom', `"Playfair Display", Georgia, serif`);
      root.style.setProperty('--font-display-custom', `"Playfair Display", serif`);
      headingWeight = '500';
      headingLetterSpacing = '0.01em';
      headingCase = 'none';
      headingLineHeight = '1.15';
    } else if (currentFont === 'Plus Jakarta Sans') {
      root.style.setProperty('--font-sans-custom', `"Plus Jakarta Sans", ${fontFallback}`);
      root.style.setProperty('--font-display-custom', `"Plus Jakarta Sans", ${fontFallback}`);
      headingWeight = '600';
      headingLetterSpacing = '-0.02em';
      headingLineHeight = '1.25';
    } else if (currentFont === 'Outfit') {
      root.style.setProperty('--font-sans-custom', `"Outfit", ${fontFallback}`);
      root.style.setProperty('--font-display-custom', `"Outfit", ${fontFallback}`);
      headingWeight = '600';
      headingLetterSpacing = '-0.02em';
      headingLineHeight = '1.25';
    } else {
      root.style.setProperty('--font-sans-custom', `"${currentFont}", ${fontFallback}`);
      root.style.setProperty('--font-display-custom', `"${currentFont}", ${fontFallback}`);
    }

    // Dynamic Text Glow on Dark Themes / Editorial shadow on light themes
    if (isBgDark && config.shadowIntensity !== 'none') {
      textShadow = '0 1px 2px rgba(0, 0, 0, 0.4)';
      textGlow = `0 0 8px rgba(${hexToRgbStr(config.primaryColor)}, 0.2)`;
    } else if (!isBgDark) {
      textShadow = '0 1px 2px rgba(255, 255, 255, 0.4)';
      textGlow = 'none';
    }

    // Add backdrop overlay blur for stickers & gradient configurations
    if (config.stickerPack && config.stickerPack !== 'none') {
      root.style.setProperty('--theme-card-blur', 'blur(20px)');
      root.style.setProperty('--theme-backdrop-overlay', 'rgba(0, 0, 0, 0.15)');
    } else {
      root.style.setProperty('--theme-backdrop-overlay', 'none');
    }

    root.style.setProperty('--theme-heading-weight', headingWeight);
    root.style.setProperty('--theme-heading-tracking', headingLetterSpacing);
    root.style.setProperty('--theme-heading-case', headingCase);
    root.style.setProperty('--theme-heading-lh', headingLineHeight);
    root.style.setProperty('--theme-text-shadow', textShadow);
    root.style.setProperty('--theme-text-glow', textGlow);

    // --- RADIUS & SHADOW GENERATION ---
    let btnRadius = '9999px';
    if (config.buttonStyle === 'square') {
      btnRadius = '0px';
    } else if (config.buttonStyle === 'rounded') {
      btnRadius = `${config.borderRadius || 12}px`;
    } else if (config.buttonStyle === 'pill') {
      btnRadius = '9999px';
    }
    root.style.setProperty('--theme-btn-radius', btnRadius);
    root.style.setProperty('--theme-card-radius', `${config.borderRadius || 16}px`);

    // Glassmorphism border and blur
    if (config.glassmorphism) {
      root.style.setProperty('--theme-card-border', isBgDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)');
      root.style.setProperty('--theme-card-blur', 'blur(16px)');
    } else {
      root.style.setProperty('--theme-card-border', isBgDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)');
      root.style.setProperty('--theme-card-blur', 'none');
    }

    // High fidelity shadow glow based on accent RGB
    const primaryRgbStr = hexToRgbStr(config.primaryColor);
    const accentRgbStr = hexToRgbStr(config.accentGlowColor || config.primaryColor);
    
    let glowShadow = 'none';
    if (config.shadowIntensity === 'soft') {
      glowShadow = '0 4px 20px -2px rgba(0, 0, 0, 0.35)';
    } else if (config.shadowIntensity === 'glow') {
      glowShadow = `0 4px 30px rgba(0, 0, 0, 0.4), 0 0 20px rgba(${primaryRgbStr}, 0.25)`;
    } else if (config.shadowIntensity === 'intense') {
      glowShadow = `0 10px 40px rgba(0, 0, 0, 0.5), 0 0 30px rgba(${primaryRgbStr}, 0.3), 0 0 10px rgba(${accentRgbStr}, 0.15)`;
    }
    root.style.setProperty('--theme-shadow-glow', glowShadow);

    // Sync theme class
    if (isBgDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    root.style.setProperty('--theme-gradient-start', config.gradientStart);
    root.style.setProperty('--theme-gradient-end', config.gradientEnd);

  }, [config]);

  return null;
}
