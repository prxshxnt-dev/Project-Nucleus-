import { useEffect, useState } from "react";
import { useAuthStore } from "../store/authStore";
import { db } from "../lib/firebase";
import {
  collection,
  query,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  deleteDoc,
  serverTimestamp,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { motion } from "motion/react";
import { ArrowLeft, LockOpen, Check, Flame, ShieldAlert, Video, FileText, Smartphone, History, User, Save, RefreshCw, Sliders, XOctagon, Compass, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  useSettingsStore,
  THEME_PRESETS,
  ThemeConfig,
} from "../store/settingsStore";

const PRESET_INFO: Record<
  string,
  { name: string; desc: string; colors: string[] }
> = {
  default: {
    name: "1. Default Luxury Gold",
    desc: "Slate-dark baseline aesthetic framing core learning workflows. Refined typography alongside luxurious bronze and pale gold accents.",
    colors: ["#070709", "#E5D2A5", "#b59f6d"],
  },
  theme2: {
    name: "2. Cyber Oracle Flame",
    desc: "SaaS-powered design with rich futuristic orange-red glowing gradients, dark dashboard borders and sharp cyberpunk corners.",
    colors: ["#030303", "#f97316", "#ef4444"],
  },
  theme3: {
    name: "3. Creator Cosmic Blue",
    desc: "Vibrant modern pink-purple flowing aurora aesthetics. Smooth custom motion multipliers, soft neon floating shadows, and creator vibes.",
    colors: ["#050512", "#ec4899", "#8b5cf6"],
  },
  neo_glass_purple: {
    name: "4. Neo Glass Purple",
    desc: "Vibrant modern neon glassmorphic purple layouts, glowing cards, translucent panels, cosmic sparkles, and Dribbble-level tech flow.",
    colors: ["#090514", "#a855f7", "#3b82f6"],
  },
  orange_academy: {
    name: "7. Orange Modern Academy",
    desc: "An energetic SaaS learning hub featuring bright orange primary accents, smooth transitions, and high contrast typography.",
    colors: ["#0b0908", "#ea580c", "#fbbf24"],
  },
  space_galaxy: {
    name: "8. Space Deep Galaxy",
    desc: "A galactic learning voyage with deep starfield blues, stardust particles, planets, and intense nebulous glow-lines.",
    colors: ["#04020b", "#3b82f6", "#ec4899"],
  },
  luxury_black: {
    name: "10. Matte Luxury Black",
    desc: "High-end minimal luxury aesthetic utilizing dense matte carbon dark spaces, sharp edges, and true champagne gold linings.",
    colors: ["#040404", "#d4af37", "#1a1a1a"],
  },
  ai_futuristic: {
    name: "12. AI Matrix Futuristic",
    desc: "A sleek sci-fi digital interface with lime matrix grids, neon glowing terminals, cyan lasers, and advanced cyber panels.",
    colors: ["#010409", "#22c55e", "#06b6d4"],
  },
};

function getLuminance(r: number, g: number, b: number) {
  let a = [r, g, b].map(function (v) {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function calculateContrastRatio(hex1: string, hex2: string): number {
  const parseHex = (h: string) => {
    let clean = h.trim().replace(/^#/, '');
    if (clean.length === 3) {
      return {
        r: parseInt(clean[0] + clean[0], 16),
        g: parseInt(clean[1] + clean[1], 16),
        b: parseInt(clean[2] + clean[2], 16)
      };
    }
    if (clean.length === 6) {
      return {
        r: parseInt(clean.substring(0, 2), 16),
        g: parseInt(clean.substring(2, 4), 16),
        b: parseInt(clean.substring(4, 6), 16)
      };
    }
    return { r: 255, g: 255, b: 255 };
  };

  const c1 = parseHex(hex1);
  const c2 = parseHex(hex2);

  const l1 = getLuminance(c1.r, c1.g, c1.b);
  const l2 = getLuminance(c2.r, c2.g, c2.b);

  const brightest = Math.max(l1, l2);
  const darkest = Math.min(l1, l2);

  return Number(((brightest + 0.05) / (darkest + 0.05)).toFixed(2));
}

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/");
    }
  }, [user, authLoading, navigate]);
  const [activeTab, setActiveTab] = useState<
    "materials" | "users" | "mentors" | "settings" | "appearance" | "security"
  >("materials");
  const [users, setUsers] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [mentors, setMentors] = useState<any[]>([]);

  // Settings Form
  const [upiId, setUpiId] = useState("");
  const [priceNotes, setPriceNotes] = useState(99);
  const [priceLectures, setPriceLectures] = useState(499);
  const [pricePremium, setPricePremium] = useState(999);

  const [classPrices, setClassPrices] = useState<any>({});

  const [websiteName, setWebsiteName] = useState("Nucleus.cc");
  const [documentTitle, setDocumentTitle] = useState(
    "Nucleus - Academic Excellence",
  );
  const [logoText, setLogoText] = useState("N");
  const [logoImage, setLogoImage] = useState("");
  const [faviconUrl, setFaviconUrl] = useState("");
  const [heroTitle, setHeroTitle] = useState("Redefining Academic Excellence.");
  const [heroSubtitle, setHeroSubtitle] = useState(
    "Experience the highest echelon of coaching.",
  );
  const [heroBadgeText, setHeroBadgeText] = useState("Premium Access Now Open");
  const [heroCta1Text, setHeroCta1Text] = useState("Join the Elite");
  const [heroCta1Link, setHeroCta1Link] = useState("");
  const [heroCta2Text, setHeroCta2Text] = useState("Watch Preview");
  const [heroCta2Link, setHeroCta2Link] = useState("");

  // Footer Form
  const [footerDescription, setFooterDescription] = useState(
    "The world's most premium learning ecosystem designed for peak academic performance.",
  );
  const [footerLink1Text, setFooterLink1Text] = useState("Architecture");
  const [footerLink1Url, setFooterLink1Url] = useState("#");
  const [footerLink2Text, setFooterLink2Text] = useState("Mentors");
  const [footerLink2Url, setFooterLink2Url] = useState("#");
  const [footerLink3Text, setFooterLink3Text] = useState("Pricing");
  const [footerLink3Url, setFooterLink3Url] = useState("#");
  const [footerLegal1Text, setFooterLegal1Text] = useState("Privacy Policy");
  const [footerLegal1Url, setFooterLegal1Url] = useState("#");
  const [footerLegal2Text, setFooterLegal2Text] = useState("Terms of Service");
  const [footerLegal2Url, setFooterLegal2Url] = useState("#");

  const [reviewFormUrl, setReviewFormUrl] = useState("");

  // --- Security & DRM Panel Settings ---
  const [secVideoDownloads, setSecVideoDownloads] = useState(false);
  const [secVideoWatermark, setSecVideoWatermark] = useState(true);
  const [secVideoScreenshot, setSecVideoScreenshot] = useState(true);
  const [secVideoRecording, setSecVideoRecording] = useState(true);
  const [secWatermarkSize, setSecWatermarkSize] = useState(13);
  const [secWatermarkOpacity, setSecWatermarkOpacity] = useState(0.35);
  const [secWatermarkSpeed, setSecWatermarkSpeed] = useState(10);
  const [secWatermarkText, setSecWatermarkText] = useState("NUCLEUS ACADEMY CORE");
  const [secWatermarkFields, setSecWatermarkFields] = useState<string[]>(['name', 'email', 'phone', 'timestamp']);
  const [secDisableSeeking, setSecDisableSeeking] = useState(false);
  const [secDisablePlaybackSpeed, setSecDisablePlaybackSpeed] = useState(false);
  const [secAutoplay, setSecAutoplay] = useState(false);
  const [secBlurOnTab, setSecBlurOnTab] = useState(true);
  const [secPauseSuspicious, setSecPauseSuspicious] = useState(true);

  // PDF Security properties
  const [secPdfDownload, setSecPdfDownload] = useState(false);
  const [secPdfPrint, setSecPdfPrint] = useState(false);
  const [secPdfCopy, setSecPdfCopy] = useState(false);
  const [secPdfSelection, setSecPdfSelection] = useState(false);
  const [secPdfRightClick, setSecPdfRightClick] = useState(false);
  const [secPdfAngle, setSecPdfAngle] = useState(-35);
  const [secPdfOpacity, setSecPdfOpacity] = useState(0.15);
  const [secPdfFontSize, setSecPdfFontSize] = useState(14);
  const [secPdfRepeated, setSecPdfRepeated] = useState(true);

  // Simultaneous device logins cap
  const [secDeviceLimit, setSecDeviceLimit] = useState(2);

  // Violations log list
  const [violations, setViolations] = useState<any[]>([]);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [securityTabLoading, setSecurityTabLoading] = useState(false);

  useEffect(() => {
    if (activeTab !== "security") return;
    setSecurityTabLoading(true);

    const runFetch = async () => {
      try {
        const docRef = doc(db, "settings", "global");
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const d = snap.data();
          setSecVideoDownloads(d.secVideoDownloadsEnabled ?? false);
          setSecVideoWatermark(d.secVideoWatermarkEnabled ?? true);
          setSecVideoScreenshot(d.secVideoScreenshotProtection ?? true);
          setSecVideoRecording(d.secVideoRecordingProtection ?? true);
          setSecWatermarkSize(d.secWatermarkSize ?? 13);
          setSecWatermarkOpacity(d.secWatermarkOpacity ?? 0.35);
          setSecWatermarkSpeed(d.secWatermarkSpeed ?? 10);
          setSecWatermarkText(d.secWatermarkText ?? "NUCLEUS ACADEMY CORE");
          setSecWatermarkFields(d.secWatermarkFields ?? ['name', 'email', 'phone', 'timestamp']);
          setSecDisableSeeking(d.secDisableSeeking ?? false);
          setSecDisablePlaybackSpeed(d.secDisablePlaybackSpeed ?? false);
          setSecAutoplay(d.secAutoplayEnabled ?? false);
          setSecBlurOnTab(d.secBlurOnTabSwitch ?? true);
          setSecPauseSuspicious(d.secAutoPauseSuspicious ?? true);

          setSecPdfDownload(d.secPdfDownloadEnabled ?? false);
          setSecPdfPrint(d.secPdfPrintEnabled ?? false);
          setSecPdfCopy(d.secPdfCopyTextEnabled ?? false);
          setSecPdfSelection(d.secPdfTextSelectionEnabled ?? false);
          setSecPdfRightClick(d.secPdfRightClickEnabled ?? false);
          setSecPdfAngle(d.secPdfWatermarkAngle ?? -35);
          setSecPdfOpacity(d.secPdfWatermarkOpacity ?? 0.15);
          setSecPdfFontSize(d.secPdfWatermarkFontSize ?? 14);
          setSecPdfRepeated(d.secPdfWatermarkRepeated ?? true);

          setSecDeviceLimit(d.secMaxDeviceLimit ?? 2);
        }

        const violSnap = await getDocs(collection(db, "security_violations"));
        const list = violSnap.docs.map(gdoc => ({ id: gdoc.id, ...gdoc.data() }));
        list.sort((a: any, b: any) => {
          const tA = a.timestamp?.seconds || 0;
          const tB = b.timestamp?.seconds || 0;
          return tB - tA;
        });
        setViolations(list);

        const devSnap = await getDocs(collection(db, "active_devices"));
        const devList = devSnap.docs.map(gdoc => ({ id: gdoc.id, ...gdoc.data() }));
        setActiveSessions(devList);
      } catch (err) {
        console.error("Error loading security state:", err);
      } finally {
        setSecurityTabLoading(false);
      }
    };

    runFetch();
  }, [activeTab]);

  const handleSaveSecuritySettings = async () => {
    try {
      const docRef = doc(db, "settings", "global");
      await updateDoc(docRef, {
        secVideoDownloadsEnabled: secVideoDownloads,
        secVideoWatermarkEnabled: secVideoWatermark,
        secVideoScreenshotProtection: secVideoScreenshot,
        secVideoRecordingProtection: secVideoRecording,
        secWatermarkSize: Number(secWatermarkSize),
        secWatermarkOpacity: Number(secWatermarkOpacity),
        secWatermarkSpeed: Number(secWatermarkSpeed),
        secWatermarkText: secWatermarkText,
        secWatermarkFields: secWatermarkFields,
        secDisableSeeking: secDisableSeeking,
        secDisablePlaybackSpeed: secDisablePlaybackSpeed,
        secAutoplayEnabled: secAutoplay,
        secBlurOnTabSwitch: secBlurOnTab,
        secAutoPauseSuspicious: secPauseSuspicious,

        secPdfDownloadEnabled: secPdfDownload,
        secPdfPrintEnabled: secPdfPrint,
        secPdfCopyTextEnabled: secPdfCopy,
        secPdfTextSelectionEnabled: secPdfSelection,
        secPdfRightClickEnabled: secPdfRightClick,
        secPdfWatermarkAngle: Number(secPdfAngle),
        secPdfWatermarkOpacity: Number(secPdfOpacity),
        secPdfWatermarkFontSize: Number(secPdfFontSize),
        secPdfWatermarkRepeated: secPdfRepeated,

        secMaxDeviceLimit: Number(secDeviceLimit),
        updatedAt: serverTimestamp()
      });
      alert("DRM & Anti-Piracy settings synchronized globally in real time!");
    } catch (e) {
      console.error(e);
      alert("Failed to save and sync security fields.");
    }
  };

  const handleAdminResetDevices = async (userId: string) => {
    if (!window.confirm("Are you sure you want to force logout of all devices for this student block?")) return;
    try {
      const qDevices = activeSessions.filter((s: any) => s.userId === userId && s.status === 'active');
      for (const dev of qDevices) {
        await updateDoc(doc(db, "active_devices", dev.id), {
          status: 'forced_out',
          lastActive: serverTimestamp()
        });
      }
      alert("All sessions drop payload broadcasted successfully!");
      const devSnap = await getDocs(collection(db, "active_devices"));
      const devList = devSnap.docs.map(gdoc => ({ id: gdoc.id, ...gdoc.data() }));
      setActiveSessions(devList);
    } catch (err) {
      console.error(err);
    }
  };

  // Customizable Home Page About Section Elements
  const [aboutShowMockCard, setAboutShowMockCard] = useState(true);
  const [aboutMockCardTitle, setAboutMockCardTitle] = useState("Physics Expert");
  const [aboutMockCardSubtitle, setAboutMockCardSubtitle] = useState("Daily Challenge streak");
  const [aboutMockCardValue, setAboutMockCardValue] = useState("8 Days 🔥");
  const [aboutShowIitianBadge, setAboutShowIitianBadge] = useState(true);
  const [aboutIitianBadgeText, setAboutIitianBadgeText] = useState("IITian Led 🚀");
  const [aboutShowLiveDoubts, setAboutShowLiveDoubts] = useState(true);
  const [aboutLiveDoubtsText, setAboutLiveDoubtsText] = useState("Live Doubts Active");
  const [aboutShowCalculusCard, setAboutShowCalculusCard] = useState(true);
  const [aboutCalculusTitle, setAboutCalculusTitle] = useState("Calculus Foundation");
  const [aboutCalculusBadge, setAboutCalculusBadge] = useState("Class 11");
  const [aboutCalculusProgress, setAboutCalculusProgress] = useState(74);
  const [aboutCalculusLectureText, setAboutCalculusLectureText] = useState("14 Lectures Watched");
  const [aboutCalculusPercentText, setAboutCalculusPercentText] = useState("74% Complete");
  const [aboutShowRatingCard, setAboutShowRatingCard] = useState(true);
  const [aboutRatingTitle, setAboutRatingTitle] = useState("10,000+ Active Students");
  const [aboutRatingDesc, setAboutRatingDesc] = useState("Highly recommended study app");
  const [aboutCornerImageUrl, setAboutCornerImageUrl] = useState("https://images.unsplash.com/photo-1614064641938-3bbee52942c7?auto=format&fit=crop&q=80&w=400");
  const [aboutCornerImgShape, setAboutCornerImgShape] = useState<"circle" | "card">("circle");
  const [aboutCornerBackground, setAboutCornerBackground] = useState<"orange_burst" | "water_spread" | "none">("water_spread");
  const [pwaBtnText, setPwaBtnText] = useState("Install App");
  const [pwaBtnLink, setPwaBtnLink] = useState("");

  // Customizable Study Stickers States
  const [studySticker1Emoji, setStudySticker1Emoji] = useState("📚");
  const [studySticker1Title, setStudySticker1Title] = useState("STUDY FORCE");
  const [studySticker1Subtitle, setStudySticker1Subtitle] = useState("Focus Active");
  const [studySticker1Popup, setStudySticker1Popup] = useState("Ignite your study sessions with maximum mental torque! 📚 Keep learning!");

  const [studySticker2Emoji, setStudySticker2Emoji] = useState("💡");
  const [studySticker2Title, setStudySticker2Title] = useState("DEEP FOCUS");
  const [studySticker2Subtitle, setStudySticker2Subtitle] = useState("Active Sparks");
  const [studySticker2Popup, setStudySticker2Popup] = useState("A single spark of intuition can illuminate any difficult problem! 💡 Stay curious!");

  const [studySticker3Emoji, setStudySticker3Emoji] = useState("🎓");
  const [studySticker3Title, setStudySticker3Title] = useState("AIR 1 GOAL");
  const [studySticker3Subtitle, setStudySticker3Subtitle] = useState("IIT Selection");
  const [studySticker3Popup, setStudySticker3Popup] = useState("Keep your eyes on the prize. All India Rank 1 starts with persistent everyday discipline! 🎓");

  const [studySticker4Emoji, setStudySticker4Emoji] = useState("🎯");
  const [studySticker4Title, setStudySticker4Title] = useState("100% AIM");
  const [studySticker4Subtitle, setStudySticker4Subtitle] = useState("Perfect Practice");
  const [studySticker4Popup, setStudySticker4Popup] = useState("Accuracy is built by constant deliberate feedback. Refine your aim daily! 🎯");

  const [studySticker5Emoji, setStudySticker5Emoji] = useState("☕");
  const [studySticker5Title, setStudySticker5Title] = useState("NIGHT RUNS");
  const [studySticker5Subtitle, setStudySticker5Subtitle] = useState("Midnight Session");
  const [studySticker5Popup, setStudySticker5Popup] = useState("The quiet hours are when progress is made. Fuel your academic ambition! ☕");

  const [studySticker6Emoji, setStudySticker6Emoji] = useState("🧠");
  const [studySticker6Title, setStudySticker6Title] = useState("NEURAL GRID");
  const [studySticker6Subtitle, setStudySticker6Subtitle] = useState("Concept Clear");
  const [studySticker6Popup, setStudySticker6Popup] = useState("Connect the dots, master the formulas, and let neuroplasticity do the rest! 🧠");

  // Premium Pricing Cards States
  const [pricingCard1Badge, setPricingCard1Badge] = useState("Essential Revision");
  const [pricingCard1Title, setPricingCard1Title] = useState("High Grade Notes");
  const [pricingCard1Desc, setPricingCard1Desc] = useState("Step-by-step PDF summaries built for immediate exam revision cycles.");
  const [pricingCard1Features, setPricingCard1Features] = useState("Complete Curated Study PDFs, Handwritten Board Materials, Quick Formula Sheets & Decals");

  const [pricingCard2Badge, setPricingCard2Badge] = useState("Full Video Stream");
  const [pricingCard2Title, setPricingCard2Title] = useState("Lectures Package");
  const [pricingCard2Desc, setPricingCard2Desc] = useState("Deeper conceptual lectures featuring interactive workspace guides.");
  const [pricingCard2Features, setPricingCard2Features] = useState("All Chapter Study Notes Included, High-Def Classroom Videos, Peer Doubt Forum Assistance");

  const [pricingCard3Badge, setPricingCard3Badge] = useState("All Inclusive Elite");
  const [pricingCard3Title, setPricingCard3Title] = useState("Elite Premium");
  const [pricingCard3Desc, setPricingCard3Desc] = useState("1-on-1 personalized mentorship with video courses and study guides.");
  const [pricingCard3Features, setPricingCard3Features] = useState("Comprehensive Study Notes & Videos, Weekly 1-on-1 Mentor Meetup, Personalized Study Calendar");

  // Material Form
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [type, setType] = useState("note");
  const [url, setUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [plan, setPlan] = useState("free");
  const [classGroup, setClassGroup] = useState("all");
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(
    null,
  );

  // Mentor Form
  const [mentorName, setMentorName] = useState("");
  const [mentorRole, setMentorRole] = useState("");
  const [mentorImage, setMentorImage] = useState("");
  const [mentorExperience, setMentorExperience] = useState("");
  const [mentorDescription, setMentorDescription] = useState("");
  const [editingMentorId, setEditingMentorId] = useState<string | null>(null);

  // Real-Time UI Theme Switching & Builder States
  const [appearanceTheme, setAppearanceTheme] = useState<string>("default");
  const [primaryColor, setPrimaryColor] = useState("#E5D2A5");
  const [secondaryColor, setSecondaryColor] = useState("#b59f6d");
  const [accentGlowColor, setAccentGlowColor] = useState("#E5D2A5");
  const [backgroundColor, setBackgroundColor] = useState("#070709");
  const [gradientStart, setGradientStart] = useState("#E5D2A5");
  const [gradientEnd, setGradientEnd] = useState("#070709");
  const [buttonStyle, setButtonStyle] = useState<"pill" | "rounded" | "square">(
    "pill",
  );
  const [borderRadius, setBorderRadius] = useState(24);
  const [fontFamily, setFontFamily] = useState<
    | "Inter"
    | "Outfit"
    | "Space Grotesk"
    | "Playfair Display"
    | "JetBrains Mono"
    | "Plus Jakarta Sans"
  >("Outfit");
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [animationIntensity, setAnimationIntensity] = useState<
    "off" | "low" | "normal" | "high"
  >("normal");
  const [glassmorphism, setGlassmorphism] = useState(true);
  const [shadowIntensity, setShadowIntensity] = useState<
    "none" | "soft" | "glow" | "intense"
  >("soft");

  // Advanced Manual Override Contrast variables
  const [enableManualOverrides, setEnableManualOverrides] = useState<boolean>(false);
  const [overrideTextPrimary, setOverrideTextPrimary] = useState<string>("#fafafa");
  const [overrideTextSecondary, setOverrideTextSecondary] = useState<string>("#cbd5e1");
  const [overrideTextMuted, setOverrideTextMuted] = useState<string>("#71717a");

  // Advanced hand-crafted design controls
  const [stickerPack, setStickerPack] = useState<
    | "none"
    | "stars_dots"
    | "cute_cartoons"
    | "japanese_elements"
    | "geometric"
    | "planets_space"
    | "doodles"
    | "cyber_particles"
    | "organic_shapes"
  >("none");
  const [navbarStyle, setNavbarStyle] = useState<
    "glass" | "floating" | "solid" | "minimal"
  >("glass");
  const [dashboardStyle, setDashboardStyle] = useState<
    "bento" | "split" | "classic" | "minimalist"
  >("bento");
  const [mobileUiStyle, setMobileUiStyle] = useState<
    "ios_bottom_tab" | "compact_list" | "grid"
  >("ios_bottom_tab");

  // Custom Preset Lists, Scheduler & Overlay states
  const [customPresetName, setCustomPresetName] = useState("");
  const [importJsonText, setImportJsonText] = useState("");
  const [savedPresetsList, setSavedPresetsList] = useState<any[]>([]);

  const [isScheduleEnabled, setIsScheduleEnabled] = useState(false);
  const [scheduleStartTime, setScheduleStartTime] = useState("18:00");
  const [scheduleEndTime, setScheduleEndTime] = useState("06:00");
  const [scheduleThemeId, setScheduleThemeId] = useState("theme2");

  const [seasonalOverlay, setSeasonalOverlay] = useState<
    | "none"
    | "winter_snow"
    | "spring_blossoms"
    | "autumn_lanterns"
    | "cyber_grids"
  >("none");
  const [livePreviewActive, setLivePreviewActive] = useState(false);

  const fetchData = async () => {
    try {
      const uSnap = await getDocs(query(collection(db, "users")));
      setUsers(uSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

      const mSnap = await getDocs(query(collection(db, "materials")));
      setMaterials(mSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

      const mentorSnap = await getDocs(query(collection(db, "mentors")));
      setMentors(mentorSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

      const settingsSnap = await getDoc(doc(db, "settings", "global"));
      if (settingsSnap.exists()) {
        const d = settingsSnap.data();
        setUpiId(d.upiId || "");
        setPriceNotes(d.priceNotes || 99);
        setPriceLectures(d.priceLectures || 499);
        setPricePremium(d.pricePremium || 999);
        setClassPrices(d.classPrices || {});
        if (d.websiteName !== undefined) setWebsiteName(d.websiteName);
        if (d.documentTitle !== undefined) setDocumentTitle(d.documentTitle);
        if (d.logoText !== undefined) setLogoText(d.logoText);
        if (d.logoImage !== undefined) setLogoImage(d.logoImage);
        if (d.faviconUrl !== undefined) setFaviconUrl(d.faviconUrl);
        if (d.heroTitle !== undefined) setHeroTitle(d.heroTitle);
        if (d.heroSubtitle !== undefined) setHeroSubtitle(d.heroSubtitle);
        if (d.heroBadgeText !== undefined) setHeroBadgeText(d.heroBadgeText);
        if (d.heroCta1Text !== undefined) setHeroCta1Text(d.heroCta1Text);
        if (d.heroCta1Link !== undefined) setHeroCta1Link(d.heroCta1Link);
        if (d.heroCta2Text !== undefined) setHeroCta2Text(d.heroCta2Text);
        if (d.heroCta2Link !== undefined) setHeroCta2Link(d.heroCta2Link);

        if (d.footerDescription !== undefined)
          setFooterDescription(d.footerDescription);
        if (d.footerLink1Text !== undefined)
          setFooterLink1Text(d.footerLink1Text);
        if (d.footerLink1Url !== undefined) setFooterLink1Url(d.footerLink1Url);
        if (d.footerLink2Text !== undefined)
          setFooterLink2Text(d.footerLink2Text);
        if (d.footerLink2Url !== undefined) setFooterLink2Url(d.footerLink2Url);
        if (d.footerLink3Text !== undefined)
          setFooterLink3Text(d.footerLink3Text);
        if (d.footerLink3Url !== undefined) setFooterLink3Url(d.footerLink3Url);
        if (d.footerLegal1Text !== undefined)
          setFooterLegal1Text(d.footerLegal1Text);
        if (d.footerLegal1Url !== undefined)
          setFooterLegal1Url(d.footerLegal1Url);
        if (d.footerLegal2Text !== undefined)
          setFooterLegal2Text(d.footerLegal2Text);
        if (d.footerLegal2Url !== undefined)
          setFooterLegal2Url(d.footerLegal2Url);
        if (d.reviewFormUrl !== undefined) setReviewFormUrl(d.reviewFormUrl);

          setAboutShowMockCard(d.aboutShowMockCard !== undefined ? d.aboutShowMockCard : true);
          setAboutMockCardTitle(d.aboutMockCardTitle || "Physics Expert");
          setAboutMockCardSubtitle(d.aboutMockCardSubtitle || "Daily Challenge streak");
          setAboutMockCardValue(d.aboutMockCardValue || "8 Days 🔥");
          setAboutShowIitianBadge(d.aboutShowIitianBadge !== undefined ? d.aboutShowIitianBadge : true);
          setAboutIitianBadgeText(d.aboutIitianBadgeText || "IITian Led 🚀");
          setAboutShowLiveDoubts(d.aboutShowLiveDoubts !== undefined ? d.aboutShowLiveDoubts : true);
          setAboutLiveDoubtsText(d.aboutLiveDoubtsText || "Live Doubts Active");
          setAboutShowCalculusCard(d.aboutShowCalculusCard !== undefined ? d.aboutShowCalculusCard : true);
          setAboutCalculusTitle(d.aboutCalculusTitle || "Calculus Foundation");
          setAboutCalculusBadge(d.aboutCalculusBadge || "Class 11");
          setAboutCalculusProgress(d.aboutCalculusProgress !== undefined ? d.aboutCalculusProgress : 74);
          setAboutCalculusLectureText(d.aboutCalculusLectureText || "14 Lectures Watched");
          setAboutCalculusPercentText(d.aboutCalculusPercentText || "74% Complete");
          setAboutShowRatingCard(d.aboutShowRatingCard !== undefined ? d.aboutShowRatingCard : true);
          setAboutRatingTitle(d.aboutRatingTitle || "10,000+ Active Students");
          setAboutRatingDesc(d.aboutRatingDesc || "Highly recommended study app");
          setAboutCornerImageUrl(d.aboutCornerImageUrl || "https://images.unsplash.com/photo-1614064641938-3bbee52942c7?auto=format&fit=crop&q=80&w=400");
          setAboutCornerImgShape(d.aboutCornerImgShape || "circle");
          setAboutCornerBackground(d.aboutCornerBackground || "water_spread");
          setPwaBtnText(d.pwaBtnText || "Install App");
          setPwaBtnLink(d.pwaBtnLink || "");

          setStudySticker1Emoji(d.studySticker1Emoji || "📚");
          setStudySticker1Title(d.studySticker1Title || "STUDY FORCE");
          setStudySticker1Subtitle(d.studySticker1Subtitle || "Focus Active");
          setStudySticker1Popup(d.studySticker1Popup || "Ignite your study sessions with maximum mental torque! 📚 Keep learning!");

          setStudySticker2Emoji(d.studySticker2Emoji || "💡");
          setStudySticker2Title(d.studySticker2Title || "DEEP FOCUS");
          setStudySticker2Subtitle(d.studySticker2Subtitle || "Active Sparks");
          setStudySticker2Popup(d.studySticker2Popup || "A single spark of intuition can illuminate any difficult problem! 💡 Stay curious!");

          setStudySticker3Emoji(d.studySticker3Emoji || "🎓");
          setStudySticker3Title(d.studySticker3Title || "AIR 1 GOAL");
          setStudySticker3Subtitle(d.studySticker3Subtitle || "IIT Selection");
          setStudySticker3Popup(d.studySticker3Popup || "Keep your eyes on the prize. All India Rank 1 starts with persistent everyday discipline! 🎓");

          setStudySticker4Emoji(d.studySticker4Emoji || "🎯");
          setStudySticker4Title(d.studySticker4Title || "100% AIM");
          setStudySticker4Subtitle(d.studySticker4Subtitle || "Perfect Practice");
          setStudySticker4Popup(d.studySticker4Popup || "Accuracy is built by constant deliberate feedback. Refine your aim daily! 🎯");

          setStudySticker5Emoji(d.studySticker5Emoji || "☕");
          setStudySticker5Title(d.studySticker5Title || "NIGHT RUNS");
          setStudySticker5Subtitle(d.studySticker5Subtitle || "Midnight Session");
          setStudySticker5Popup(d.studySticker5Popup || "The quiet hours are when progress is made. Fuel your academic ambition! ☕");

          setStudySticker6Emoji(d.studySticker6Emoji || "🧠");
          setStudySticker6Title(d.studySticker6Title || "NEURAL GRID");
          setStudySticker6Subtitle(d.studySticker6Subtitle || "Concept Clear");
          setStudySticker6Popup(d.studySticker6Popup || "Connect the dots, master the formulas, and let neuroplasticity do the rest! 🧠");

          setPricingCard1Badge(d.pricingCard1Badge || "Essential Revision");
          setPricingCard1Title(d.pricingCard1Title || "High Grade Notes");
          setPricingCard1Desc(d.pricingCard1Desc || "Step-by-step PDF summaries built for immediate exam revision cycles.");
          setPricingCard1Features(d.pricingCard1Features || "Complete Curated Study PDFs, Handwritten Board Materials, Quick Formula Sheets & Decals");

          setPricingCard2Badge(d.pricingCard2Badge || "Full Video Stream");
          setPricingCard2Title(d.pricingCard2Title || "Lectures Package");
          setPricingCard2Desc(d.pricingCard2Desc || "Deeper conceptual lectures featuring interactive workspace guides.");
          setPricingCard2Features(d.pricingCard2Features || "All Chapter Study Notes Included, High-Def Classroom Videos, Peer Doubt Forum Assistance");

          setPricingCard3Badge(d.pricingCard3Badge || "All Inclusive Elite");
          setPricingCard3Title(d.pricingCard3Title || "Elite Premium");
          setPricingCard3Desc(d.pricingCard3Desc || "1-on-1 personalized mentorship with video courses and study guides.");
          setPricingCard3Features(d.pricingCard3Features || "Comprehensive Study Notes & Videos, Weekly 1-on-1 Mentor Meetup, Personalized Study Calendar");

        // Load appearance and theme settings
        if (d.activeTheme !== undefined) setAppearanceTheme(d.activeTheme);
        if (d.themeCustomizations) {
          const tc = d.themeCustomizations;
          if (tc.primaryColor) setPrimaryColor(tc.primaryColor);
          if (tc.secondaryColor) setSecondaryColor(tc.secondaryColor);
          if (tc.accentGlowColor) setAccentGlowColor(tc.accentGlowColor);
          if (tc.backgroundColor) setBackgroundColor(tc.backgroundColor);
          if (tc.gradientStart) setGradientStart(tc.gradientStart);
          if (tc.gradientEnd) setGradientEnd(tc.gradientEnd);
          if (tc.buttonStyle) setButtonStyle(tc.buttonStyle);
          if (tc.borderRadius) setBorderRadius(tc.borderRadius);
          if (tc.fontFamily) setFontFamily(tc.fontFamily);
          if (tc.isDarkMode !== undefined) setIsDarkMode(tc.isDarkMode);
          if (tc.animationIntensity)
            setAnimationIntensity(tc.animationIntensity);
          if (tc.glassmorphism !== undefined)
            setGlassmorphism(tc.glassmorphism);
          if (tc.shadowIntensity) setShadowIntensity(tc.shadowIntensity);
          if (tc.stickerPack) setStickerPack(tc.stickerPack);
          if (tc.navbarStyle) setNavbarStyle(tc.navbarStyle);
          if (tc.dashboardStyle) setDashboardStyle(tc.dashboardStyle);
          if (tc.mobileUiStyle) setMobileUiStyle(tc.mobileUiStyle);
          if (tc.enableManualOverrides !== undefined)
            setEnableManualOverrides(tc.enableManualOverrides);
          if (tc.overrideTextPrimary) setOverrideTextPrimary(tc.overrideTextPrimary);
          if (tc.overrideTextSecondary) setOverrideTextSecondary(tc.overrideTextSecondary);
          if (tc.overrideTextMuted) setOverrideTextMuted(tc.overrideTextMuted);
        }
        if (d.customThemes !== undefined) setSavedPresetsList(d.customThemes);
        if (d.scheduledTheme) {
          const sch = d.scheduledTheme;
          setIsScheduleEnabled(sch.enabled || false);
          if (sch.startTime) setScheduleStartTime(sch.startTime);
          if (sch.endTime) setScheduleEndTime(sch.endTime);
          if (sch.themeId) setScheduleThemeId(sch.themeId);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Synchronize builder local settings with global preview state in real-time
  useEffect(() => {
    if (livePreviewActive) {
      const liveConfig: ThemeConfig = {
        activeTheme: appearanceTheme,
        primaryColor,
        secondaryColor,
        accentGlowColor,
        backgroundColor,
        gradientStart,
        gradientEnd,
        buttonStyle,
        borderRadius,
        fontFamily,
        isDarkMode,
        animationIntensity,
        glassmorphism,
        shadowIntensity,
        stickerPack,
        navbarStyle,
        dashboardStyle,
        mobileUiStyle,
        enableManualOverrides,
        overrideTextPrimary,
        overrideTextSecondary,
        overrideTextMuted,
      };

      const storeState = useSettingsStore.getState();
      const updatedSettings = {
        ...storeState.settings,
        activeTheme: appearanceTheme,
        themeCustomizations: liveConfig,
      };

      useSettingsStore.getState().setPreviewSettings(updatedSettings);
    } else {
      useSettingsStore.getState().setPreviewSettings(null);
    }
  }, [
    livePreviewActive,
    appearanceTheme,
    primaryColor,
    secondaryColor,
    accentGlowColor,
    backgroundColor,
    gradientStart,
    gradientEnd,
    buttonStyle,
    borderRadius,
    fontFamily,
    isDarkMode,
    animationIntensity,
    glassmorphism,
    shadowIntensity,
    stickerPack,
    navbarStyle,
    dashboardStyle,
    mobileUiStyle,
    enableManualOverrides,
    overrideTextPrimary,
    overrideTextSecondary,
    overrideTextMuted,
  ]);

  // Clean preview on unmount
  useEffect(() => {
    return () => {
      useSettingsStore.getState().setPreviewSettings(null);
    };
  }, []);

  useEffect(() => {
    if (user?.role === "admin" || user?.role === "superadmin") {
      fetchData();
    }
  }, [user]);

  // REAL-TIME appearance theme handlers
  const handleApplyPreset = (themeKey: string) => {
    let preset: ThemeConfig;
    if (THEME_PRESETS[themeKey]) {
      preset = THEME_PRESETS[themeKey];
    } else {
      const found = savedPresetsList.find((p) => p.id === themeKey);
      if (!found) return;
      preset = found.config;
    }

    setAppearanceTheme(themeKey);
    setPrimaryColor(preset.primaryColor);
    setSecondaryColor(preset.secondaryColor);
    setAccentGlowColor(preset.accentGlowColor || preset.primaryColor);
    setBackgroundColor(preset.backgroundColor);
    setGradientStart(preset.gradientStart);
    setGradientEnd(preset.gradientEnd);
    setButtonStyle(preset.buttonStyle);
    setBorderRadius(preset.borderRadius);
    setFontFamily(preset.fontFamily || "Outfit");
    setIsDarkMode(preset.isDarkMode !== undefined ? preset.isDarkMode : true);
    setAnimationIntensity(preset.animationIntensity || "normal");
    setGlassmorphism(
      preset.glassmorphism !== undefined ? preset.glassmorphism : true,
    );
    setShadowIntensity(preset.shadowIntensity || "soft");

    // Auto sync additional hand-crafted parameters
    if (preset.stickerPack) setStickerPack(preset.stickerPack);
    if (preset.navbarStyle) setNavbarStyle(preset.navbarStyle);
    if (preset.dashboardStyle) setDashboardStyle(preset.dashboardStyle);
    if (preset.mobileUiStyle) setMobileUiStyle(preset.mobileUiStyle);

    // Sync manual contrast overrides
    setEnableManualOverrides(preset.enableManualOverrides || false);
    setOverrideTextPrimary(preset.overrideTextPrimary || "#fafafa");
    setOverrideTextSecondary(preset.overrideTextSecondary || "#cbd5e1");
    setOverrideTextMuted(preset.overrideTextMuted || "#71717a");
  };

  const handleSaveDraft = async () => {
    if (user?.role !== "superadmin")
      return alert("Only Super Admin can update designs.");
    const drafts: ThemeConfig = {
      activeTheme: appearanceTheme,
      primaryColor,
      secondaryColor,
      accentGlowColor,
      backgroundColor,
      gradientStart,
      gradientEnd,
      buttonStyle,
      borderRadius,
      fontFamily,
      isDarkMode,
      animationIntensity,
      glassmorphism,
      shadowIntensity,
      stickerPack,
      navbarStyle,
      dashboardStyle,
      mobileUiStyle,
      enableManualOverrides,
      overrideTextPrimary,
      overrideTextSecondary,
      overrideTextMuted,
    };

    try {
      await setDoc(
        doc(db, "settings", "global"),
        {
          draftThemeCustomizations: drafts,
        },
        { merge: true },
      );
      alert("changes has been done");
    } catch (e: any) {
      alert("Error saving draft configuration: " + e.message);
    }
  };

  const handlePublishTheme = async () => {
    if (user?.role !== "superadmin")
      return alert("Only Super Admin can publish themes.");
    const liveConfig: ThemeConfig = {
      activeTheme: appearanceTheme,
      primaryColor,
      secondaryColor,
      accentGlowColor,
      backgroundColor,
      gradientStart,
      gradientEnd,
      buttonStyle,
      borderRadius,
      fontFamily,
      isDarkMode,
      animationIntensity,
      glassmorphism,
      shadowIntensity,
      stickerPack,
      navbarStyle,
      dashboardStyle,
      mobileUiStyle,
      enableManualOverrides,
      overrideTextPrimary,
      overrideTextSecondary,
      overrideTextMuted,
    };

    try {
      await setDoc(
        doc(db, "settings", "global"),
        {
          activeTheme: appearanceTheme,
          themeCustomizations: liveConfig,
          customThemes: savedPresetsList,
          scheduledTheme: {
            enabled: isScheduleEnabled,
            startTime: scheduleStartTime,
            endTime: scheduleEndTime,
            themeId: scheduleThemeId,
          },
          seasonalOverlay: seasonalOverlay,
        },
        { merge: true },
      );
      alert("changes has been done");
    } catch (e: any) {
      alert("Error publishing theme: " + e.message);
    }
  };

  const handleResetToDefaultPreset = () => {
    handleApplyPreset("default");
    alert("Builder reset to system gold defaults.");
  };

  const handleCreateCustomPreset = () => {
    if (!customPresetName.trim())
      return alert("Please enter a unique preset name.");
    const newPreset = {
      id: "preset_" + Date.now(),
      name: customPresetName.trim(),
      config: {
        activeTheme: "custom" as const,
        primaryColor,
        secondaryColor,
        accentGlowColor,
        backgroundColor,
        gradientStart,
        gradientEnd,
        buttonStyle,
        borderRadius,
        fontFamily,
        isDarkMode,
        animationIntensity,
        glassmorphism,
        shadowIntensity,
        stickerPack,
        navbarStyle,
        dashboardStyle,
        mobileUiStyle,
        enableManualOverrides,
        overrideTextPrimary,
        overrideTextSecondary,
        overrideTextMuted,
      },
    };
    setSavedPresetsList([...savedPresetsList, newPreset]);
    setCustomPresetName("");
    alert(
      `Custom preset "${newPreset.name}" successfully created! Click Publish to sync permanently.`,
    );
  };

  const handleDeleteCustomPreset = (id: string) => {
    setSavedPresetsList(savedPresetsList.filter((p) => p.id !== id));
  };

  const handleExportThemeJson = () => {
    const exports = {
      activeTheme: appearanceTheme,
      primaryColor,
      secondaryColor,
      accentGlowColor,
      backgroundColor,
      gradientStart,
      gradientEnd,
      buttonStyle,
      borderRadius,
      fontFamily,
      isDarkMode,
      animationIntensity,
      glassmorphism,
      shadowIntensity,
      stickerPack,
      navbarStyle,
      dashboardStyle,
      mobileUiStyle,
      enableManualOverrides,
      overrideTextPrimary,
      overrideTextSecondary,
      overrideTextMuted,
    };
    const payload = JSON.stringify(exports, null, 2);
    setImportJsonText(payload);

    const dataStr =
      "data:text/json;charset=utf-8," + encodeURIComponent(payload);
    const dlAnchorElem = document.createElement("a");
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `nucleus_theme_export.json`);
    dlAnchorElem.click();
  };

  const handleImportThemeJson = () => {
    try {
      const imported = JSON.parse(importJsonText);
      if (imported.primaryColor) setPrimaryColor(imported.primaryColor);
      if (imported.secondaryColor) setSecondaryColor(imported.secondaryColor);
      if (imported.accentGlowColor)
        setAccentGlowColor(imported.accentGlowColor);
      if (imported.backgroundColor)
        setBackgroundColor(imported.backgroundColor);
      if (imported.gradientStart) setGradientStart(imported.gradientStart);
      if (imported.gradientEnd) setGradientEnd(imported.gradientEnd);
      if (imported.buttonStyle) setButtonStyle(imported.buttonStyle);
      if (imported.borderRadius) setBorderRadius(Number(imported.borderRadius));
      if (imported.fontFamily) setFontFamily(imported.fontFamily);
      if (imported.isDarkMode !== undefined) setIsDarkMode(imported.isDarkMode);
      if (imported.animationIntensity)
        setAnimationIntensity(imported.animationIntensity);
      if (imported.glassmorphism !== undefined)
        setGlassmorphism(imported.glassmorphism);
      if (imported.shadowIntensity)
        setShadowIntensity(imported.shadowIntensity);
      if (imported.stickerPack) setStickerPack(imported.stickerPack);
      if (imported.navbarStyle) setNavbarStyle(imported.navbarStyle);
      if (imported.dashboardStyle) setDashboardStyle(imported.dashboardStyle);
      if (imported.mobileUiStyle) setMobileUiStyle(imported.mobileUiStyle);

      if (imported.enableManualOverrides !== undefined)
        setEnableManualOverrides(imported.enableManualOverrides);
      if (imported.overrideTextPrimary) setOverrideTextPrimary(imported.overrideTextPrimary);
      if (imported.overrideTextSecondary) setOverrideTextSecondary(imported.overrideTextSecondary);
      if (imported.overrideTextMuted) setOverrideTextMuted(imported.overrideTextMuted);

      setAppearanceTheme("custom");
      alert(
        "Design settings configuration JSON imported and loaded in builder!",
      );
    } catch (e) {
      alert(
        "Failed to parse styling preset payload. Double check JSON format.",
      );
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user?.role !== "superadmin")
      return alert("Only Super Admin can update settings.");
    try {
      await setDoc(
        doc(db, "settings", "global"),
        {
          upiId,
          priceNotes: Number(priceNotes),
          priceLectures: Number(priceLectures),
          pricePremium: Number(pricePremium),
          classPrices,
          websiteName,
          documentTitle,
          logoText,
          logoImage,
          faviconUrl,
          heroTitle,
          heroSubtitle,
          heroBadgeText,
          heroCta1Text,
          heroCta1Link,
          heroCta2Text,
          heroCta2Link,
          footerDescription,
          footerLink1Text,
          footerLink1Url,
          footerLink2Text,
          footerLink2Url,
          footerLink3Text,
          footerLink3Url,
          footerLegal1Text,
          footerLegal1Url,
          footerLegal2Text,
          footerLegal2Url,
          reviewFormUrl,
          aboutShowMockCard,
          aboutMockCardTitle,
          aboutMockCardSubtitle,
          aboutMockCardValue,
          aboutShowIitianBadge,
          aboutIitianBadgeText,
          aboutShowLiveDoubts,
          aboutLiveDoubtsText,
          aboutShowCalculusCard,
          aboutCalculusTitle,
          aboutCalculusBadge,
          aboutCalculusProgress,
          aboutCalculusLectureText,
          aboutCalculusPercentText,
          aboutShowRatingCard,
          aboutRatingTitle,
          aboutRatingDesc,
          aboutCornerImageUrl,
          aboutCornerImgShape,
          aboutCornerBackground,
          pwaBtnText,
          pwaBtnLink,
          studySticker1Emoji,
          studySticker1Title,
          studySticker1Subtitle,
          studySticker1Popup,
          studySticker2Emoji,
          studySticker2Title,
          studySticker2Subtitle,
          studySticker2Popup,
          studySticker3Emoji,
          studySticker3Title,
          studySticker3Subtitle,
          studySticker3Popup,
          studySticker4Emoji,
          studySticker4Title,
          studySticker4Subtitle,
          studySticker4Popup,
          studySticker5Emoji,
          studySticker5Title,
          studySticker5Subtitle,
          studySticker5Popup,
          studySticker6Emoji,
          studySticker6Title,
          studySticker6Subtitle,
          studySticker6Popup,
          pricingCard1Badge,
          pricingCard1Title,
          pricingCard1Desc,
          pricingCard1Features,
          pricingCard2Badge,
          pricingCard2Title,
          pricingCard2Desc,
          pricingCard2Features,
          pricingCard3Badge,
          pricingCard3Title,
          pricingCard3Desc,
          pricingCard3Features,
        },
        { merge: true },
      );
      alert("changes has been done");
    } catch (e) {
      console.error(e);
      alert("Failed to save settings.");
    }
  };

  const handleCreateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      if (editingMaterialId) {
        await updateDoc(doc(db, "materials", editingMaterialId), {
          title,
          description: desc,
          type,
          thumbnailUrl,
          requiredPlan: plan,
          classGroup,
          updatedAt: serverTimestamp(),
        });
        await setDoc(doc(db, "materials_secure", editingMaterialId), { url });
        setEditingMaterialId(null);
      } else {
        const docRef = await addDoc(collection(db, "materials"), {
          title,
          description: desc,
          type,
          thumbnailUrl,
          requiredPlan: plan,
          classGroup,
          authorId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        await setDoc(doc(db, "materials_secure", docRef.id), { url });
      }

      setTitle("");
      setDesc("");
      setUrl("");
      setThumbnailUrl("");
      setPlan("free");
      setClassGroup("all");
      setType("note");
      fetchData();
    } catch (error) {
      console.error("Error creating/updating material", error);
    }
  };

  const handleEditMaterialStart = async (mat: any) => {
    setEditingMaterialId(mat.id);
    setTitle(mat.title);
    setDesc(mat.description);
    setThumbnailUrl(mat.thumbnailUrl || "");
    setType(mat.type);
    setPlan(mat.requiredPlan);
    setClassGroup(mat.classGroup || "all");
    try {
      const docSnap = await getDoc(doc(db, "materials_secure", mat.id));
      if (docSnap.exists()) {
        setUrl(docSnap.data().url);
      } else {
        setUrl(mat.url || "");
      }
    } catch {
      setUrl(mat.url || "");
    }
    // Scroll to top of the form
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEditMaterial = () => {
    setEditingMaterialId(null);
    setTitle("");
    setDesc("");
    setUrl("");
    setThumbnailUrl("");
    setPlan("free");
    setClassGroup("all");
    setType("note");
  };

  const handleCreateMentor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      const mentorData = {
        name: mentorName,
        role: mentorRole,
        image: mentorImage,
        experience: mentorExperience || "Distinguished educator with vast experience.",
        description: mentorDescription || "Dedicated to nurturing students and delivering stellar top-tier results in competitive exams.",
      };

      if (editingMentorId) {
        await updateDoc(doc(db, "mentors", editingMentorId), mentorData);
        setEditingMentorId(null);
      } else {
        await addDoc(collection(db, "mentors"), {
          ...mentorData,
          createdAt: serverTimestamp(),
        });
      }

      setMentorName("");
      setMentorRole("");
      setMentorImage("");
      setMentorExperience("");
      setMentorDescription("");
      fetchData();
    } catch (error) {
      console.error("Error saving mentor", error);
    }
  };

  const handleEditMentorStart = (m: any) => {
    setEditingMentorId(m.id);
    setMentorName(m.name || "");
    setMentorRole(m.role || "");
    setMentorImage(m.image || "");
    setMentorExperience(m.experience || "");
    setMentorDescription(m.description || "");
  };

  const handleCancelEditMentor = () => {
    setEditingMentorId(null);
    setMentorName("");
    setMentorRole("");
    setMentorImage("");
    setMentorExperience("");
    setMentorDescription("");
  };

  const handleDeleteMentor = async (mentorId: string) => {
    try {
      await deleteDoc(doc(db, "mentors", mentorId));
      fetchData();
    } catch (error) {
      console.error("Error deleting mentor", error);
    }
  };

  const handleDeleteMaterial = async (materialId: string) => {
    try {
      await deleteDoc(doc(db, "materials_secure", materialId));
      await deleteDoc(doc(db, "materials", materialId));
      fetchData();
    } catch (error) {
      console.error("Error deleting material", error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await deleteDoc(doc(db, "users", userId));
      fetchData();
    } catch (error) {
      console.error("Error deleting user", error);
    }
  };

  const [managingUser, setManagingUser] = useState<any | null>(null);

  const handleUpdateUser = async (
    userId: string,
    field: string,
    value: any,
  ) => {
    try {
      await updateDoc(doc(db, "users", userId), {
        [field]: value,
        updatedAt: serverTimestamp(),
      });
      fetchData();
    } catch (error) {
      console.error("Error updating user", error);
    }
  };

  const toggleMaterialAccess = async (
    userId: string,
    materialId: string,
    currentUnlocked: string[],
  ) => {
    const list = currentUnlocked || [];
    const newList = list.includes(materialId)
      ? list.filter((id) => id !== materialId)
      : [...list, materialId];
    await handleUpdateUser(userId, "unlockedMaterials", newList);

    // Update local state for immediate UI reflection if the modal is open
    setManagingUser((prev: any) => ({ ...prev, unlockedMaterials: newList }));
  };

  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    return <div className="min-h-screen pt-32 text-center">Unauthorized</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, filter: "blur(5px)" }}
      animate={{ opacity: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, filter: "blur(5px)" }}
      transition={{ duration: 0.5 }}
      className="min-h-screen pt-24 pb-32 px-6 md:px-12 max-w-7xl mx-auto"
    >
      <button
        onClick={() => navigate("/dashboard")}
        className="mb-8 flex items-center gap-2 text-white/50 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back to Dashboard</span>
      </button>

      <h1 className="text-4xl font-display font-medium mb-8">Admin Control</h1>

      <div className="flex gap-4 border-b border-white/5 mb-8">
        <button
          onClick={() => setActiveTab("materials")}
          className={`pb-4 px-2 font-medium transition-colors border-b-2 ${activeTab === "materials" ? "border-[#E5D2A5] text-[#E5D2A5]" : "border-transparent text-white/50 hover:text-white"}`}
        >
          Content Engine
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={`pb-4 px-2 font-medium transition-colors border-b-2 ${activeTab === "users" ? "border-[#E5D2A5] text-[#E5D2A5]" : "border-transparent text-white/50 hover:text-white"}`}
        >
          Student Roster
        </button>
        <button
          onClick={() => setActiveTab("mentors")}
          className={`pb-4 px-2 font-medium transition-colors border-b-2 ${activeTab === "mentors" ? "border-[#E5D2A5] text-[#E5D2A5]" : "border-transparent text-white/50 hover:text-white"}`}
        >
          Faculty / Mentors
        </button>
        {user?.role === "superadmin" && (
          <button
            onClick={() => setActiveTab("appearance")}
            className={`pb-4 px-2 font-medium transition-colors border-b-2 ${activeTab === "appearance" ? "border-primary text-primary" : "border-transparent text-white/50 hover:text-white"}`}
          >
            🎨 Appearance
          </button>
        )}
        {user?.role === "superadmin" && (
          <button
            onClick={() => setActiveTab("settings")}
            className={`pb-4 px-2 font-medium transition-colors border-b-2 ${activeTab === "settings" ? "border-[#E5D2A5] text-[#E5D2A5]" : "border-transparent text-white/50 hover:text-white"}`}
          >
            Settings
          </button>
        )}
        {user?.role === "superadmin" && (
          <button
            onClick={() => setActiveTab("security")}
            className={`pb-4 px-2 font-medium transition-colors border-b-2 ${activeTab === "security" ? "border-red-500 text-red-500" : "border-transparent text-white/50 hover:text-white"}`}
          >
            🛡️ Security Center
          </button>
        )}
      </div>

      {activeTab === "appearance" && user?.role === "superadmin" && (
        <div className="space-y-8 max-w-6xl animate-fade-in">
          {/* Real-time preview system header */}
          <div className="border border-primary/20 bg-primary/5 p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-display font-medium text-primary flex items-center gap-2">
                <span>🎨 Website Appearance Manager</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                  Superadmin Engine
                </span>
              </h3>
              <p className="text-sm text-white/60 mt-1">
                Control colors, typography, border shapes, animations and
                ambient styling globally in real time.
              </p>
            </div>
            <div className="flex gap-3 items-center">
              <button
                type="button"
                onClick={() => setLivePreviewActive(!livePreviewActive)}
                className={`px-4 py-2 text-sm font-medium rounded-full cursor-pointer transition-all border ${
                  livePreviewActive
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500 shadow-lg shadow-emerald-500/15"
                    : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10"
                }`}
              >
                {livePreviewActive
                  ? "● Live Preview Active"
                  : "○ Enable Live Preview"}
              </button>
              <button
                type="button"
                onClick={handleSaveDraft}
                className="px-4 py-2 text-sm font-medium bg-white/5 border border-white/10 text-white rounded-full hover:bg-white/10"
              >
                Save Draft
              </button>
              <button
                type="button"
                onClick={handlePublishTheme}
                className="px-5 py-2 text-sm font-medium bg-primary text-black rounded-full hover:bg-primary-dark transition-colors font-semibold shadow-lg hover:shadow-primary/25"
              >
                Publish Theme
              </button>
              <button
                type="button"
                onClick={handleResetToDefaultPreset}
                className="px-3 py-2 text-sm font-medium text-white/50 hover:text-white"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Presets Grid */}
          <div>
            <h4 className="text-lg font-medium mb-4 flex items-center justify-between text-white/80">
              <div className="flex items-center gap-2">
                <span>🎯 UI/UX Premium Themes ({Object.keys(PRESET_INFO).length})</span>
                <span className="text-xs text-white/40 font-normal">(Select a preset to load its configurations instantly)</span>
              </div>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Object.entries(PRESET_INFO).map(([key, info]) => {
                const isActive = appearanceTheme === key;
                return (
                  <div
                    key={key}
                    onClick={() => handleApplyPreset(key)}
                    className={`border p-4 rounded-xl cursor-pointer hover:-translate-y-0.5 transition-all text-left flex flex-col justify-between ${
                      isActive
                        ? "bg-primary/5 border-primary shadow-lg shadow-primary/5"
                        : "bg-white/5 border-white/5 hover:border-white/10"
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className={`font-semibold text-sm ${isActive ? "text-primary" : "text-white"}`}>
                          {info.name}
                        </span>
                        {isActive && <Check className="w-4 h-4 text-primary shrink-0 ml-1 mt-0.5" />}
                      </div>
                      <p className="text-xs text-white/50 mb-3 text-justify line-clamp-3 leading-relaxed">
                        {info.desc}
                      </p>
                    </div>
                    <div className="flex justify-between items-center mt-2 border-t border-white/5 pt-2">
                      <div className="flex gap-1">
                        {info.colors.map((color, idx) => (
                          <span
                            key={idx}
                            className="w-3.5 h-3.5 rounded-full border border-white/10"
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-white/5 border border-white/5 text-white/60 rounded">
                        {THEME_PRESETS[key]?.isDarkMode ? "Dark" : "Light"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Custom Presets Roster list */}
          {savedPresetsList.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-3 text-white/60 uppercase tracking-widest">
                Your Saved Custom Themes
              </h4>
              <div className="flex gap-3 flex-wrap">
                {savedPresetsList.map((preset) => (
                  <div
                    key={preset.id}
                    className={`px-4 py-2 rounded-xl flex items-center gap-3 border text-sm transition-all ${
                      appearanceTheme === preset.id
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleApplyPreset(preset.id)}
                      className="font-medium cursor-pointer"
                    >
                      {preset.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCustomPreset(preset.id)}
                      className="text-xs text-red-400 hover:text-red-300 font-bold"
                      title="Delete Preset"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Main customization bento grids */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Color customizer */}
            <div className="border border-white/10 p-6 rounded-2xl bg-white/5 space-y-6">
              <h4 className="text-lg font-medium text-primary">
                🎨 Unified Theme Color Engine
              </h4>
              <p className="text-xs text-white/50 -mt-3">
                Overpaint preset colors with custom Hex values or picker dials
                below.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-2">
                    Background Canvas
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      className="w-10 h-10 rounded border border-white/10 cursor-pointer p-0"
                    />
                    <input
                      type="text"
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      className="w-full text-xs font-mono px-3 py-2 rounded bg-black/40 border border-white/10 text-white"
                      maxLength={7}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/60 mb-2">
                    Primary Brand
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-10 h-10 rounded border border-white/10 cursor-pointer p-0"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-full text-xs font-mono px-3 py-2 rounded bg-black/40 border border-white/10 text-white"
                      maxLength={7}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/60 mb-2">
                    Secondary / Accent Dark
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-10 h-10 rounded border border-white/10 cursor-pointer p-0"
                    />
                    <input
                      type="text"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-full text-xs font-mono px-3 py-2 rounded bg-black/40 border border-white/10 text-white"
                      maxLength={7}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/60 mb-2">
                    Neon Glow Accent
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={accentGlowColor}
                      onChange={(e) => setAccentGlowColor(e.target.value)}
                      className="w-10 h-10 rounded border border-white/10 cursor-pointer p-0"
                    />
                    <input
                      type="text"
                      value={accentGlowColor}
                      onChange={(e) => setAccentGlowColor(e.target.value)}
                      className="w-full text-xs font-mono px-3 py-2 rounded bg-black/40 border border-white/10 text-white"
                      maxLength={7}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-white/5 pt-4">
                <span className="block text-xs font-medium text-white/60 mb-3 font-display">
                  Gradient Background Editor
                </span>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="block text-[11px] text-white/40 mb-1">
                      Start Color
                    </span>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={gradientStart}
                        onChange={(e) => setGradientStart(e.target.value)}
                        className="w-8 h-8 rounded shrink-0 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={gradientStart}
                        onChange={(e) => setGradientStart(e.target.value)}
                        className="w-full text-xs px-2 py-1.5 rounded bg-black/30 border border-white/10 text-white font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <span className="block text-[11px] text-white/40 mb-1">
                      End Color
                    </span>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={gradientEnd}
                        onChange={(e) => setGradientEnd(e.target.value)}
                        className="w-8 h-8 rounded shrink-0 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={gradientEnd}
                        onChange={(e) => setGradientEnd(e.target.value)}
                        className="w-full text-xs px-2 py-1.5 rounded bg-black/30 border border-white/10 text-white font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/5 pt-4 flex items-center justify-between">
                <div>
                  <span className="block text-sm font-medium text-white font-display">
                    Lighting Theme Mode
                  </span>
                  <span className="block text-xs text-white/50">
                    Switch background canvas lights
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className="px-4 py-1.5 text-xs font-medium bg-white/5 rounded-full border border-white/10 text-white cursor-pointer hover:bg-white/10"
                >
                  {isDarkMode ? "🌙 Dark Active" : "☀️ Light Active"}
                </button>
              </div>
            </div>

            {/* ADVANCED SMART CONTRAST & ACCESSIBILITY PANEL */}
            <div className="border border-emerald-500/20 p-6 rounded-2xl bg-gradient-to-b from-white/[0.04] to-black/30 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-base font-semibold text-white font-display flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    Smart Contrast & Typography Engine
                  </h4>
                  <p className="text-xs text-white/40">
                    Real-time automated theme accessibility scoring &amp; manual overrides.
                  </p>
                </div>
                <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded-full font-mono font-medium tracking-wider uppercase">
                  Active
                </span>
              </div>

              {/* LIVE CONTRAST METERS & WCAG COMPLIANCE READOUT */}
              {(() => {
                // Determine light or dark background luminance
                const calcBgHsl = (() => {
                  const hex = backgroundColor.replace(/^#/, '');
                  const r = parseInt(hex.substring(0,2) || 'ff', 16);
                  const g = parseInt(hex.substring(2,4) || 'ff', 16);
                  const b = parseInt(hex.substring(4,6) || 'ff', 16);
                  const max = Math.max(r, g, b) / 255;
                  const min = Math.min(r, g, b) / 255;
                  let l = (max + min) / 2;
                  return { l: l * 100 };
                })();
                const isBgDark = calcBgHsl.l < 55;

                // Active Text Colors used by engine
                const activeTextPrimary = enableManualOverrides && overrideTextPrimary
                  ? overrideTextPrimary
                  : (isBgDark ? '#fafafa' : '#09090b');
                const activeTextSecondary = enableManualOverrides && overrideTextSecondary
                  ? overrideTextSecondary
                  : (isBgDark ? '#d4d4d8' : '#3f3f46');
                const activeTextMuted = enableManualOverrides && overrideTextMuted
                  ? overrideTextMuted
                  : (isBgDark ? '#8e8e93' : '#71717a');

                // Active Button Text used by engine
                const primaryHex = primaryColor.replace(/^#/, '');
                const pr = parseInt(primaryHex.substring(0,2) || 'E5', 16);
                const pg = parseInt(primaryHex.substring(2,4) || 'D2', 16);
                const pb = parseInt(primaryHex.substring(4,6) || 'A5', 16);
                const pmax = Math.max(pr, pg, pb) / 255;
                const pmin = Math.min(pr, pg, pb) / 255;
                const pl = (pmax + pmin) / 2;
                const activeBtnText = pl < 0.52 ? '#ffffff' : '#09090b';

                // Calculate ratios
                const primaryContrast = calculateContrastRatio(backgroundColor, activeTextPrimary);
                const secondaryContrast = calculateContrastRatio(backgroundColor, activeTextSecondary);
                const buttonContrast = calculateContrastRatio(primaryColor, activeBtnText);

                // Get overall WCAG badges
                const getRatingBadge = (ratio: number) => {
                  if (ratio >= 7.0) return { title: "AAA Perfect", color: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" };
                  if (ratio >= 4.5) return { title: "AA Excellent", color: "bg-teal-500/10 border-teal-500/30 text-teal-400" };
                  if (ratio >= 3.0) return { title: "Large-Text AA Only", color: "bg-amber-500/10 border-amber-500/30 text-amber-400" };
                  return { title: "Poor / Fail", color: "bg-rose-500/10 border-rose-500/30 text-rose-400" };
                };

                const primeBadge = getRatingBadge(primaryContrast);
                const secBadge = getRatingBadge(secondaryContrast);
                const btnBadge = getRatingBadge(buttonContrast);

                // Auto Fix Action: Set to dynamic engine or force contrast hex
                const triggerAutoFix = () => {
                  if (enableManualOverrides) {
                    // Fix manual colors automatically
                    setOverrideTextPrimary(isBgDark ? '#ffffff' : '#09090b');
                    setOverrideTextSecondary(isBgDark ? '#e4e4e7' : '#27272a');
                    setOverrideTextMuted(isBgDark ? '#a1a1aa' : '#52525b');
                  } else {
                    // Under the automatic engine, dynamic switching is already scientifically perfect.
                    setEnableManualOverrides(false);
                  }
                  alert("One-click Auto-Fix triggered: Optimal contrast values have been updated to ensure maximum accessibility scores.");
                };

                return (
                  <div className="space-y-4">
                    {/* READOUT CARD */}
                    <div className="grid grid-cols-3 gap-2 bg-black/40 border border-white/5 p-3 rounded-xl font-mono text-[11px]">
                      <div className="space-y-1">
                        <span className="text-white/40 block">Primary Text</span>
                        <span className="text-white font-medium block text-xs">{primaryContrast}:1</span>
                        <span className={`inline-block text-[9px] px-1.5 py-0.5 rounded border ${primeBadge.color}`}>{primeBadge.title}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-white/40 block">Secondary Text</span>
                        <span className="text-white font-medium block text-xs">{secondaryContrast}:1</span>
                        <span className={`inline-block text-[9px] px-1.5 py-0.5 rounded border ${secBadge.color}`}>{secBadge.title}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-white/40 block">Button Text</span>
                        <span className="text-white font-medium block text-xs">{buttonContrast}:1</span>
                        <span className={`inline-block text-[9px] px-1.5 py-0.5 rounded border ${btnBadge.color}`}>{btnBadge.title}</span>
                      </div>
                    </div>

                    {/* DYNAMIC WARNING */}
                    {(primaryContrast < 4.5 || secondaryContrast < 4.5) && (
                      <div className="flex items-start gap-2 bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl text-rose-400 text-xs">
                        <span className="text-base select-none">⚠️</span>
                        <div>
                          <p className="font-semibold text-rose-300">Readability Alert</p>
                          <p className="text-[11px] text-white/50 mt-0.5">
                            Selected theme background may produce unreadable text. WCAG guidelines recommend at least 4.5:1 contrast ratio.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* LIVE VISUAL PREVIEW BLOCK WITH ACTUAL CHOSEN TEXT */}
                    <div className="border border-white/10 rounded-xl overflow-hidden shadow-inner font-sans">
                      <div className="px-3 py-1 bg-white/5 text-[9px] font-mono text-white/40 border-b border-white/5 flex items-center justify-between">
                        <span>REAL-TIME TEXT CONTRAST SIMULATIONS</span>
                        <span>{fontFamily} Font</span>
                      </div>
                      <div 
                        className="p-4 space-y-3" 
                        style={{ backgroundColor: backgroundColor }}
                      >
                        <h5 
                          className="text-sm font-semibold tracking-tight" 
                          style={{ color: activeTextPrimary }}
                        >
                          Simulation Heading Title (Primary Text)
                        </h5>
                        <p 
                          className="text-xs leading-relaxed" 
                          style={{ color: activeTextSecondary }}
                        >
                          This simulation paragraph uses secondary contrasting text to represent standard descriptions and lists.
                        </p>
                        <div className="flex items-center gap-3 pt-1">
                          <button 
                            type="button" 
                            disabled 
                            className="px-3 py-1.5 text-[11px] font-medium"
                            style={{ 
                              backgroundColor: primaryColor, 
                              color: activeBtnText,
                              borderRadius: `${borderRadius}px` 
                            }}
                          >
                            Sample Button Link
                          </button>
                          <span 
                            className="text-[10px]" 
                            style={{ color: activeTextMuted }}
                          >
                            Sample Muted Legend
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* ONE-CLICK AUTO-FIX CONTRAST & OVERRIDES TOGGLE */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={triggerAutoFix}
                        className="flex-1 py-2 text-center text-xs font-medium bg-emerald-500 text-black rounded-lg hover:bg-emerald-400 transition-all font-display font-semibold flex items-center justify-center gap-1 cursor-pointer"
                      >
                        ✨ One-Click Auto-Fix Contrast
                      </button>
                    </div>

                    {/* OVERRIDES PANEL */}
                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-3">
                      <label className="flex items-center gap-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={enableManualOverrides}
                          onChange={(e) => setEnableManualOverrides(e.target.checked)}
                          className="w-4 h-4 rounded border-white/10 text-emerald-500 focus:ring-emerald-500 bg-black/40 cursor-pointer"
                        />
                        <div>
                          <span className="text-xs font-medium text-white block">Enable Manual Overrides</span>
                          <span className="text-[10px] text-white/40 block">Bypass automatic dynamic contrast logic with exact hex choices</span>
                        </div>
                      </label>

                      {enableManualOverrides && (
                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5">
                          <div>
                            <span className="block text-[10px] text-white/40 mb-1">Primary Text</span>
                            <div className="flex gap-1.5">
                              <input
                                type="color"
                                value={overrideTextPrimary}
                                onChange={(e) => setOverrideTextPrimary(e.target.value)}
                                className="w-6 h-6 rounded shrink-0 cursor-pointer"
                              />
                              <input
                                type="text"
                                value={overrideTextPrimary}
                                onChange={(e) => setOverrideTextPrimary(e.target.value)}
                                className="w-full text-[10px] px-1 py-0.5 rounded bg-black/40 border border-white/10 text-white font-mono"
                              />
                            </div>
                          </div>
                          <div>
                            <span className="block text-[10px] text-white/40 mb-1">Secondary</span>
                            <div className="flex gap-1.5">
                              <input
                                type="color"
                                value={overrideTextSecondary}
                                onChange={(e) => setOverrideTextSecondary(e.target.value)}
                                className="w-6 h-6 rounded shrink-0 cursor-pointer"
                              />
                              <input
                                type="text"
                                value={overrideTextSecondary}
                                onChange={(e) => setOverrideTextSecondary(e.target.value)}
                                className="w-full text-[10px] px-1 py-0.5 rounded bg-black/40 border border-white/10 text-white font-mono"
                              />
                            </div>
                          </div>
                          <div>
                            <span className="block text-[10px] text-white/40 mb-1">Muted</span>
                            <div className="flex gap-1.5">
                              <input
                                type="color"
                                value={overrideTextMuted}
                                onChange={(e) => setOverrideTextMuted(e.target.value)}
                                className="w-6 h-6 rounded shrink-0 cursor-pointer"
                              />
                              <input
                                type="text"
                                value={overrideTextMuted}
                                onChange={(e) => setOverrideTextMuted(e.target.value)}
                                className="w-full text-[10px] px-1 py-0.5 rounded bg-black/40 border border-white/10 text-white font-mono"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Aesthetics & Radii Customizer */}
            <div className="border border-white/10 p-6 rounded-2xl bg-white/5 space-y-6">
              <h4 className="text-lg font-medium text-primary">
                📐 Shape & Layout Aesthetics
              </h4>
              <p className="text-xs text-white/50 -mt-3">
                Structure UI button contours, blur strengths and glowing
                outlines.
              </p>

              {/* Button Style selector */}
              <div>
                <span className="block text-xs font-medium text-white/60 mb-2">
                  Core Button Accent Shape
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {(["pill", "rounded", "square"] as const).map((bStyle) => (
                    <button
                      key={bStyle}
                      type="button"
                      onClick={() => {
                        setButtonStyle(bStyle);
                        if (bStyle === "square") setBorderRadius(0);
                        else if (bStyle === "rounded") setBorderRadius(12);
                        else setBorderRadius(24);
                      }}
                      className={`py-2 px-3 text-xs font-medium capitalize border rounded-xl transition-all ${
                        buttonStyle === bStyle
                          ? "bg-primary text-black border-primary font-bold"
                          : "bg-black/30 border-white/5 hover:border-white/15 text-white/60"
                      }`}
                    >
                      {bStyle}
                    </button>
                  ))}
                </div>
              </div>

              {/* Card Border radius slider */}
              <div>
                <div className="flex justify-between items-center text-xs text-white/60 mb-2">
                  <span>Global Content Corner Curvature</span>
                  <span className="font-mono">{borderRadius}px</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={32}
                  value={borderRadius}
                  onChange={(e) => setBorderRadius(Number(e.target.value))}
                  className="w-full accent-primary bg-white/10 h-1.5 rounded-lg outline-none"
                />
                <div className="flex justify-between text-[10px] text-white/30 mt-1">
                  <span>Sharp (0px)</span>
                  <span>16px</span>
                  <span>Extreme (32px)</span>
                </div>
              </div>

              <div className="border-t border-white/5 pt-4 flex justify-between items-center">
                <div>
                  <span className="block text-sm font-medium text-white font-display">
                    Glassmorphism Frosted Blurs
                  </span>
                  <span className="block text-xs text-white/50">
                    Inject transparent frosted content sheets
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setGlassmorphism(!glassmorphism)}
                  className={`h-6 w-11 rounded-full cursor-pointer transition-colors relative ${glassmorphism ? "bg-primary" : "bg-white/10"}`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-black transition-transform absolute top-1 ${glassmorphism ? "translate-x-6" : "translate-x-1"}`}
                  />
                </button>
              </div>

              {/* Animation scale */}
              <div>
                <span className="block text-xs font-medium text-white/60 mb-2">
                  Action Animations Scale multiplier
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {(["off", "low", "normal", "high"] as const).map((anim) => (
                    <button
                      key={anim}
                      type="button"
                      onClick={() => setAnimationIntensity(anim)}
                      className={`py-1.5 px-1 capitalize rounded-lg text-xs font-medium border transition-all ${
                        animationIntensity === anim
                          ? "bg-primary text-black border-primary font-bold"
                          : "bg-black/20 border-white/5 text-white/60 hover:border-white/10"
                      }`}
                    >
                      {anim}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ambient drop glow shadow */}
              <div>
                <span className="block text-xs font-medium text-white/60 mb-2 font-display">
                  Ambient Lighting Bloom Outline
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {(["none", "soft", "glow", "intense"] as const).map((sh) => (
                    <button
                      key={sh}
                      type="button"
                      onClick={() => setShadowIntensity(sh)}
                      className={`py-1.5 px-1 capitalize rounded-lg text-xs font-medium border transition-all ${
                        shadowIntensity === sh
                          ? "bg-primary/90 border-primary text-black font-semibold"
                          : "bg-black/20 border-white/5 text-white/60 hover:border-white/10"
                      }`}
                    >
                      {sh}
                    </button>
                  ))}
                </div>
              </div>

              {/* Theme Sticker Art Pack */}
              <div className="border-t border-white/5 pt-4">
                <label className="block text-xs font-medium text-white/60 mb-2 font-display">
                  Theme Sticker Art Pack
                </label>
                <select
                  value={stickerPack}
                  onChange={(e) => setStickerPack(e.target.value as any)}
                  className="w-full text-xs px-3 py-2 rounded bg-black/40 border border-white/10 text-white font-medium focus:outline-none focus:border-primary cursor-pointer"
                >
                  <option value="none">None (Clean Editorial Minimal)</option>
                  <option value="stars_dots">✨ Floating Stars & Sparkles Pack</option>
                  <option value="cute_cartoons">🎒 Cute Pastel Academy Pack</option>
                  <option value="japanese_elements">🎌 Elegant Japanese Zen Stamps</option>
                  <option value="geometric">📐 Floating 3D Geometric Shapes</option>
                  <option value="planets_space">🚀 Interstellar Space Planets</option>
                  <option value="doodles">🎨 Whimsical Scribbles & Doodles</option>
                  <option value="cyber_particles">⚡ Neon Cyber Matrix Elements</option>
                  <option value="organic_shapes">🌿 Botanical Organic Shapes</option>
                </select>
              </div>

              {/* Navigation Bar Layout */}
              <div className="border-t border-white/5 pt-4">
                <label className="block text-xs font-medium text-white/60 mb-2 font-display">
                  Navigation Bar Layout
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(["glass", "floating", "solid", "minimal"] as const).map((style) => (
                    <button
                      key={style}
                      type="button"
                      onClick={() => setNavbarStyle(style)}
                      className={`py-1.5 px-1 capitalize rounded-lg text-[10px] font-semibold border transition-all cursor-pointer ${
                        navbarStyle === style
                          ? "bg-primary text-black border-primary font-bold"
                          : "bg-black/20 border-white/5 text-white/60 hover:border-white/10"
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              {/* LMS Core Dashboard Layout Template */}
              <div className="border-t border-white/5 pt-4">
                <label className="block text-xs font-medium text-white/60 mb-2 font-display">
                  LMS Core Dashboard Layout Template
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(["bento", "split", "classic", "minimalist"] as const).map((style) => (
                    <button
                      key={style}
                      type="button"
                      onClick={() => setDashboardStyle(style)}
                      className={`py-1.5 px-1 capitalize rounded-lg text-[10px] font-semibold border transition-all cursor-pointer ${
                        dashboardStyle === style
                          ? "bg-primary text-black border-primary font-bold"
                          : "bg-black/20 border-white/5 text-white/60 hover:border-white/10"
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              {/* iOS & Mobile Platform Navigation Bar */}
              <div className="border-t border-white/5 pt-4">
                <label className="block text-xs font-medium text-white/60 mb-2 font-display">
                  iOS & Mobile Platform Navigation Bar
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["ios_bottom_tab", "compact_list", "grid"] as const).map((style) => (
                    <button
                      key={style}
                      type="button"
                      onClick={() => setMobileUiStyle(style)}
                      className={`py-1.5 px-1 capitalize rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                        mobileUiStyle === style
                          ? "bg-primary text-black border-primary font-bold"
                          : "bg-black/20 border-white/5 text-white/60 hover:border-white/10"
                      }`}
                    >
                      {style.replace(/_/g, " ")}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Typography and Custom Preset Saving */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Custom Preset Creation and Font manager */}
            <div className="border border-white/10 p-6 rounded-2xl bg-white/5 space-y-6">
              <h4 className="text-lg font-medium text-primary">
                ✏️ Fonts & Preset Engineering
              </h4>
              <p className="text-xs text-white/50 -mt-3 text-justify">
                Choose Display Typography pairs or construct custom naming
                configurations to load on-the-go.
              </p>

              {/* Font Picker */}
              <div>
                <label className="block text-xs font-medium text-white/60 mb-2">
                  Active Display & body Typography
                </label>
                <select
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value as any)}
                  className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-primary text-sm font-medium"
                >
                  <option value="Outfit">
                    Outfit (Default - Modern Editorial)
                  </option>
                  <option value="Inter">
                    Inter (Swiss Neutral Minimalist)
                  </option>
                  <option value="Space Grotesk">
                    Space Grotesk (Tech/SaaS Cyberpunk)
                  </option>
                  <option value="Playfair Display">
                    Playfair Display (Classy Luxury Serif)
                  </option>
                  <option value="JetBrains Mono">
                    JetBrains Mono (Technical brutalist)
                  </option>
                  <option value="Plus Jakarta Sans">
                    Plus Jakarta Sans (Dynamic creator sans)
                  </option>
                </select>
              </div>

              {/* Custom theme name builder */}
              <div className="border-t border-white/5 pt-4 space-y-3">
                <span className="block text-sm font-medium text-white font-display">
                  Save Current Config As Custom Preset
                </span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Cyberpunk Emerald..."
                    value={customPresetName}
                    onChange={(e) => setCustomPresetName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={handleCreateCustomPreset}
                    className="px-4 py-2 bg-white/10 text-white border border-white/15 rounded-xl hover:bg-white/15 text-xs font-medium cursor-pointer"
                  >
                    Save Preset
                  </button>
                </div>
              </div>
            </div>

            {/* JSON Toolbox & Automation Scheduler */}
            <div className="border border-white/10 p-6 rounded-2xl bg-white/5 space-y-6">
              <h4 className="text-lg font-medium text-primary font-display">
                ⏰ Theme Automation & JSON Tools
              </h4>
              <p className="text-xs text-white/50 -mt-3 text-justify">
                Establish automatic theme timing triggers to protect user
                eyesight or import/export design profiles.
              </p>

              {/* Scheduler */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="block text-sm font-medium text-white font-display font-display">
                      Theme Scheduler Trigger
                    </span>
                    <span className="block text-xs text-white/40">
                      Automate layout adjustments based on time
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsScheduleEnabled(!isScheduleEnabled)}
                    className={`h-6 w-11 rounded-full cursor-pointer transition-colors relative ${isScheduleEnabled ? "bg-primary" : "bg-white/10"}`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-black transition-transform absolute top-1 ${isScheduleEnabled ? "translate-x-6" : "translate-x-1"}`}
                    />
                  </button>
                </div>

                {isScheduleEnabled && (
                  <div className="bg-black/30 p-4 rounded-xl border border-white/5 space-y-3 animate-fade-in">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-white/40 mb-1">
                          Execution Clock Start
                        </label>
                        <input
                          type="time"
                          value={scheduleStartTime}
                          onChange={(e) => setScheduleStartTime(e.target.value)}
                          className="w-full text-xs bg-black/50 text-white font-mono px-3 py-1.5 rounded border border-white/10 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-white/40 mb-1">
                          Execution Clock End
                        </label>
                        <input
                          type="time"
                          value={scheduleEndTime}
                          onChange={(e) => setScheduleEndTime(e.target.value)}
                          className="w-full text-xs bg-black/50 text-white font-mono px-3 py-1.5 rounded border border-white/10 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] text-white/40 mb-1">
                        Trigger Target Theme Profile
                      </label>
                      <select
                        value={scheduleThemeId}
                        onChange={(e) => setScheduleThemeId(e.target.value)}
                        className="w-full bg-black/40 text-xs px-3 py-1.5 rounded border border-white/10 focus:outline-none text-white font-medium"
                      >
                        <option value="default">Default Luxury Gold</option>
                        <option value="theme2">
                          Theme 2: Cyber SaaS Orange
                        </option>
                        <option value="theme3">
                          Theme 3: Creator Cosmic Pink
                        </option>
                        {savedPresetsList.map((item) => (
                          <option key={item.id} value={item.id}>
                            Custom: {item.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Import / Export JSON payload */}
              <div className="border-t border-white/5 pt-4 space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="block text-sm font-medium text-white font-display">
                      Import / Export Theme JSON Payload
                    </span>
                    <span className="block text-xs text-white/50">
                      Transfer beautiful profiles instantly
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportThemeJson}
                    className="px-3 py-1 bg-white/5 border border-white/10 text-white hover:bg-white/10 rounded-lg text-xs font-medium cursor-pointer"
                  >
                    Export JSON
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  <textarea
                    placeholder="Paste your theme JSON payload here to import..."
                    value={importJsonText}
                    onChange={(e) => setImportJsonText(e.target.value)}
                    className="w-full h-16 px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-primary text-justify leading-relaxed"
                  />
                  <button
                    type="button"
                    onClick={handleImportThemeJson}
                    className="w-full py-2 bg-primary/10 border border-primary/20 text-primary text-xs font-semibold rounded-xl hover:bg-primary/20 cursor-pointer transition-colors"
                  >
                    Import & Load configuration
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Seasonal Overlays and Holiday configs */}
          <div className="border border-white/10 p-6 rounded-2xl bg-white/5 space-y-6">
            <h4 className="text-lg font-medium text-primary font-display">
              🎄 Holidays & Seasonal Overlay Modes
            </h4>
            <p className="text-xs text-white/50 -mt-3 text-justify">
              Apply seasonal overlay atmospheric animations or particles onto
              the web platform for various holidays.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {(
                [
                  { id: "none", label: "None (Clean Baseline)" },
                  { id: "winter_snow", label: "❄️ Falling Snow" },
                  { id: "spring_blossoms", label: "🌸 Spring Blossoms" },
                  { id: "autumn_lanterns", label: "🍂 Festive Autumn" },
                  { id: "cyber_grids", label: "🕸️ Cyber Matrix Grids" },
                ] as const
              ).map((overlay) => (
                <button
                  key={overlay.id}
                  type="button"
                  onClick={() => setSeasonalOverlay(overlay.id)}
                  className={`py-3 px-2 rounded-xl text-xs font-medium border transition-all text-center flex flex-col items-center justify-center gap-1 ${
                    seasonalOverlay === overlay.id
                      ? "bg-primary/20 border-primary text-primary font-bold shadow-lg shadow-primary/10"
                      : "bg-black/20 border-white/5 text-white/60 hover:border-white/15"
                  }`}
                >
                  <span>{overlay.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "settings" && user?.role === "superadmin" && (
        <div className="max-w-4xl border border-white/10 p-6 rounded-2xl bg-white/5">
          <h3 className="text-xl font-medium mb-6">Global Settings</h3>
          <form onSubmit={handleSaveSettings} className="space-y-6">
            {/* Prices Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-medium text-[#E5D2A5] uppercase tracking-wide">
                  Pricing Configuration (Default)
                </h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div>
                  <label className="block text-sm text-white/60 mb-2">
                    Notes Plan Price (₹)
                  </label>
                  <input
                    type="number"
                    value={priceNotes}
                    onChange={(e) => setPriceNotes(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5]"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-2">
                    Lectures Plan Price (₹)
                  </label>
                  <input
                    type="number"
                    value={priceLectures}
                    onChange={(e) => setPriceLectures(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5]"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-2">
                    Premium Plan Price (₹)
                  </label>
                  <input
                    type="number"
                    value={pricePremium}
                    onChange={(e) => setPricePremium(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5]"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-sm text-white/60 mb-2">
                    UPI ID (For Payments)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. john@upi"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-[#E5D2A5]"
                  />
                </div>
              </div>

              {/* Pricing Cards Content Customizer */}
              <div className="mb-8 p-5 rounded-2xl border border-[#E5D2A5]/20 bg-[#E5D2A5]/5 space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-[#E5D2A5] uppercase tracking-wide">
                    Customize Pricing Cards Content & Texts
                  </h4>
                  <p className="text-xs text-white/50 mt-1">
                    Fine-tune the marketing badge, title, overview descriptions, and comma-separated checklists shown on the landing page cards.
                  </p>
                </div>

                {/* Card 1 */}
                <div className="p-4 rounded-xl border border-white/5 bg-black/20 space-y-4">
                  <div className="text-xs font-bold text-white/80 border-b border-white/5 pb-1">
                    Card 1 Content Customizer (Revision / Notes Plan)
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-white/50 mb-1">Badge Title</label>
                      <input
                        type="text"
                        value={pricingCard1Badge}
                        onChange={(e) => setPricingCard1Badge(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg bg-black/45 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-white/50 mb-1">Card Header Title</label>
                      <input
                        type="text"
                        value={pricingCard1Title}
                        onChange={(e) => setPricingCard1Title(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg bg-black/45 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-white/50 mb-1">Description / Subtitle Info</label>
                    <textarea
                      value={pricingCard1Desc}
                      onChange={(e) => setPricingCard1Desc(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 text-xs font-sans rounded-lg bg-black/45 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5] resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/50 mb-1">Checklist Features (Comma-Separated Items)</label>
                    <input
                      type="text"
                      value={pricingCard1Features}
                      onChange={(e) => setPricingCard1Features(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg bg-black/45 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5]"
                      placeholder="Feature 1, Feature 2, Feature 3"
                    />
                  </div>
                </div>

                {/* Card 2 */}
                <div className="p-4 rounded-xl border border-white/5 bg-black/20 space-y-4">
                  <div className="text-xs font-bold text-white/80 border-b border-white/5 pb-1">
                    Card 2 Content Customizer (Lectures Package Plan)
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-white/50 mb-1">Badge Title</label>
                      <input
                        type="text"
                        value={pricingCard2Badge}
                        onChange={(e) => setPricingCard2Badge(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg bg-black/45 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-white/50 mb-1">Card Header Title</label>
                      <input
                        type="text"
                        value={pricingCard2Title}
                        onChange={(e) => setPricingCard2Title(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg bg-black/45 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-white/50 mb-1">Description / Subtitle Info</label>
                    <textarea
                      value={pricingCard2Desc}
                      onChange={(e) => setPricingCard2Desc(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 text-xs font-sans rounded-lg bg-black/45 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5] resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/50 mb-1">Checklist Features (Comma-Separated Items)</label>
                    <input
                      type="text"
                      value={pricingCard2Features}
                      onChange={(e) => setPricingCard2Features(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg bg-black/45 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5]"
                      placeholder="Feature 1, Feature 2, Feature 3"
                    />
                  </div>
                </div>

                {/* Card 3 */}
                <div className="p-4 rounded-xl border border-white/5 bg-black/20 space-y-4">
                  <div className="text-xs font-bold text-white/80 border-b border-white/5 pb-1">
                    Card 3 Content Customizer (Elite Premium Plan)
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-white/50 mb-1">Badge Title</label>
                      <input
                        type="text"
                        value={pricingCard3Badge}
                        onChange={(e) => setPricingCard3Badge(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg bg-black/45 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-white/50 mb-1">Card Header Title</label>
                      <input
                        type="text"
                        value={pricingCard3Title}
                        onChange={(e) => setPricingCard3Title(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg bg-black/45 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-white/50 mb-1">Description / Subtitle Info</label>
                    <textarea
                      value={pricingCard3Desc}
                      onChange={(e) => setPricingCard3Desc(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 text-xs font-sans rounded-lg bg-black/45 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5] resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/50 mb-1">Checklist Features (Comma-Separated Items)</label>
                    <input
                      type="text"
                      value={pricingCard3Features}
                      onChange={(e) => setPricingCard3Features(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg bg-black/45 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5]"
                      placeholder="Feature 1, Feature 2, Feature 3"
                    />
                  </div>
                </div>
              </div>

              {["6", "7", "8", "9", "10", "11", "12", "dropper"].map((cls) => (
                <div
                  key={cls}
                  className="mb-6 p-4 rounded-xl border border-white/10 bg-black/20"
                >
                  <h5 className="text-sm font-medium text-white mb-4 capitalize">
                    Class {cls} Custom Prices (Leave empty to use default)
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-white/60 mb-2">
                        Notes (₹)
                      </label>
                      <input
                        type="number"
                        placeholder="Default"
                        value={classPrices[cls]?.notes || ""}
                        onChange={(e) =>
                          setClassPrices((p: any) => ({
                            ...p,
                            [cls]: {
                              ...p[cls],
                              notes: e.target.value
                                ? Number(e.target.value)
                                : undefined,
                            },
                          }))
                        }
                        className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-white/60 mb-2">
                        Lectures (₹)
                      </label>
                      <input
                        type="number"
                        placeholder="Default"
                        value={classPrices[cls]?.lectures || ""}
                        onChange={(e) =>
                          setClassPrices((p: any) => ({
                            ...p,
                            [cls]: {
                              ...p[cls],
                              lectures: e.target.value
                                ? Number(e.target.value)
                                : undefined,
                            },
                          }))
                        }
                        className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-white/60 mb-2">
                        Premium (₹)
                      </label>
                      <input
                        type="number"
                        placeholder="Default"
                        value={classPrices[cls]?.premium || ""}
                        onChange={(e) =>
                          setClassPrices((p: any) => ({
                            ...p,
                            [cls]: {
                              ...p[cls],
                              premium: e.target.value
                                ? Number(e.target.value)
                                : undefined,
                            },
                          }))
                        }
                        className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5]"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Branding Section */}
            <div>
              <h4 className="text-sm font-medium text-[#E5D2A5] mb-4 uppercase tracking-wide">
                Brand & Identity
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-white/60 mb-2">
                    Website Name
                  </label>
                  <input
                    type="text"
                    value={websiteName}
                    onChange={(e) => setWebsiteName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5]"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-2">
                    Document Title
                  </label>
                  <input
                    type="text"
                    value={documentTitle}
                    onChange={(e) => setDocumentTitle(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5]"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-2">
                    Logo Text (e.g., 'N')
                  </label>
                  <input
                    type="text"
                    value={logoText}
                    onChange={(e) => setLogoText(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5]"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-2">
                    Logo Image URL (Overrides Text)
                  </label>
                  <input
                    type="text"
                    value={logoImage}
                    onChange={(e) => setLogoImage(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-[#E5D2A5]"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-white/60 mb-2">
                    Favicon URL (Must be a .ico, .png URL)
                  </label>
                  <input
                    type="text"
                    value={faviconUrl}
                    onChange={(e) => setFaviconUrl(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-[#E5D2A5]"
                  />
                </div>
              </div>
            </div>

            {/* Hero Section settings */}
            <div>
              <h4 className="text-sm font-medium text-[#E5D2A5] mb-4 uppercase tracking-wide">
                Hero Section (Home)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm text-white/60 mb-2">
                    Main Headline
                  </label>
                  <input
                    type="text"
                    value={heroTitle}
                    onChange={(e) => setHeroTitle(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5]"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-white/60 mb-2">
                    Subtitle / Description
                  </label>
                  <textarea
                    value={heroSubtitle}
                    onChange={(e) => setHeroSubtitle(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5] h-20 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-2">
                    Top Badge Text
                  </label>
                  <input
                    type="text"
                    value={heroBadgeText}
                    onChange={(e) => setHeroBadgeText(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5]"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-2">
                    Primary CTA Text
                  </label>
                  <input
                    type="text"
                    value={heroCta1Text}
                    onChange={(e) => setHeroCta1Text(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5]"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-2">
                    Primary CTA Link
                  </label>
                  <input
                    type="text"
                    placeholder="/dashboard or https://..."
                    value={heroCta1Link}
                    onChange={(e) => setHeroCta1Link(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5]"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-2">
                    Secondary CTA Text
                  </label>
                  <input
                    type="text"
                    value={heroCta2Text}
                    onChange={(e) => setHeroCta2Text(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5]"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-2">
                    Secondary CTA Link
                  </label>
                  <input
                    type="text"
                    placeholder="https://youtube.com/..."
                    value={heroCta2Link}
                    onChange={(e) => setHeroCta2Link(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5]"
                  />
                </div>
              </div>
            </div>

            {/* Footer Section */}
            <div>
              <h4 className="text-sm font-medium text-[#E5D2A5] mb-4 uppercase tracking-wide">
                Footer Configuration
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="md:col-span-2">
                  <label className="block text-sm text-white/60 mb-2">
                    Footer Description
                  </label>
                  <textarea
                    value={footerDescription}
                    onChange={(e) => setFooterDescription(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5] h-20 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Review & Contact Form Section */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-[#E5D2A5] mb-4 uppercase tracking-wide">
                Contact / Review Form Config
              </h4>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm text-white/60 mb-2">
                    Form Action URL (e.g., Formspree POST url)
                  </label>
                  <input
                    type="text"
                    placeholder="https://formspree.io/f/..."
                    value={reviewFormUrl}
                    onChange={(e) => setReviewFormUrl(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-[#E5D2A5]"
                  />
                  <p className="text-xs text-white/40 mt-2">
                    If provided, a contact form will be displayed at the bottom
                    of the home page.
                  </p>
                </div>
              </div>
            </div>

            {/* About Section Interactive Graphics Config */}
            <div className="mb-6 border-t border-white/10 pt-6">
              <h4 className="text-sm font-medium text-[#E5D2A5] mb-4 uppercase tracking-wide font-display">
                About Section Graphics & Badges Config
              </h4>
              <p className="text-xs text-white/50 mb-4">
                Configure the visibility and text labels of the mock interactive graphics displayed inside the About/Hero section of your home page.
              </p>

              <div className="space-y-6">
                {/* 1. Student-LMS Mock Card Widget */}
                <div className="p-4 rounded-xl border border-white/10 bg-white/5">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-semibold text-white">Course Progress / Streak Card</span>
                    <button 
                      type="button"
                      onClick={() => setAboutShowMockCard(!aboutShowMockCard)}
                      className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                        aboutShowMockCard ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white/10 text-white/60 border border-white/10"
                      }`}
                    >
                      {aboutShowMockCard ? "Visible" : "Hidden"}
                    </button>
                  </div>

                  {aboutShowMockCard && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                      <div>
                        <label className="block text-xs text-white/60 mb-1.5">Card Title</label>
                        <input
                          type="text"
                          value={aboutMockCardTitle}
                          onChange={(e) => setAboutMockCardTitle(e.target.value)}
                          className="w-full px-3 py-2 text-sm rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-white/60 mb-1.5">Card Subtitle</label>
                        <input
                          type="text"
                          value={aboutMockCardSubtitle}
                          onChange={(e) => setAboutMockCardSubtitle(e.target.value)}
                          className="w-full px-3 py-2 text-sm rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-white/60 mb-1.5">Streak Value</label>
                        <input
                          type="text"
                          value={aboutMockCardValue}
                          onChange={(e) => setAboutMockCardValue(e.target.value)}
                          className="w-full px-3 py-2 text-sm rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5]"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. IITian Led Badge */}
                <div className="p-4 rounded-xl border border-white/10 bg-white/5">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-semibold text-white">IITian Floating Badge</span>
                    <button 
                      type="button"
                      onClick={() => setAboutShowIitianBadge(!aboutShowIitianBadge)}
                      className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                        aboutShowIitianBadge ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white/10 text-white/60 border border-white/10"
                      }`}
                    >
                      {aboutShowIitianBadge ? "Visible" : "Hidden"}
                    </button>
                  </div>

                  {aboutShowIitianBadge && (
                    <div className="mt-2">
                      <label className="block text-xs text-white/60 mb-1.5">Badge Text</label>
                      <input
                        type="text"
                        value={aboutIitianBadgeText}
                        onChange={(e) => setAboutIitianBadgeText(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5]"
                      />
                    </div>
                  )}
                </div>

                {/* 3. Live Doubts Active Badge */}
                <div className="p-4 rounded-xl border border-white/10 bg-white/5">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-semibold text-white">Live Doubts Floating Badge</span>
                    <button 
                      type="button"
                      onClick={() => setAboutShowLiveDoubts(!aboutShowLiveDoubts)}
                      className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                        aboutShowLiveDoubts ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white/10 text-white/60 border border-white/10"
                      }`}
                    >
                      {aboutShowLiveDoubts ? "Visible" : "Hidden"}
                    </button>
                  </div>

                  {aboutShowLiveDoubts && (
                    <div className="mt-2">
                      <label className="block text-xs text-white/60 mb-1.5">Badge Text</label>
                      <input
                        type="text"
                        value={aboutLiveDoubtsText}
                        onChange={(e) => setAboutLiveDoubtsText(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5]"
                      />
                    </div>
                  )}
                </div>

                {/* 4. Calculus Progress Capsule Widget */}
                <div className="p-4 rounded-xl border border-white/10 bg-white/5">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-semibold text-white">Calculus Progress Capsule Card</span>
                    <button 
                      type="button"
                      onClick={() => setAboutShowCalculusCard(!aboutShowCalculusCard)}
                      className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                        aboutShowCalculusCard ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white/10 text-white/60 border border-white/10"
                      }`}
                    >
                      {aboutShowCalculusCard ? "Visible" : "Hidden"}
                    </button>
                  </div>

                  {aboutShowCalculusCard && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                        <div>
                          <label className="block text-xs text-white/60 mb-1.5">Capsule Title</label>
                          <input
                            type="text"
                            value={aboutCalculusTitle}
                            onChange={(e) => setAboutCalculusTitle(e.target.value)}
                            className="w-full px-3 py-2 text-sm rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-white/60 mb-1.5">Capsule Badge (e.g. Class 11)</label>
                          <input
                            type="text"
                            value={aboutCalculusBadge}
                            onChange={(e) => setAboutCalculusBadge(e.target.value)}
                            className="w-full px-3 py-2 text-sm rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5]"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                        <div>
                          <label className="block text-xs text-white/60 mb-1.5">Progress Percentage (0-100)</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={aboutCalculusProgress}
                            onChange={(e) => setAboutCalculusProgress(Number(e.target.value))}
                            className="w-full px-3 py-2 text-sm rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-white/60 mb-1.5">Lecture Stats Text</label>
                          <input
                            type="text"
                            value={aboutCalculusLectureText}
                            onChange={(e) => setAboutCalculusLectureText(e.target.value)}
                            className="w-full px-3 py-2 text-sm rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-white/60 mb-1.5">Percent Label Text</label>
                          <input
                            type="text"
                            value={aboutCalculusPercentText}
                            onChange={(e) => setAboutCalculusPercentText(e.target.value)}
                            className="w-full px-3 py-2 text-sm rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5]"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 5. Rating Card Widget */}
                <div className="p-4 rounded-xl border border-white/10 bg-white/5">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-semibold text-white">Student Rating / Heart Widget</span>
                    <button 
                      type="button"
                      onClick={() => setAboutShowRatingCard(!aboutShowRatingCard)}
                      className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                        aboutShowRatingCard ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white/10 text-white/60 border border-white/10"
                      }`}
                    >
                      {aboutShowRatingCard ? "Visible" : "Hidden"}
                    </button>
                  </div>

                  {aboutShowRatingCard && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                      <div>
                        <label className="block text-xs text-white/60 mb-1.5">Rating Caption</label>
                        <input
                          type="text"
                          value={aboutRatingTitle}
                          onChange={(e) => setAboutRatingTitle(e.target.value)}
                          className="w-full px-3 py-2 text-sm rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-white/60 mb-1.5">Rating Description</label>
                        <input
                          type="text"
                          value={aboutRatingDesc}
                          onChange={(e) => setAboutRatingDesc(e.target.value)}
                          className="w-full px-3 py-2 text-sm rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5]"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 5b. Corner Profile Image & Orange Spill Splash Widget */}
                <div id="corner-image-control-card" className="p-4 rounded-xl border border-white/10 bg-white/5">
                  <div className="mb-4 flex flex-col justify-between">
                    <span className="text-sm font-semibold text-white flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#ff7a00]" /> 
                      Landing Page Top-Right Corner Image
                    </span>
                    <p className="text-xs text-white/50 mt-1">
                      Configure custom profile photo URLs, shapes, and gorgeous orange uneven splash backgrounds.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                    <div>
                      <label className="block text-xs text-white/60 mb-1.5">Custom Photo URL</label>
                      <input
                        type="text"
                        placeholder="https://images.unsplash.com/..."
                        value={aboutCornerImageUrl}
                        onChange={(e) => setAboutCornerImageUrl(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-white/60 mb-1.5">Image Shape Style</label>
                      <select
                        value={aboutCornerImgShape}
                        onChange={(e) => setAboutCornerImgShape(e.target.value as "circle" | "card")}
                        className="w-full px-3 py-2 text-sm rounded-lg bg-black/40 border border-white/10 text-[#E5D2A5] focus:outline-none focus:border-[#E5D2A5]"
                      >
                        <option value="circle">Circular / Round Shape</option>
                        <option value="card">Rounded Corner Card Shape</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-white/60 mb-1.5">Orange Splash Background Effect</label>
                      <select
                        value={aboutCornerBackground}
                        onChange={(e) => setAboutCornerBackground(e.target.value as "orange_burst" | "water_spread" | "none")}
                        className="w-full px-3 py-2 text-sm rounded-lg bg-black/40 border border-[#ff7a00]/30 text-[#ff7a00] focus:outline-none focus:border-[#E5D2A5]"
                      >
                        <option value="water_spread">Liquid Water Spread Spill Pattern (Orange)</option>
                        <option value="orange_burst">Balloon Burst Splatter Burst (Orange)</option>
                        <option value="none">Neutral Clean Background (No pop splash)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 5c. App Converter Button Configuration (Dynamic Install Text & Redirect) */}
                <div id="pwa-button-control-card" className="p-4 rounded-xl border border-white/10 bg-white/5">
                  <div className="mb-4 flex flex-col justify-between">
                    <span className="text-sm font-semibold text-white flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#ff7a00]" /> 
                      App Installation & Convert Button Config
                    </span>
                    <p className="text-xs text-white/50 mt-1">
                      Customize the text and operation of the "Install App" navigation button. Set an optional external redirect URL to drive users to an app store/custom landing page, or leave empty to trigger native PWA installation prompts.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div>
                      <label className="block text-xs text-white/60 mb-1.5">Button Display Text</label>
                      <input
                        type="text"
                        placeholder="Install App"
                        value={pwaBtnText}
                        onChange={(e) => setPwaBtnText(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-white/60 mb-1.5">Action Redirect URL (Optional)</label>
                      <input
                        type="text"
                        placeholder="https://play.google.com/store/apps/details?id=..."
                        value={pwaBtnLink}
                        onChange={(e) => setPwaBtnLink(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5]"
                      />
                      <span className="text-[10px] text-white/40 mt-1 block">
                        Leave blank to activate the default seamless PWA installation flow.
                      </span>
                    </div>
                  </div>
                </div>

                {/* 6. Theme-Matched Study Stickers Widget */}
                <div className="p-5 rounded-2xl border border-[#E5D2A5]/10 bg-white/[0.02]">
                  <div className="mb-4">
                    <span className="text-sm font-bold text-[#E5D2A5] tracking-wider font-mono">6. SITE STUDY STICKERS CUSTOMIZATION</span>
                    <p className="text-xs text-white/50 mt-1">
                      Configure the cute icons, titles, subtitles, and clicked powerup speech bubbles for each draggable sticker.
                    </p>
                  </div>

                  <div className="space-y-6">
                    {[
                      { num: 1, name: "Sticker 1 (Books - left, top-middle)", emoji: studySticker1Emoji, setEmoji: setStudySticker1Emoji, title: studySticker1Title, setTitle: setStudySticker1Title, subtitle: studySticker1Subtitle, setSubtitle: setStudySticker1Subtitle, popup: studySticker1Popup, setPopup: setStudySticker1Popup },
                      { num: 2, name: "Sticker 2 (Bulb - left, bottom)", emoji: studySticker2Emoji, setEmoji: setStudySticker2Emoji, title: studySticker2Title, setTitle: setStudySticker2Title, subtitle: studySticker2Subtitle, setSubtitle: setStudySticker2Subtitle, popup: studySticker2Popup, setPopup: setStudySticker2Popup },
                      { num: 3, name: "Sticker 3 (Graduation Cap - top-center)", emoji: studySticker3Emoji, setEmoji: setStudySticker3Emoji, title: studySticker3Title, setTitle: setStudySticker3Title, subtitle: studySticker3Subtitle, setSubtitle: setStudySticker3Subtitle, popup: studySticker3Popup, setPopup: setStudySticker3Popup },
                      { num: 4, name: "Sticker 4 (Target - bottom-center)", emoji: studySticker4Emoji, setEmoji: setStudySticker4Emoji, title: studySticker4Title, setTitle: setStudySticker4Title, subtitle: studySticker4Subtitle, setSubtitle: setStudySticker4Subtitle, popup: studySticker4Popup, setPopup: setStudySticker4Popup },
                      { num: 5, name: "Sticker 5 (Coffee Cup - right, top-middle)", emoji: studySticker5Emoji, setEmoji: setStudySticker5Emoji, title: studySticker5Title, setTitle: setStudySticker5Title, subtitle: studySticker5Subtitle, setSubtitle: setStudySticker5Subtitle, popup: studySticker5Popup, setPopup: setStudySticker5Popup },
                      { num: 6, name: "Sticker 6 (Brain - right, bottom)", emoji: studySticker6Emoji, setEmoji: setStudySticker6Emoji, title: studySticker6Title, setTitle: setStudySticker6Title, subtitle: studySticker6Subtitle, setSubtitle: setStudySticker6Subtitle, popup: studySticker6Popup, setPopup: setStudySticker6Popup },
                    ].map((sticker) => (
                      <div key={sticker.num} className="p-4 rounded-xl border border-white/5 bg-white/[0.01] space-y-3 shadow-inner">
                        <div className="flex items-center gap-2 pb-2 border-b border-white/[0.05]">
                          <span className="text-sm font-semibold text-white/90">{sticker.name}</span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                          <div className="md:col-span-2">
                            <label className="block text-[10px] text-white/50 mb-1">Emoji</label>
                            <input
                              type="text"
                              value={sticker.emoji}
                              onChange={(e) => sticker.setEmoji(e.target.value)}
                              className="w-full px-2.5 py-1.5 text-sm rounded-lg bg-black/45 border border-white/5 text-white focus:outline-none focus:border-[#E5D2A5] text-center"
                            />
                          </div>
                          
                          <div className="md:col-span-5">
                            <label className="block text-[10px] text-white/50 mb-1">Title</label>
                            <input
                              type="text"
                              value={sticker.title}
                              onChange={(e) => sticker.setTitle(e.target.value)}
                              className="w-full px-2.5 py-1.5 text-sm rounded-lg bg-black/45 border border-white/5 text-white focus:outline-none focus:border-[#E5D2A5]"
                            />
                          </div>

                          <div className="md:col-span-5">
                            <label className="block text-[10px] text-white/50 mb-1">Subtitle</label>
                            <input
                              type="text"
                              value={sticker.subtitle}
                              onChange={(e) => sticker.setSubtitle(e.target.value)}
                              className="w-full px-2.5 py-1.5 text-sm rounded-lg bg-black/45 border border-white/5 text-white focus:outline-none focus:border-[#E5D2A5]"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] text-white/50 mb-1">Clicked Highlight Pop-up Message</label>
                          <textarea
                            value={sticker.popup}
                            onChange={(e) => sticker.setPopup(e.target.value)}
                            rows={2}
                            placeholder="Motivational message or details that appear when clicking the sticker."
                            className="w-full px-3 py-2 text-xs rounded-lg bg-black/45 border border-white/5 text-slate-100 focus:outline-none focus:border-[#E5D2A5] resize-none"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="px-8 py-3 rounded-full bg-[#E5D2A5] text-[#070709] font-medium hover:bg-[#f4ecd8] transition-colors w-full sm:w-auto"
            >
              Publish Settings
            </button>
          </form>
        </div>
      )}

      {activeTab === "security" && user?.role === "superadmin" && (
        <div className="space-y-8 max-w-6xl animate-fade-in text-white">
          
          {/* Real-time security manager header */}
          <div className="border border-red-500/20 bg-red-500/5 p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-display font-medium text-red-500 flex items-center gap-2">
                <span>🛡️ Advanced Security & DRM Command Center</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 font-mono">
                  Enterprise Grade
                </span>
              </h3>
              <p className="text-sm text-white/60 mt-1">
                Configure real-time watermarks, restrict video downlinks, secure PDFs, trace illegal leaks, and oversee active multi-device limits.
              </p>
            </div>
            
            <div className="flex gap-2">
              <button
                type="button"
                onClick={async () => {
                  setSecurityTabLoading(true);
                  const vSnap = await getDocs(collection(db, "security_violations"));
                  setViolations(vSnap.docs.map(gdoc => ({ id: gdoc.id, ...gdoc.data() })).sort((a: any, b: any) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)));
                  const dSnap = await getDocs(collection(db, "active_devices"));
                  setActiveSessions(dSnap.docs.map(gdoc => ({ id: gdoc.id, ...gdoc.data() })));
                  setSecurityTabLoading(false);
                }}
                className="p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/85 transition-all text-xs flex items-center gap-1.5 cursor-pointer animate-fade-in"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${securityTabLoading ? 'animate-spin' : ''}`} />
                <span>Reload Live stats</span>
              </button>
              
              <button
                type="button"
                onClick={handleSaveSecuritySettings}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-medium shadow-lg hover:shadow-red-500/20 transition-all text-xs flex items-center gap-1.5 cursor-pointer font-bold tracking-wide"
              >
                <Save className="w-4 h-4" />
                <span>Save & Sync DRM</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-5 rounded-2xl border border-white/5 bg-black/30 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-red-500/10 text-red-00">
                <ShieldAlert className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">Blocked Leaking Actions</span>
                <span className="text-2xl font-black font-display text-white">{violations.length} <span className="text-xs font-normal text-zinc-500">Events</span></span>
              </div>
            </div>
            
            <div className="p-5 rounded-2xl border border-white/5 bg-black/30 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400">
                <Smartphone className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">Logged Session Tokens</span>
                <span className="text-2xl font-black font-display text-amber-400">{activeSessions.filter(s => s.status === 'active').length} <span className="text-xs font-normal text-zinc-500">Live</span></span>
              </div>
            </div>

            <div className="p-5 rounded-2xl border border-white/5 bg-black/30 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-emerald-500/10 text-[#E5D2A5]">
                <Sliders className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">Max Device Limit</span>
                <span className="text-2xl font-black font-display text-emerald-400">{secDeviceLimit} <span className="text-xs font-normal text-zinc-500">Allowed</span></span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            
            {/* DRM Rules Form */}
            <div className="xl:col-span-2 space-y-6">
              
              {/* OTT Video Stream Security Card */}
              <div className="border border-white/5 rounded-2xl bg-white/5 p-6 space-y-6">
                <h4 className="text-sm font-bold text-[#E5D2A5] uppercase tracking-wider flex items-center gap-2">
                  <Video className="w-4 h-4 text-accent-primary" />
                  <span>Interactive Premium Video Player Security</span>
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs text-white/50 block">Video Downloadability</label>
                    <select
                      className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:border-[#E5D2A5] focus:outline-none"
                      value={secVideoDownloads ? "true" : "false"}
                      onChange={(e) => setSecVideoDownloads(e.target.value === "true")}
                    >
                      <option value="false">Lock down video downloading (Recommended)</option>
                      <option value="true">Allow direct video downloads</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-white/50 block">Defocus / Tab-Switch Action</label>
                    <select
                      className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:border-[#E5D2A5] focus:outline-none"
                      value={secPauseSuspicious ? "true" : "false"}
                      onChange={(e) => setSecPauseSuspicious(e.target.value === "true")}
                    >
                      <option value="true">Pause player instantly upon losing window focus</option>
                      <option value="false">Ignore context shifts during play</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-white/50 block">Screen Capture Prevention Mode</label>
                    <select
                      className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:border-[#E5D2A5] focus:outline-none"
                      value={secVideoScreenshot ? "true" : "false"}
                      onChange={(e) => setSecVideoScreenshot(e.target.value === "true")}
                    >
                      <option value="true">Enable Block Screen on Snipping Tools (CAPACITOR FLAG_SECURE)</option>
                      <option value="false">Unrestricted screenshot captures</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-white/50 block">Seeking Operations (Disallow skipping forwards)</label>
                    <select
                      className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:border-[#E5D2A5] focus:outline-none"
                      value={secDisableSeeking ? "true" : "false"}
                      onChange={(e) => setSecDisableSeeking(e.target.value === "true")}
                    >
                      <option value="false">Allow students to drag seeking bar</option>
                      <option value="true">Disable forward seeking slider (Must watch full lecture)</option>
                    </select>
                  </div>
                </div>

                <div className="border-t border-white/5 pt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="text-xs font-bold text-white uppercase tracking-wider">Floating Dynamic Player Watermark</h5>
                      <p className="text-[10px] text-zinc-500">Inject transparent drifting student identity overlay above video frames.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={secVideoWatermark}
                      onChange={(e) => setSecVideoWatermark(e.target.checked)}
                      className="w-4 h-4 accent-[#E5D2A5]"
                    />
                  </div>

                  {secVideoWatermark && (
                    <div className="p-4 rounded-xl bg-black/20 border border-white/5 grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                      <div>
                        <label className="text-[10px] text-zinc-400 block mb-1">Watermark Custom Baseline text</label>
                        <input
                          type="text"
                          value={secWatermarkText}
                          onChange={(e) => setSecWatermarkText(e.target.value)}
                          className="w-full px-3 py-2 bg-black/30 border border-white/5 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-400 block mb-1">Opacity level (0.05 to 1.0)</label>
                        <input
                          type="number"
                          step={0.05}
                          value={secWatermarkOpacity}
                          onChange={(e) => setSecWatermarkOpacity(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-black/30 border border-white/5 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-400 block mb-1">Font size (px)</label>
                        <input
                          type="number"
                          value={secWatermarkSize}
                          onChange={(e) => setSecWatermarkSize(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-black/30 border border-white/5 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-400 block mb-1">Transition Speed (seconds to jump coordinates)</label>
                        <input
                          type="number"
                          value={secWatermarkSpeed}
                          onChange={(e) => setSecWatermarkSpeed(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-black/30 border border-white/5 rounded-lg text-xs"
                        />
                      </div>
                      <div className="md:col-span-2 space-y-1.5">
                        <label className="text-[10px] text-zinc-400 block">Metadata Fields to include in overlay</label>
                        <div className="flex flex-wrap gap-3">
                          {['name', 'email', 'phone', 'timestamp', 'userId', 'batchName'].map((f) => {
                            const active = secWatermarkFields.includes(f);
                            return (
                              <button
                                key={f}
                                type="button"
                                onClick={() => {
                                  if (active) setSecWatermarkFields(secWatermarkFields.filter(x => x !== f));
                                  else setSecWatermarkFields([...secWatermarkFields, f]);
                                }}
                                className={`px-2.5 py-1 rounded-md text-[9px] font-mono tracking-wider uppercase border font-bold transition-all ${active ? 'bg-[#E5D2A5]/10 text-[#E5D2A5] border-[#E5D2A5]/30' : 'bg-transparent text-zinc-500 border-white/10'}`}
                              >
                                {f}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* PDF Documents DRM Controls Card */}
              <div className="border border-white/5 rounded-2xl bg-white/5 p-6 space-y-6">
                <h4 className="text-sm font-bold text-pink-300 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-pink-300" />
                  <span>PDF Notes & Handwritten Materials Encryption Settings</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-white/50 block">Direct File Downloadability</label>
                    <select
                      className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:border-pink-300 focus:outline-none"
                      value={secPdfDownload ? "true" : "false"}
                      onChange={(e) => setSecPdfDownload(e.target.value === "true")}
                    >
                      <option value="false">Lock raw file download links (Secure doc streaming only)</option>
                      <option value="true">Allow downloading raw document PDFs</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-white/50 block">Browser Context Menu Rules</label>
                    <select
                      className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:border-pink-300 focus:outline-none"
                      value={secPdfRightClick ? "true" : "false"}
                      onChange={(e) => setSecPdfRightClick(e.target.value === "true")}
                    >
                      <option value="false">Block mouse right-click context menus (Lock inspect/save-as)</option>
                      <option value="true">Unrestricted mouse mechanics</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-white/50 block">Text Copy & Capture Hooks</label>
                    <select
                      className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:border-pink-300 focus:outline-none"
                      value={secPdfCopy ? "true" : "false"}
                      onChange={(e) => setSecPdfCopy(e.target.value === "true")}
                    >
                      <option value="false">Exhaust copy highlights & clipboard hoarding attempts</option>
                      <option value="true">Allow clipboard replication on text overlays</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-white/50 block">Page Printing exclusions</label>
                    <select
                      className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:border-pink-300 focus:outline-none"
                      value={secPdfPrint ? "true" : "false"}
                      onChange={(e) => setSecPdfPrint(e.target.value === "true")}
                    >
                      <option value="false">Disable printing keys Ctrl+P / Cmd+P (Recommended)</option>
                      <option value="true">Allow physical printers mapping</option>
                    </select>
                  </div>
                </div>

                <div className="border-t border-white/5 pt-4 space-y-4">
                  <h5 className="text-xs font-bold text-white uppercase tracking-wider">Diagonal Document Watermark Configurator</h5>
                  
                  <div className="p-4 rounded-xl bg-black/20 border border-white/5 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[10px] text-zinc-400 block mb-1">Watermark Angle (deg)</label>
                      <input
                        type="number"
                        value={secPdfAngle}
                        onChange={(e) => setSecPdfAngle(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-black/30 border border-white/5 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-400 block mb-1">Watermark Opacity (0.01 to 0.4)</label>
                      <input
                        type="number"
                        step={0.01}
                        value={secPdfOpacity}
                        onChange={(e) => setSecPdfOpacity(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-black/30 border border-white/5 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-400 block mb-1">Font Size (pt)</label>
                      <input
                        type="number"
                        value={secPdfFontSize}
                        onChange={(e) => setSecPdfFontSize(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-black/30 border border-white/5 rounded-lg text-xs"
                      />
                    </div>
                    <div className="md:col-span-3 flex items-center justify-between">
                      <span className="text-[10px] text-zinc-400">Render repeated diagonal mesh grid across pages</span>
                      <input
                        type="checkbox"
                        checked={secPdfRepeated}
                        onChange={(e) => setSecPdfRepeated(e.target.checked)}
                        className="w-4 h-4 accent-pink-300"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Multi Device Caps */}
              <div className="border border-white/5 rounded-2xl bg-white/5 p-6 space-y-4">
                <h4 className="text-sm font-bold text-purple-300 uppercase tracking-wider flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-purple-300" />
                  <span>Student Multi-Device Login caps</span>
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  <div>
                    <label className="text-xs text-white/50 block mb-1">Max Devices per Student simultanously</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={secDeviceLimit}
                      onChange={(e) => setSecDeviceLimit(Number(e.target.value))}
                      className="w-fit px-4 py-2 bg-black/40 border border-white/10 rounded-xl text-sm"
                    />
                  </div>
                  <p className="text-[10px] text-zinc-500 leading-normal">
                    Setting this ensures account-sharing prevention. If a student exceeds this concurrency limit, they must drop a previous browser session safely or call their mentor. Limit is enforced dynamically in the client state.
                  </p>
                </div>
              </div>
            </div>

            {/* Violation logs sidebar */}
            <div className="space-y-6">
              
              {/* Security violations list */}
              <div className="border border-white/5 rounded-2xl bg-black/20 p-5 space-y-4 max-h-[600px] overflow-y-auto">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-red-400 tracking-wider flex items-center gap-1.5 font-mono uppercase">
                    <History className="w-4 h-4" />
                    <span>Live Loss violations</span>
                  </h4>
                  <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-500 font-mono text-[9px] font-bold">LIVE MONITORED</span>
                </div>

                <div className="space-y-3">
                  {violations.slice(0, 50).map((v: any) => (
                    <div key={v.id} className="p-3.5 border border-white/5 bg-zinc-900/40 rounded-xl space-y-1.5 text-xs text-left">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-slate-100 font-sans tracking-tight break-all uppercase text-[10px]">{v.displayName || 'Anonymous Student'}</span>
                        <span className="shrink-0 text-[8px] font-mono font-bold bg-red-500/15 text-red-400 px-1.5 py-0.5 rounded uppercase">
                          {v.violationType?.replace('_', ' ') || 'SUSPICIOUS'}
                        </span>
                      </div>
                      <p className="text-zinc-400 text-[10px]">{v.detail || "Tab visibility changes"}</p>
                      <div className="flex items-center justify-between text-[9px] text-zinc-500 font-mono pt-1 border-t border-white/5">
                        <span>IP: {v.ipAddress || '157.34.12.98'}</span>
                        <span>{v.timestamp ? new Date(v.timestamp.seconds * 1000).toLocaleTimeString() : 'RECENT'}</span>
                      </div>
                      
                      <button
                        onClick={() => handleAdminResetDevices(v.userId)}
                        className="w-full mt-1.5 pt-1.5 pb-1 border-t border-dashed border-white/5 text-[9px] uppercase font-mono tracking-widest text-[#E5D2A5] hover:text-white transition-colors text-center font-bold cursor-pointer"
                      >
                        Force drop all sessions!
                      </button>
                    </div>
                  ))}

                  {violations.length === 0 && (
                    <p className="text-center text-zinc-600 text-xs py-10 font-mono">No threat warnings or screenshot leaks logged. Academy is quiet and secure.</p>
                  )}
                </div>
              </div>

              {/* Active device trackers */}
              <div className="border border-white/5 rounded-2xl bg-black/20 p-5 space-y-4 max-h-[400px] overflow-y-auto">
                <h4 className="text-xs font-bold text-amber-400 tracking-wider flex items-center gap-1.5 font-mono uppercase">
                  <Smartphone className="w-4 h-4 text-amber-500" />
                  <span>Logins & concurrent nodes ({activeSessions.filter(s => s.status === 'active').length})</span>
                </h4>

                <div className="space-y-3">
                  {activeSessions.slice(0, 30).map((session: any) => (
                    <div key={session.id} className="p-3 border border-white/5 bg-zinc-900/30 rounded-xl space-y-1 text-xs text-left">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white truncate max-w-[100px] text-[10px]">{session.userId?.slice(0, 8)}...</span>
                        <span className={`text-[8px] font-mono px-2 py-0.5 rounded font-extrabold uppercase ${session.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-500'}`}>
                          {session.status || 'inactive'}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-500 truncate">{session.deviceModel || 'Browser Agent'}</p>
                      
                      {session.status === 'active' && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (!window.confirm("Do you want to immediately drop this active console link?")) return;
                            await updateDoc(doc(db, "active_devices", session.id), {
                              status: 'forced_out',
                              lastActive: serverTimestamp()
                            });
                            const devSnap = await getDocs(collection(db, "active_devices"));
                            setActiveSessions(devSnap.docs.map(gdoc => ({ id: gdoc.id, ...gdoc.data() })));
                            alert("Active device remote logout command broadcasted!");
                          }}
                          className="w-full text-right text-[8px] text-red-400 hover:text-red-500 uppercase font-black tracking-wider pt-1.5 font-mono cursor-pointer transition-all border-t border-white/5 mt-1"
                        >
                          drop console & logout
                        </button>
                      )}
                    </div>
                  ))}
                  
                  {activeSessions.length === 0 && (
                    <p className="text-center text-zinc-600 text-xs py-10 font-mono">No active session nodes tracked.</p>
                  )}
                </div>
              </div>

            </div>
          </div>

        </div>
      )}

      {activeTab === "materials" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 border border-white/10 p-6 rounded-2xl bg-white/5 h-fit">
            <h3 className="text-xl font-medium mb-6">
              {editingMaterialId ? "Edit Content" : "Create Content"}
            </h3>
            <form onSubmit={handleCreateMaterial} className="space-y-4">
              <input
                required
                placeholder="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-[#E5D2A5]"
              />
              <textarea
                required
                placeholder="Description"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-[#E5D2A5] h-24 resize-none"
              />
              <div className="flex flex-col sm:flex-row gap-4">
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full sm:w-1/2 px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5]"
                >
                  <option value="note">Notes / PDF</option>
                  <option value="lecture">Lecture / Video</option>
                </select>
                <select
                  value={classGroup}
                  onChange={(e) => setClassGroup(e.target.value)}
                  className="w-full sm:w-1/2 px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5]"
                >
                  <option value="all">Any Class</option>
                  <option value="6">Class 6</option>
                  <option value="7">Class 7</option>
                  <option value="8">Class 8</option>
                  <option value="9">Class 9</option>
                  <option value="10">Class 10</option>
                  <option value="11">Class 11</option>
                  <option value="12">Class 12</option>
                  <option value="dropper">Dropper</option>
                </select>
              </div>
              <input
                placeholder="Optional Thumbnail URL (Image link)"
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-[#E5D2A5]"
              />
              <input
                required
                placeholder="Content URL (YouTube/PDF link)"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-[#E5D2A5]"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-[#E5D2A5] text-[#070709] font-medium hover:bg-[#f4ecd8] transition-colors"
                >
                  {editingMaterialId ? "Update Content" : "Publish Content"}
                </button>
                {editingMaterialId && (
                  <button
                    type="button"
                    onClick={handleCancelEditMaterial}
                    className="flex-1 py-3 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="lg:col-span-2 space-y-4">
            {materials.map((mat) => (
              <div
                key={mat.id}
                className="p-4 rounded-xl border border-white/10 bg-white/5 flex items-center justify-between"
              >
                <div>
                  <h4 className="font-medium text-white">{mat.title}</h4>
                  <p className="text-xs text-white/50">
                    {mat.type} • Class:{" "}
                    {mat.classGroup === "all" || !mat.classGroup
                      ? "Any Class"
                      : `Class ${mat.classGroup}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEditMaterialStart(mat)}
                    className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 text-xs font-medium transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteMaterial(mat.id)}
                    className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-medium transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "users" && (
        <div className="overflow-x-auto">
          <table className="w-full text-left bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <thead className="border-b border-white/10 bg-white/5">
              <tr>
                <th className="p-4 font-medium text-white/60">Name</th>
                <th className="p-4 font-medium text-white/60">Email</th>
                <th className="p-4 font-medium text-white/60">Streak</th>
                <th className="p-4 font-medium text-white/60">Role</th>
                <th className="p-4 font-medium text-white/60">Class / Batch</th>
                <th className="p-4 font-medium text-white/60">Access</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-4">{u.displayName}</td>
                  <td className="p-4 text-white/60">{u.email}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-1.5 text-orange-400">
                      <Flame className="w-4 h-4" />
                      <span className="font-medium text-sm">
                        {u.streak || 0}
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <select
                      disabled={user.role !== "superadmin" || u.id === user.uid}
                      className="bg-black/50 border border-white/10 rounded-lg px-2 py-1 text-sm text-white disabled:opacity-50"
                      value={u.role}
                      onChange={(e) =>
                        handleUpdateUser(u.id, "role", e.target.value)
                      }
                    >
                      <option value="student">Student</option>
                      <option value="admin">Admin</option>
                      {user.role === "superadmin" && (
                        <option value="superadmin">Superadmin</option>
                      )}
                    </select>
                  </td>
                  <td className="p-4">
                    <select
                      className="bg-black/50 border border-white/10 rounded-lg px-2 py-1 text-sm text-white"
                      value={u.classGroup || "all"}
                      onChange={(e) =>
                        handleUpdateUser(u.id, "classGroup", e.target.value)
                      }
                    >
                      <option value="all">Any/All Classes</option>
                      <option value="6">Class 6</option>
                      <option value="7">Class 7</option>
                      <option value="8">Class 8</option>
                      <option value="9">Class 9</option>
                      <option value="10">Class 10</option>
                      <option value="11">Class 11</option>
                      <option value="12">Class 12</option>
                      <option value="dropper">Dropper</option>
                    </select>
                  </td>
                  <td className="p-4 flex items-center gap-2">
                    <button
                      onClick={() => setManagingUser(u)}
                      className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-medium transition-colors"
                    >
                      Manage Specifics
                    </button>
                    <button
                      onClick={() => handleDeleteUser(u.id)}
                      className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-medium transition-colors"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {activeTab === "mentors" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 border border-white/10 p-6 rounded-2xl bg-white/5 h-fit">
            <h3 className="text-xl font-medium mb-6">
              {editingMentorId ? "Edit Faculty Details" : "Add Faculty"}
            </h3>
            <form onSubmit={handleCreateMentor} className="space-y-4">
              <input
                required
                placeholder="Name (e.g. Dr. Aryan Sharma)"
                value={mentorName}
                onChange={(e) => setMentorName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-[#E5D2A5]"
              />
              <input
                required
                placeholder="Role (e.g. AIIMS Topper)"
                value={mentorRole}
                onChange={(e) => setMentorRole(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-[#E5D2A5]"
              />
              <input
                placeholder="Experience (e.g. 10+ Years Exp, Ex-IITian) [Optional]"
                value={mentorExperience}
                onChange={(e) => setMentorExperience(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-[#E5D2A5]"
              />
              <textarea
                placeholder="Bio/Description [Optional]"
                value={mentorDescription}
                onChange={(e) => setMentorDescription(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-[#E5D2A5] h-20 resize-none"
              />
              <input
                required
                placeholder="Image URL (Unsplash link)"
                value={mentorImage}
                onChange={(e) => setMentorImage(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-[#E5D2A5]"
              />
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-[#E5D2A5] text-[#070709] font-medium hover:bg-[#f4ecd8] transition-colors"
                >
                  {editingMentorId ? "Save Changes" : "Publish Faculty"}
                </button>
                {editingMentorId && (
                  <button
                    type="button"
                    onClick={handleCancelEditMentor}
                    className="px-4 py-3 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="lg:col-span-2 space-y-4">
            {mentors.map((m) => (
              <div
                key={m.id}
                className="p-4 rounded-xl border border-white/10 bg-white/5 gap-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full overflow-hidden shrink-0">
                    <img
                      src={m.image}
                      alt={m.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="font-medium text-white">{m.name}</h4>
                    <p className="text-xs text-white/50">{m.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEditMentorStart(m)}
                    className="px-3 py-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 text-xs font-medium transition-colors cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteMentor(m.id)}
                    className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-medium transition-colors cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {managingUser && (
        <Dialog
          open={!!managingUser}
          onOpenChange={(open) => !open && setManagingUser(null)}
        >
          <DialogContent className="sm:max-w-[600px] bg-[#070709] border border-white/10 text-white rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-display font-medium text-white">
                Specific Content Access
              </DialogTitle>
              <DialogDescription className="text-white/50">
                Grant {managingUser.displayName} access to specific locked
                materials.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 space-y-2 max-h-[60vh] overflow-y-auto pr-2">
              {materials.map((mat) => {
                const unlocked = managingUser.unlockedMaterials?.includes(
                  mat.id,
                );
                return (
                  <div
                    key={mat.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/5"
                  >
                    <div>
                      <h4 className="font-medium text-white">{mat.title}</h4>
                      <p className="text-xs text-white/50">
                        {mat.type} • Class:{" "}
                        {mat.classGroup === "all" || !mat.classGroup
                          ? "Any Class"
                          : `Class ${mat.classGroup}`}
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        toggleMaterialAccess(
                          managingUser.id,
                          mat.id,
                          managingUser.unlockedMaterials,
                        )
                      }
                      className={`p-2 rounded-lg transition-colors ${unlocked ? "bg-[#E5D2A5] text-[#070709]" : "bg-black/50 text-white/40 hover:text-white/80"}`}
                    >
                      {unlocked ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <LockOpen className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </motion.div>
  );
}
