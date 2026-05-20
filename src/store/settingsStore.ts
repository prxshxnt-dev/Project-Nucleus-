import { create } from 'zustand';

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
}

interface SettingsState {
  settings: SiteSettings;
  setSettings: (settings: SiteSettings) => void;
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
  },
  setSettings: (settings) => set({ settings }),
}));
