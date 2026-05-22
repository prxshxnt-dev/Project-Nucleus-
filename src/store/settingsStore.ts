import { create } from 'zustand';

export interface ThemeConfig {
  activeTheme: string;
  primaryColor: string;
  secondaryColor: string;
  accentGlowColor: string;
  backgroundColor: string;
  gradientStart: string;
  gradientEnd: string;
  buttonStyle: 'pill' | 'rounded' | 'square';
  borderRadius: number;
  fontFamily: 'Inter' | 'Outfit' | 'Space Grotesk' | 'Playfair Display' | 'JetBrains Mono' | 'Plus Jakarta Sans';
  isDarkMode: boolean;
  animationIntensity: 'off' | 'low' | 'normal' | 'high';
  glassmorphism: boolean;
  shadowIntensity: 'none' | 'soft' | 'glow' | 'intense';
  stickerPack?: 'none' | 'stars_dots' | 'cute_cartoons' | 'japanese_elements' | 'geometric' | 'planets_space' | 'doodles' | 'cyber_particles' | 'organic_shapes';
  navbarStyle?: 'glass' | 'floating' | 'solid' | 'minimal';
  dashboardStyle?: 'bento' | 'split' | 'classic' | 'minimalist';
  mobileUiStyle?: 'ios_bottom_tab' | 'compact_list' | 'grid';
  enableManualOverrides?: boolean;
  overrideTextPrimary?: string;
  overrideTextSecondary?: string;
  overrideTextMuted?: string;
}

