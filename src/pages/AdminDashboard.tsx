import { useEffect, useState, useRef } from "react";
import { useAuthStore } from "../store/authStore";
import { db } from "../lib/firebase";
import { apiGateway, APITelemetryLog } from "../lib/apiGateway";
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
  onSnapshot,
  arrayUnion,
  orderBy,
} from "firebase/firestore";
import { motion } from "motion/react";
import { ArrowLeft, LockOpen, Check, Flame, ShieldAlert, Video, FileText, Smartphone, History, User, Save, RefreshCw, Sliders, XOctagon, Compass, AlertCircle, Camera, Layers, AlertTriangle, CheckCircle, Send, MessageSquare } from "lucide-react";
import Markdown from "react-markdown";
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
import { SyllabusRenderer, getDefaultSyllabus } from "../components/SyllabusRenderer";
import { ContentManagement } from "../components/ContentManagement";
import { parseYouTubeVideoId } from "../components/CustomVideoPlayer";

const PRESET_INFO: Record<
  string,
  { name: string; desc: string; colors: string[] }
> = {
  default: {
    name: "1. Default Luxury Gold",
    desc: "Slate-dark baseline aesthetic framing key learning workflows. Refined typography alongside luxurious bronze and pale gold accents.",
    colors: ["#070709", "var(--primary-custom, #F15A29)", "#b59f6d"],
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
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/");
    }
  }, [user, authLoading, navigate]);
  const [activeTab, setActiveTab] = useState<
    "materials" | "users" | "mentors" | "settings" | "appearance" | "security" | "syllabus" | "support_chats" | "content_management"
  >("content_management");

  // Content Management Sub-tab States
  const [contentSubTab, setContentSubTab] = useState<
    "classes" | "subjects" | "chapters" | "materials" | "upload_center"
  >("classes");

  const [classesList, setClassesList] = useState<any[]>([]);
  const [subjectsList, setSubjectsList] = useState<any[]>([]);
  const [chaptersList, setChaptersList] = useState<any[]>([]);

  // Folder Explorer Navigation States
  const [expClassId, setExpClassId] = useState<string | null>(null);
  const [expSubjectId, setExpSubjectId] = useState<string | null>(null);
  const [expChapterId, setExpChapterId] = useState<string | null>(null);

  // Forms states
  const [classEditingId, setClassEditingId] = useState<string | null>(null);
  const [classFormName, setClassFormName] = useState("");
  const [classFormOrder, setClassFormOrder] = useState<number | "">("");

  const [subjectEditingId, setSubjectEditingId] = useState<string | null>(null);
  const [subjectFormName, setSubjectFormName] = useState("");
  const [subjectFormClassId, setSubjectFormClassId] = useState("");
  const [subjectFormOrder, setSubjectFormOrder] = useState<number | "">("");

  const [chapterEditingId, setChapterEditingId] = useState<string | null>(null);
  const [chapterFormName, setChapterFormName] = useState("");
  const [chapterFormSubjectId, setChapterFormSubjectId] = useState("");

  const [mEditingId, setMEditingId] = useState<string | null>(null);
  const [mTitle, setMTitle] = useState("");
  const [mDesc, setMDesc] = useState("");
  const [mUrl, setMUrl] = useState("");
  const [mType, setMType] = useState("note");
  const [mMaterialType, setMMaterialType] = useState<
    "notes" | "pyqs" | "assignments" | "dpps" | "video_lectures" | "formula_sheets" | "tests"
  >("notes");
  const [mClassId, setMClassId] = useState("");
  const [mSubjectId, setMSubjectId] = useState("");
  const [mChapterId, setMChapterId] = useState("");
  const [mThumbnailUrl, setMThumbnailUrl] = useState("");
  const [mIsHidden, setMIsHidden] = useState(false);

  const [users, setUsers] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [mentors, setMentors] = useState<any[]>([]);

  // Support / Live Mentorship Chats States & Real-Time Sync
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [adminMessageText, setAdminMessageText] = useState("");

  useEffect(() => {
    const isAuthorizedAdmin = user?.role === "admin" || user?.role === "superadmin" || (user?.email && ["meinkxun@gmail.com", "nucleuscc2026@gmail.com"].includes(user.email.toLowerCase().trim()));
    if (!isAuthorizedAdmin) return;

    const q = query(collection(db, "chatbot_sessions"), orderBy("updatedAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const fetched: any[] = [];
      snapshot.forEach((doc) => {
        fetched.push({ id: doc.id, ...doc.data() });
      });
      setSessions(fetched);
    }, (err) => {
      console.error("Error subscribing to chatbot_sessions:", err);
    });

    return () => unsub();
  }, [user]);

  // Support Chats functions
  const handleSendAdminMessage = async () => {
    if (!activeSessionId || !adminMessageText.trim()) return;

    const currentText = adminMessageText.trim();
    setAdminMessageText("");

    const newAdminMessage = {
      id: "msg_" + Date.now(),
      role: "assistant" as const, // Rendered standard role matching chatbot or advisor
      content: currentText,
      timestamp: new Date().toISOString(),
      senderName: user?.displayName || "Teacher (Faculty)"
    };

    const sessionRef = doc(db, "chatbot_sessions", activeSessionId);
    try {
      await updateDoc(sessionRef, {
        messages: arrayUnion(newAdminMessage),
        unreadByUser: true,
        unreadByAdmin: false,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("Failed to append admin message:", err);
      alert("Failed to send message: " + String(err));
    }
  };

  const handleJoinChat = async (sessionId: string) => {
    const sessionRef = doc(db, "chatbot_sessions", sessionId);
    try {
      const systemMessage = {
        id: "msg_join_" + Date.now(),
        role: "teacher" as const,
        content: "👋 The teacher has joined the chat and you can ask whatever you want to ask freely",
        timestamp: new Date().toISOString(),
        senderName: "System"
      };

      await updateDoc(sessionRef, {
        teacherJoined: true,
        unreadByUser: true,
        updatedAt: new Date().toISOString(),
        messages: arrayUnion(systemMessage)
      });
    } catch (err) {
      console.error("Failed to join chat:", err);
      alert("Failed to join chat: " + String(err));
    }
  };

  const handleLeaveChat = async (sessionId: string) => {
    if (!window.confirm("Pause live teacher mentorship and let AI assistant resume?")) return;
    const sessionRef = doc(db, "chatbot_sessions", sessionId);
    try {
      const systemMessage = {
        id: "msg_leave_" + Date.now(),
        role: "teacher" as const,
        content: "🤖 Live mentorship session paused. Nucleus AI Assistant has resumed helping.",
        timestamp: new Date().toISOString(),
        senderName: "System"
      };

      await updateDoc(sessionRef, {
        teacherJoined: false,
        unreadByUser: true,
        updatedAt: new Date().toISOString(),
        messages: arrayUnion(systemMessage)
      });
    } catch (err) {
      console.error("Failed to leave chat:", err);
    }
  };

  const handleEndChat = async (sessionId: string) => {
    if (!window.confirm("End and permanently delete this chat session? This action is irreversible.")) return;
    const sessionRef = doc(db, "chatbot_sessions", sessionId);
    try {
      const systemMessage = {
        id: "msg_end_" + Date.now(),
        role: "assistant" as const,
        content: "Thanks for asking your queries! Hopefully your queries have been resolved. ✨",
        timestamp: new Date().toISOString(),
        senderName: "Nucleus AI Advisor"
      };

      await updateDoc(sessionRef, {
        teacherJoined: false,
        unreadByUser: true,
        updatedAt: new Date().toISOString(),
        messages: arrayUnion(systemMessage)
      });

      // Give a tiny delay for the message update to be visible to the student
      setTimeout(async () => {
        try {
          await deleteDoc(sessionRef);
          if (activeSessionId === sessionId) {
            setActiveSessionId(null);
          }
        } catch (err) {
          console.error("Failed to delete chat session:", err);
        }
      }, 1500);
    } catch (err) {
      console.error("Failed to end chat:", err);
      alert("Failed to end chat: " + String(err));
    }
  };

  const handleDeleteChatSession = async (sessionId: string) => {
    if (!window.confirm("Are you sure you want to delete this student chat session? This action is irreversible.")) return;
    try {
      await deleteDoc(doc(db, "chatbot_sessions", sessionId));
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
      }
    } catch (err) {
      console.error("Failed to delete chat session:", err);
    }
  };

  // Syllabus form states
  const [syllabusSectionName, setSyllabusSectionName] = useState("Syllabus");
  const [classSyllabuses, setClassSyllabuses] = useState<Record<string, string>>({});
  const [isSavingSyllabus, setIsSavingSyllabus] = useState(false);
  const [syllabusEditClass, setSyllabusEditClass] = useState("11");

  // Settings Form
  const [upiId, setUpiId] = useState("");
  const [upiQrCode, setUpiQrCode] = useState("");
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
  const [heroTitle, setHeroTitle] = useState("Learning That's Smart, Simple & Super Fun!");
  const [heroTitleLine1, setHeroTitleLine1] = useState("Learning That's");
  const [heroTitleLine2, setHeroTitleLine2] = useState("Smart, Simple &");
  const [heroTitleHighlight, setHeroTitleHighlight] = useState("Super Fun!");
  const [loaderSteps, setLoaderSteps] = useState("");
  const [heroSubtitle, setHeroSubtitle] = useState(
    "Master Science, Maths & More with India's most engaging learning app – where every concept clicks and every lesson feels like play.",
  );
  const [heroBadgeText, setHeroBadgeText] = useState("India's Most Engaging Learning Hub");
  const [heroCta1Text, setHeroCta1Text] = useState("Start Learning Now");
  const [heroCta1Link, setHeroCta1Link] = useState("");
  const [heroCta2Text, setHeroCta2Text] = useState("Quick Video Preview");
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
        if (!isMountedRef.current) return;
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
        if (!isMountedRef.current) return;
        const list = violSnap.docs.map(gdoc => ({ id: gdoc.id, ...gdoc.data() }));
        list.sort((a: any, b: any) => {
          const tA = a.timestamp?.seconds || 0;
          const tB = b.timestamp?.seconds || 0;
          return tB - tA;
        });
        setViolations(list);

        const devSnap = await getDocs(collection(db, "active_devices"));
        if (!isMountedRef.current) return;
        const devList = devSnap.docs.map(gdoc => ({ id: gdoc.id, ...gdoc.data() }));
        setActiveSessions(devList);
      } catch (err) {
        console.error("Error loading security state:", err);
      } finally {
        if (isMountedRef.current) {
          setSecurityTabLoading(false);
        }
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
  const [aboutMockCardValue, setAboutMockCardValue] = useState("8 Days");
  const [aboutShowIitianBadge, setAboutShowIitianBadge] = useState(true);
  const [aboutIitianBadgeText, setAboutIitianBadgeText] = useState("IITian Led");
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
  const [aboutTeacherPhotoUrl, setAboutTeacherPhotoUrl] = useState("");
  const [aboutTeacherName, setAboutTeacherName] = useState("Dr. Anand Kumar");
  const [aboutTeacherRole, setAboutTeacherRole] = useState("Senior Physics Specialist (Ex-IIT)");
  const [aboutTeacherTagline, setAboutTeacherTagline] = useState("Visualizing complex equations. Crafting interactive modules for deep analytical development.");
  const [pwaBtnText, setPwaBtnText] = useState("Install App");
  const [pwaBtnLink, setPwaBtnLink] = useState("");

  // Customizable Social Media states
  const [socialSectionTitle, setSocialSectionTitle] = useState("Connect via Socials");
  const [socialSectionSubtitle, setSocialSectionSubtitle] = useState("Stay in the loop with live streams, instant tips, sample study papers, and continuous student updates.");
  const [socialSectionShow, setSocialSectionShow] = useState(true);

  const [socialInstagramUrl, setSocialInstagramUrl] = useState("https://instagram.com/nucleus.cc");
  const [socialInstagramShow, setSocialInstagramShow] = useState(true);
  const [socialYoutubeUrl, setSocialYoutubeUrl] = useState("https://youtube.com/@nucleus");
  const [socialYoutubeShow, setSocialYoutubeShow] = useState(true);
  const [socialTelegramUrl, setSocialTelegramUrl] = useState("https://t.me/nucleus");
  const [socialTelegramShow, setSocialTelegramShow] = useState(true);
  const [socialDiscordUrl, setSocialDiscordUrl] = useState("https://discord.gg/nucleus");
  const [socialDiscordShow, setSocialDiscordShow] = useState(true);
  const [socialTwitterUrl, setSocialTwitterUrl] = useState("https://x.com/nucleus");
  const [socialTwitterShow, setSocialTwitterShow] = useState(false);
  const [socialLinkedinUrl, setSocialLinkedinUrl] = useState("");
  const [socialLinkedinShow, setSocialLinkedinShow] = useState(false);
  const [socialFacebookUrl, setSocialFacebookUrl] = useState("");
  const [socialFacebookShow, setSocialFacebookShow] = useState(false);

  // AI Chatbot Assistant States
  const [chatbotEnabled, setChatbotEnabled] = useState(false);
  const [chatbotIconUrl, setChatbotIconUrl] = useState("");
  const [aiProvider, setAiProvider] = useState<"gemini" | "openai" | "grok">("gemini");
  const [aiApiKey, setAiApiKey] = useState("");
  const [aiModel, setAiModel] = useState("gemini-3.5-flash");
  const [aiLogs, setAiLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSavingAiSettings, setIsSavingAiSettings] = useState(false);

  // SMTP Config States
  const [smtpHost, setSmtpHost] = useState("smtp.gmail.com");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpSecure, setSmtpSecure] = useState("false");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [isSavingSmtpSettings, setIsSavingSmtpSettings] = useState(false);

  // Customizable Study Stickers States
  const [studySticker1Emoji, setStudySticker1Emoji] = useState("📚");
  const [studySticker1Title, setStudySticker1Title] = useState("STUDY FORCE");
  const [studySticker1Subtitle, setStudySticker1Subtitle] = useState("Focus Active");
  const [studySticker1Popup, setStudySticker1Popup] = useState("Ignite your study sessions with maximum mental torque! 📚 Keep learning!");
  const [studySticker1Left, setStudySticker1Left] = useState("2%");
  const [studySticker1Top, setStudySticker1Top] = useState("22%");
  const [studySticker1Rotate, setStudySticker1Rotate] = useState(-12);
  const [studySticker1Show, setStudySticker1Show] = useState(true);

  const [studySticker2Emoji, setStudySticker2Emoji] = useState("💡");
  const [studySticker2Title, setStudySticker2Title] = useState("DEEP FOCUS");
  const [studySticker2Subtitle, setStudySticker2Subtitle] = useState("Active Sparks");
  const [studySticker2Popup, setStudySticker2Popup] = useState("A single spark of intuition can illuminate any difficult problem! 💡 Stay curious!");
  const [studySticker2Left, setStudySticker2Left] = useState("4%");
  const [studySticker2Top, setStudySticker2Top] = useState("76%");
  const [studySticker2Rotate, setStudySticker2Rotate] = useState(15);
  const [studySticker2Show, setStudySticker2Show] = useState(true);

  const [studySticker3Emoji, setStudySticker3Emoji] = useState("🎓");
  const [studySticker3Title, setStudySticker3Title] = useState("AIR 1 GOAL");
  const [studySticker3Subtitle, setStudySticker3Subtitle] = useState("IIT Selection");
  const [studySticker3Popup, setStudySticker3Popup] = useState("Keep your eyes on the prize. All India Rank 1 starts with persistent everyday discipline! 🎓");
  const [studySticker3Left, setStudySticker3Left] = useState("47%");
  const [studySticker3Top, setStudySticker3Top] = useState("12%");
  const [studySticker3Rotate, setStudySticker3Rotate] = useState(-8);
  const [studySticker3Show, setStudySticker3Show] = useState(true);

  const [studySticker4Emoji, setStudySticker4Emoji] = useState("🎯");
  const [studySticker4Title, setStudySticker4Title] = useState("100% AIM");
  const [studySticker4Subtitle, setStudySticker4Subtitle] = useState("Perfect Practice");
  const [studySticker4Popup, setStudySticker4Popup] = useState("Accuracy is built by constant deliberate feedback. Refine your aim daily! 🎯");
  const [studySticker4Left, setStudySticker4Left] = useState("44%");
  const [studySticker4Top, setStudySticker4Top] = useState("84%");
  const [studySticker4Rotate, setStudySticker4Rotate] = useState(10);
  const [studySticker4Show, setStudySticker4Show] = useState(true);

  const [studySticker5Emoji, setStudySticker5Emoji] = useState("☕");
  const [studySticker5Title, setStudySticker5Title] = useState("NIGHT RUNS");
  const [studySticker5Subtitle, setStudySticker5Subtitle] = useState("Midnight Session");
  const [studySticker5Popup, setStudySticker5Popup] = useState("The quiet hours are when progress is made. Fuel your academic ambition! ☕");
  const [studySticker5Left, setStudySticker5Left] = useState("88%");
  const [studySticker5Top, setStudySticker5Top] = useState("16%");
  const [studySticker5Rotate, setStudySticker5Rotate] = useState(-14);
  const [studySticker5Show, setStudySticker5Show] = useState(true);

  const [studySticker6Emoji, setStudySticker6Emoji] = useState("🧠");
  const [studySticker6Title, setStudySticker6Title] = useState("NEURAL GRID");
  const [studySticker6Subtitle, setStudySticker6Subtitle] = useState("Concept Clear");
  const [studySticker6Popup, setStudySticker6Popup] = useState("Connect the dots, master the formulas, and let neuroplasticity do the rest! 🧠");
  const [studySticker6Left, setStudySticker6Left] = useState("87%");
  const [studySticker6Top, setStudySticker6Top] = useState("78%");
  const [studySticker6Rotate, setStudySticker6Rotate] = useState(18);
  const [studySticker6Show, setStudySticker6Show] = useState(true);

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
  const [section, setSection] = useState("General");
  const [isHidden, setIsHidden] = useState(false);

  // Mentor Form
  const [mentorName, setMentorName] = useState("");
  const [mentorRole, setMentorRole] = useState("");
  const [mentorImage, setMentorImage] = useState("");
  const [mentorExperience, setMentorExperience] = useState("");
  const [mentorDescription, setMentorDescription] = useState("");
  const [editingMentorId, setEditingMentorId] = useState<string | null>(null);

  // Real-Time UI Theme Switching & Builder States
  const [appearanceTheme, setAppearanceTheme] = useState<string>("default");
  const [primaryColor, setPrimaryColor] = useState("var(--primary-custom, #F15A29)");
  const [secondaryColor, setSecondaryColor] = useState("#b59f6d");
  const [accentGlowColor, setAccentGlowColor] = useState("var(--primary-custom, #F15A29)");
  const [backgroundColor, setBackgroundColor] = useState("#070709");
  const [gradientStart, setGradientStart] = useState("var(--primary-custom, #F15A29)");
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
  const [dockBackgroundStyle, setDockBackgroundStyle] = useState<
    "frosted" | "solid"
  >("frosted");

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

  const showToast = (message: string, isError = false) => {
    alert(isError ? `❌ Error: ${message}` : `✨ ${message}`);
  };

  const fetchData = async () => {
    try {
      const usersList = await apiGateway.users.list();
      if (!isMountedRef.current) return;
      setUsers(usersList);

      const materialsList = await apiGateway.materials.list();
      if (!isMountedRef.current) return;
      setMaterials(materialsList);

      const mentorsList = await apiGateway.mentors.list();
      if (!isMountedRef.current) return;
      setMentors(mentorsList);

      const globalSettings = await apiGateway.settings.getGlobal();
      if (!isMountedRef.current) return;
      if (globalSettings) {
        const d = globalSettings;
        setSyllabusSectionName(d.syllabusSectionName || "Syllabus");
        setClassSyllabuses(d.classSyllabuses || {});
        setUpiId(d.upiId || "");
        setUpiQrCode(d.upiQrCode || "");
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
        if (d.heroTitleLine1 !== undefined) setHeroTitleLine1(d.heroTitleLine1);
        if (d.heroTitleLine2 !== undefined) setHeroTitleLine2(d.heroTitleLine2);
        if (d.heroTitleHighlight !== undefined) setHeroTitleHighlight(d.heroTitleHighlight);
        if (d.heroSubtitle !== undefined) setHeroSubtitle(d.heroSubtitle);
        if (d.loaderSteps !== undefined) setLoaderSteps(d.loaderSteps);
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
          setAboutMockCardValue(d.aboutMockCardValue || "8 Days");
          setAboutShowIitianBadge(d.aboutShowIitianBadge !== undefined ? d.aboutShowIitianBadge : true);
          setAboutIitianBadgeText(d.aboutIitianBadgeText || "IITian Led");
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
          setAboutTeacherPhotoUrl(d.aboutTeacherPhotoUrl || "");
          setAboutTeacherName(d.aboutTeacherName || "Dr. Anand Kumar");
          setAboutTeacherRole(d.aboutTeacherRole || "Senior Physics Specialist (Ex-IIT)");
          setAboutTeacherTagline(d.aboutTeacherTagline || "Visualizing complex equations. Crafting interactive modules for deep analytical development.");
          setPwaBtnText(d.pwaBtnText || "Install App");
          setPwaBtnLink(d.pwaBtnLink || "");

          setSocialSectionTitle(d.socialSectionTitle || "Connect via Socials");
          setSocialSectionSubtitle(d.socialSectionSubtitle || "Stay in the loop with live streams, instant tips, sample study papers, and continuous student updates.");
          setSocialSectionShow(d.socialSectionShow !== undefined ? d.socialSectionShow : true);
          setSocialInstagramUrl(d.socialInstagramUrl !== undefined ? d.socialInstagramUrl : "https://instagram.com/nucleus.cc");
          setSocialInstagramShow(d.socialInstagramShow !== undefined ? d.socialInstagramShow : true);
          setSocialYoutubeUrl(d.socialYoutubeUrl !== undefined ? d.socialYoutubeUrl : "https://youtube.com/@nucleus");
          setSocialYoutubeShow(d.socialYoutubeShow !== undefined ? d.socialYoutubeShow : true);
          setSocialTelegramUrl(d.socialTelegramUrl !== undefined ? d.socialTelegramUrl : "https://t.me/nucleus");
          setSocialTelegramShow(d.socialTelegramShow !== undefined ? d.socialTelegramShow : true);
          setSocialDiscordUrl(d.socialDiscordUrl !== undefined ? d.socialDiscordUrl : "https://discord.gg/nucleus");
          setSocialDiscordShow(d.socialDiscordShow !== undefined ? d.socialDiscordShow : true);
          setSocialTwitterUrl(d.socialTwitterUrl !== undefined ? d.socialTwitterUrl : "https://x.com/nucleus");
          setSocialTwitterShow(d.socialTwitterShow !== undefined ? d.socialTwitterShow : false);
          setSocialLinkedinUrl(d.socialLinkedinUrl !== undefined ? d.socialLinkedinUrl : "");
          setSocialLinkedinShow(d.socialLinkedinShow !== undefined ? d.socialLinkedinShow : false);
          setSocialFacebookUrl(d.socialFacebookUrl !== undefined ? d.socialFacebookUrl : "");
          setSocialFacebookShow(d.socialFacebookShow !== undefined ? d.socialFacebookShow : false);

          setStudySticker1Emoji(d.studySticker1Emoji || "📚");
          setStudySticker1Title(d.studySticker1Title || "STUDY FORCE");
          setStudySticker1Subtitle(d.studySticker1Subtitle || "Focus Active");
          setStudySticker1Popup(d.studySticker1Popup || "Ignite your study sessions with maximum mental torque! 📚 Keep learning!");
          setStudySticker1Left(d.studySticker1Left !== undefined ? d.studySticker1Left : "2%");
          setStudySticker1Top(d.studySticker1Top !== undefined ? d.studySticker1Top : "22%");
          setStudySticker1Rotate(d.studySticker1Rotate !== undefined ? d.studySticker1Rotate : -12);
          setStudySticker1Show(d.studySticker1Show !== undefined ? d.studySticker1Show : true);

          setStudySticker2Emoji(d.studySticker2Emoji || "💡");
          setStudySticker2Title(d.studySticker2Title || "DEEP FOCUS");
          setStudySticker2Subtitle(d.studySticker2Subtitle || "Active Sparks");
          setStudySticker2Popup(d.studySticker2Popup || "A single spark of intuition can illuminate any difficult problem! 💡 Stay curious!");
          setStudySticker2Left(d.studySticker2Left !== undefined ? d.studySticker2Left : "4%");
          setStudySticker2Top(d.studySticker2Top !== undefined ? d.studySticker2Top : "76%");
          setStudySticker2Rotate(d.studySticker2Rotate !== undefined ? d.studySticker2Rotate : 15);
          setStudySticker2Show(d.studySticker2Show !== undefined ? d.studySticker2Show : true);

          setStudySticker3Emoji(d.studySticker3Emoji || "🎓");
          setStudySticker3Title(d.studySticker3Title || "AIR 1 GOAL");
          setStudySticker3Subtitle(d.studySticker3Subtitle || "IIT Selection");
          setStudySticker3Popup(d.studySticker3Popup || "Keep your eyes on the prize. All India Rank 1 starts with persistent everyday discipline! 🎓");
          setStudySticker3Left(d.studySticker3Left !== undefined ? d.studySticker3Left : "47%");
          setStudySticker3Top(d.studySticker3Top !== undefined ? d.studySticker3Top : "12%");
          setStudySticker3Rotate(d.studySticker3Rotate !== undefined ? d.studySticker3Rotate : -8);
          setStudySticker3Show(d.studySticker3Show !== undefined ? d.studySticker3Show : true);

          setStudySticker4Emoji(d.studySticker4Emoji || "🎯");
          setStudySticker4Title(d.studySticker4Title || "100% AIM");
          setStudySticker4Subtitle(d.studySticker4Subtitle || "Perfect Practice");
          setStudySticker4Popup(d.studySticker4Popup || "Accuracy is built by constant deliberate feedback. Refine your aim daily! 🎯");
          setStudySticker4Left(d.studySticker4Left !== undefined ? d.studySticker4Left : "44%");
          setStudySticker4Top(d.studySticker4Top !== undefined ? d.studySticker4Top : "84%");
          setStudySticker4Rotate(d.studySticker4Rotate !== undefined ? d.studySticker4Rotate : 10);
          setStudySticker4Show(d.studySticker4Show !== undefined ? d.studySticker4Show : true);

          setStudySticker5Emoji(d.studySticker5Emoji || "☕");
          setStudySticker5Title(d.studySticker5Title || "NIGHT RUNS");
          setStudySticker5Subtitle(d.studySticker5Subtitle || "Midnight Session");
          setStudySticker5Popup(d.studySticker5Popup || "The quiet hours are when progress is made. Fuel your academic ambition! ☕");
          setStudySticker5Left(d.studySticker5Left !== undefined ? d.studySticker5Left : "88%");
          setStudySticker5Top(d.studySticker5Top !== undefined ? d.studySticker5Top : "16%");
          setStudySticker5Rotate(d.studySticker5Rotate !== undefined ? d.studySticker5Rotate : -14);
          setStudySticker5Show(d.studySticker5Show !== undefined ? d.studySticker5Show : true);

          setStudySticker6Emoji(d.studySticker6Emoji || "🧠");
          setStudySticker6Title(d.studySticker6Title || "NEURAL GRID");
          setStudySticker6Subtitle(d.studySticker6Subtitle || "Concept Clear");
          setStudySticker6Popup(d.studySticker6Popup || "Connect the dots, master the formulas, and let neuroplasticity do the rest! 🧠");
          setStudySticker6Left(d.studySticker6Left !== undefined ? d.studySticker6Left : "87%");
          setStudySticker6Top(d.studySticker6Top !== undefined ? d.studySticker6Top : "78%");
          setStudySticker6Rotate(d.studySticker6Rotate !== undefined ? d.studySticker6Rotate : 18);
          setStudySticker6Show(d.studySticker6Show !== undefined ? d.studySticker6Show : true);

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
          if (tc.dockBackgroundStyle) setDockBackgroundStyle(tc.dockBackgroundStyle);
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
        if (d.chatbotEnabled !== undefined) setChatbotEnabled(d.chatbotEnabled);
        if (d.chatbotIconUrl !== undefined) setChatbotIconUrl(d.chatbotIconUrl);
      }

      // Fetch AI chatbot secure config
      try {
        const aiDocRef = doc(db, "settings", "secure_bot");
        const aiDocSnap = await getDoc(aiDocRef);
        if (aiDocSnap.exists()) {
          const aiData = aiDocSnap.data();
          if (aiData.provider) setAiProvider(aiData.provider);
          if (aiData.apiKey) setAiApiKey(aiData.apiKey);
          if (aiData.model) setAiModel(aiData.model);
        }
      } catch (aiErr) {
        console.error("Error loading secure AI config:", aiErr);
      }

      // Fetch SMTP config
      try {
        const smtpDocRef = doc(db, "settings", "smtp_config");
        const smtpDocSnap = await getDoc(smtpDocRef);
        if (smtpDocSnap.exists()) {
          const smtpData = smtpDocSnap.data();
          if (smtpData.host) setSmtpHost(smtpData.host);
          if (smtpData.port) setSmtpPort(smtpData.port.toString());
          if (smtpData.secure !== undefined) setSmtpSecure(smtpData.secure.toString());
          if (smtpData.user) setSmtpUser(smtpData.user);
          if (smtpData.pass) setSmtpPass(smtpData.pass);
        }
      } catch (smtpErr) {
        console.error("Error loading secure SMTP config:", smtpErr);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Load Classes, Subjects, and Chapters in real-time on Admin mount
  useEffect(() => {
    if (!user) return;

    const unsubClasses = onSnapshot(collection(db, "classes"), (snap) => {
      const cls = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      cls.sort((a: any, b: any) => {
        if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
        return a.className.localeCompare(b.className);
      });
      setClassesList(cls);
    });

    const unsubSubjects = onSnapshot(collection(db, "subjects"), (snap) => {
      const sub = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      sub.sort((a: any, b: any) => {
        if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
        return a.subjectName.localeCompare(b.subjectName);
      });
      setSubjectsList(sub);
    });

    const unsubChapters = onSnapshot(collection(db, "chapters"), (snap) => {
      const chap = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      chap.sort((a: any, b: any) => a.chapterName.localeCompare(b.chapterName));
      setChaptersList(chap);
    });

    return () => {
      unsubClasses();
      unsubSubjects();
      unsubChapters();
    };
  }, [user]);

  // --- Content Management CRUD Event Handlers (Classes, Subjects, Chapters, Materials) ---
  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classFormName.trim()) return;
    try {
      if (classEditingId) {
        await updateDoc(doc(db, "classes", classEditingId), {
          className: classFormName,
          order: classFormOrder === "" ? 0 : Number(classFormOrder)
        });
        showToast("Class structural level updated successfully.");
      } else {
        await addDoc(collection(db, "classes"), {
          className: classFormName,
          order: classFormOrder === "" ? 0 : Number(classFormOrder),
          createdAt: serverTimestamp()
        });
        showToast("Class folder created safely.");
      }
      setClassEditingId(null);
      setClassFormName("");
      setClassFormOrder("");
    } catch (err) {
      console.error(err);
      showToast("Error saving class folder.", true);
    }
  };

  const handleReorderClass = async (id: string, dir: "up" | "down") => {
    const cls = classesList.find(c => c.id === id);
    if (!cls) return;
    const currentOrder = cls.order !== undefined ? cls.order : 0;
    const targetOrder = dir === "up" ? currentOrder - 1 : currentOrder + 1;
    try {
      await updateDoc(doc(db, "classes", id), { order: targetOrder });
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteClass = async (id: string) => {
    if (!window.confirm("Deleting this standard folder will drop all subjects, chapters, and files nested within. Proceed?")) return;
    try {
      await deleteDoc(doc(db, "classes", id));
      // Cascade delete subjects
      const subs = subjectsList.filter(s => s.classId === id);
      for (const s of subs) {
        await deleteDoc(doc(db, "subjects", s.id));
      }
      // Cascade delete chapters
      const chaps = chaptersList.filter(c => c.classId === id);
      for (const c of chaps) {
        await deleteDoc(doc(db, "chapters", c.id));
      }
      showToast("Class folder standard cascade-deleted.");
    } catch (err) {
      console.error(err);
      showToast("Error deleting class.", true);
    }
  };

  // Subjects Management operations
  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectFormName.trim() || !subjectFormClassId) return;
    try {
      if (subjectEditingId) {
        await updateDoc(doc(db, "subjects", subjectEditingId), {
          subjectName: subjectFormName,
          classId: subjectFormClassId,
          order: subjectFormOrder === "" ? 0 : Number(subjectFormOrder)
        });
        showToast("Subject folder details modified.");
      } else {
        await addDoc(collection(db, "subjects"), {
          subjectName: subjectFormName,
          classId: subjectFormClassId,
          order: subjectFormOrder === "" ? 0 : Number(subjectFormOrder),
          createdAt: serverTimestamp()
        });
        showToast("Subject folder created safely.");
      }
      setSubjectEditingId(null);
      setSubjectFormName("");
      setSubjectFormOrder("");
    } catch (err) {
      console.error(err);
      showToast("Error saving subject folder.", true);
    }
  };

  const handleDeleteSubject = async (id: string) => {
    if (!window.confirm("Delete this subject folder and all files?")) return;
    try {
      await deleteDoc(doc(db, "subjects", id));
      showToast("Subject and child chapters removed.");
    } catch (err) {
      console.error(err);
    }
  };

  // Chapter operations
  const handleSaveChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chapterFormName.trim() || !chapterFormSubjectId) return;
    const subj = subjectsList.find(s => s.id === chapterFormSubjectId);
    const associatedClassId = subj ? subj.classId : "";
    try {
      if (chapterEditingId) {
        await updateDoc(doc(db, "chapters", chapterEditingId), {
          chapterName: chapterFormName,
          subjectId: chapterFormSubjectId,
          classId: associatedClassId
        });
        showToast("Chapter folder renamed.");
      } else {
        await addDoc(collection(db, "chapters"), {
          chapterName: chapterFormName,
          subjectId: chapterFormSubjectId,
          classId: associatedClassId,
          createdAt: serverTimestamp()
        });
        showToast("Chapter folder created.");
      }
      setChapterEditingId(null);
      setChapterFormName("");
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteChapter = async (id: string) => {
    if (!window.confirm("Delete this chapter? All folders within will be deleted.")) return;
    try {
      await deleteDoc(doc(db, "chapters", id));
      showToast("Chapter database reference deleted.");
    } catch (e) {
      console.error(e);
    }
  };

  // Dynamic uploads publishing
  const handlePublishMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mTitle.trim() || !mUrl.trim() || !mClassId || !mSubjectId || !mChapterId) {
      showToast("Please specify the complete Folder Directory path details.", true);
      return;
    }
    try {
      const cls = classesList.find(c => c.id === mClassId);
      const isVideo = mType === "lecture" || mMaterialType === "video_lectures";
      
      let finalUrl = mUrl;
      let extractedVideoId = "";

      if (isVideo) {
        const isYouTubeUrl = mUrl.includes("youtube.com") || mUrl.includes("youtu.be") || mUrl.includes("shorts/");
        const youtubeId = parseYouTubeVideoId(mUrl);
        
        if (isYouTubeUrl && !youtubeId) {
          showToast("Invalid YouTube URL! We could not parse a valid 11-digit Video ID.", true);
          return;
        }
        
        if (youtubeId) {
          finalUrl = `https://www.youtube.com/embed/${youtubeId}`;
          extractedVideoId = youtubeId;
        }
      }

      const data = {
        title: mTitle,
        description: mDesc,
        url: finalUrl,
        fileUrl: finalUrl,
        videoId: extractedVideoId,
        type: mType,
        fileType: isVideo ? "video" : "pdf",
        materialType: mMaterialType,
        classId: mClassId,
        subjectId: mSubjectId,
        chapterId: mChapterId,
        classGroup: cls ? cls.className.replace('Class ', '').toLowerCase() : 'all',
        thumbnailUrl: mThumbnailUrl || "https://images.unsplash.com/photo-1614064641938-3bbee52942c7?auto=format&fit=crop&q=80&w=400",
        isHidden: mIsHidden,
        downloadCount: 0,
        bookmarks: [],
        createdAt: serverTimestamp()
      };

      let matId = mEditingId;

      if (mEditingId) {
        await updateDoc(doc(db, "materials", mEditingId), data);
        showToast("Content file record in directory updated.");
      } else {
        const docRef = await addDoc(collection(db, "materials"), data);
        matId = docRef.id;
        showToast("Published file successfully to folder directory!");
      }

      if (finalUrl && matId) {
        await setDoc(doc(db, "materials_secure", matId), { url: finalUrl });
      }

      setMEditingId(null);
      setMTitle("");
      setMDesc("");
      setMUrl("");
      setMThumbnailUrl("");
      setMIsHidden(false);
    } catch (err) {
      console.error(err);
      showToast("Error updating materials file document.", true);
    }
  };

  const handleEditMaterialDirect = (mat: any) => {
    setMEditingId(mat.id);
    setMTitle(mat.title);
    setMDesc(mat.description || "");
    setMUrl(mat.url);
    setMType(mat.type || "note");
    setMMaterialType(mat.materialType || "notes");
    setMClassId(mat.classId || "");
    setMSubjectId(mat.subjectId || "");
    setMChapterId(mat.chapterId || "");
    setMThumbnailUrl(mat.thumbnailUrl || "");
    setMIsHidden(mat.isHidden || false);
    setContentSubTab("upload_center");
  };

  const handleDeleteMaterialDirect = async (id: string) => {
    if (!window.confirm("Delete this material resource?")) return;
    try {
      await deleteDoc(doc(db, "materials", id));
      showToast("File deleted from workspace.");
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleMaterialVisibilityDirect = async (id: string, current: boolean) => {
    try {
      await updateDoc(doc(db, "materials", id), {
        isHidden: !current
      });
      showToast(`Material toggled to ${!current ? "private" : "public"}.`);
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
        dockBackgroundStyle,
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
    dockBackgroundStyle,
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
    setDockBackgroundStyle(preset.dockBackgroundStyle || "frosted");

    // Sync manual contrast overrides
    setEnableManualOverrides(preset.enableManualOverrides || false);
    setOverrideTextPrimary(preset.overrideTextPrimary || "#fafafa");
    setOverrideTextSecondary(preset.overrideTextSecondary || "#cbd5e1");
    setOverrideTextMuted(preset.overrideTextMuted || "#71717a");
  };

  const handleSaveDraft = async () => {
    if (user?.role !== "superadmin" && user?.role !== "admin")
      return alert("Only administrators can update designs.");
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
      dockBackgroundStyle,
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
    if (user?.role !== "superadmin" && user?.role !== "admin")
      return alert("Only administrators can publish themes.");
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
      dockBackgroundStyle,
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
        dockBackgroundStyle,
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
      dockBackgroundStyle,
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
      if (imported.dockBackgroundStyle) setDockBackgroundStyle(imported.dockBackgroundStyle);

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
    if (user?.role !== "superadmin" && user?.role !== "admin")
      return alert("Only administrators can update settings.");
    try {
      await setDoc(
        doc(db, "settings", "global"),
        {
          upiId,
          upiQrCode,
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
          heroTitleLine1,
          heroTitleLine2,
          heroTitleHighlight,
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
          aboutTeacherPhotoUrl,
          aboutTeacherName,
          aboutTeacherRole,
          aboutTeacherTagline,
          pwaBtnText,
          pwaBtnLink,
          socialSectionTitle,
          socialSectionSubtitle,
          socialSectionShow,
          socialInstagramUrl,
          socialInstagramShow,
          socialYoutubeUrl,
          socialYoutubeShow,
          socialTelegramUrl,
          socialTelegramShow,
          socialDiscordUrl,
          socialDiscordShow,
          socialTwitterUrl,
          socialTwitterShow,
          socialLinkedinUrl,
          socialLinkedinShow,
          socialFacebookUrl,
          socialFacebookShow,
          studySticker1Emoji,
          studySticker1Title,
          studySticker1Subtitle,
          studySticker1Popup,
          studySticker1Left,
          studySticker1Top,
          studySticker1Rotate,
          studySticker1Show,
          studySticker2Emoji,
          studySticker2Title,
          studySticker2Subtitle,
          studySticker2Popup,
          studySticker2Left,
          studySticker2Top,
          studySticker2Rotate,
          studySticker2Show,
          studySticker3Emoji,
          studySticker3Title,
          studySticker3Subtitle,
          studySticker3Popup,
          studySticker3Left,
          studySticker3Top,
          studySticker3Rotate,
          studySticker3Show,
          studySticker4Emoji,
          studySticker4Title,
          studySticker4Subtitle,
          studySticker4Popup,
          studySticker4Left,
          studySticker4Top,
          studySticker4Rotate,
          studySticker4Show,
          studySticker5Emoji,
          studySticker5Title,
          studySticker5Subtitle,
          studySticker5Popup,
          studySticker5Left,
          studySticker5Top,
          studySticker5Rotate,
          studySticker5Show,
          studySticker6Emoji,
          studySticker6Title,
          studySticker6Subtitle,
          studySticker6Popup,
          studySticker6Left,
          studySticker6Top,
          studySticker6Rotate,
          studySticker6Show,
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
          syllabusSectionName,
          classSyllabuses,
          chatbotEnabled,
          chatbotIconUrl,
          loaderSteps,
        },
        { merge: true },
      );
      alert("changes has been done");
    } catch (e) {
      console.error(e);
      alert("Failed to save settings.");
    }
  };

  const handleSaveAiSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user?.role !== "superadmin" && user?.role !== "admin") {
      alert("Only administrators can update AI Assistant settings.");
      return;
    }
    setIsSavingAiSettings(true);
    try {
      await setDoc(
        doc(db, "settings", "secure_bot"),
        {
          provider: aiProvider,
          apiKey: aiApiKey,
          model: aiModel,
        },
        { merge: true }
      );

      // Save to server backup cache to overcome backend service account cross-project IAM bounds
      try {
        await fetch("/api/chatbot/config", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            provider: aiProvider,
            apiKey: aiApiKey,
            model: aiModel,
            userEmail: user?.email,
          }),
        });
      } catch (backupErr) {
        console.error("Failed to update backend config backup:", backupErr);
      }

      alert("AI Assistant config updated successfully!");
    } catch (err: any) {
      console.error(err);
      alert("Failed to save AI settings: " + err.message);
    } finally {
      setIsSavingAiSettings(false);
    }
  };

  const handleSaveSmtpSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user?.role !== "superadmin" && user?.role !== "admin") {
      alert("Only administrators can update SMTP settings.");
      return;
    }
    setIsSavingSmtpSettings(true);
    try {
      await setDoc(
        doc(db, "settings", "smtp_config"),
        {
          host: smtpHost.trim(),
          port: parseInt(smtpPort) || 587,
          secure: smtpSecure === "true",
          user: smtpUser.trim(),
          pass: smtpPass.trim(),
        },
        { merge: true }
      );

      // Save to server backup cache by notifying the server about the update
      try {
        await fetch("/api/auth/smtp-config-sync", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            host: smtpHost.trim(),
            port: parseInt(smtpPort) || 587,
            secure: smtpSecure === "true",
            user: smtpUser.trim(),
            pass: smtpPass.trim(),
            userEmail: user?.email,
          }),
        });
      } catch (backupErr) {
        console.error("Failed to update backend SMTP config backup:", backupErr);
      }

      alert("SMTP dynamic configuration saved and synchronized successfully!");
    } catch (err: any) {
      console.error(err);
      alert("Failed to save SMTP settings: " + err.message);
    } finally {
      setIsSavingSmtpSettings(false);
    }
  };

  const fetchAiLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch("/api/chatbot/logs");
      if (res.ok) {
        const data = await res.json();
        setAiLogs(data.logs || []);
      }
    } catch (e) {
      console.error("Error fetching AI logs:", e);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleSaveSyllabusSettings = async () => {
    if (!user) return;
    if (user?.role !== "superadmin" && user?.role !== "admin") {
      alert("Only administrators can update syllabus data.");
      return;
    }
    try {
      setIsSavingSyllabus(true);
      await setDoc(
        doc(db, "settings", "global"),
        {
          syllabusSectionName,
          classSyllabuses,
        },
        { merge: true },
      );
      alert("Syllabus configuration updated successfully!");
    } catch (err: any) {
      console.error(err);
      alert("Failed to save syllabus: " + err.message);
    } finally {
      setIsSavingSyllabus(false);
    }
  };

  const handleCreateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      const isVideo = type === "lecture";
      let finalUrl = url;
      let extractedVideoId = "";

      if (isVideo) {
        const isYouTubeUrl = url.includes("youtube.com") || url.includes("youtu.be") || url.includes("shorts/");
        const youtubeId = parseYouTubeVideoId(url);
        
        if (isYouTubeUrl && !youtubeId) {
          showToast("Invalid YouTube URL! We could not parse a valid 11-digit Video ID.", true);
          return;
        }
        
        if (youtubeId) {
          finalUrl = `https://www.youtube.com/embed/${youtubeId}`;
          extractedVideoId = youtubeId;
        }
      }

      if (editingMaterialId) {
        await updateDoc(doc(db, "materials", editingMaterialId), {
          title,
          description: desc,
          type,
          url: finalUrl,
          fileUrl: finalUrl,
          videoId: extractedVideoId,
          thumbnailUrl,
          requiredPlan: plan,
          classGroup,
          section: section || "General",
          isHidden: isHidden || false,
          updatedAt: serverTimestamp(),
        });
        await setDoc(doc(db, "materials_secure", editingMaterialId), { url: finalUrl });
        setEditingMaterialId(null);
      } else {
        const docRef = await addDoc(collection(db, "materials"), {
          title,
          description: desc,
          type,
          url: finalUrl,
          fileUrl: finalUrl,
          videoId: extractedVideoId,
          thumbnailUrl,
          requiredPlan: plan,
          classGroup,
          section: section || "General",
          isHidden: isHidden || false,
          authorId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        await setDoc(doc(db, "materials_secure", docRef.id), { url: finalUrl });
      }

      setTitle("");
      setDesc("");
      setUrl("");
      setThumbnailUrl("");
      setPlan("free");
      setClassGroup("all");
      setType("note");
      setSection("General");
      setIsHidden(false);
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
    setSection(mat.section || "General");
    setIsHidden(mat.isHidden || false);
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
    setSection("General");
    setIsHidden(false);
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
      id="admin-panel-container"
      initial={{ opacity: 0, filter: "blur(5px)" }}
      animate={{ opacity: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, filter: "blur(5px)" }}
      transition={{ duration: 0.5 }}
      className="min-h-screen pt-24 pb-32 px-6 md:px-12 max-w-7xl mx-auto"
    >
      <style>{`
        body, html, #root {
          background-color: #000000 !important;
        }
        #admin-panel-container {
          --primary-custom: #F15A29;
          background-color: #000000 !important;
        }
        #admin-panel-container h1,
        #admin-panel-container h2,
        #admin-panel-container h3,
        #admin-panel-container h4,
        #admin-panel-container h5,
        #admin-panel-container h6,
        #admin-panel-container p,
        #admin-panel-container span,
        #admin-panel-container strong,
        #admin-panel-container label,
        #admin-panel-container legend,
        #admin-panel-container caption,
        #admin-panel-container th,
        #admin-panel-container td,
        #admin-panel-container li,
        #admin-panel-container a,
        #admin-panel-container :not(.bg-primary):not([class*="bg-primary"]) > svg {
          color: var(--color-primary, #F15A29) !important;
        }

        /* Black text for solid primary-colored surfaces */
        #admin-panel-container .bg-primary,
        #admin-panel-container [class*="bg-primary"],
        #admin-panel-container button.bg-primary,
        #admin-panel-container button[class*="bg-primary"],
        #admin-panel-container .bg-primary *,
        #admin-panel-container [class*="bg-primary"] * {
          color: #000000 !important;
          fill: #000000 !important;
        }

        /* Subcontainers, forms, and tables background to deep black for maximum premium look */
        #admin-panel-container div[class*="bg-white/5"],
        #admin-panel-container div[class*="bg-white/10"],
        #admin-panel-container div[class*="bg-black/"],
        #admin-panel-container div[class*="bg-zinc-"],
        #admin-panel-container div.bg-zinc-900\\/60,
        #admin-panel-container .bg-white\\/5,
        #admin-panel-container .bg-white\\/10,
        #admin-panel-container .bg-black\\/40,
        #admin-panel-container .bg-black\\/50 {
          background-color: #000000 !important;
          border-color: rgba(241, 90, 41, 0.25) !important;
        }

        /* Input controls and buttons */
        #admin-panel-container input,
        #admin-panel-container textarea,
        #admin-panel-container select {
          background-color: #000000 !important;
          color: var(--color-primary, #F15A29) !important;
          border-color: rgba(241, 90, 41, 0.4) !important;
        }
        #admin-panel-container input::placeholder,
        #admin-panel-container textarea::placeholder {
          color: rgba(241, 90, 41, 0.45) !important;
        }
        #admin-panel-container input:focus,
        #admin-panel-container textarea:focus,
        #admin-panel-container select:focus {
          border-color: var(--color-primary, #F15A29) !important;
          box-shadow: 0 0 0 2px rgba(241, 90, 41, 0.15) !important;
        }

        /* Adjust all border utilities to use fine-grained theme orange */
        #admin-panel-container .border,
        #admin-panel-container [class*="border-white/"],
        #admin-panel-container [class*="border-dashed"] {
          border-color: rgba(241, 90, 41, 0.2) !important;
        }
        
        #admin-translucent-tab-bar {
          background-color: #000000 !important;
          border-color: rgba(241, 90, 41, 0.3) !important;
        }
      `}</style>
      <button
        onClick={() => navigate("/dashboard")}
        className="mb-8 flex items-center gap-2 text-white/50 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back to Dashboard</span>
      </button>

      <h1 className="text-4xl font-display font-medium mb-8">Admin Control</h1>

      {/* iOS-Style Solid Translucent Navigation Bar */}
      <div 
        id="admin-translucent-tab-bar" 
        className="w-full bg-zinc-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-1.5 mb-8 shadow-xl flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        <button
          id="tab-btn-content-management"
          onClick={() => {
            setActiveTab("content_management");
            setContentSubTab("classes");
          }}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "content_management"
              ? "bg-primary text-zinc-950 shadow-md font-bold scale-[1.02]"
              : "text-white/60 hover:text-white hover:bg-white/5"
          }`}
        >
          📂 Content Management
        </button>
        <button
          id="tab-btn-materials"
          onClick={() => setActiveTab("materials")}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "materials"
              ? "bg-primary text-zinc-950 shadow-md font-bold scale-[1.02]"
              : "text-white/60 hover:text-white hover:bg-white/5"
          }`}
        >
          Content Engine
        </button>
        <button
          id="tab-btn-users"
          onClick={() => setActiveTab("users")}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "users"
              ? "bg-primary text-zinc-950 shadow-md font-bold scale-[1.02]"
              : "text-white/60 hover:text-white hover:bg-white/5"
          }`}
        >
          Student Roster
        </button>
        <button
          id="tab-btn-mentors"
          onClick={() => setActiveTab("mentors")}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "mentors"
              ? "bg-primary text-zinc-950 shadow-md font-bold scale-[1.02]"
              : "text-white/60 hover:text-white hover:bg-white/5"
          }`}
        >
          Faculty / Mentors
        </button>
        {(user?.role === "superadmin" || user?.role === "admin") && (
          <button
            id="tab-btn-appearance"
            onClick={() => setActiveTab("appearance")}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "appearance"
                ? "bg-primary text-zinc-950 shadow-md font-bold scale-[1.02]"
                : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
          >
            🎨 Appearance
          </button>
        )}
        {(user?.role === "superadmin" || user?.role === "admin") && (
          <button
            id="tab-btn-settings"
            onClick={() => setActiveTab("settings")}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "settings"
                ? "bg-primary text-zinc-950 shadow-md font-bold scale-[1.02]"
                : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
          >
            Settings
          </button>
        )}
        {(user?.role === "superadmin" || user?.role === "admin") && (
          <button
            id="tab-btn-syllabus"
            onClick={() => setActiveTab("syllabus")}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "syllabus"
                ? "bg-primary text-zinc-950 shadow-md font-bold scale-[1.02]"
                : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
          >
            📚 Syllabus Planner
          </button>
        )}
        {(user?.role === "superadmin" || user?.role === "admin") && (
          <button
            id="tab-btn-support-chats"
            onClick={() => setActiveTab("support_chats")}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === "support_chats"
                ? "bg-[#E5D2A5] text-zinc-950 shadow-md font-bold scale-[1.02]"
                : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
          >
            <span>💬 Live Chats</span>
            {sessions.some(s => s.unreadByAdmin) && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            )}
          </button>
        )}
        {(user?.role === "superadmin" || user?.role === "admin") && (
          <button
            id="tab-btn-security"
            onClick={() => setActiveTab("security")}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "security"
                ? "bg-red-500 text-white shadow-md font-bold scale-[1.02]"
                : "text-red-400/80 hover:text-red-300 hover:bg-red-500/10"
            }`}
          >
            🛡️ Security Center
          </button>
        )}
      </div>

      {activeTab === "appearance" && (user?.role === "superadmin" || user?.role === "admin") && (
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
                  Button Accent Shape
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

              {/* LMS Dashboard Layout Template */}
              <div className="border-t border-white/5 pt-4">
                <label className="block text-xs font-medium text-white/60 mb-2 font-display">
                  LMS Dashboard Layout Template
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

              {/* LiquidGlassDock Background Style */}
              <div className="border-t border-white/5 pt-4">
                <label className="block text-xs font-medium text-white/60 mb-2 font-display flex items-center justify-between">
                  <span>LiquidGlassDock Background Style</span>
                  <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-mono uppercase tracking-widest scale-90">Dock Style</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(["frosted", "solid"] as const).map((style) => (
                    <button
                      key={style}
                      type="button"
                      onClick={() => setDockBackgroundStyle(style)}
                      className={`py-1.5 px-1 capitalize rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                        dockBackgroundStyle === style
                          ? "bg-primary text-black border-primary font-bold"
                          : "bg-black/20 border-white/5 text-white/60 hover:border-white/10"
                      }`}
                    >
                      {style}
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

      {activeTab === "settings" && (user?.role === "superadmin" || user?.role === "admin") && (
        <div className="max-w-4xl border border-white/10 p-6 rounded-2xl bg-white/5">
          <h3 className="text-xl font-medium mb-6">Global Settings</h3>
          <form onSubmit={handleSaveSettings} className="space-y-6">
            {/* Prices Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-medium text-[var(--primary-custom, #F15A29)] uppercase tracking-wide">
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
                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[var(--primary-custom, #F15A29)]"
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
                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[var(--primary-custom, #F15A29)]"
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
                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[var(--primary-custom, #F15A29)]"
                  />
                </div>
                <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-white/60 mb-2">
                      UPI ID (For Payments)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. john@upi"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-[var(--primary-custom, #F15A29)]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/60 mb-2">
                      Custom UPI QR Code Image URL (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. https://domain.com/my-qr.jpg (leave blank to auto-generate from UPI ID)"
                      value={upiQrCode}
                      onChange={(e) => setUpiQrCode(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-[var(--primary-custom, #F15A29)]"
                    />
                  </div>
                </div>
              </div>

              {/* Pricing Cards Content Customizer */}
              <div className="mb-8 p-5 rounded-2xl border border-[var(--primary-custom, #F15A29)]/20 bg-[var(--primary-custom, #F15A29)]/5 space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-[var(--primary-custom, #F15A29)] uppercase tracking-wide">
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
                        className="w-full px-3 py-2 text-xs rounded-lg bg-black/45 border border-white/10 text-white focus:outline-none focus:border-[var(--primary-custom, #F15A29)]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-white/50 mb-1">Card Header Title</label>
                      <input
                        type="text"
                        value={pricingCard1Title}
                        onChange={(e) => setPricingCard1Title(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg bg-black/45 border border-white/10 text-white focus:outline-none focus:border-[var(--primary-custom, #F15A29)]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-white/50 mb-1">Description / Subtitle Info</label>
                    <textarea
                      value={pricingCard1Desc}
                      onChange={(e) => setPricingCard1Desc(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 text-xs font-sans rounded-lg bg-black/45 border border-white/10 text-white focus:outline-none focus:border-[var(--primary-custom, #F15A29)] resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/50 mb-1">Checklist Features (Comma-Separated Items)</label>
                    <input
                      type="text"
                      value={pricingCard1Features}
                      onChange={(e) => setPricingCard1Features(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg bg-black/45 border border-white/10 text-white focus:outline-none focus:border-[var(--primary-custom, #F15A29)]"
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
                        className="w-full px-3 py-2 text-xs rounded-lg bg-black/45 border border-white/10 text-white focus:outline-none focus:border-[var(--primary-custom, #F15A29)]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-white/50 mb-1">Card Header Title</label>
                      <input
                        type="text"
                        value={pricingCard2Title}
                        onChange={(e) => setPricingCard2Title(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg bg-black/45 border border-white/10 text-white focus:outline-none focus:border-[var(--primary-custom, #F15A29)]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-white/50 mb-1">Description / Subtitle Info</label>
                    <textarea
                      value={pricingCard2Desc}
                      onChange={(e) => setPricingCard2Desc(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 text-xs font-sans rounded-lg bg-black/45 border border-white/10 text-white focus:outline-none focus:border-[var(--primary-custom, #F15A29)] resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/50 mb-1">Checklist Features (Comma-Separated Items)</label>
                    <input
                      type="text"
                      value={pricingCard2Features}
                      onChange={(e) => setPricingCard2Features(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg bg-black/45 border border-white/10 text-white focus:outline-none focus:border-[var(--primary-custom, #F15A29)]"
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
                        className="w-full px-3 py-2 text-xs rounded-lg bg-black/45 border border-white/10 text-white focus:outline-none focus:border-[var(--primary-custom, #F15A29)]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-white/50 mb-1">Card Header Title</label>
                      <input
                        type="text"
                        value={pricingCard3Title}
                        onChange={(e) => setPricingCard3Title(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg bg-black/45 border border-white/10 text-white focus:outline-none focus:border-[var(--primary-custom, #F15A29)]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-white/50 mb-1">Description / Subtitle Info</label>
                    <textarea
                      value={pricingCard3Desc}
                      onChange={(e) => setPricingCard3Desc(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 text-xs font-sans rounded-lg bg-black/45 border border-white/10 text-white focus:outline-none focus:border-[var(--primary-custom, #F15A29)] resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/50 mb-1">Checklist Features (Comma-Separated Items)</label>
                    <input
                      type="text"
                      value={pricingCard3Features}
                      onChange={(e) => setPricingCard3Features(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg bg-black/45 border border-white/10 text-white focus:outline-none focus:border-[var(--primary-custom, #F15A29)]"
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
                        className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[var(--primary-custom, #F15A29)]"
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
                        className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[var(--primary-custom, #F15A29)]"
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
                        className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[var(--primary-custom, #F15A29)]"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Branding Section */}
            <div>
              <h4 className="text-sm font-medium text-[var(--primary-custom, #F15A29)] mb-4 uppercase tracking-wide">
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
                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[var(--primary-custom, #F15A29)]"
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
                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[var(--primary-custom, #F15A29)]"
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
                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[var(--primary-custom, #F15A29)]"
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
                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-[var(--primary-custom, #F15A29)]"
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
                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-[var(--primary-custom, #F15A29)]"
                  />
                </div>
              </div>
            </div>

            {/* Hero Section settings */}
            <div>
              <h4 className="text-sm font-medium text-[var(--primary-custom, #F15A29)] mb-4 uppercase tracking-wide">
                Hero Section (Home)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm text-white/60 mb-2">
                    Fallback Headline
                  </label>
                  <input
                    type="text"
                    value={heroTitle}
                    onChange={(e) => setHeroTitle(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[var(--primary-custom, #F15A29)]"
                  />
                </div>

                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 border border-white/5 bg-white/5 p-4 rounded-xl mt-2 mb-2">
                  <div className="md:col-span-3">
                    <span className="text-xs font-bold text-[var(--primary-custom,#F15A29)] tracking-wider uppercase">Doodle Title Configuration (Editable Layout)</span>
                    <p className="text-xs text-white/50 mt-1">Controls the text structure EXACTLY like the playful handdrawn layout in the landing page (e.g., sparkles and curved double underlines).</p>
                  </div>
                  <div>
                    <label className="block text-xs text-white/60 mb-1.5">Line 1 (Top Style)</label>
                    <input
                      type="text"
                      value={heroTitleLine1}
                      onChange={(e) => setHeroTitleLine1(e.target.value)}
                      placeholder="Learning That's"
                      className="w-full px-3 py-2 text-sm rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[var(--primary-custom, #F15A29)]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/60 mb-1.5">Line 2 (Middle Style)</label>
                    <input
                      type="text"
                      value={heroTitleLine2}
                      onChange={(e) => setHeroTitleLine2(e.target.value)}
                      placeholder="Smart, Simple &"
                      className="w-full px-3 py-2 text-sm rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[var(--primary-custom, #F15A29)]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/60 mb-1.5">Line 3 Highlight (Double Underlined)</label>
                    <input
                      type="text"
                      value={heroTitleHighlight}
                      onChange={(e) => setHeroTitleHighlight(e.target.value)}
                      placeholder="Super Fun!"
                      className="w-full px-3 py-2 text-sm rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[var(--primary-custom, #F15A29)]"
                    />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-white/60 mb-2">
                    Subtitle / Description
                  </label>
                  <textarea
                    value={heroSubtitle}
                    onChange={(e) => setHeroSubtitle(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[var(--primary-custom, #F15A29)] h-20 resize-none"
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
                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[var(--primary-custom, #F15A29)]"
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
                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[var(--primary-custom, #F15A29)]"
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
                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[var(--primary-custom, #F15A29)]"
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
                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[var(--primary-custom, #F15A29)]"
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
                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[var(--primary-custom, #F15A29)]"
                  />
                </div>
              </div>
            </div>

            {/* Interactive Loading Screen Customizer Section */}
            <div>
              <h4 className="text-sm font-medium text-[var(--primary-custom, #F15A29)] mb-4 uppercase tracking-wide">
                Interactive Loading Screen Customizer
              </h4>
              <div className="grid grid-cols-1 gap-4 mb-4">
                <div>
                  <label className="block text-sm text-white/60 mb-2">
                    Dynamic Progress Steps (One text per line)
                  </label>
                  <textarea
                    value={loaderSteps}
                    onChange={(e) => setLoaderSteps(e.target.value)}
                    placeholder="Formulating learning equations...&#10;Learn to become smart&#10;Learn to become simple&#10;Learn to become super fun!&#10;Ready to play & learn!"
                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[var(--primary-custom, #F15A29)] h-32 font-mono scrollbar-thin"
                  />
                  <p className="text-xs text-white/45 mt-1">
                    Provide the phrases to show sequentially (one per line) as the application fully boots.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer Section */}
            <div>
              <h4 className="text-sm font-medium text-[var(--primary-custom, #F15A29)] mb-4 uppercase tracking-wide">
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
                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[var(--primary-custom, #F15A29)] h-20 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Review & Contact Form Section */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-[var(--primary-custom, #F15A29)] mb-4 uppercase tracking-wide">
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
                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-[var(--primary-custom, #F15A29)]"
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
              <h4 className="text-sm font-medium text-[var(--primary-custom, #F15A29)] mb-4 uppercase tracking-wide font-display">
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
                          className="w-full px-3 py-2 text-sm rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[var(--primary-custom, #F15A29)]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-white/60 mb-1.5">Card Subtitle</label>
                        <input
                          type="text"
                          value={aboutMockCardSubtitle}
                          onChange={(e) => setAboutMockCardSubtitle(e.target.value)}
                          className="w-full px-3 py-2 text-sm rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[var(--primary-custom, #F15A29)]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-white/60 mb-1.5">Streak Value</label>
                        <input
                          type="text"
                          value={aboutMockCardValue}
                          onChange={(e) => setAboutMockCardValue(e.target.value)}
                          className="w-full px-3 py-2 text-sm rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[var(--primary-custom, #F15A29)]"
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
                        className="w-full px-3 py-2 text-sm rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[var(--primary-custom, #F15A29)]"
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
                        className="w-full px-3 py-2 text-sm rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[var(--primary-custom, #F15A29)]"
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
                            className="w-full px-3 py-2 text-sm rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[var(--primary-custom, #F15A29)]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-white/60 mb-1.5">Capsule Badge (e.g. Class 11)</label>
                          <input
                            type="text"
                            value={aboutCalculusBadge}
                            onChange={(e) => setAboutCalculusBadge(e.target.value)}
                            className="w-full px-3 py-2 text-sm rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[var(--primary-custom, #F15A29)]"
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
                            className="w-full px-3 py-2 text-sm rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[var(--primary-custom, #F15A29)]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-white/60 mb-1.5">Lecture Stats Text</label>
                          <input
                            type="text"
                            value={aboutCalculusLectureText}
                            onChange={(e) => setAboutCalculusLectureText(e.target.value)}
                            className="w-full px-3 py-2 text-sm rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[var(--primary-custom, #F15A29)]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-white/60 mb-1.5">Percent Label Text</label>
                          <input
                            type="text"
                            value={aboutCalculusPercentText}
                            onChange={(e) => setAboutCalculusPercentText(e.target.value)}
                            className="w-full px-3 py-2 text-sm rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[var(--primary-custom, #F15A29)]"
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
                          className="w-full px-3 py-2 text-sm rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[var(--primary-custom, #F15A29)]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-white/60 mb-1.5">Rating Description</label>
                        <input
                          type="text"
                          value={aboutRatingDesc}
                          onChange={(e) => setAboutRatingDesc(e.target.value)}
                          className="w-full px-3 py-2 text-sm rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[var(--primary-custom, #F15A29)]"
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
                        className="w-full px-3 py-2 text-sm rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[var(--primary-custom, #F15A29)]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-white/60 mb-1.5">Image Shape Style</label>
                      <select
                        value={aboutCornerImgShape}
                        onChange={(e) => setAboutCornerImgShape(e.target.value as "circle" | "card")}
                        className="w-full px-3 py-2 text-sm rounded-lg bg-black/40 border border-white/10 text-[var(--primary-custom, #F15A29)] focus:outline-none focus:border-[var(--primary-custom, #F15A29)]"
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
                        className="w-full px-3 py-2 text-sm rounded-lg bg-black/40 border border-[#ff7a00]/30 text-[#ff7a00] focus:outline-none focus:border-[var(--primary-custom, #F15A29)]"
                      >
                        <option value="water_spread">Liquid Water Spread Spill Pattern (Orange)</option>
                        <option value="orange_burst">Balloon Burst Splatter Burst (Orange)</option>
                        <option value="none">Neutral Clean Background (No pop splash)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Interactive Teacher Card on Click */}
                <div className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-4">
                  <div>
                    <span className="text-sm font-semibold text-white flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[var(--primary-custom, #F15A29)]" /> 
                      Interactive Teacher Showcase Card (Streak Widget Click)
                    </span>
                    <p className="text-xs text-white/50 mt-1">
                      Customize the details of the roundish corner teacher box that appears with high-end dark water-spraying backdrop.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-white/60 mb-1.5">Teacher Photo URL</label>
                      <input
                        type="text"
                        placeholder="https://images.unsplash.com/..."
                        value={aboutTeacherPhotoUrl}
                        onChange={(e) => setAboutTeacherPhotoUrl(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[var(--primary-custom, #F15A29)]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-white/60 mb-1.5">Teacher Name</label>
                      <input
                        type="text"
                        placeholder="Dr. Anand Kumar"
                        value={aboutTeacherName}
                        onChange={(e) => setAboutTeacherName(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[var(--primary-custom, #F15A29)]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-white/60 mb-1.5">Teacher Role/Credentials</label>
                      <input
                        type="text"
                        placeholder="Senior Physics Specialist (Ex-IIT)"
                        value={aboutTeacherRole}
                        onChange={(e) => setAboutTeacherRole(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[var(--primary-custom, #F15A29)]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-white/60 mb-1.5">Inspiring Tagline / Bio Quote</label>
                    <textarea
                      placeholder="Visualizing complex equations. Crafting interactive modules for deep analytical development."
                      value={aboutTeacherTagline}
                      onChange={(e) => setAboutTeacherTagline(e.target.value)}
                      className="w-full h-16 px-3 py-2 text-sm rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[var(--primary-custom, #F15A29)] resize-none"
                    />
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
                        className="w-full px-3 py-2 text-sm rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[var(--primary-custom, #F15A29)]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-white/60 mb-1.5">Action Redirect URL (Optional)</label>
                      <input
                        type="text"
                        placeholder="https://play.google.com/store/apps/details?id=..."
                        value={pwaBtnLink}
                        onChange={(e) => setPwaBtnLink(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[var(--primary-custom, #F15A29)]"
                      />
                      <span className="text-[10px] text-white/40 mt-1 block">
                        Leave blank to activate the default seamless PWA installation flow.
                      </span>
                    </div>
                  </div>
                </div>

                {/* 5d. Social Media Live Links & Channels Widget */}
                <div id="social-media-channels-control-card" className="p-4 rounded-xl border border-white/10 bg-white/5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                    <div>
                      <span className="text-sm font-semibold text-white flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" /> 
                        Footer Social Media Links & Visibility Control Panel
                      </span>
                      <p className="text-xs text-white/50 mt-1">
                        Control the footer social media links, edit custom redirection profiles, and toggle channel visibility inside the footer.
                      </p>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setSocialSectionShow(!socialSectionShow)}
                      className={`px-4 py-1.5 rounded-full text-xs font-bold cursor-pointer transition-colors self-start sm:self-auto ${
                        socialSectionShow ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white/10 text-white/60 border border-white/10"
                      }`}
                    >
                      {socialSectionShow ? "Section Enabled" : "Section Hidden"}
                    </button>
                  </div>

                  {socialSectionShow && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                        <div>
                          <label className="block text-xs text-white/60 mb-1.5">Section Main Header Text</label>
                          <input
                            type="text"
                            placeholder="Connect via Socials"
                            value={socialSectionTitle}
                            onChange={(e) => setSocialSectionTitle(e.target.value)}
                            className="w-full px-3 py-2 text-sm rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[var(--primary-custom, #F15A29)]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-white/60 mb-1.5">Section Sub-header Text Detail</label>
                          <input
                            type="text"
                            placeholder="Stay in the loop with live streams..."
                            value={socialSectionSubtitle}
                            onChange={(e) => setSocialSectionSubtitle(e.target.value)}
                            className="w-full px-3 py-2 text-sm rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[var(--primary-custom, #F15A29)]"
                          />
                        </div>
                      </div>

                      <div className="h-px bg-white/10 my-4" />
                      <span className="text-xs font-bold text-[var(--primary-custom, #F15A29)] block mb-2 uppercase tracking-wider">Configure Channels Profiles (Link + Toggle)</span>

                      <div className="space-y-3">
                        {/* Instagram Platform */}
                        <div className="p-3 bg-black/20 border border-white/5 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded bg-[#E1306C]/10 text-[#E1306C] flex items-center justify-center font-bold text-xs">IG</div>
                            <div>
                              <span className="text-xs font-bold text-white block">Instagram Handle Card</span>
                              <span className="text-[10px] text-white/40">Visits social circle feedback</span>
                            </div>
                          </div>
                          <div className="flex flex-1 items-center gap-3">
                            <input
                              type="text"
                              placeholder="https://instagram.com/your-username"
                              value={socialInstagramUrl}
                              onChange={(e) => setSocialInstagramUrl(e.target.value)}
                              className="flex-1 px-3 py-1.5 text-xs rounded bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[var(--primary-custom, #F15A29)]"
                            />
                            <button
                              type="button"
                              onClick={() => setSocialInstagramShow(!socialInstagramShow)}
                              className={`px-3 py-1.5 rounded text-xs font-bold cursor-pointer transition-colors whitespace-nowrap ${
                                socialInstagramShow ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 text-white/50"
                              }`}
                            >
                              {socialInstagramShow ? "Visible" : "Hidden"}
                            </button>
                          </div>
                        </div>

                        {/* YouTube Platform */}
                        <div className="p-3 bg-black/20 border border-white/5 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded bg-[#FF0000]/10 text-[#FF0000] flex items-center justify-center font-bold text-xs">YT</div>
                            <div>
                              <span className="text-xs font-bold text-white block">YouTube Channel Url</span>
                              <span className="text-[10px] text-white/40">Video archives & streams</span>
                            </div>
                          </div>
                          <div className="flex flex-1 items-center gap-3">
                            <input
                              type="text"
                              placeholder="https://youtube.com/@channel"
                              value={socialYoutubeUrl}
                              onChange={(e) => setSocialYoutubeUrl(e.target.value)}
                              className="flex-1 px-3 py-1.5 text-xs rounded bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[var(--primary-custom, #F15A29)]"
                            />
                            <button
                              type="button"
                              onClick={() => setSocialYoutubeShow(!socialYoutubeShow)}
                              className={`px-3 py-1.5 rounded text-xs font-bold cursor-pointer transition-colors whitespace-nowrap ${
                                socialYoutubeShow ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 text-white/50"
                              }`}
                            >
                              {socialYoutubeShow ? "Visible" : "Hidden"}
                            </button>
                          </div>
                        </div>

                        {/* Telegram Platform */}
                        <div className="p-3 bg-black/20 border border-white/5 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded bg-[#26A5E4]/10 text-[#26A5E4] flex items-center justify-center font-bold text-xs">TG</div>
                            <div>
                              <span className="text-xs font-bold text-white block">Telegram Channel Link</span>
                              <span className="text-[10px] text-white/40">Instant study PDF materials</span>
                            </div>
                          </div>
                          <div className="flex flex-1 items-center gap-3">
                            <input
                              type="text"
                              placeholder="https://t.me/yourchannel"
                              value={socialTelegramUrl}
                              onChange={(e) => setSocialTelegramUrl(e.target.value)}
                              className="flex-1 px-3 py-1.5 text-xs rounded bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[var(--primary-custom, #F15A29)]"
                            />
                            <button
                              type="button"
                              onClick={() => setSocialTelegramShow(!socialTelegramShow)}
                              className={`px-3 py-1.5 rounded text-xs font-bold cursor-pointer transition-colors whitespace-nowrap ${
                                socialTelegramShow ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 text-white/50"
                              }`}
                            >
                              {socialTelegramShow ? "Visible" : "Hidden"}
                            </button>
                          </div>
                        </div>

                        {/* Discord Platform */}
                        <div className="p-3 bg-black/20 border border-white/5 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded bg-[#5865F2]/10 text-[#5865F2] flex items-center justify-center font-bold text-xs">DC</div>
                            <div>
                              <span className="text-xs font-bold text-white block">Discord Invite Link</span>
                              <span className="text-[10px] text-white/40">Student voice study room channels</span>
                            </div>
                          </div>
                          <div className="flex flex-1 items-center gap-3">
                            <input
                              type="text"
                              placeholder="https://discord.gg/invite"
                              value={socialDiscordUrl}
                              onChange={(e) => setSocialDiscordUrl(e.target.value)}
                              className="flex-1 px-3 py-1.5 text-xs rounded bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[var(--primary-custom, #F15A29)]"
                            />
                            <button
                              type="button"
                              onClick={() => setSocialDiscordShow(!socialDiscordShow)}
                              className={`px-3 py-1.5 rounded text-xs font-bold cursor-pointer transition-colors whitespace-nowrap ${
                                socialDiscordShow ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 text-white/50"
                              }`}
                            >
                              {socialDiscordShow ? "Visible" : "Hidden"}
                            </button>
                          </div>
                        </div>

                        {/* Twitter Platform */}
                        <div className="p-3 bg-black/20 border border-white/5 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded bg-[#1DA1F2]/10 text-[#1DA1F2] flex items-center justify-center font-bold text-xs">TW</div>
                            <div>
                              <span className="text-xs font-bold text-white block">Twitter Profile Link (X)</span>
                              <span className="text-[10px] text-white/40">Curriculum and academic bulletins</span>
                            </div>
                          </div>
                          <div className="flex flex-1 items-center gap-3">
                            <input
                              type="text"
                              placeholder="https://x.com/username"
                              value={socialTwitterUrl}
                              onChange={(e) => setSocialTwitterUrl(e.target.value)}
                              className="flex-1 px-3 py-1.5 text-xs rounded bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[var(--primary-custom, #F15A29)]"
                            />
                            <button
                              type="button"
                              onClick={() => setSocialTwitterShow(!socialTwitterShow)}
                              className={`px-3 py-1.5 rounded text-xs font-bold cursor-pointer transition-colors whitespace-nowrap ${
                                socialTwitterShow ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 text-white/50"
                              }`}
                            >
                              {socialTwitterShow ? "Visible" : "Hidden"}
                            </button>
                          </div>
                        </div>

                        {/* LinkedIn Platform */}
                        <div className="p-3 bg-black/20 border border-white/5 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded bg-[#0A66C2]/10 text-[#0A66C2] flex items-center justify-center font-bold text-xs">LN</div>
                            <div>
                              <span className="text-xs font-bold text-white block">LinkedIn Organization Page</span>
                              <span className="text-[10px] text-white/40">Celebrated mentor details</span>
                            </div>
                          </div>
                          <div className="flex flex-1 items-center gap-3">
                            <input
                              type="text"
                              placeholder="https://linkedin.com/company/yourcompany"
                              value={socialLinkedinUrl}
                              onChange={(e) => setSocialLinkedinUrl(e.target.value)}
                              className="flex-1 px-3 py-1.5 text-xs rounded bg-black/40 border border-white/10 text-white focus:outline-none focus:border-primary"
                            />
                            <button
                              type="button"
                              onClick={() => setSocialLinkedinShow(!socialLinkedinShow)}
                              className={`px-3 py-1.5 rounded text-xs font-bold cursor-pointer transition-colors whitespace-nowrap ${
                                socialLinkedinShow ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 text-white/50"
                              }`}
                            >
                              {socialLinkedinShow ? "Visible" : "Hidden"}
                            </button>
                          </div>
                        </div>

                        {/* Facebook Platform */}
                        <div className="p-3 bg-black/20 border border-white/5 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded bg-[#1877F2]/10 text-[#1877F2] flex items-center justify-center font-bold text-xs">FB</div>
                            <div>
                              <span className="text-xs font-bold text-white block">Facebook Community Page</span>
                              <span className="text-[10px] text-white/40">Student and parent updates</span>
                            </div>
                          </div>
                          <div className="flex flex-1 items-center gap-3">
                            <input
                              type="text"
                              placeholder="https://facebook.com/yourpage"
                              value={socialFacebookUrl}
                              onChange={(e) => setSocialFacebookUrl(e.target.value)}
                              className="flex-1 px-3 py-1.5 text-xs rounded bg-black/40 border border-white/10 text-white focus:outline-none focus:border-primary"
                            />
                            <button
                              type="button"
                              onClick={() => setSocialFacebookShow(!socialFacebookShow)}
                              className={`px-3 py-1.5 rounded text-xs font-bold cursor-pointer transition-colors whitespace-nowrap ${
                                socialFacebookShow ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 text-white/50"
                              }`}
                            >
                              {socialFacebookShow ? "Visible" : "Hidden"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 6. Theme-Matched Study Stickers Widget */}
                <div className="p-5 rounded-2xl border border-primary/10 bg-white/[0.02]">
                  <div className="mb-4">
                    <span className="text-sm font-bold text-primary tracking-wider font-mono">6. SITE STUDY STICKERS CUSTOMIZATION</span>
                    <p className="text-xs text-white/50 mt-1">
                      Configure the cute icons, titles, subtitles, and clicked powerup speech bubbles for each draggable sticker.
                    </p>
                  </div>

                  <div className="space-y-6">
                    {[
                      { num: 1, name: "Sticker 1 (Books - left, top-middle)", emoji: studySticker1Emoji, setEmoji: setStudySticker1Emoji, title: studySticker1Title, setTitle: setStudySticker1Title, subtitle: studySticker1Subtitle, setSubtitle: setStudySticker1Subtitle, popup: studySticker1Popup, setPopup: setStudySticker1Popup, left: studySticker1Left, setLeft: setStudySticker1Left, top: studySticker1Top, setTop: setStudySticker1Top, rotate: studySticker1Rotate, setRotate: setStudySticker1Rotate, show: studySticker1Show, setShow: setStudySticker1Show },
                      { num: 2, name: "Sticker 2 (Bulb - left, bottom)", emoji: studySticker2Emoji, setEmoji: setStudySticker2Emoji, title: studySticker2Title, setTitle: setStudySticker2Title, subtitle: studySticker2Subtitle, setSubtitle: setStudySticker2Subtitle, popup: studySticker2Popup, setPopup: setStudySticker2Popup, left: studySticker2Left, setLeft: setStudySticker2Left, top: studySticker2Top, setTop: setStudySticker2Top, rotate: studySticker2Rotate, setRotate: setStudySticker2Rotate, show: studySticker2Show, setShow: setStudySticker2Show },
                      { num: 3, name: "Sticker 3 (Graduation Cap - top-center)", emoji: studySticker3Emoji, setEmoji: setStudySticker3Emoji, title: studySticker3Title, setTitle: setStudySticker3Title, subtitle: studySticker3Subtitle, setSubtitle: setStudySticker3Subtitle, popup: studySticker3Popup, setPopup: setStudySticker3Popup, left: studySticker3Left, setLeft: setStudySticker3Left, top: studySticker3Top, setTop: setStudySticker3Top, rotate: studySticker3Rotate, setRotate: setStudySticker3Rotate, show: studySticker3Show, setShow: setStudySticker3Show },
                      { num: 4, name: "Sticker 4 (Target - bottom-center)", emoji: studySticker4Emoji, setEmoji: setStudySticker4Emoji, title: studySticker4Title, setTitle: setStudySticker4Title, subtitle: studySticker4Subtitle, setSubtitle: setStudySticker4Subtitle, popup: studySticker4Popup, setPopup: setStudySticker4Popup, left: studySticker4Left, setLeft: setStudySticker4Left, top: studySticker4Top, setTop: setStudySticker4Top, rotate: studySticker4Rotate, setRotate: setStudySticker4Rotate, show: studySticker4Show, setShow: setStudySticker4Show },
                      { num: 5, name: "Sticker 5 (Coffee Cup - right, top-middle)", emoji: studySticker5Emoji, setEmoji: setStudySticker5Emoji, title: studySticker5Title, setTitle: setStudySticker5Title, subtitle: studySticker5Subtitle, setSubtitle: setStudySticker5Subtitle, popup: studySticker5Popup, setPopup: setStudySticker5Popup, left: studySticker5Left, setLeft: setStudySticker5Left, top: studySticker5Top, setTop: setStudySticker5Top, rotate: studySticker5Rotate, setRotate: setStudySticker5Rotate, show: studySticker5Show, setShow: setStudySticker5Show },
                      { num: 6, name: "Sticker 6 (Brain - right, bottom)", emoji: studySticker6Emoji, setEmoji: setStudySticker6Emoji, title: studySticker6Title, setTitle: setStudySticker6Title, subtitle: studySticker6Subtitle, setSubtitle: setStudySticker6Subtitle, popup: studySticker6Popup, setPopup: setStudySticker6Popup, left: studySticker6Left, setLeft: setStudySticker6Left, top: studySticker6Top, setTop: setStudySticker6Top, rotate: studySticker6Rotate, setRotate: setStudySticker6Rotate, show: studySticker6Show, setShow: setStudySticker6Show },
                    ].map((sticker) => (
                      <div key={sticker.num} className="p-4 rounded-xl border border-white/5 bg-white/[0.01] space-y-3 shadow-inner">
                        <div className="flex items-center justify-between pb-2 border-b border-white/[0.05]">
                          <span className="text-sm font-semibold text-white/90">{sticker.name}</span>
                          <button
                            type="button"
                            onClick={() => sticker.setShow(!sticker.show)}
                            className={`px-2.5 py-1 rounded text-[10px] font-bold cursor-pointer transition-colors whitespace-nowrap ${
                              sticker.show ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 text-white/50"
                            }`}
                          >
                            {sticker.show ? "● Showing" : "○ Hidden"}
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                          <div className="md:col-span-2">
                            <label className="block text-[10px] text-white/50 mb-1">Emoji</label>
                            <input
                              type="text"
                              value={sticker.emoji}
                              onChange={(e) => sticker.setEmoji(e.target.value)}
                              className="w-full px-2.5 py-1.5 text-sm rounded-lg bg-black/45 border border-white/10 text-white focus:outline-none focus:border-primary text-center"
                            />
                          </div>
                          
                          <div className="md:col-span-5">
                            <label className="block text-[10px] text-white/50 mb-1">Title</label>
                            <input
                              type="text"
                              value={sticker.title}
                              onChange={(e) => sticker.setTitle(e.target.value)}
                              className="w-full px-2.5 py-1.5 text-sm rounded-lg bg-black/45 border border-white/10 text-white focus:outline-none focus:border-primary"
                            />
                          </div>

                          <div className="md:col-span-12"></div> {/* force wraps nicely */}
                          
                          <div className="md:col-span-4">
                            <label className="block text-[10px] text-white/50 mb-1">Subtitle</label>
                            <input
                              type="text"
                              value={sticker.subtitle}
                              onChange={(e) => sticker.setSubtitle(e.target.value)}
                              className="w-full px-2.5 py-1.5 text-sm rounded-lg bg-black/45 border border-white/10 text-white focus:outline-none focus:border-primary"
                            />
                          </div>

                          <div className="md:col-span-3">
                            <label className="block text-[10px] text-white/50 mb-1">Position Left (e.g. 15% or 40px)</label>
                            <input
                              type="text"
                              value={sticker.left}
                              onChange={(e) => sticker.setLeft(e.target.value)}
                              className="w-full px-2.5 py-1.5 text-sm rounded-lg bg-black/45 border border-white/10 text-white focus:outline-none focus:border-primary"
                            />
                          </div>

                          <div className="md:col-span-3">
                            <label className="block text-[10px] text-white/50 mb-1">Position Top (e.g. 20% or 100px)</label>
                            <input
                              type="text"
                              value={sticker.top}
                              onChange={(e) => sticker.setTop(e.target.value)}
                              className="w-full px-2.5 py-1.5 text-sm rounded-lg bg-black/45 border border-white/10 text-white focus:outline-none focus:border-primary"
                            />
                          </div>

                          <div className="md:col-span-2">
                            <label className="block text-[10px] text-white/50 mb-1">Rotation (deg)</label>
                            <input
                              type="number"
                              value={sticker.rotate}
                              onChange={(e) => sticker.setRotate(Number(e.target.value))}
                              className="w-full px-2.5 py-1.5 text-sm rounded-lg bg-black/45 border border-white/10 text-white focus:outline-none focus:border-primary text-center"
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
                            className="w-full px-3 py-2 text-xs rounded-lg bg-black/45 border border-white/10 text-slate-100 focus:outline-none focus:border-primary resize-none"
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
              className="px-8 py-3 rounded-full bg-primary text-zinc-950 font-medium hover:brightness-110 transition-colors w-full sm:w-auto"
            >
              Publish Settings
            </button>
          </form>

          {/* AI Assistant Configuration & Analytics Section */}
          <div className="mt-8 border border-white/10 p-6 rounded-2xl bg-white/5 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-medium text-primary flex items-center gap-2">
                  <span>🤖 Helper AI Assistant Configuration</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 font-mono">
                    Secure Bot API
                  </span>
                </h3>
                <p className="text-xs text-white/50 mt-1">
                  Configure the API key and provider for the bottom-right AI Assistant Chatbot.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/60">Enable Assistant Bot:</span>
                <button
                  type="button"
                  onClick={() => setChatbotEnabled(!chatbotEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                    chatbotEnabled ? "bg-primary" : "bg-zinc-800"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      chatbotEnabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Custom AI Logo URL option */}
            <div className="p-4 rounded-xl bg-black/20 border border-white/5 space-y-3 font-sans">
              <label className="block text-xs text-white/70 uppercase tracking-wide font-bold">🤖 Custom Chatbot Image Logo URL</label>
              <div className="flex flex-col sm:flex-row gap-3 items-center">
                <input
                  type="url"
                  value={chatbotIconUrl}
                  onChange={(e) => setChatbotIconUrl(e.target.value)}
                  placeholder="e.g. https://example.com/logo.png"
                  className="flex-1 w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-primary text-xs font-mono"
                />
                {chatbotIconUrl && (
                  <div className="w-10 h-10 rounded-full border border-white/10 overflow-hidden flex-shrink-0 bg-zinc-900">
                    <img src={chatbotIconUrl} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                )}
              </div>
              <p className="text-[10px] text-white/40">
                Provide an image web link (HTTPS URL) to replace the default chat icon with your custom icon logo throughout the chatbot UI (triggers and avatars). Click "Publish Settings" above to save changes.
              </p>
            </div>

            <form onSubmit={handleSaveAiSettings} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
                <div>
                  <label className="block text-xs text-white/60 mb-2 uppercase tracking-wide">AI Service Provider</label>
                  <select
                    value={aiProvider}
                    onChange={(e) => {
                      const val = e.target.value as "gemini" | "openai" | "grok";
                      setAiProvider(val);
                      if (val === "gemini") setAiModel("gemini-3.5-flash");
                      else if (val === "openai") setAiModel("gpt-4o-mini");
                      else if (val === "grok") setAiModel("grok-beta");
                    }}
                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-primary text-xs"
                  >
                    <option value="gemini" className="bg-zinc-950">Gemini (Google @google/genai)</option>
                    <option value="openai" className="bg-zinc-950">OpenAI ChatGPT</option>
                    <option value="grok" className="bg-zinc-950">Grok (xAI API)</option>
                  </select>
                </div>

                <div className="relative">
                  <label className="block text-xs text-white/60 mb-2 uppercase tracking-wide">API Key</label>
                  <div className="relative">
                    <input
                      type={showApiKey ? "text" : "password"}
                      value={aiApiKey}
                      onChange={(e) => setAiApiKey(e.target.value)}
                      placeholder="Paste secure API key here..."
                      className="w-full pl-4 pr-16 py-3 rounded-xl bg-black/40 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors text-[10px] font-mono font-bold select-none cursor-pointer"
                    >
                      {showApiKey ? "HIDE" : "SHOW"}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-white/60 mb-2 uppercase tracking-wide">AI Model Name</label>
                  <input
                    type="text"
                    value={aiModel}
                    onChange={(e) => setAiModel(e.target.value)}
                    placeholder="e.g. gemini-3.5-flash or gpt-4o-mini"
                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-primary text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                <span className="text-[10px] text-rose-300 font-mono">
                  * Note: Stored securely in private config collection settings/secure_bot. Never loaded into frontends.
                </span>
                <button
                  type="submit"
                  disabled={isSavingAiSettings}
                  className="px-6 py-2.5 rounded-xl bg-primary text-zinc-950 font-medium hover:brightness-110 disabled:opacity-50 transition-colors text-xs flex items-center gap-1 cursor-pointer w-full sm:w-auto justify-center"
                >
                  {isSavingAiSettings ? "Saving config..." : "Save AI Assistant settings"}
                </button>
              </div>
            </form>

            {/* AI Assistant Conversation Analytics and Logs */}
            <div className="pt-6 border-t border-white/10 space-y-4 font-sans">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-medium text-white flex items-center gap-2">
                    <span>📊 Intercept & LLM Interaction Logs</span>
                    <button
                      type="button"
                      onClick={fetchAiLogs}
                      className="text-[10px] text-primary hover:underline"
                    >
                      (fetch logs)
                    </button>
                  </h4>
                  <p className="text-[11px] text-white/40 mt-0.5">Track and browse anonymized student questions and helper completions for learning analytics.</p>
                </div>
                <button
                  type="button"
                  onClick={fetchAiLogs}
                  disabled={loadingLogs}
                  className="px-4 py-2 border border-white/10 rounded-lg text-xs hover:bg-white/5 transition-colors text-white/80 cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
                >
                  {loadingLogs ? (
                    <span>Refreshing...</span>
                  ) : (
                    <span>🔄 Refresh Study Logs</span>
                  )}
                </button>
              </div>

              {aiLogs.length === 0 ? (
                <div 
                  onClick={fetchAiLogs}
                  className="p-8 border border-dashed border-white/10 rounded-xl text-center text-white/30 text-xs font-mono hover:bg-white/2 cursor-pointer"
                >
                  No logged student conversation events found. Click to fetch or wait for interactions.
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto border border-white/10 rounded-xl bg-black/20 text-xs font-mono divide-y divide-white/5 scrollbar-thin">
                  {aiLogs.map((log: any) => (
                    <div key={log.id} className="p-3 hover:bg-white/5 transition-colors space-y-2">
                      <div className="flex items-center justify-between text-[10px] text-white/40">
                        <span className="text-primary font-semibold">{log.userEmail || "anonymous student"}</span>
                        <span>{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                      <div className="space-y-1 text-xs font-sans">
                        <div className="text-white/80 leading-relaxed font-sans">
                          <span className="text-violet-400 font-bold mr-1 font-mono">Q:</span>
                          {log.query}
                        </div>
                        <div className="text-white/60 leading-relaxed font-sans bg-black/30 p-2 rounded-lg border border-white/5 whitespace-pre-wrap">
                          <span className="text-indigo-400 font-bold mr-1 font-mono">A:</span>
                          {log.response}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-[9px] text-white/30 pt-1">
                        <span>Provider: <strong className="text-white/50">{log.provider || "direct-intercept"}</strong></span>
                        <span>Model: <strong className="text-white/50">{log.model || "none"}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SMTP Dynamic Mail Credentials Form */}
            <div className="pt-8 mt-8 border-t border-white/10 space-y-6">
              <div>
                <h4 className="text-base font-medium text-[var(--primary-custom, #F15A29)] flex items-center gap-2">
                  <span>✉️ Dynamic SMTP Mail Server Config</span>
                </h4>
                <p className="text-xs text-white/40 mt-1">
                  Configure outgoing OTP email credentials here. These settings are stored securely in Firestore and override system default environment configurations for real-time delivery.
                </p>
              </div>

              <form onSubmit={handleSaveSmtpSettings} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-white/60 mb-2 uppercase tracking-wide">SMTP Outgoing Host</label>
                    <input
                      type="text"
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                      placeholder="e.g. smtp.gmail.com"
                      required
                      className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-primary text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-white/60 mb-2 uppercase tracking-wide">SMTP Port</label>
                    <input
                      type="text"
                      value={smtpPort}
                      onChange={(e) => setSmtpPort(e.target.value)}
                      placeholder="e.g. 587 or 465"
                      required
                      className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-primary text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-white/60 mb-2 uppercase tracking-wide">Secure (SSL/TLS)</label>
                    <select
                      value={smtpSecure}
                      onChange={(e) => setSmtpSecure(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-primary text-xs"
                    >
                      <option value="false">False (Port 587 / STARTTLS)</option>
                      <option value="true">True (Port 465 / Direct SSL)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-white/60 mb-2 uppercase tracking-wide">SMTP Auth User (Email)</label>
                    <input
                      type="email"
                      value={smtpUser}
                      onChange={(e) => setSmtpUser(e.target.value)}
                      placeholder="e.g. your_email@gmail.com"
                      required
                      className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-primary text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-white/60 mb-2 uppercase tracking-wide">SMTP Auth Password / App Secret</label>
                    <div className="relative">
                      <input
                        type={showSmtpPass ? "text" : "password"}
                        value={smtpPass}
                        onChange={(e) => setSmtpPass(e.target.value)}
                        placeholder="16-character secure app password"
                        required
                        className="w-full px-4 py-3 pr-16 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-primary text-xs font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSmtpPass(!showSmtpPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-white/60 hover:text-white uppercase font-bold"
                      >
                        {showSmtpPass ? "HIDE" : "SHOW"}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                  <span className="text-[10px] text-amber-300 font-mono">
                    * Note: For security, use Google's 16-character "App Password", not your master Google password.
                  </span>
                  <button
                    type="submit"
                    disabled={isSavingSmtpSettings}
                    className="px-6 py-2.5 rounded-xl bg-primary text-zinc-950 font-medium hover:brightness-110 disabled:opacity-50 transition-colors text-xs flex items-center gap-1 cursor-pointer w-full sm:w-auto justify-center font-bold"
                  >
                    {isSavingSmtpSettings ? "Saving SMTP..." : "Save SMTP credentials"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {activeTab === "security" && (user?.role === "superadmin" || user?.role === "admin") && (
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
              <div className="p-3 rounded-xl bg-emerald-500/10 text-[var(--primary-custom, #F15A29)]">
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
                <h4 className="text-sm font-bold text-[var(--primary-custom, #F15A29)] uppercase tracking-wider flex items-center gap-2">
                  <Video className="w-4 h-4 text-accent-primary" />
                  <span>Interactive Premium Video Player Security</span>
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs text-white/50 block">Video Downloadability</label>
                    <select
                      className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:border-[var(--primary-custom, #F15A29)] focus:outline-none"
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
                      className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:border-[var(--primary-custom, #F15A29)] focus:outline-none"
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
                      className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:border-[var(--primary-custom, #F15A29)] focus:outline-none"
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
                      className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:border-[var(--primary-custom, #F15A29)] focus:outline-none"
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
                      className="w-4 h-4 accent-[var(--primary-custom, #F15A29)]"
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
                                className={`px-2.5 py-1 rounded-md text-[9px] font-mono tracking-wider uppercase border font-bold transition-all ${active ? 'bg-[var(--primary-custom, #F15A29)]/10 text-[var(--primary-custom, #F15A29)] border-[var(--primary-custom, #F15A29)]/30' : 'bg-transparent text-zinc-500 border-white/10'}`}
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
              
              {/* YOUTUBE DRM SYSTEM AUTO-REPAIR ASSISTANT */}
              <YoutubeDiagnosticConsole />
              
              {/* NATIVE INTEGRATED DRM SIMULATION SUITE */}
              <DrmSimulatorDashboard />

              {/* CENTRAL API GATEWAY MONITOR & TELEMETRY OBSERVABILITY CONSOLE */}
              <ApiGatewayTelemetryConsole />

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
                        className="w-full mt-1.5 pt-1.5 pb-1 border-t border-dashed border-white/5 text-[9px] uppercase font-mono tracking-widest text-[var(--primary-custom, #F15A29)] hover:text-white transition-colors text-center font-bold cursor-pointer"
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

      {activeTab === "syllabus" && (
        <div className="space-y-8 max-w-5xl animate-fade-in text-left">
          {/* Section Header */}
          <div className="border border-[var(--primary-custom, #F15A29)]/20 bg-[var(--primary-custom, #F15A29)]/5 p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-display font-medium text-[var(--primary-custom, #F15A29)] flex items-center gap-2">
                <span>📚 Custom Syllabus & Section Planner</span>
              </h3>
              <p className="text-xs text-white/50 mt-1 max-w-2xl">
                Define the title of the syllabus portal and manage/edit the curriculum document of every single grade. Use the interactive guides to customize the learning experience of your students.
              </p>
            </div>
            
            <button
              onClick={handleSaveSyllabusSettings}
              disabled={isSavingSyllabus}
              className="px-6 py-2.5 rounded-xl text-xs font-black uppercase bg-[var(--primary-custom, #F15A29)] text-zinc-950 hover:scale-[1.03] active:scale-[0.98] transition-all shadow-lg cursor-pointer flex items-center gap-2 shrink-0 disabled:opacity-50"
            >
              {isSavingSyllabus ? "Saving updates..." : "Publish Syllabus Updates"}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Hand: Dashboard Label Customizer & Class select */}
            <div className="lg:col-span-4 space-y-6">
              <div className="border border-white/10 p-6 rounded-2xl bg-white/5 space-y-4">
                <h4 className="text-sm font-semibold text-[var(--primary-custom, #F15A29)] uppercase tracking-wider border-b border-white/5 pb-2 font-mono">
                  Portal Layout Labels
                </h4>
                <div>
                  <label className="block text-xs text-white/60 mb-2">
                    Syllabus Section Name (Student View)
                  </label>
                  <input
                    type="text"
                    value={syllabusSectionName}
                    onChange={(e) => setSyllabusSectionName(e.target.value)}
                    placeholder="e.g. Syllabus, Course Plan"
                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-[var(--primary-custom, #F15A29)] text-xs font-semibold"
                  />
                  <p className="text-[10px] text-white/40 mt-1.5 leading-relaxed">
                    Changes the rendering text on the student navbar link, persistent dock, mobile drawer menu, and class card headings. Default is "Syllabus".
                  </p>
                </div>
              </div>

              {/* Class Selection List */}
              <div className="border border-white/10 p-6 rounded-2xl bg-white/5 space-y-4">
                <h4 className="text-sm font-semibold text-[var(--primary-custom, #F15A29)] uppercase tracking-wider border-b border-white/5 pb-2 font-mono">
                  Select Grade to Edit
                </h4>
                <div className="flex flex-col gap-1.5">
                  {['6', '7', '8', '9', '10', '11', '12', 'dropper'].map((cls) => (
                    <button
                      key={cls}
                      type="button"
                      onClick={() => setSyllabusEditClass(cls)}
                      className={`w-full px-4 py-3 rounded-xl text-left text-xs font-bold uppercase tracking-wide transition-all flex items-center justify-between cursor-pointer ${
                        syllabusEditClass === cls
                          ? 'bg-[var(--primary-custom, #F15A29)]/15 text-[var(--primary-custom, #F15A29)] border border-[var(--primary-custom, #F15A29)]/30 shadow-md scale-[1.02]'
                          : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <span>Class {cls === 'dropper' ? 'Dropper' : cls}</span>
                      <span className="text-[9px] text-[var(--primary-custom, #F15A29)]/60 bg-[var(--primary-custom, #F15A29)]/10 px-2 py-0.5 rounded-full font-mono font-normal">
                        {classSyllabuses[cls] ? 'Customized' : 'Template'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Hand: Detailed Syllabus Text Editor & Live Preview */}
            <div className="lg:col-span-8 flex flex-col space-y-6">
              <div className="border border-white/10 p-6 rounded-2xl bg-white/5 flex-grow flex flex-col space-y-4">
                <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-3">
                  <div>
                    <h4 className="text-sm font-semibold text-[var(--primary-custom, #F15A29)] uppercase tracking-wider font-mono">
                      Syllabus Details: Class {syllabusEditClass === 'dropper' ? 'Dropper' : syllabusEditClass}
                    </h4>
                    <p className="text-[11px] text-white/50 mt-0.5">
                      Type the curriculum topics using straightforward formatting guides.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm("Are you sure you want to restore the standard system template for Class " + (syllabusEditClass === 'dropper' ? 'Dropper' : syllabusEditClass) + "? This will discard un-saved changes.")) {
                        const defaultText = getDefaultSyllabus(syllabusEditClass);
                        setClassSyllabuses(prev => ({ ...prev, [syllabusEditClass]: defaultText }));
                      }
                    }}
                    className="text-[10px] text-[var(--primary-custom, #F15A29)] hover:underline font-bold cursor-pointer"
                  >
                    Restore Class Template
                  </button>
                </div>

                <div className="flex-grow flex flex-col space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-white/40 uppercase tracking-widest font-mono">Editor Panel</span>
                    <span className="text-[9px] text-white/30 leading-none">Use # / ## / ### (Headers), - (List) and **bold** formatting tags</span>
                  </div>
                  <textarea
                    rows={12}
                    value={classSyllabuses[syllabusEditClass] ?? getDefaultSyllabus(syllabusEditClass)}
                    onChange={(e) => {
                      const updated = e.target.value;
                      setClassSyllabuses(prev => ({ ...prev, [syllabusEditClass]: updated }));
                    }}
                    placeholder="Describe syllabus units and curriculum layout detail..."
                    className="w-full flex-grow p-4 rounded-xl bg-black/50 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-[var(--primary-custom, #F15A29)] resize-y min-h-[300px] leading-relaxed"
                  />
                </div>

                {/* Live Preview block mimicking Student View */}
                <div className="space-y-2 border-t border-white/5 pt-4">
                  <div className="text-[10px] text-[var(--primary-custom, #F15A29)] uppercase tracking-widest font-mono mb-2">Live Student View Preview</div>
                  <div className="p-4 rounded-xl bg-black/30 border border-white/5 max-h-[180px] overflow-y-auto custom-scrollbar">
                    <SyllabusRenderer text={classSyllabuses[syllabusEditClass] ?? getDefaultSyllabus(syllabusEditClass)} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "content_management" && (
        <ContentManagement />
      )}

      {(activeTab as string) === "content_management_legacy" && (
        <div className="w-full bg-zinc-900/40 border border-white/10 p-6 md:p-8 rounded-3xl relative text-left min-h-[600px] flex flex-col md:flex-row gap-8">
          {/* Sub-navigation Sidebar Menu */}
          <div className="w-full md:w-64 shrink-0 flex flex-col gap-2 border-b md:border-b-0 md:border-r border-white/5 pb-6 md:pb-0 md:pr-6">
            <h3 className="text-sm font-black uppercase text-white/40 tracking-wider mb-2 select-none">Content Sections</h3>
            {[
              { id: "classes", label: "🏫 Classes Folder", icon: "Classes" },
              { id: "subjects", label: "📚 Subjects List", icon: "Subjects" },
              { id: "chapters", label: "📂 Chapters Folder", icon: "Chapters" },
              { id: "materials", label: "📄 Search & File List", icon: "Materials" },
              { id: "upload_center", label: "🚀 Live Upload Center", icon: "Upload Center" }
            ].map((subb) => (
              <button
                key={subb.id}
                onClick={() => setContentSubTab(subb.id as any)}
                className={`w-full text-left p-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-between ${
                  contentSubTab === subb.id
                    ? "bg-primary text-zinc-950 shadow-md font-black scale-[1.01]"
                    : "text-white/70 hover:text-white hover:bg-white/5"
                }`}
              >
                <span>{subb.label}</span>
                {subb.id === "classes" && (
                  <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded-full">{classesList.length}</span>
                )}
                {subb.id === "subjects" && (
                  <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded-full">{subjectsList.length}</span>
                )}
                {subb.id === "chapters" && (
                  <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded-full">{chaptersList.length}</span>
                )}
              </button>
            ))}
          </div>

          {/* Sub-navigation Content Pane */}
          <div className="flex-1 space-y-6">
            
            {/* 1. Classes Directory Management */}
            {contentSubTab === "classes" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div>
                    <h3 className="text-xl font-bold font-display text-white">Class Standards Directory</h3>
                    <p className="text-xs text-white/50">Configure primary folder list elements like Class 11, JEE, NEET.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left panel: Add/Edit Class */}
                  <div className="bg-white/5 p-5 rounded-2xl border border-white/5 h-fit">
                    <h4 className="text-sm font-black uppercase text-primary mb-4">
                      {classEditingId ? "Edit Class Details" : "Create New Class Standard"}
                    </h4>
                    <form onSubmit={handleSaveClass} className="space-y-4">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-white/50 mb-1.5">Class Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Class 11, JEE"
                          value={classFormName}
                          onChange={(e) => setClassFormName(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-white/50 mb-1.5">Sequence order index</label>
                        <input
                          type="number"
                          placeholder="e.g. 1"
                          value={classFormOrder}
                          onChange={(e) => setClassFormOrder(e.target.value === "" ? "" : Number(e.target.value))}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <button
                          type="submit"
                          className="flex-1 bg-primary text-zinc-950 font-black uppercase text-[10px] py-2 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                        >
                          {classEditingId ? "Modify Class" : "Publish Class Standard"}
                        </button>
                        {classEditingId && (
                          <button
                            type="button"
                            onClick={() => {
                              setClassEditingId(null);
                              setClassFormName("");
                              setClassFormOrder("");
                            }}
                            className="bg-white/10 text-white font-bold uppercase text-[10px] px-3 py-2 rounded-xl hover:bg-white/15 transition-all cursor-pointer"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </form>
                  </div>

                  {/* Right panel: Class Standard Cards List */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {classesList.map((cls) => {
                        const subCount = subjectsList.filter((s) => s.classId === cls.id).length;
                        return (
                          <div
                            key={cls.id}
                            className="p-5 rounded-2xl border border-white/10 bg-white/5 flex flex-col justify-between gap-4 group"
                          >
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] uppercase tracking-wider font-mono text-primary/75">
                                  Order index: {cls.order !== undefined ? cls.order : 0}
                                </span>
                                <div className="flex items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => handleReorderClass(cls.id, "up")}
                                    className="p-1 hover:text-primary rounded"
                                    title="Move Up"
                                  >
                                    ▲
                                  </button>
                                  <button
                                    onClick={() => handleReorderClass(cls.id, "down")}
                                    className="p-1 hover:text-primary rounded"
                                    title="Move Down"
                                  >
                                    ▼
                                  </button>
                                </div>
                              </div>
                              <h5 className="text-base font-bold text-white group-hover:text-primary transition-colors">
                                {cls.className}
                              </h5>
                              <p className="text-xs text-white/40 mt-1 uppercase font-mono tracking-wider">
                                {subCount} Subjects Configured
                              </p>
                            </div>

                            <div className="grid grid-cols-3 gap-1.5 border-t border-white/5 pt-3">
                              <button
                                onClick={() => {
                                  setExpClassId(cls.id);
                                  setContentSubTab("subjects");
                                }}
                                className="py-1.5 rounded-lg bg-white/10 hover:bg-white/15 hover:text-primary text-[10px] font-black uppercase transition-colors cursor-pointer"
                              >
                                Open Folder
                              </button>
                              <button
                                onClick={() => {
                                  setClassEditingId(cls.id);
                                  setClassFormName(cls.className);
                                  setClassFormOrder(cls.order !== undefined ? cls.order : "");
                                }}
                                className="py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-[10px] font-black uppercase transition-colors cursor-pointer"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteClass(cls.id)}
                                className="py-1.5 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500 hover:text-black text-[10px] font-black uppercase transition-all cursor-pointer"
                              >
                                Delete
                              </button>
                            </div>

                            {/* Add Subject shortcut inline inside card */}
                            <div className="border-t border-dashed border-white/5 pt-3 mt-1">
                              <p className="text-[9px] uppercase tracking-wider text-white/40 mb-1 font-bold">Quick New Subject</p>
                              <div className="flex gap-1.5">
                                <input
                                  type="text"
                                  placeholder="e.g. Chemistry"
                                  id={`quick-subject-input-${cls.id}`}
                                  className="flex-1 bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white focus:outline-none focus:border-primary"
                                />
                                <button
                                  onClick={async () => {
                                    const el = document.getElementById(`quick-subject-input-${cls.id}`) as HTMLInputElement;
                                    if (el && el.value.trim()) {
                                      try {
                                        await addDoc(collection(db, "subjects"), {
                                          subjectName: el.value.trim(),
                                          classId: cls.id,
                                          order: 0,
                                          createdAt: serverTimestamp()
                                        });
                                        el.value = "";
                                        showToast("Subject standard folder created!");
                                      } catch (err) {
                                        console.error(err);
                                      }
                                    }
                                  }}
                                  className="px-2 py-1 bg-primary text-zinc-950 font-black rounded-lg text-[9px] uppercase hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                                >
                                  Add
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {classesList.length === 0 && (
                        <div className="p-8 text-center bg-white/5 border border-dashed border-white/10 rounded-2xl col-span-full">
                          <p className="text-xs text-white/40">No class level standard created. Create one at the left.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Subjects List Management */}
            {contentSubTab === "subjects" && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                  <div>
                    <h3 className="text-xl font-bold font-display text-white">Subjects Standard Folders</h3>
                    <p className="text-xs text-white/50">
                      {expClassId
                        ? `Viewing folders of: ${classesList.find((c) => c.id === expClassId)?.className || expClassId}`
                        : "Configure subjects, chapters and materials directories."}
                    </p>
                  </div>
                  {expClassId && (
                    <button
                      onClick={() => setExpClassId(null)}
                      className="p-1.5 px-3 rounded-lg text-xs font-bold bg-white/15 hover:text-primary transition-all cursor-pointer"
                    >
                      ← Back to All Subjects
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left: Create subject */}
                  <div className="bg-white/5 p-5 rounded-2xl border border-white/5 h-fit">
                    <h4 className="text-sm font-black uppercase text-primary mb-4">
                      {subjectEditingId ? "Edit Subject Folder" : "Add New Subject Folder"}
                    </h4>
                    <form onSubmit={handleSaveSubject} className="space-y-4">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-white/50 mb-1.5">Class Standard Option *</label>
                        <select
                          required
                          value={subjectFormClassId || expClassId || ""}
                          onChange={(e) => setSubjectFormClassId(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                        >
                          <option value="">-- Choose Class --</option>
                          {classesList.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.className}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-bold text-white/50 mb-1.5">Subject Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Physics, Math"
                          value={subjectFormName}
                          onChange={(e) => setSubjectFormName(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-bold text-white/50 mb-1.5">Index order sequence</label>
                        <input
                          type="number"
                          placeholder="e.g. 1"
                          value={subjectFormOrder}
                          onChange={(e) => setSubjectFormOrder(e.target.value === "" ? "" : Number(e.target.value))}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="submit"
                          className="flex-1 bg-primary text-zinc-950 font-black uppercase text-[10px] py-2 rounded-xl hover:scale-[1.02] cursor-pointer"
                        >
                          {subjectEditingId ? "Modify Subject" : "Confirm Publish"}
                        </button>
                        {subjectEditingId && (
                          <button
                            type="button"
                            onClick={() => {
                              setSubjectEditingId(null);
                              setSubjectFormName("");
                              setSubjectFormOrder("");
                            }}
                            className="bg-white/15 px-3 py-2 text-[10px] font-bold uppercase rounded-xl hover:bg-white/20"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </form>
                  </div>

                  {/* Right: Subjects table */}
                  <div className="lg:col-span-2 space-y-3">
                    {(() => {
                      const list = expClassId
                        ? subjectsList.filter((s) => s.classId === expClassId)
                        : subjectsList;

                      if (list.length === 0) {
                        return (
                          <div className="p-8 text-center bg-white/5 border border-dashed border-white/10 rounded-2xl">
                            <p className="text-xs text-white/40">No subject folders created matching this selection path.</p>
                          </div>
                        );
                      }

                      return (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {list.map((subj) => {
                            const parentClass = classesList.find((c) => c.id === subj.classId);
                            const chapCount = chaptersList.filter((c) => c.subjectId === subj.id).length;
                            return (
                              <div
                                key={subj.id}
                                className="p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between gap-4 hover:border-primary/45 transition-all group"
                              >
                                <div>
                                  <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/10 text-white/60 font-mono">
                                      Class: {parentClass ? parentClass.className : "Unmapped"}
                                    </span>
                                    <span className="text-[10px] font-mono text-primary/75">
                                      Order: {subj.order || 0}
                                    </span>
                                  </div>

                                  <h5 className="font-bold text-base text-white group-hover:text-primary transition-colors">
                                    {subj.subjectName}
                                  </h5>
                                  <p className="text-xs text-white/40 mt-1 uppercase font-mono tracking-wider">
                                    {chapCount} Chapter Directories
                                  </p>
                                </div>

                                <div className="border-t border-white/5 pt-3 space-y-2">
                                  <div className="grid grid-cols-3 gap-1 px-1">
                                    <button
                                      onClick={() => {
                                        setExpSubjectId(subj.id);
                                        setContentSubTab("chapters");
                                      }}
                                      className="py-1 rounded-lg bg-white/10 hover:bg-white/15 text-[9px] font-black uppercase tracking-wider text-text-primary hover:text-primary cursor-pointer text-center"
                                    >
                                      Add Chapter
                                    </button>
                                    <button
                                      onClick={() => {
                                        // Preset parameters
                                        setMClassId(subj.classId || "");
                                        setMSubjectId(subj.id);
                                        // Go directly to Upload Center
                                        setContentSubTab("upload_center");
                                      }}
                                      className="py-1 rounded-lg bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500 hover:text-black text-[9px] font-black uppercase tracking-wider cursor-pointer text-center"
                                    >
                                      Upload Content
                                    </button>
                                    <button
                                      onClick={() => {
                                        setSubjectEditingId(subj.id);
                                        setSubjectFormClassId(subj.classId || "");
                                        setSubjectFormName(subj.subjectName);
                                        setSubjectFormOrder(subj.order !== undefined ? subj.order : "");
                                      }}
                                      className="py-1 rounded-lg bg-white/10 hover:bg-white/15 text-[9px] font-black uppercase tracking-wider cursor-pointer text-center"
                                    >
                                      Edit
                                    </button>
                                  </div>
                                  <button
                                    onClick={() => handleDeleteSubject(subj.id)}
                                    className="w-full py-1.5 rounded-lg bg-red-500/15 text-red-500 hover:bg-red-500 hover:text-black text-[9px] font-black uppercase tracking-wider transition-colors cursor-pointer text-center"
                                  >
                                    Delete Subject
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* 3. Chapters Folders Management */}
            {contentSubTab === "chapters" && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                  <div>
                    <h3 className="text-xl font-bold font-display text-white">Chapters Folders List</h3>
                    <p className="text-xs text-white/50">Configure core chapter nodes inside subject modules.</p>
                  </div>
                  {expSubjectId && (
                    <button
                      onClick={() => setExpSubjectId(null)}
                      className="p-1.5 px-3 rounded-lg text-xs font-bold bg-white/15 hover:text-primary transition-all cursor-pointer"
                    >
                      ← Back to All Chapters
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left panel */}
                  <div className="bg-white/5 p-5 rounded-2xl border border-white/5 h-fit">
                    <h4 className="text-sm font-black uppercase text-primary mb-4">
                      {chapterEditingId ? "Rename Chapter" : "Create New Chapter"}
                    </h4>
                    <form onSubmit={handleSaveChapter} className="space-y-4">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-white/50 mb-1.5">Subject Category *</label>
                        <select
                          required
                          value={chapterFormSubjectId || expSubjectId || ""}
                          onChange={(e) => setChapterFormSubjectId(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                        >
                          <option value="">-- Choose Subject --</option>
                          {subjectsList.map((s) => {
                            const cStandard = classesList.find((c) => c.id === s.classId);
                            return (
                              <option key={s.id} value={s.id}>
                                {s.subjectName} ({cStandard ? cStandard.className : "No Standard Detail"})
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-bold text-white/50 mb-1.5">Chapter Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Kinematics, Integration"
                          value={chapterFormName}
                          onChange={(e) => setChapterFormName(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="submit"
                          className="flex-1 bg-primary text-zinc-950 font-black uppercase text-[10px] py-2 rounded-xl hover:scale-[1.02] cursor-pointer"
                        >
                          {chapterEditingId ? "Modify Chapter" : "Publish Chapter"}
                        </button>
                        {chapterEditingId && (
                          <button
                            type="button"
                            onClick={() => {
                              setChapterEditingId(null);
                              setChapterFormName("");
                            }}
                            className="bg-white/15 px-3 py-2 text-[10px] font-bold uppercase rounded-xl hover:bg-white/20"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </form>
                  </div>

                  {/* Right: Chapters list */}
                  <div className="lg:col-span-2 space-y-3">
                    {(() => {
                      const list = expSubjectId
                        ? chaptersList.filter((c) => c.subjectId === expSubjectId)
                        : chaptersList;

                      if (list.length === 0) {
                        return (
                          <div className="p-8 text-center bg-white/5 border border-dashed border-white/10 rounded-2xl">
                            <p className="text-xs text-white/40">No chapters configured in this directory segment.</p>
                          </div>
                        );
                      }

                      return (
                        <div className="bg-black/20 border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5">
                          {list.map((chap) => {
                            const matchingSubject = subjectsList.find((s) => s.id === chap.subjectId);
                            const matchingClass = classesList.find((c) => c.id === chap.classId || (matchingSubject && c.id === matchingSubject.classId));
                            return (
                              <div
                                key={chap.id}
                                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/[0.02]"
                              >
                                <div>
                                  <h5 className="font-bold text-sm text-white">{chap.chapterName}</h5>
                                  <p className="text-[10px] text-white/40 font-mono mt-1">
                                    Path: {matchingClass?.className || "Any Class"} / {matchingSubject?.subjectName || "Any Subject"}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => {
                                      setChapterEditingId(chap.id);
                                      setChapterFormSubjectId(chap.subjectId || "");
                                      setChapterFormName(chap.chapterName);
                                    }}
                                    className="p-1 px-2.5 rounded bg-white/10 hover:bg-white/15 text-[10px] font-bold text-white transition-colors cursor-pointer"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteChapter(chap.id)}
                                    className="p-1 px-2.5 rounded bg-red-500/15 hover:bg-red-500 hover:text-black text-[10px] text-red-400 font-bold transition-all cursor-pointer"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* 4. Complete Files Directory Search List */}
            {contentSubTab === "materials" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-display font-black text-white">Consolidated Files Directory</h3>
                  <p className="text-xs text-white/50">Manage individual file placements, change thumbnails, and toggle availability.</p>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden divide-y divide-white/5">
                  {materials.map((mat) => {
                    const cStandard = classesList.find((c) => c.id === mat.classId);
                    const sStandard = subjectsList.find((s) => s.id === mat.subjectId);
                    const cChapter = chaptersList.find((c) => c.id === mat.chapterId);
                    const isVideo = mat.type === 'lecture' || mat.materialType === 'video_lectures';

                    return (
                      <div
                        key={mat.id}
                        className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:bg-white/[0.02]"
                      >
                        <div className="flex gap-4 items-center">
                          <img
                            src={mat.thumbnailUrl || (isVideo ? "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=120" : "https://images.unsplash.com/photo-1614064641938-3bbee52942c7?auto=format&fit=crop&w=120")}
                            className="w-12 h-12 rounded-xl object-cover shrink-0 border border-white/10 bg-black"
                            referrerPolicy="no-referrer"
                          />
                          <div className="text-left min-w-0">
                            <h4 className="font-bold text-sm text-text-primary flex items-center gap-2">
                              <span>{mat.title}</span>
                              {mat.isHidden && (
                                <span className="text-[8px] bg-red-500/25 border border-red-500/30 text-red-400 px-1.5 py-0.5 rounded uppercase font-mono tracking-widest">
                                  Private
                                </span>
                              )}
                            </h4>
                            <p className="text-[10px] text-white/40 line-clamp-1 mt-0.5">{mat.description || "No summary notes."}</p>
                            <p className="text-[9px] text-[#F15A29] font-mono uppercase tracking-wider mt-1 select-none">
                              标准路径: {cStandard?.className || mat.classGroup || "Default"} standard / {sStandard?.subjectName || "General"} / {cChapter?.chapterName || "Folder ROOT"}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => handleToggleMaterialVisibilityDirect(mat.id, mat.isHidden)}
                            className={`p-1.5 px-3 rounded-lg text-[9px] uppercase font-black tracking-wider transition-colors cursor-pointer ${
                              mat.isHidden
                                ? "bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/20"
                                : "bg-white/10 hover:bg-white/15 text-white/80"
                            }`}
                          >
                            {mat.isHidden ? "Make Public" : "Make Private"}
                          </button>
                          
                          <button
                            onClick={() => handleEditMaterialDirect(mat)}
                            className="p-1.5 px-3 rounded-lg text-[9px] uppercase font-black tracking-wider bg-white/10 hover:bg-white/15 text-white cursor-pointer"
                          >
                            Move / Edit
                          </button>
                          
                          <button
                            onClick={() => handleDeleteMaterialDirect(mat.id)}
                            className="p-1.5 px-3 rounded-lg text-[9px] uppercase font-black tracking-wider bg-red-500/15 text-red-400 hover:bg-red-500 hover:text-black transition-all cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {materials.length === 0 && (
                    <div className="p-12 text-center bg-black/20 text-white/40">
                      No files uploaded or synced in the catalog library yet.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 5. Live Upload Center */}
            {contentSubTab === "upload_center" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold font-display text-white">Live Folder Upload Console</h3>
                  <p className="text-xs text-white/50">Directly link resource PDFs, notes, assignments, PYQs, and class lectures to standard database folders.</p>
                </div>

                <div className="max-w-2xl bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8">
                  <form onSubmit={handlePublishMaterial} className="space-y-6 text-left">
                    
                    {/* Folder Path Cascading Parameters Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-white/50 mb-1.5">Class Standard *</label>
                        <select
                          required
                          value={mClassId}
                          onChange={(e) => {
                            setMClassId(e.target.value);
                            setMSubjectId("");
                            setMChapterId("");
                          }}
                          className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                        >
                          <option value="">-- Choose Class --</option>
                          {classesList.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.className}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-bold text-white/50 mb-1.5">Subject Folder *</label>
                        <select
                          required
                          value={mSubjectId}
                          onChange={(e) => {
                            setMSubjectId(e.target.value);
                            setMChapterId("");
                          }}
                          className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                        >
                          <option value="">-- Choose Subject --</option>
                          {subjectsList.filter((s) => s.classId === mClassId).map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.subjectName}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-bold text-white/50 mb-1.5">Chapter Folder *</label>
                        <select
                          required
                          value={mChapterId}
                          onChange={(e) => setMChapterId(e.target.value)}
                          className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                        >
                          <option value="">-- Choose Chapter --</option>
                          {chaptersList.filter((c) => c.subjectId === mSubjectId).map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.chapterName}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Choose Content Type Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-white/50 mb-1.5">Study Material Type *</label>
                        <select
                          required
                          value={mMaterialType}
                          onChange={(e) => {
                            const val = e.target.value;
                            setMMaterialType(val as any);
                            setMType(val === "video_lectures" ? "lecture" : "note");
                          }}
                          className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                        >
                          <option value="notes">📝 Notes (PDF)</option>
                          <option value="pyqs">🏆 Previous Year Questions (PYQs)</option>
                          <option value="assignments">📂 Class Assignments (PDF)</option>
                          <option value="dpps">📚 Daily Practice Papers (DPPs)</option>
                          <option value="video_lectures">🎥 Video Classes (Lectures)</option>
                          <option value="formula_sheets">📐 Formula Sheets</option>
                          <option value="tests">✏️ Subject Test modules</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-bold text-white/50 mb-1.5">Title / File name *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Newton's Laws Sheet, Electrostatics PYQs"
                          value={mTitle}
                          onChange={(e) => setMTitle(e.target.value)}
                          className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-white/50 mb-1.5">Summary / Description Details</label>
                      <textarea
                        rows={3}
                        placeholder="Provide deep details or summaries about the syllabus topics under this specific file..."
                        value={mDesc}
                        onChange={(e) => setMDesc(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-white/50 mb-1.5">Security resource URL (link) *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. https://example.com/sheet.pdf or secure video link"
                          value={mUrl}
                          onChange={(e) => setMUrl(e.target.value)}
                          className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                        />
                        
                        {(mType === "lecture" || mMaterialType === "video_lectures") && mUrl.trim() && (
                          <div className="mt-2.5 space-y-2 text-left">
                            {(() => {
                              const isYouTube = mUrl.includes("youtube.com") || mUrl.includes("youtu.be") || mUrl.includes("shorts/");
                              const parsedId = parseYouTubeVideoId(mUrl);
                              if (isYouTube) {
                                if (parsedId) {
                                  return (
                                    <div className="space-y-1.5 p-3 rounded-xl bg-green-500/5 border border-green-500/10 max-w-sm">
                                      <span className="text-[10px] text-green-400 font-mono flex items-center gap-1 font-bold">
                                        ● Valid YouTube Video ID: {parsedId}
                                      </span>
                                      <div className="border border-white/10 rounded-lg overflow-hidden aspect-video bg-black mt-1">
                                        <iframe
                                          src={`https://www.youtube.com/embed/${parsedId}?controls=1`}
                                          className="w-full h-full"
                                          allowFullScreen
                                        />
                                      </div>
                                    </div>
                                  );
                                } else {
                                  return (
                                    <span className="text-[10px] text-red-500 font-mono flex items-center gap-1 font-bold bg-red-500/5 border border-red-500/10 px-2.5 py-1.5 rounded-lg w-fit animate-pulse">
                                      ⚠️ Invalid YouTube URL format: Unable to extract 11-character ID.
                                    </span>
                                  );
                                }
                              } else {
                                return (
                                  <span className="text-[10px] text-zinc-400 font-mono bg-white/5 border border-white/10 px-2.5 py-1.5 rounded-lg block w-fit">
                                    ℹ️ Non-YouTube link. Playback will use default direct controls.
                                  </span>
                                );
                              }
                            })()}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-bold text-white/50 mb-1.5">Optional Card Image (Thumbnail URL)</label>
                        <input
                          type="text"
                          placeholder="e.g. https://images.unsplash.com/..."
                          value={mThumbnailUrl}
                          onChange={(e) => setMThumbnailUrl(e.target.value)}
                          className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                        />
                      </div>
                    </div>

                    {/* Visibility status */}
                    <div className="flex items-center gap-2.5 bg-black/30 border border-white/5 p-4 rounded-xl">
                      <input
                        type="checkbox"
                        id="mIsHidden"
                        checked={mIsHidden}
                        onChange={(e) => setMIsHidden(e.target.checked)}
                        className="w-4 h-4 text-primary bg-zinc-955 border-zinc-700 rounded focus:ring-primary focus:ring-offset-zinc-900 focus:ring-2"
                      />
                      <div>
                        <label htmlFor="mIsHidden" className="text-xs font-black text-white hover:text-white/80 cursor-pointer block leading-none">
                          Hide this document from Students (Private Mode)
                        </label>
                        <span className="text-[10px] text-white/40 block mt-1">If enabled, students cannot see this folder file in their directory explorer.</span>
                      </div>
                    </div>

                    {/* Form Controls */}
                    <div className="flex items-center gap-2 pt-4">
                      <button
                        type="submit"
                        className="flex-1 bg-primary text-zinc-950 font-black uppercase tracking-wider text-xs py-3 rounded-xl hover:scale-[1.01] active:scale-[0.99] hover:bg-primary/90 transition-all cursor-pointer"
                      >
                        {mEditingId ? "💾 Confirm Move / Modify" : "🚀 Publish Content to Folder"}
                      </button>
                      {mEditingId && (
                        <button
                          type="button"
                          onClick={() => {
                            setMEditingId(null);
                            setMTitle("");
                            setMDesc("");
                            setMUrl("");
                            setMThumbnailUrl("");
                            setMIsHidden(false);
                          }}
                          className="bg-white/15 text-white font-bold uppercase text-xs px-5 py-3 rounded-xl hover:bg-white/20"
                        >
                          Cancel
                        </button>
                      )}
                    </div>

                  </form>
                </div>
              </div>
            )}

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
                className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-[var(--primary-custom, #F15A29)]"
              />
              <textarea
                required
                placeholder="Description"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-[var(--primary-custom, #F15A29)] h-24 resize-none"
              />
              <div className="flex flex-col sm:flex-row gap-4">
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full sm:w-1/2 px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[var(--primary-custom, #F15A29)]"
                >
                  <option value="note">Notes / PDF</option>
                  <option value="lecture">Lecture / Video</option>
                </select>
                <select
                  value={classGroup}
                  onChange={(e) => setClassGroup(e.target.value)}
                  className="w-full sm:w-1/2 px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[var(--primary-custom, #F15A29)]"
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
                className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-[var(--primary-custom, #F15A29)]"
              />
              <input
                required
                placeholder="Content URL, YouTube/PDF link, or VdoCipher Script/Video ID"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-[var(--primary-custom, #F15A29)]"
              />
              
              {type === "lecture" && url.trim() && (
                <div className="mt-1 space-y-2 text-left">
                  {(() => {
                    const isYouTube = url.includes("youtube.com") || url.includes("youtu.be") || url.includes("shorts/");
                    const parsedId = parseYouTubeVideoId(url);
                    if (isYouTube) {
                      if (parsedId) {
                        return (
                          <div className="space-y-1.5 p-3 rounded-xl bg-green-500/5 border border-green-500/10 max-w-sm">
                            <span className="text-[10px] text-green-400 font-mono flex items-center gap-1 font-bold">
                              ● Valid YouTube Video ID: {parsedId}
                            </span>
                            <div className="border border-white/10 rounded-lg overflow-hidden aspect-video bg-black mt-1">
                              <iframe
                                src={`https://www.youtube.com/embed/${parsedId}?controls=1`}
                                className="w-full h-full"
                                allowFullScreen
                              />
                            </div>
                          </div>
                        );
                      } else {
                        return (
                          <span className="text-[10px] text-red-500 font-mono flex items-center gap-1 font-bold bg-red-500/5 border border-red-500/10 px-2.5 py-1.5 rounded-lg w-fit animate-pulse">
                            ⚠️ Invalid YouTube URL format: Unable to extract 11-character ID.
                          </span>
                        );
                      }
                    } else {
                      return (
                        <span className="text-[10px] text-zinc-400 font-mono bg-white/5 border border-white/10 px-2.5 py-1.5 rounded-lg block w-fit">
                          ℹ️ Non-YouTube link. Playback will use default direct controls.
                        </span>
                      );
                    }
                  })()}
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="w-full sm:w-1/2">
                  <input
                    placeholder="Section Name (e.g. Trigonometry)"
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-[var(--primary-custom, #F15A29)]"
                  />
                </div>
                <div className="w-full sm:w-1/2 flex items-center justify-between px-4 py-2.5 rounded-xl bg-black/40 border border-white/10">
                  <span className="text-xs text-white/60 font-medium">Hide Content</span>
                  <input
                    type="checkbox"
                    checked={isHidden}
                    onChange={(e) => setIsHidden(e.target.checked)}
                    className="w-5 h-5 accent-[var(--primary-custom, #F15A29)] rounded cursor-pointer"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-[var(--primary-custom, #F15A29)] text-[#070709] font-medium hover:bg-[var(--primary-custom, #F15A29)] transition-colors"
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
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    <span className="text-[10px] font-mono tracking-wide px-2 py-0.5 rounded bg-white/10 text-white/80 border border-white/5">
                      Section: {mat.section || "General"}
                    </span>
                    {mat.isHidden && (
                      <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/10 uppercase">
                        Hidden
                      </span>
                    )}
                  </div>
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
                className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-[var(--primary-custom, #F15A29)]"
              />
              <input
                required
                placeholder="Role (e.g. AIIMS Topper)"
                value={mentorRole}
                onChange={(e) => setMentorRole(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-[var(--primary-custom, #F15A29)]"
              />
              <input
                placeholder="Experience (e.g. 10+ Years Exp, Ex-IITian) [Optional]"
                value={mentorExperience}
                onChange={(e) => setMentorExperience(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-[var(--primary-custom, #F15A29)]"
              />
              <textarea
                placeholder="Bio/Description [Optional]"
                value={mentorDescription}
                onChange={(e) => setMentorDescription(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-[var(--primary-custom, #F15A29)] h-20 resize-none"
              />
              <input
                required
                placeholder="Image URL (Unsplash link)"
                value={mentorImage}
                onChange={(e) => setMentorImage(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-[var(--primary-custom, #F15A29)]"
              />
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-[var(--primary-custom, #F15A29)] text-[#070709] font-medium hover:bg-[var(--primary-custom, #F15A29)] transition-colors"
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

      {activeTab === "support_chats" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px] animate-fade-in text-white mb-10 text-left">
          {/* Left Column: All Sessions List */}
          <div className="lg:col-span-4 bg-zinc-950/40 rounded-2xl border border-white/10 p-5 flex flex-col h-[700px]">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-[#E5D2A5] tracking-wide uppercase">Active Student Threads</h3>
              <p className="text-[11px] text-white/50">Click on any course student to join or inspect their chat instantly.</p>
            </div>

            {/* List entries */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {sessions.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-12 px-4 border border-dashed border-white/5 rounded-xl bg-black/10">
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-2">
                    <History className="w-5 h-5 text-white/30" />
                  </div>
                  <span className="text-xs text-zinc-400 font-bold">No active chat sessions</span>
                  <p className="text-[10px] text-zinc-600 max-w-[180px] mt-1">When students open or type messages to the chatbot, they will appear here in real-time.</p>
                </div>
              ) : (
                sessions.map((sess) => {
                  const isSelected = sess.id === activeSessionId;
                  const lastMsg = sess.messages && sess.messages.length > 0 ? sess.messages[sess.messages.length - 1] : null;
                  const formattedTime = sess.updatedAt 
                    ? new Date(sess.updatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
                    : "Unknown";

                  return (
                    <div
                      key={sess.id}
                      onClick={() => {
                        setActiveSessionId(sess.id);
                        // Mark as read by admin when clicked
                        const sRef = doc(db, "chatbot_sessions", sess.id);
                        updateDoc(sRef, { unreadByAdmin: false }).catch(err => console.error("Error marking read:", err));
                      }}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer relative group flex flex-col justify-between text-left ${
                        isSelected
                          ? "bg-zinc-900 border-[#E5D2A5] shadow-lg shadow-[#E5D2A5]/5"
                          : "bg-black/20 border-white/5 hover:bg-white/5 hover:border-white/15"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="min-w-0">
                          <h4 className="text-xs font-black truncate text-zinc-100 flex items-center gap-1.5">
                            <span className="truncate">{sess.userDisplayName || "Guest Student"}</span>
                            {sess.teacherJoined && (
                              <span className="text-[8px] bg-emerald-500/10 text-emerald-400 font-extrabold px-1 py-0.2 rounded border border-emerald-500/20 uppercase shrink-0">Live</span>
                            )}
                          </h4>
                          <span className="text-[9px] font-mono text-white/40 block truncate mt-0.5">{sess.userEmail || sess.id}</span>
                        </div>
                        {sess.unreadByAdmin && (
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" title="New messages!" />
                        )}
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-white/[0.04] flex items-center justify-between text-[10px] text-zinc-400 gap-2">
                        <span className="truncate max-w-[150px] italic font-medium">
                          {lastMsg ? lastMsg.content : "No messages yet"}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[9px] font-mono text-white/30 shrink-0">{formattedTime}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteChatSession(sess.id);
                            }}
                            title="Delete thread"
                            className="p-1 rounded hover:bg-rose-500/20 text-white/30 hover:text-rose-400 transition-colors cursor-pointer"
                          >
                            <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Chat view */}
          <div className="lg:col-span-8 bg-zinc-950/40 rounded-2xl border border-white/10 p-5 flex flex-col h-[700px]">
            {activeSessionId ? (
              (() => {
                const currentSession = sessions.find(s => s.id === activeSessionId);
                if (!currentSession) {
                  return (
                    <div className="h-full flex flex-col items-center justify-center text-center">
                      <span className="text-xs text-white/50">Loading selected thread...</span>
                    </div>
                  );
                }

                return (
                  <div className="flex flex-col h-full">
                    {/* Active Session Header Banner */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10 mb-4 shrink-0 text-left">
                      <div>
                        <div className="flex items-center gap-2.5">
                          <h3 className="text-base font-bold text-white tracking-wide">{currentSession.userDisplayName || "Student User"}</h3>
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                            currentSession.teacherJoined
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 font-extrabold shadow-[0_0_8px_rgba(16,185,129,0.1)]"
                              : "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
                          }`}>
                            {currentSession.teacherJoined ? "🟢 LIVE TUTORING" : "🤖 AUTOMATIC AI"}
                          </span>
                        </div>
                        <span className="text-xs font-mono text-zinc-400 mt-0.5 block">{currentSession.userEmail || "anonymous"}</span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {!currentSession.teacherJoined ? (
                          <div className="flex items-center gap-2">
                             <button
                            onClick={() => handleEndChat(currentSession.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-400 border border-rose-500/30 transition-all text-[11px] font-extrabold uppercase tracking-wider cursor-pointer"
                          >
                            <XOctagon className="w-3.5 h-3.5" />
                            <span>End Chat</span>
                          </button>

                          <button
                            onClick={() => handleJoinChat(currentSession.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-white font-extrabold text-[11px] uppercase tracking-wider cursor-pointer shadow-md transition-all active:scale-[0.98]"
                          >
                            <User className="w-3.5 h-3.5" />
                            <span>Join & Intervene</span>
                          </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                             <button
                            onClick={() => handleEndChat(currentSession.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-400 border border-rose-500/30 transition-all text-[11px] font-extrabold uppercase tracking-wider cursor-pointer"
                          >
                            <XOctagon className="w-3.5 h-3.5" />
                            <span>End Chat</span>
                          </button>
                              
                          <button
                            onClick={() => handleLeaveChat(currentSession.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-zinc-500/20 text-zinc-300 hover:text-zinc-400 border border-white/5 transition-all text-[11px] font-extrabold uppercase tracking-wider cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Handover</span>
                          </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Chat Messages Log */}
                    <div className="flex-1 overflow-y-auto px-1 py-1 space-y-4 mb-4 select-text">
                      {currentSession.messages && currentSession.messages.length > 0 ? (
                        currentSession.messages.map((m: any, idx: number) => {
                          const isStudent = m.role === "user";
                          const isSys = m.senderName === "System";
                          const isTeacher = m.role === "teacher" || (!isStudent && (m.senderName?.includes("Teacher") || m.senderName?.includes("Faculty") || m.senderName?.includes("System")));
                          const isBot = !isStudent && !isTeacher && !isSys;

                          // Format beautiful timestamp
                          const msgTime = m.timestamp
                            ? new Date(m.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
                            : "Now";

                          if (isSys || m.role === "teacher") {
                            return (
                              <div key={m.id || idx} className="flex justify-center my-2 animate-fade-in text-center w-full">
                                <div className="bg-zinc-900 border border-white/10 rounded-xl px-4 py-2 text-[11px] text-[#E5D2A5] max-w-[80%] font-medium">
                                  {m.content}
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div key={m.id || idx} className={`flex ${isStudent ? "justify-start" : "justify-end"} animate-fade-in w-full`}>
                              <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-xs leading-relaxed text-left ${
                                isStudent
                                  ? "bg-zinc-900 border border-white/5 text-zinc-100 rounded-tl-none"
                                  : isTeacher
                                    ? "bg-[#E5D2A5] text-zinc-950 font-semibold rounded-tr-none"
                                    : "bg-zinc-900/40 border border-[#E5D2A5]/20 text-zinc-200 rounded-tr-none"
                              }`}>
                                <div className="flex items-center gap-1.5 mb-1 opacity-50 text-[9px] font-bold uppercase tracking-wider">
                                  <span>{m.senderName || (isStudent ? "Student" : isBot ? "Nucleus AI" : "Teacher")}</span>
                                  <span>•</span>
                                  <span className="font-mono">{msgTime}</span>
                                </div>
                                {isStudent ? (
                                  <div className="whitespace-pre-wrap select-text">{m.content}</div>
                                ) : (
                                  <div className="markdown-body select-text">
                                    <Markdown>{m.content}</Markdown>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="h-full flex items-center justify-center text-center text-zinc-500">
                          <span>No messages in this chat session.</span>
                        </div>
                      )}
                    </div>

                    {/* Admin Message Typing Feed footer */}
                    <div className="pt-3 border-t border-white/10 flex items-center gap-3 shrink-0">
                      <input
                        type="text"
                        value={adminMessageText}
                        onChange={(e) => setAdminMessageText(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSendAdminMessage()}
                        placeholder="Reply directly to the student or explain formulas..."
                        className="flex-1 px-4 py-3 text-xs bg-zinc-950 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-[#E5D2A5]"
                      />
                      <button
                        onClick={handleSendAdminMessage}
                        disabled={!adminMessageText.trim()}
                        className="p-3.5 rounded-xl bg-[#E5D2A5] hover:bg-[#f4ecd8] text-zinc-950 disabled:opacity-50 transition-colors cursor-pointer shrink-0"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>

                  </div>
                );
              })()
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center py-20">
                <div className="bg-white/5 w-16 h-16 rounded-full flex items-center justify-center mb-4 border border-white/10">
                  <MessageSquare className="w-8 h-8 text-white/40" />
                </div>
                <h3 className="text-base font-bold text-white tracking-wide">Select a Student Chat Thread</h3>
                <p className="text-xs text-zinc-500 max-w-sm mt-1">
                  Access incoming questions from students in real time. You can view bot transcriptions and click "Join & Intervene" to intercept and guide them directly.
                </p>
              </div>
            )}
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
                      className={`p-2 rounded-lg transition-colors ${unlocked ? "bg-[var(--primary-custom, #F15A29)] text-[#070709]" : "bg-black/50 text-white/40 hover:text-white/80"}`}
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

interface CapturedMock {
  id: string;
  timestamp: string;
  capturedAs: string;
  type: string;
}

interface TelemetryLog {
  id: string;
  type: string;
  msg: string;
  time: string;
}

function DrmSimulatorDashboard() {
  const [sandboxWatermark, setSandboxWatermark] = useState(true);
  const [sandboxRecording, setSandboxRecording] = useState(false);
  const [sandboxCaptured, setSandboxCaptured] = useState<CapturedMock[]>([]);
  const [liveTelemetry, setLiveTelemetry] = useState<TelemetryLog[]>([]);

  useEffect(() => {
    const handleTelemetry = (e: Event) => {
      const customEv = e as CustomEvent;
      if (customEv.detail) {
        setLiveTelemetry(prev => [customEv.detail, ...prev].slice(0, 8));
      }
    };
    window.addEventListener('flag-secure-telemetry', handleTelemetry);
    return () => {
      window.removeEventListener('flag-secure-telemetry', handleTelemetry);
    };
  }, []);

  const triggerMockShutter = () => {
    window.dispatchEvent(new CustomEvent('trigger-secure-shutter'));
    const newRecord: CapturedMock = {
      id: "CAP_" + Date.now().toString().slice(-5),
      timestamp: new Date().toLocaleTimeString(),
      capturedAs: 'PITCH BLACK',
      type: 'Simulation click'
    };
    setSandboxCaptured(prev => [newRecord, ...prev]);
  };

  const toggleRecording = () => {
    const newState = !sandboxRecording;
    setSandboxRecording(newState);
    window.dispatchEvent(new CustomEvent('toggle-secure-recording', { detail: newState }));
  };

  const toggleWatermark = () => {
    const newState = !sandboxWatermark;
    setSandboxWatermark(newState);
    window.dispatchEvent(new CustomEvent('toggle-secure-watermark', { detail: newState }));
  };

  return (
    <div className="border border-white/5 rounded-2xl bg-black/20 p-5 space-y-4 text-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-xs font-mono font-bold tracking-wider uppercase text-[var(--primary-custom, #F15A29)] flex items-center gap-1">
            <ShieldAlert className="w-4 h-4 text-[#ff7a00]" /> Secure DRM Simulator
          </span>
        </div>
        <span className="text-[9px] font-mono font-black text-red-500 uppercase tracking-widest bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">FLAG_SECURE Active</span>
      </div>

      <p className="text-[11px] text-zinc-400 leading-relaxed font-mono text-left">
        Test hardware blocks safely. Simulates how device screen protections (like banking apps) operate globally across all web and mobile views.
      </p>

      {/* Control Buttons */}
      <div className="space-y-2">
        <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/5">
          <div className="flex flex-col text-left">
            <span className="text-[10px] font-bold text-white flex items-center gap-1 font-mono uppercase">
              <Layers className="w-3.5 h-3.5 text-blue-400" /> Dynamic Watermark
            </span>
            <span className="text-[8px] text-zinc-500 font-mono">Telemetry grid overlay</span>
          </div>
          <button
            type="button"
            onClick={toggleWatermark}
            className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono transition-all uppercase cursor-pointer ${
              sandboxWatermark ? 'bg-[#ff7a00]/20 text-[#ff7a00] border border-[#ff7a00]/30' : 'bg-white/5 text-white/40'
            }`}
          >
            {sandboxWatermark ? 'ENABLED' : 'DISABLED'}
          </button>
        </div>

        <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/5">
          <div className="flex flex-col text-left">
            <span className="text-[10px] font-bold text-white flex items-center gap-1 font-mono uppercase">
              <Video className="w-3.5 h-3.5 text-red-400" /> Screen Record Block
            </span>
            <span className="text-[8px] text-zinc-500 font-mono">Silently black media players</span>
          </div>
          <button
            type="button"
            onClick={toggleRecording}
            className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono transition-all uppercase cursor-pointer ${
              sandboxRecording ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/10 text-red-400'
            }`}
          >
            {sandboxRecording ? 'RECORDING ON' : 'TEST RECORD'}
          </button>
        </div>
      </div>

      {/* Primary Simulator Launch Trigger */}
      <button
        type="button"
        onClick={triggerMockShutter}
        className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gradient-to-r from-[var(--primary-custom, #F15A29)] to-[#f4e2ba] hover:brightness-110 text-zinc-950 font-bold text-[10px] uppercase tracking-widest cursor-pointer transition-transform active:scale-[0.98]"
      >
        <Camera className="w-3.5 h-3.5" /> Trigger Shot Block Simulation
      </button>

      {/* Captured simulation results list */}
      <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-2">
        <span className="text-[8px] text-[#ff7a00] font-black uppercase tracking-wider block flex items-center gap-1 font-mono text-left">
          <History className="w-3 h-3" /> Mock Output Buffer Captures ({sandboxCaptured.length})
        </span>

        {sandboxCaptured.length === 0 ? (
          <div className="text-center py-2.5 text-zinc-600 text-[9px] font-mono">
            No capture events simulated. Trigger above!
          </div>
        ) : (
          <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
            {sandboxCaptured.map((item, index) => {
              const isTargetBlack = index === 1 || index === 2 || index === 4;
              return (
                <div key={item.id} className="flex items-center justify-between bg-zinc-900/60 p-1.5 rounded-lg border border-white/5 font-mono text-[9px]">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-7 rounded bg-black border border-white/20 flex items-center justify-center">
                      <span className="text-[4px] text-white font-mono scale-90">BLACK</span>
                    </div>
                    <div className="flex flex-col text-[8px] leading-none text-left">
                      <span className="text-zinc-300 font-bold">{item.id}</span>
                      <span className="text-zinc-500 text-[7px] mt-0.5">{item.timestamp}</span>
                    </div>
                  </div>
                  <span 
                    className={`text-[7.5px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase tracking-wide ${
                      isTargetBlack 
                        ? 'bg-[var(--primary-custom, #F15A29)] text-black border-none font-extrabold' 
                        : 'bg-red-400/10 text-red-400 border-red-400/20'
                    }`}
                  >
                    {item.capturedAs}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Live Telemetry monitor output log */}
      <div className="p-2.5 rounded-xl bg-black/60 border border-white/5 space-y-2 select-text">
        <span className="text-[8px] text-zinc-400 font-bold uppercase tracking-wider block flex items-center gap-1 font-mono text-left">
          <AlertTriangle className="w-3 h-3 text-yellow-500" /> Real-time System Console Logs
        </span>

        {liveTelemetry.length === 0 ? (
          <div className="text-[8px] font-mono text-zinc-600 py-1.5 text-center">
            Awaiting real browser actions (PrintScreen / Copy / Switch Tab)...
          </div>
        ) : (
          <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
            {liveTelemetry.map((log, index) => {
              const isTargetBlack = index === 1 || index === 2 || index === 4;
              return (
                <div key={log.id} className="text-[8px] font-mono flex items-start gap-1 justify-between border-b border-white/[0.03] pb-1 text-left">
                  <span className="text-yellow-400 font-bold uppercase shrink-0">[{log.time}]:</span>
                  <span 
                    className={`flex-1 ml-1 leading-normal text-left ${isTargetBlack ? "text-black font-semibold" : "text-zinc-300"}`}
                  >
                    {log.msg}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ApiGatewayTelemetryConsole() {
  const [logs, setLogs] = useState<APITelemetryLog[]>([]);
  const [totalRequests, setTotalRequests] = useState(0);
  const [avgLatency, setAvgLatency] = useState(0);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    // Sync initial logs
    const initialLogs = apiGateway.getLogs();
    setLogs(initialLogs);
    setTotalRequests(initialLogs.length);
    if (initialLogs.length > 0) {
      const sum = initialLogs.reduce((acc, log) => acc + log.latencyMs, 0);
      setAvgLatency(Math.round(sum / initialLogs.length));
    }

    // Subscribe to updates with a ref to avoid infinite re-renders or stale count
    const unsubscribe = apiGateway.subscribeTelemetry((newLog) => {
      setLogs((prev) => [newLog, ...prev].slice(0, 15));
      setTotalRequests((prevCount) => {
        const nextCount = prevCount + 1;
        setAvgLatency((prevAvg) => {
          return Math.round((prevAvg * prevCount + newLog.latencyMs) / nextCount);
        });
        return nextCount;
      });
    });

    return () => unsubscribe();
  }, []);

  const runLoadSimulation = async () => {
    if (simulating) return;
    setSimulating(true);
    try {
      // Execute distinct tasks simultaneously to model distributed REST operations
      await Promise.all([
        apiGateway.materials.list(2),
        apiGateway.mentors.list(),
        apiGateway.settings.getGlobal()
      ]);
    } catch (e) {
      console.error("Simulation query err:", e);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="border border-white/5 rounded-2xl bg-black/20 p-5 space-y-4 text-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-xs font-mono font-bold tracking-wider uppercase text-cyan-400 flex items-center gap-1">
            <Compass className="w-4 h-4 text-cyan-400" /> Central API Gateway Monitor
          </span>
        </div>
        <span className="text-[8px] font-mono font-bold text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20 uppercase tracking-widest">
          Active Trace
        </span>
      </div>

      <p className="text-[11px] text-zinc-400 leading-relaxed font-mono text-left">
        Observability panel mapping transactions routing through the central API Gateway tier. Tracks query response times, HTTP states, and database layer latencies.
      </p>

      {/* Observability Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 text-left">
          <span className="text-[8px] font-mono text-zinc-500 uppercase block">Total Operations</span>
          <span className="text-lg font-black font-mono text-white">{totalRequests}</span>
        </div>
        <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 text-left">
          <span className="text-[8px] font-mono text-zinc-500 uppercase block">Avg Latency</span>
          <span className="text-lg font-black font-mono text-cyan-400 font-bold">
            {avgLatency > 0 ? `${avgLatency} ms` : "0 ms"}
          </span>
        </div>
      </div>

      {/* Simulator Actions */}
      <button
        type="button"
        disabled={simulating}
        onClick={runLoadSimulation}
        className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:brightness-110 disabled:opacity-50 text-white font-bold text-[10px] uppercase tracking-widest cursor-pointer transition-all active:scale-[0.98]"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${simulating ? "animate-spin" : ""}`} />
        {simulating ? "Executing Cloud Fetch..." : "Simulate Live API Load Test"}
      </button>

      {/* Micro service traces */}
      <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-2">
        <span className="text-[8px] text-cyan-400 font-black uppercase tracking-wider block flex items-center gap-1 font-mono text-left">
          <History className="w-3 h-3" /> HTTP / Firestore Stream Traces ({logs.length})
        </span>

        {logs.length === 0 ? (
          <div className="text-center py-4 text-zinc-500 text-[9px] font-mono">
            Gateway quiescent. Execute operations or run the load test above!
          </div>
        ) : (
          <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
            {logs.map((log, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-zinc-900/60 p-1.5 rounded-lg border border-white/5 font-mono text-[9px]"
              >
                <div className="flex items-start gap-1.5 text-left min-w-0 flex-1">
                  <span
                    className={`text-[8px] font-bold px-1 py-0.2 rounded shrink-0 font-mono ${
                      log.method === "GET"
                        ? "bg-sky-500/10 text-sky-400"
                        : log.method === "POST" || log.method === "PUT"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : log.method === "DELETE"
                        ? "bg-rose-500/10 text-rose-400"
                        : "bg-purple-500/10 text-purple-400"
                    }`}
                  >
                    {log.method}
                  </span>
                  <div className="flex flex-col text-[8.5px] leading-tight font-mono text-left min-w-0 flex-1">
                    <span className="text-zinc-300 font-bold truncate block">{log.endpoint}</span>
                    <span className="text-zinc-500 text-[6.5px] mt-0.5 font-mono">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <span className="text-[8px] font-mono text-zinc-400 font-bold">
                    {log.latencyMs}ms
                  </span>
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      log.success ? "bg-emerald-400 shadow-[0_0_4px_#34d399]" : "bg-red-400 animate-ping"
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function YoutubeDiagnosticConsole() {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<{
    totalVideos: number;
    faultyVideos: number;
    faultyList: { id: string; title: string; url: string; videoId?: string; isSecureSyncMissing: boolean }[];
  } | null>(null);
  const [repairing, setRepairing] = useState(false);
  const [repairResult, setRepairResult] = useState<string>("");

  const runDiagnostics = async () => {
    setLoading(true);
    setRepairResult("");
    try {
      const mSnap = await getDocs(collection(db, "materials"));
      const allMaterials = mSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      
      const vids = allMaterials.filter(m => m.type === "lecture" || m.fileType === "video" || m.materialType === "video_lectures");
      
      const faulty: { id: string; title: string; url: string; videoId?: string; isSecureSyncMissing: boolean }[] = [];
      
      for (const v of vids) {
        const isYouTube = v.url && (v.url.includes("youtube.com") || v.url.includes("youtu.be") || v.url.includes("shorts/"));
        const idFromUrl = parseYouTubeVideoId(v.url || "");
        
        const isNotEmbed = isYouTube && idFromUrl && !v.url.includes("/embed/");
        const isVideoIdMissing = isYouTube && idFromUrl && !v.videoId;
        
        const secureSnap = await getDoc(doc(db, "materials_secure", v.id));
        const isSecureSyncMissing = !secureSnap.exists() || !secureSnap.data()?.url;
        
        if (isNotEmbed || isVideoIdMissing || isSecureSyncMissing) {
          faulty.push({
            id: v.id,
            title: v.title,
            url: v.url || "",
            videoId: v.videoId || idFromUrl || undefined,
            isSecureSyncMissing
          });
        }
      }
      
      setReport({
        totalVideos: vids.length,
        faultyVideos: faulty.length,
        faultyList: faulty
      });
    } catch (err: any) {
      console.error(err);
      alert("Diagnostics failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const executeRepair = async () => {
    if (!report || report.faultyVideos === 0) return;
    setRepairing(true);
    setRepairResult("");
    try {
      let repairCount = 0;
      for (const item of report.faultyList) {
        const parsedId = parseYouTubeVideoId(item.url);
        if (parsedId) {
          const embedUrl = `https://www.youtube.com/embed/${parsedId}`;
          await updateDoc(doc(db, "materials", item.id), {
            url: embedUrl,
            fileUrl: embedUrl,
            videoId: parsedId,
            fileType: "video",
          });
          
          await setDoc(doc(db, "materials_secure", item.id), { url: embedUrl });
          repairCount++;
        } else {
          if (item.url && item.isSecureSyncMissing) {
            await setDoc(doc(db, "materials_secure", item.id), { url: item.url });
            repairCount++;
          }
        }
      }
      setRepairResult(`Successfully repaired and authorized ${repairCount} legacy educational videos!`);
      await runDiagnostics();
    } catch (err: any) {
      console.error(err);
      setRepairResult("Repair encountered an error: " + err.message);
    } finally {
      setRepairing(false);
    }
  };

  return (
    <div className="border border-red-500/30 rounded-2xl bg-red-950/20 p-5 space-y-4 text-left">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-red-100 tracking-wider flex items-center gap-1.5 font-mono uppercase">
          <span>🛠️ YouTube System Auto-Repair Assistant</span>
        </h4>
        <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 font-mono text-[8px] font-bold uppercase tracking-widest">DRM Auditor</span>
      </div>
      
      <p className="text-[10px] text-zinc-400 leading-relaxed font-sans mt-1">
        Analyze all course video folders to verify URL embedding formats, isolate missing indices, detect non-migrated secure streams, and secure legacy materials database records dynamically in a single tap.
      </p>

      {!report && (
        <button
          type="button"
          onClick={runDiagnostics}
          disabled={loading}
          className="w-full text-center py-2 bg-red-900/40 hover:bg-red-900/60 text-red-200 border border-red-500/20 rounded-xl text-xs font-bold cursor-pointer transition-all uppercase tracking-wider font-mono animate-pulse"
        >
          {loading ? "Scanning core directories..." : "Scan Video Playback Ecosystem"}
        </button>
      )}

      {report && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-black/40 border border-white/5 font-mono text-[11px]">
            <div>
              <span className="text-zinc-500 block uppercase text-[8px]">Examined Videos</span>
              <span className="text-white font-bold">{report.totalVideos}</span>
            </div>
            <div>
              <span className="text-zinc-500 block uppercase text-[8px]">Anomalies Found</span>
              <span className={`font-bold ${report.faultyVideos > 0 ? 'text-red-400 animate-pulse' : 'text-green-400'}`}>
                {report.faultyVideos}
              </span>
            </div>
          </div>

          {report.faultyVideos > 0 ? (
            <div className="space-y-3">
              <div className="max-h-[160px] overflow-y-auto space-y-2 border border-white/5 rounded-xl p-2.5 bg-black/20">
                {report.faultyList.map(item => (
                  <div key={item.id} className="text-[11px] font-mono p-2 rounded bg-white/5 hover:bg-white/10 transition-colors">
                    <span className="text-white block truncate font-sans font-bold">{item.title}</span>
                    <span className="text-red-400 text-[10px] block truncate mt-1">Fault: Legacy Format / Missing DRM Link</span>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={executeRepair}
                disabled={repairing}
                className="w-full text-center py-2.5 bg-[var(--primary-custom,#F15A29)] hover:brightness-110 text-white rounded-xl text-xs font-bold cursor-pointer transition-all uppercase tracking-widest shadow-md"
              >
                {repairing ? "Executing repair routine..." : "Instant Safe Repair Ecosystem"}
              </button>
            </div>
          ) : (
            <div className="p-3 bg-green-500/5 border border-green-500/10 text-green-400 rounded-xl text-xs font-sans flex items-center gap-2">
              <span>✓ All video links verified! URLs are embedded, video IDs correspond, and DRM structures are completely synchronized.</span>
            </div>
          )}

          {repairResult && (
            <div className="p-3 bg-blue-500/5 border border-blue-500/10 text-blue-400 rounded-xl text-[11px] font-mono text-left animate-fade-in uppercase">
              {repairResult}
            </div>
          )}

          <button
            type="button"
            onClick={runDiagnostics}
            className="text-center w-full text-zinc-500 hover:text-zinc-300 text-[10px] uppercase font-mono tracking-wider pt-1 block"
          >
            Re-scan Database Status
          </button>
        </div>
      )}
    </div>
  );
}
