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
  dockBackgroundStyle?: 'frosted' | 'solid';
  enableManualOverrides?: boolean;
  overrideTextPrimary?: string;
  overrideTextSecondary?: string;
  overrideTextMuted?: string;
}

export const THEME_PRESETS: Record<string, ThemeConfig> = {
  default: {
    activeTheme: 'default',
    primaryColor: '#4F46E5',
    secondaryColor: '#1F1F1F',
    accentGlowColor: '#4F46E5',
    backgroundColor: '#F8FAFC',
    gradientStart: '#4F46E5',
    gradientEnd: '#F8FAFC',
    buttonStyle: 'rounded',
    borderRadius: 20,
    fontFamily: 'Inter',
    isDarkMode: false,
    animationIntensity: 'normal',
    glassmorphism: false,
    shadowIntensity: 'soft',
    stickerPack: 'none',
    navbarStyle: 'minimal',
    dashboardStyle: 'minimalist',
    mobileUiStyle: 'compact_list',
    dockBackgroundStyle: 'solid',
    enableManualOverrides: true,
    overrideTextPrimary: '#1F1F1F',
    overrideTextSecondary: '#4A4A4A',
    overrideTextMuted: '#7A7A7A'
  },
  theme2: {
    activeTheme: 'theme2',
    primaryColor: '#10B981',
    secondaryColor: '#059669',
    accentGlowColor: '#10B981',
    backgroundColor: '#022C22',
    gradientStart: '#10B981',
    gradientEnd: '#34D399',
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
  royal_academy: {
    activeTheme: 'royal_academy',
    primaryColor: '#6366F1',
    secondaryColor: '#3b82f6',
    accentGlowColor: '#6366F1',
    backgroundColor: '#0b0914',
    gradientStart: '#6366F1',
    gradientEnd: '#3B82F6',
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
  upiQrCode?: string;
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
  heroTitleLine1?: string;
  heroTitleLine2?: string;
  heroTitleHighlight?: string;
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
  aboutCornerBackground?: 'indigo_burst' | 'water_spread' | 'none';

  chatbotEnabled?: boolean;
  chatbotIconUrl?: string;

  aboutTeacherPhotoUrl?: string;
  aboutTeacherName?: string;
  aboutTeacherRole?: string;
  aboutTeacherTagline?: string;

  pwaBtnText?: string;
  pwaBtnLink?: string;

  // Study Stickers
  studySticker1Emoji?: string;
  studySticker1Title?: string;
  studySticker1Subtitle?: string;
  studySticker1Popup?: string;
  studySticker1Left?: string;
  studySticker1Top?: string;
  studySticker1Rotate?: number;
  studySticker1Show?: boolean;

  studySticker2Emoji?: string;
  studySticker2Title?: string;
  studySticker2Subtitle?: string;
  studySticker2Popup?: string;
  studySticker2Left?: string;
  studySticker2Top?: string;
  studySticker2Rotate?: number;
  studySticker2Show?: boolean;

  studySticker3Emoji?: string;
  studySticker3Title?: string;
  studySticker3Subtitle?: string;
  studySticker3Popup?: string;
  studySticker3Left?: string;
  studySticker3Top?: string;
  studySticker3Rotate?: number;
  studySticker3Show?: boolean;

  studySticker4Emoji?: string;
  studySticker4Title?: string;
  studySticker4Subtitle?: string;
  studySticker4Popup?: string;
  studySticker4Left?: string;
  studySticker4Top?: string;
  studySticker4Rotate?: number;
  studySticker4Show?: boolean;

  studySticker5Emoji?: string;
  studySticker5Title?: string;
  studySticker5Subtitle?: string;
  studySticker5Popup?: string;
  studySticker5Left?: string;
  studySticker5Top?: string;
  studySticker5Rotate?: number;
  studySticker5Show?: boolean;

  studySticker6Emoji?: string;
  studySticker6Title?: string;
  studySticker6Subtitle?: string;
  studySticker6Popup?: string;
  studySticker6Left?: string;
  studySticker6Top?: string;
  studySticker6Rotate?: number;
  studySticker6Show?: boolean;

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

  // --- Social Media Section & Controls ---
  socialSectionTitle?: string;
  socialSectionSubtitle?: string;
  socialSectionShow?: boolean;
  
  socialInstagramUrl?: string;
  socialInstagramShow?: boolean;
  socialYoutubeUrl?: string;
  socialYoutubeShow?: boolean;
  socialTelegramUrl?: string;
  socialTelegramShow?: boolean;

  socialTwitterUrl?: string;
  socialTwitterShow?: boolean;
  socialLinkedinUrl?: string;
  socialLinkedinShow?: boolean;
  socialFacebookUrl?: string;
  socialFacebookShow?: boolean;
  syllabusSectionName?: string;
  classSyllabuses?: { [classGroup: string]: string };
  loaderSteps?: string;
  termsContent?: string;
  privacyContent?: string;
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
    syllabusSectionName: 'Syllabus',
    classSyllabuses: {},
    documentTitle: 'Nucleus - Learning That\'s Smart, Simple & Super Fun!',
    heroTitle: 'Learning That\'s Smart, Simple & Super Fun!',
    heroTitleLine1: 'Learning That\'s',
    heroTitleLine2: 'Smart, Simple &',
    heroTitleHighlight: 'Super Fun!',
    heroSubtitle: 'Master Science, Maths & More with India\'s most engaging learning app – where every concept clicks and every lesson feels like play.',
    heroBadgeText: 'India\'s Most Engaging Learning Hub',
    heroCta1Text: 'Start Learning Now',
    heroCta1Link: '',
    heroCta2Text: 'Quick Video Preview',
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

    termsContent: `# Terms and Conditions for Nucleus.cc\nEffective Date: June 9, 2026\n\nWelcome to Nucleus.cc! These terms define the rules and regulations for using our educational platform.\n\n### 1. General Acceptance\nBy accessing this website, we assume you accept these terms and conditions. Do not continue to use Nucleus.cc if you do not agree to all terms stated on this page.\n\n### 2. Intellectual Property Rights\nUnless otherwise stated, Nucleus.cc and/or its licensors own the intellectual property rights for all study materials, courses, and content on Nucleus.cc. All intellectual property rights are reserved.\n\n### 3. User Accounts and Verification\nWhen registering or logging in, you agree to:\n- Provide accurate and complete registration info.\n- Verify transactions, login sequences, and operations using secure dynamic OTP mechanisms.\n- Maintain the confidentiality of your account credentials.\n\n### 4. Code of Conduct\nUsers are strictly prohibited from:\n- Attempting to bypass dynamic DRM and anti-piracy protection.\n- Republishing, selling, or rent-leasing any class syllabus, slides, or study materials.\n- Engaging in systematic scraping or automated queries.\n\n### 5. Disclaimer of Warranties\nOur courses are provided "as is" and "as available" without any warranty of any kind, whether express or implied. Under no circumstance shall Nucleus.cc be liable for any special, direct, indirect, consequential, or incidental damages.`,

    privacyContent: `# Privacy Policy for Nucleus.cc\nEffective Date: June 9, 2026\n\nAt Nucleus.cc, accessible from our application platform, one of our main priorities is the privacy of our visitors. This Privacy Policy document contains types of information that is collected and recorded by Nucleus.cc and how we use it.\n\n### 1. Information We Collect\nWe collect several types of operational and personal data to support your seamless educational journey:\n- **Personal and Profile Data**: Information such as your full name, email address, standard/class, and profile data.\n- **Verification Logs**: Temporal dynamic OTP logs for securely authorizing operations without static password vulnerabilities.\n- **Educational Activity**: Syllabus progress, lecture completions, and chatbot assist query logs.\n\n### 2. How We Use Your Information\nWe use the collected information to:\n- Provision, operate, and maintain internal interactive courses and library systems.\n- Enhance personalized AI-assisted tutoring and doubt solving.\n- Safely route security notifications and study milestones.\n- Strictly enforce DRM rules to protect against unauthorized redistribution of educational video content.\n\n### 3. Cookies and Persistent States\nNucleus.cc uses local browser storage and cookie segments strictly to retain secure theme options, system preferences, and user authorization sessions.\n\n### 4. Data Protection & Deletion\nWe implement rigorous security measures to protect your metadata and prevent unauthorized leakage. You may request data inspection or account deletion at any time by contacting our support team or designated administrators.`,

    aboutShowMockCard: true,
    aboutMockCardTitle: 'Physics Expert',
    aboutMockCardSubtitle: 'Daily Challenge streak',
    aboutMockCardValue: '8 Days',
    aboutShowIitianBadge: true,
    aboutIitianBadgeText: 'IITian Led',
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
    aboutCornerImageUrl: 'auto=format&fit=crop&q=80&w=400',
    aboutCornerImgShape: 'circle',
    aboutCornerBackground: 'water_spread',
    aboutTeacherPhotoUrl: '',
    aboutTeacherName: 'Dr. Anand Kumar',
    aboutTeacherRole: 'Senior Physics Specialist (Ex-IIT)',
    aboutTeacherTagline: 'Visualizing equations dynamically. Crafting interactive modules for deep analytical development of students.',
    pwaBtnText: 'Install App',
    pwaBtnLink: '',

    chatbotEnabled: false,
    chatbotIconUrl: '',

    // Study sticker default values
    studySticker1Emoji: '📚',
    studySticker1Title: 'STUDY FORCE',
    studySticker1Subtitle: 'Focus Active',
    studySticker1Popup: 'Ignite your study sessions with maximum mental torque! 📚 Keep learning!',
    studySticker1Left: '2%',
    studySticker1Top: '22%',
    studySticker1Rotate: -12,
    studySticker1Show: true,

    studySticker2Emoji: '💡',
    studySticker2Title: 'DEEP FOCUS',
    studySticker2Subtitle: 'Active Sparks',
    studySticker2Popup: 'A single spark of intuition can illuminate any difficult problem! 💡 Stay curious!',
    studySticker2Left: '4%',
    studySticker2Top: '76%',
    studySticker2Rotate: 15,
    studySticker2Show: true,

    studySticker3Emoji: '🎓',
    studySticker3Title: 'AIR 1 GOAL',
    studySticker3Subtitle: 'IIT Selection',
    studySticker3Popup: 'Keep your eyes on the prize. All India Rank 1 starts with persistent everyday discipline! 🎓',
    studySticker3Left: '47%',
    studySticker3Top: '12%',
    studySticker3Rotate: -8,
    studySticker3Show: true,

    studySticker4Emoji: '🎯',
    studySticker4Title: '100% AIM',
    studySticker4Subtitle: 'Perfect Practice',
    studySticker4Popup: 'Accuracy is built by constant deliberate feedback. Refine your aim daily! 🎯',
    studySticker4Left: '44%',
    studySticker4Top: '84%',
    studySticker4Rotate: 10,
    studySticker4Show: true,

    studySticker5Emoji: '☕',
    studySticker5Title: 'NIGHT RUNS',
    studySticker5Subtitle: 'Midnight Session',
    studySticker5Popup: 'The quiet hours are when progress is made. Fuel your academic ambition! ☕',
    studySticker5Left: '88%',
    studySticker5Top: '16%',
    studySticker5Rotate: -14,
    studySticker5Show: true,

    studySticker6Emoji: '🧠',
    studySticker6Title: 'NEURAL GRID',
    studySticker6Subtitle: 'Concept Clear',
    studySticker6Popup: 'Connect the dots, master the formulas, and let neuroplasticity do the rest! 🧠',
    studySticker6Left: '87%',
    studySticker6Top: '78%',
    studySticker6Rotate: 18,
    studySticker6Show: true,

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
    secMaxDeviceLimit: 4,

    // --- Social Media Section Default Values ---
    socialSectionTitle: 'Connect via Socials',
    socialSectionSubtitle: 'Stay in the loop with live streams, instant tips, sample study papers, and continuous student updates.',
    socialSectionShow: true,
    socialInstagramUrl: 'https://instagram.com/nucleus.cc',
    socialInstagramShow: true,
    socialYoutubeUrl: 'https://youtube.com/@nucleus',
    socialYoutubeShow: true,
    socialTelegramUrl: 'https://t.me/nucleus',
    socialTelegramShow: true,

    socialTwitterUrl: 'https://x.com/nucleus',
    socialTwitterShow: false,
    socialLinkedinUrl: '',
    socialLinkedinShow: false,
    socialFacebookUrl: '',
    socialFacebookShow: false,
    loaderSteps: 'Formulating learning equations...\nLearn to become smart\nLearn to become simple\nLearn to become super fun!\nReady to play & learn!'
  },
  setSettings: (settings) => set({ settings }),
  previewSettings: null,
  setPreviewSettings: (previewSettings) => set({ previewSettings }),
}));