export const THEME_PRESETS: Record<string, ThemeConfig> = {
  default: {
    activeTheme: 'default',
    primaryColor: '#E5D2A5',
    secondaryColor: '#b59f6d',
    accentGlowColor: '#E5D2A5',
    backgroundColor: '#070709',
    gradientStart: '#E5D2A5',
    gradientEnd: '#070709',
    buttonStyle: 'pill',
    borderRadius: 24,
    fontFamily: 'Outfit',
    isDarkMode: true,
    animationIntensity: 'normal',
    glassmorphism: true,
    shadowIntensity: 'soft',
    stickerPack: 'stars_dots',
    navbarStyle: 'glass',
    dashboardStyle: 'bento',
    mobileUiStyle: 'ios_bottom_tab'
  },
  theme2: {
    activeTheme: 'theme2',
    primaryColor: '#f97316',
    secondaryColor: '#ef4444',
    accentGlowColor: '#f97316',
    backgroundColor: '#030303',
    gradientStart: '#f97316',
    gradientEnd: '#ef4444',
    buttonStyle: 'rounded',
    borderRadius: 12,
    fontFamily: 'Space Grotesk',
    isDarkMode: true,
    animationIntensity: 'high',
    glassmorphism: true,
    shadowIntensity: 'glow',
    stickerPack: 'geometric',
    navbarStyle: 'floating',
    dashboardStyle: 'split',
    mobileUiStyle: 'grid'
  },
  theme3: {
    activeTheme: 'theme3',
    primaryColor: '#ec4899',
    secondaryColor: '#8b5cf6',
    accentGlowColor: '#ec4899',
    backgroundColor: '#050512',
    gradientStart: '#ec4899',
    gradientEnd: '#ef4444',
    buttonStyle: 'pill',
    borderRadius: 24,
    fontFamily: 'Inter',
    isDarkMode: true,
    animationIntensity: 'high',
    glassmorphism: true,
    shadowIntensity: 'intense',
    stickerPack: 'stars_dots',
    navbarStyle: 'glass',
    dashboardStyle: 'bento',
    mobileUiStyle: 'ios_bottom_tab'
  },
  neo_glass_purple: {
    activeTheme: 'neo_glass_purple',
    primaryColor: '#a855f7',
    secondaryColor: '#3b82f6',
    accentGlowColor: '#c084fc',
    backgroundColor: '#090514',
    gradientStart: '#a855f7',
    gradientEnd: '#3b82f6',
    buttonStyle: 'pill',
    borderRadius: 20,
    fontFamily: 'Outfit',
    isDarkMode: true,
    animationIntensity: 'high',
    glassmorphism: true,
    shadowIntensity: 'glow',
    stickerPack: 'stars_dots',
    navbarStyle: 'floating',
    dashboardStyle: 'bento',
    mobileUiStyle: 'ios_bottom_tab'
  },
  orange_academy: {
    activeTheme: 'orange_academy',
    primaryColor: '#ea580c',
    secondaryColor: '#fbbf24',
    accentGlowColor: '#ea580c',
    backgroundColor: '#0b0908',
    gradientStart: '#ea580c',
    gradientEnd: '#fbbf24',
    buttonStyle: 'rounded',
    borderRadius: 12,
    fontFamily: 'Space Grotesk',
    isDarkMode: true,
    animationIntensity: 'normal',
    glassmorphism: true,
    shadowIntensity: 'glow',
    stickerPack: 'geometric',
    navbarStyle: 'glass',
    dashboardStyle: 'split',
    mobileUiStyle: 'ios_bottom_tab'
  },
  space_galaxy: {
    activeTheme: 'space_galaxy',
    primaryColor: '#3b82f6',
    secondaryColor: '#ec4899',
    accentGlowColor: '#eab308',
    backgroundColor: '#04020b',
    gradientStart: '#3b82f6',
    gradientEnd: '#ec4899',
    buttonStyle: 'pill',
    borderRadius: 24,
    fontFamily: 'Outfit',
    isDarkMode: true,
    animationIntensity: 'high',
    glassmorphism: true,
    shadowIntensity: 'intense',
    stickerPack: 'planets_space',
    navbarStyle: 'floating',
    dashboardStyle: 'bento',
    mobileUiStyle: 'ios_bottom_tab'
  },
  luxury_black: {
    activeTheme: 'luxury_black',
    primaryColor: '#d4af37',
    secondaryColor: '#1a1a1a',
    accentGlowColor: '#aa7c11',
    backgroundColor: '#040404',
    gradientStart: '#d4af37',
    gradientEnd: '#1e1e1e',
    buttonStyle: 'square',
    borderRadius: 0,
    fontFamily: 'Playfair Display',
    isDarkMode: true,
    animationIntensity: 'low',
    glassmorphism: true,
    shadowIntensity: 'glow',
    stickerPack: 'none',
    navbarStyle: 'minimal',
    dashboardStyle: 'split',
    mobileUiStyle: 'compact_list'
  },
  ai_futuristic: {
    activeTheme: 'ai_futuristic',
    primaryColor: '#22c55e',
    secondaryColor: '#06b6d4',
    accentGlowColor: '#a855f7',
    backgroundColor: '#010409',
    gradientStart: '#22c55e',
    gradientEnd: '#06b6d4',
    buttonStyle: 'rounded',
    borderRadius: 6,
    fontFamily: 'JetBrains Mono',
    isDarkMode: true,
    animationIntensity: 'high',
    glassmorphism: true,
    shadowIntensity: 'intense',
    stickerPack: 'cyber_particles',
    navbarStyle: 'glass',
    dashboardStyle: 'bento',
    mobileUiStyle: 'ios_bottom_tab'
  }
};

export interface CustomThemePreset {
  id: string;
  name: string;
  config: ThemeConfig;
  createdAt: number;
}

export interface ScheduledTheme {
  enabled: boolean;
  startTime: string; // "HH:MM" format
  endTime: string; // "HH:MM" format
  themeId: 'default' | 'theme2' | 'theme3' | string;
}

interface SiteSettings {
  upiId?: string;
  priceNotes?: number;
  priceLectures?: number;
  pricePremium?: number;
  
  classPrices?: {
    '6'?: { notes?: number, lectures?: number, premium?: number };
    '7'?: { notes?: number, lectures?: number, premium?: number };
    '8'?: { notes?: number, lectures?: number, premium?: number };
    '9'?: { notes?: number, lectures?: number, premium?: number };
    '10'?: { notes?: number, lectures?: number, premium?: number };
    '11'?: { notes?: number, lectures?: number, premium?: number };
    '12'?: { notes?: number, lectures?: number, premium?: number };
    'dropper'?: { notes?: number, lectures?: number, premium?: number };
  };

  websiteName?: string;
  logoText?: string;
  logoImage?: string;
  faviconUrl?: string;
  documentTitle?: string;
  
  heroTitle?: string;
  heroSubtitle?: string;
  heroBadgeText?: string;
  heroCta1Text?: string;
  heroCta1Link?: string;
  heroCta2Text?: string;
  heroCta2Link?: string;
  
  footerDescription?: string;
  
  footerLink1Text?: string;
  footerLink1Url?: string;
  footerLink2Text?: string;
  footerLink2Url?: string;
  footerLink3Text?: string;
  footerLink3Url?: string;
  
  footerLegal1Text?: string;
  footerLegal1Url?: string;
  footerLegal2Text?: string;
  footerLegal2Url?: string;

  reviewFormUrl?: string;

  aboutShowMockCard?: boolean;
  aboutMockCardTitle?: string;
  aboutMockCardSubtitle?: string;
  aboutMockCardValue?: string;
  aboutShowIitianBadge?: boolean;
  aboutIitianBadgeText?: string;
  aboutShowLiveDoubts?: boolean;
  aboutLiveDoubtsText?: string;
  aboutShowCalculusCard?: boolean;
  aboutCalculusTitle?: string;
  aboutCalculusBadge?: string;
  aboutCalculusProgress?: number;
  aboutCalculusLectureText?: string;
  aboutCalculusPercentText?: string;
  aboutShowRatingCard?: boolean;
  aboutRatingTitle?: string;
  aboutRatingDesc?: string;
  aboutCornerImageUrl?: string;
  aboutCornerImgShape?: 'circle' | 'card';
  aboutCornerBackground?: 'orange_burst' | 'water_spread' | 'none';

  pwaBtnText?: string;
  pwaBtnLink?: string;

  // Study Stickers
  studySticker1Emoji?: string;
  studySticker1Title?: string;
  studySticker1Subtitle?: string;
  studySticker1Popup?: string;

  studySticker2Emoji?: string;
  studySticker2Title?: string;
  studySticker2Subtitle?: string;
  studySticker2Popup?: string;

  studySticker3Emoji?: string;
  studySticker3Title?: string;
  studySticker3Subtitle?: string;
  studySticker3Popup?: string;

  studySticker4Emoji?: string;
  studySticker4Title?: string;
  studySticker4Subtitle?: string;
  studySticker4Popup?: string;

  studySticker5Emoji?: string;
  studySticker5Title?: string;
  studySticker5Subtitle?: string;
  studySticker5Popup?: string;

  studySticker6Emoji?: string;
  studySticker6Title?: string;
  studySticker6Subtitle?: string;
  studySticker6Popup?: string;

  // Pricing/Payment Cards
  pricingCard1Badge?: string;
  pricingCard1Title?: string;
  pricingCard1Desc?: string;
  pricingCard1Features?: string;

  pricingCard2Badge?: string;
  pricingCard2Title?: string;
  pricingCard2Desc?: string;
  pricingCard2Features?: string;

  pricingCard3Badge?: string;
  pricingCard3Title?: string;
  pricingCard3Desc?: string;
  pricingCard3Features?: string;

  // Real-Time Theme & UI System Store Elements
  activeTheme?: string;
  themeCustomizations?: ThemeConfig;
  draftThemeCustomizations?: ThemeConfig;
  customThemes?: CustomThemePreset[];
  scheduledTheme?: ScheduledTheme;
  seasonalOverlay?: 'none' | 'winter_snow' | 'spring_blossoms' | 'autumn_lanterns' | 'cyber_grids';

  // --- Video Security System ---
  secVideoDownloadsEnabled?: boolean;
  secVideoWatermarkEnabled?: boolean;
  secVideoScreenshotProtection?: boolean;
  secVideoRecordingProtection?: boolean;
  secWatermarkSize?: number;
  secWatermarkOpacity?: number;
  secWatermarkSpeed?: number;
  secWatermarkText?: string;
  secWatermarkFields?: string[]; // e.g. ["name", "email", "phone", "timestamp", "userId", "batchName"]
  secTokenExpiry?: number; // in hours
  secPlaybackPermissions?: 'any' | 'paid_only';
  secDisableSeeking?: boolean;
  secDisablePlaybackSpeed?: boolean;
  secAutoplayEnabled?: boolean;
  secBlurOnTabSwitch?: boolean;
  secAutoPauseSuspicious?: boolean;

  // --- PDF Security System ---
  secPdfDownloadEnabled?: boolean;
  secPdfPrintEnabled?: boolean;
  secPdfCopyTextEnabled?: boolean;
  secPdfTextSelectionEnabled?: boolean;
  secPdfRightClickEnabled?: boolean;
  secPdfWatermarkAngle?: number;
  secPdfWatermarkOpacity?: number;
  secPdfWatermarkFontSize?: number;
  secPdfWatermarkRepeated?: boolean;

  // --- Device & Access ---
  secMaxDeviceLimit?: number;
}

interface SettingsState {
  settings: SiteSettings;
  setSettings: (settings: SiteSettings) => void;
  // Live admin temporary preview state
  previewSettings: SiteSettings | null;
  setPreviewSettings: (previewSettings: SiteSettings | null) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: {
    websiteName: 'Nucleus.cc',
    logoText: 'N',
    documentTitle: 'Nucleus - Academic Excellence',
    heroTitle: 'Redefining Academic Excellence.',
    heroSubtitle: 'Experience the highest echelon of coaching. Crafted for ambitious minds, powered by top IITians and Doctors. Welcome to the future of learning.',
    heroBadgeText: 'Premium Access Now Open',
    heroCta1Text: 'Join the Elite',
    heroCta1Link: '',
    heroCta2Text: 'Watch Preview',
    heroCta2Link: '',
    footerDescription: 'The world\'s most premium learning ecosystem designed for peak academic performance.',
    footerLink1Text: 'Architecture',
    footerLink1Url: '#',
    footerLink2Text: 'Mentors',
    footerLink2Url: '#',
    footerLink3Text: 'Pricing',
    footerLink3Url: '#',
    footerLegal1Text: 'Privacy Policy',
    footerLegal1Url: '#',
    footerLegal2Text: 'Terms of Service',
    footerLegal2Url: '#',
    reviewFormUrl: '',

    aboutShowMockCard: true,
    aboutMockCardTitle: 'Physics Expert',
    aboutMockCardSubtitle: 'Daily Challenge streak',
    aboutMockCardValue: '8 Days 🔥',
    aboutShowIitianBadge: true,
    aboutIitianBadgeText: 'IITian Led 🚀',
    aboutShowLiveDoubts: true,
    aboutLiveDoubtsText: 'Live Doubts Active',
    aboutShowCalculusCard: true,
    aboutCalculusTitle: 'Calculus Foundation',
    aboutCalculusBadge: 'Class 11',
    aboutCalculusProgress: 74,
    aboutCalculusLectureText: '14 Lectures Watched',
    aboutCalculusPercentText: '74% Complete',
    aboutShowRatingCard: true,
    aboutRatingTitle: '10,000+ Active Students',
    aboutRatingDesc: 'Highly recommended study app',
    aboutCornerImageUrl: 'https://images.unsplash.com/photo-1614064641938-3bbee52942c7?auto=format&fit=crop&q=80&w=400',
    aboutCornerImgShape: 'circle',
    aboutCornerBackground: 'water_spread',
    pwaBtnText: 'Install App',
    pwaBtnLink: '',

    // Study sticker default values
    studySticker1Emoji: '📚',
    studySticker1Title: 'STUDY FORCE',
    studySticker1Subtitle: 'Focus Active',
    studySticker1Popup: 'Ignite your study sessions with maximum mental torque! 📚 Keep learning!',

    studySticker2Emoji: '💡',
    studySticker2Title: 'DEEP FOCUS',
    studySticker2Subtitle: 'Active Sparks',
    studySticker2Popup: 'A single spark of intuition can illuminate any difficult problem! 💡 Stay curious!',

    studySticker3Emoji: '🎓',
    studySticker3Title: 'AIR 1 GOAL',
    studySticker3Subtitle: 'IIT Selection',
    studySticker3Popup: 'Keep your eyes on the prize. All India Rank 1 starts with persistent everyday discipline! 🎓',

    studySticker4Emoji: '🎯',
    studySticker4Title: '100% AIM',
    studySticker4Subtitle: 'Perfect Practice',
    studySticker4Popup: 'Accuracy is built by constant deliberate feedback. Refine your aim daily! 🎯',

    studySticker5Emoji: '☕',
    studySticker5Title: 'NIGHT RUNS',
    studySticker5Subtitle: 'Midnight Session',
    studySticker5Popup: 'The quiet hours are when progress is made. Fuel your academic ambition! ☕',

    studySticker6Emoji: '🧠',
    studySticker6Title: 'NEURAL GRID',
    studySticker6Subtitle: 'Concept Clear',
    studySticker6Popup: 'Connect the dots, master the formulas, and let neuroplasticity do the rest! 🧠',

    // Pricing/Payment Cards
    pricingCard1Badge: 'Essential Revision',
    pricingCard1Title: 'High Grade Notes',
    pricingCard1Desc: 'Step-by-step PDF summaries built for immediate exam revision cycles.',
    pricingCard1Features: 'Complete Curated Study PDFs,Handwritten Board Materials,Quick Formula Sheets & Decals',

    pricingCard2Badge: 'Full Video Stream',
    pricingCard2Title: 'Lectures Package',
    pricingCard2Desc: 'Deeper conceptual lectures featuring interactive workspace guides.',
    pricingCard2Features: 'All Chapter Study Notes Included,High-Def Classroom Videos,Peer Doubt Forum Assistance',

    pricingCard3Badge: 'All Inclusive Elite',
    pricingCard3Title: 'Elite Premium',
    pricingCard3Desc: '1-on-1 personalized mentorship with video courses and study guides.',
    pricingCard3Features: 'Comprehensive Study Notes & Videos,Weekly 1-on-1 Mentor Meetup,Personalized Study Calendar',

    // Setup active themes
    activeTheme: 'default',
    themeCustomizations: THEME_PRESETS.default,
    draftThemeCustomizations: THEME_PRESETS.default,
    customThemes: [],
    scheduledTheme: {
      enabled: false,
      startTime: '18:00',
      endTime: '06:00',
      themeId: 'theme2'
    },
    seasonalOverlay: 'none',

    // --- Video Security System Defaults ---
    secVideoDownloadsEnabled: false, // by default downloads are disabled
    secVideoWatermarkEnabled: true,  // by default active watermarking is enabled
    secVideoScreenshotProtection: true,
    secVideoRecordingProtection: true,
    secWatermarkSize: 13,
    secWatermarkOpacity: 0.35,
    secWatermarkSpeed: 10, // speed in seconds to jump around
    secWatermarkText: 'NUCLEUS PREMIUM LECTURES',
    secWatermarkFields: ['name', 'email', 'phone', 'timestamp'],
    secTokenExpiry: 2, // 2 hours
    secPlaybackPermissions: 'paid_only',
    secDisableSeeking: false,
    secDisablePlaybackSpeed: false,
    secAutoplayEnabled: false,
    secBlurOnTabSwitch: true,
    secAutoPauseSuspicious: true,

    // --- PDF Security System Defaults ---
    secPdfDownloadEnabled: false,
    secPdfPrintEnabled: false,
    secPdfCopyTextEnabled: false,
    secPdfTextSelectionEnabled: false,
    secPdfRightClickEnabled: false,
    secPdfWatermarkAngle: -45,
    secPdfWatermarkOpacity: 0.15,
    secPdfWatermarkFontSize: 16,
    secPdfWatermarkRepeated: true,

    // --- Device Limit Defaults ---
    secMaxDeviceLimit: 2
  },
  setSettings: (settings) => set({ settings }),
  previewSettings: null,
  setPreviewSettings: (previewSettings) => set({ previewSettings }),
}));
