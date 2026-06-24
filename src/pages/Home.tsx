import { motion, useScroll, useTransform, AnimatePresence } from 'motion/react';
import { useEffect, useState, useRef } from 'react';
import { Play, BookOpen, Video, Lock, Check, X, Sparkles, Star, Trophy, ArrowRight, Heart, Feather, Coffee, QrCode, Copy, Smartphone } from 'lucide-react';
import { signInWithGoogle, db } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { useNavigate } from 'react-router-dom';
import { collection, query, getDocs, limit, orderBy } from 'firebase/firestore';
import { FloatingStickers } from '../components/FloatingStickers';
import { NucleusLogo } from '../components/NucleusLogo';

function MentorTrack({ mentors, direction = 'left' }: { mentors: any[], direction?: 'left' | 'right' }) {
  // Duplicate for infinite scroll
  const dupMentors = [...mentors, ...mentors];
  
  return (
    <div className="flex w-full overflow-hidden relative fade-mask py-6">
      <motion.div 
        initial={{ x: direction === 'left' ? 0 : '-50%' }}
        animate={{ x: direction === 'left' ? '-50%' : 0 }}
        transition={{ 
          duration: 35, 
          ease: 'linear', 
          repeat: Infinity 
        }}
        className="flex gap-8 px-4 whitespace-nowrap min-w-max"
      >
        {dupMentors.map((m, i) => (
          <motion.div 
            key={i} 
            whileHover={{ y: -8, scale: 1.02 }}
            className="group relative w-[260px] p-5 bg-glass-bg border border-border-color hover:border-accent-primary/20 rounded-3xl transition-all duration-300 flex flex-col gap-4 text-left whitespace-normal shadow-sm hover:shadow-lg z-30"
            style={{ borderRadius: 'var(--theme-card-radius, 24px)' }}
          >
            {/* Soft background glow for cards */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-accent-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

            <div className="w-full h-[160px] rounded-2xl overflow-hidden bg-bg-secondary relative border border-border-color/50">
              <img 
                src={m.image} 
                alt={m.name} 
                className="w-full h-full object-cover group-hover:scale-105 transition-all duration-700 ease-out"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors duration-300"></div>
              {/* Cute badge inside avatar */}
              <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-white/95 dark:bg-zinc-900/95 shadow-sm text-[10px] font-bold text-accent-primary flex items-center gap-1">
                <Star className="w-2.5 h-2.5 fill-current" />
                <span>IIT/Doc faculty</span>
              </div>
            </div>

            {/* Teacher basic details */}
            <div className="flex flex-col flex-1 justify-between min-h-[80px] relative z-10">
              <div>
                <h3 className="font-display font-bold text-lg text-text-primary group-hover:text-accent-primary transition-colors duration-300 line-clamp-1 truncate">{m.name}</h3>
                <p className="text-xs text-text-muted font-medium line-clamp-1 truncate mb-2">{m.role}</p>
              </div>
              
              <div className="text-xs text-accent-primary font-bold flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity duration-300 select-none pt-2 border-t border-border-color/40">
                <span>Distinguished Faculty</span>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const y1 = useTransform(scrollYProgress, [0, 1], [0, 180]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, -80]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  // Morph scroll transforms for background blobs
  const blobSpeed1 = useTransform(scrollYProgress, [0, 1], [0, 240]);
  const blobSpeed2 = useTransform(scrollYProgress, [0, 1], [0, -180]);
  const blobSkewY1 = useTransform(scrollYProgress, [0, 0.5, 1], [0, 12, -8]);
  const blobSkewX1 = useTransform(scrollYProgress, [0, 0.5, 1], [0, -6, 10]);
  const blobScale1 = useTransform(scrollYProgress, [0, 0.5, 1], [1, 1.2, 0.9]);
  const blobRotate1 = useTransform(scrollYProgress, [0, 1], [0, 120]);

  const blobSkewY2 = useTransform(scrollYProgress, [0, 0.5, 1], [0, -10, 15]);
  const blobSkewX2 = useTransform(scrollYProgress, [0, 0.5, 1], [0, 8, -12]);
  const blobScale2 = useTransform(scrollYProgress, [0, 0.5, 1], [1, 0.85, 1.25]);
  const blobRotate2 = useTransform(scrollYProgress, [0, 1], [0, -150]);
  
  const pricingContainerRef = useRef<HTMLDivElement | null>(null);

  const handlePricingScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (window.innerWidth >= 768) return; // Only apply on mobile where overflow-x scroll is active
    const container = e.currentTarget;
    
    // Get child nodes corresponding specifically to the pricing cards
    const children = Array.from(container.children) as HTMLElement[];
    const cardChildren = children.filter(child => child.id && child.id.endsWith('-pricing-card'));
    if (cardChildren.length === 0) return;
    
    let closestIndex = 0;
    let minDistance = Infinity;
    const containerCenter = container.getBoundingClientRect().left + container.offsetWidth / 2;
    
    cardChildren.forEach((child, index) => {
      const rect = child.getBoundingClientRect();
      const childCenter = rect.left + rect.width / 2;
      const distance = Math.abs(childCenter - containerCenter);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });

    const plans = ['notes', 'lectures', 'premium'];
    if (closestIndex >= 0 && closestIndex < plans.length) {
      const matchedPlan = plans[closestIndex];
      if (matchedPlan !== activePricingCard) {
        setActivePricingCard(matchedPlan);
      }
    }
  };

  const scrollToPlan = (plan: string) => {
    setActivePricingCard(plan);
    if (!pricingContainerRef.current) return;
    const container = pricingContainerRef.current;
    
    const children = Array.from(container.children).filter(
      (c) => (c as HTMLElement).id && (c as HTMLElement).id.endsWith('-pricing-card')
    ) as HTMLElement[];
    const plans = ['notes', 'lectures', 'premium'];
    const index = plans.indexOf(plan);
    
    if (index !== -1 && children[index]) {
      const child = children[index];
      const containerWidth = container.offsetWidth;
      const childWidth = child.offsetWidth;
      // Scroll to position where the child is perfectly centered in the container
      const scrollToLeft = child.offsetLeft - (containerWidth - childWidth) / 2;
      container.scrollTo({
        left: scrollToLeft,
        behavior: 'smooth'
      });
    }
  };

  const { user } = useAuthStore();
  const { settings } = useSettingsStore();
  const navigate = useNavigate();
  const [materials, setMaterials] = useState<any[]>([]);
  const [mentors1, setMentors1] = useState<any[]>([]);
  const [mentors2, setMentors2] = useState<any[]>([]);
  const [selectedClassGroup, setSelectedClassGroup] = useState<string>('all');
  const [pricingClassGroup, setPricingClassGroup] = useState<string>('11');
  const [activeStickerId, setActiveStickerId] = useState<string | null>(null);
  const [activePricingCard, setActivePricingCard] = useState<string | null>('lectures');
  const [showTeacherBox, setShowTeacherBox] = useState(false);
  const [isPaymentChoiceOpen, setIsPaymentChoiceOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(250);
  const [customAmountText, setCustomAmountText] = useState<string>('250');
  const [upiIdCopied, setUpiIdCopied] = useState(false);
  const [showQrMode, setShowQrMode] = useState(false);
  const [paymentPurpose, setPaymentPurpose] = useState<string>('Support & Donation');

  useEffect(() => {
    // Explicitly scroll to top on mount to ensure landing page starts at the header
    window.scrollTo(0, 0);
    const lenis = (window as any).lenisInstance;
    if (lenis) {
      lenis.scrollTo(0, { immediate: true });
    }

    const handleOpenDonation = () => {
      setPaymentPurpose('Support & Donation');
      setPaymentAmount(250);
      setCustomAmountText('250');
      setIsPaymentChoiceOpen(true);
    };
    window.addEventListener('trigger-nucleus-donation', handleOpenDonation);

    const fetchMaterials = async () => {
      try {
        const q = query(collection(db, 'materials'), orderBy('createdAt', 'desc'), limit(6));
        const snapshot = await getDocs(q);
        setMaterials(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Error fetching materials for home:", error);
      }
      
      try {
        const mentorSnap = await getDocs(query(collection(db, 'mentors'), orderBy('createdAt', 'desc')));
        const allMentors = mentorSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const half = Math.ceil(allMentors.length / 2);
        setMentors1(allMentors.slice(0, half));
        setMentors2(allMentors.slice(half));
      } catch (error) {
        console.error("Error fetching mentors for home:", error);
      }
    };
    fetchMaterials();

    return () => {
      window.removeEventListener('trigger-nucleus-donation', handleOpenDonation);
    };
  }, []);

  const planTiers = {
    free: 0,
    notes: 1,
    lectures: 2,
    premium: 3
  };
  const userTier = user ? planTiers[user.planId as keyof typeof planTiers] : 0;

  const renderDecoratedTitle = (title: string) => {
    const line1 = settings.heroTitleLine1 || "Learning That's";
    const line2 = settings.heroTitleLine2 || "Smart, Simple &";
    const highlight = settings.heroTitleHighlight || "Super Fun!";
    
    // Split the middle line to attach the cute purple doodle spark lines above the first word
    const words = line2.split(' ');
    const firstWord = words[0] || "";
    const remainingWords = words.slice(1).join(' ');

    return (
      <h1 className="text-5xl md:text-7xl font-display font-black tracking-tight text-text-primary mb-8 leading-[1.25] relative select-none text-center flex flex-col items-center justify-center">
        <span className="block mt-1">{line1}</span>
        <span className="relative inline-block mt-3 z-10 font-black">
          {firstWord && (
            <span className="relative inline-block pr-1 text-text-primary font-black">
              {firstWord}
              <span className="absolute -top-7 left-[65%] w-14 h-9 pointer-events-none select-none text-[#b894ff]">
                <svg viewBox="0 0 40 30" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full stroke-current animate-pulse" strokeWidth="3" strokeLinecap="round">
                  <path d="M 8 22 C 10 15, 14 8, 22 4" />
                  <path d="M 18 24 C 21 16, 28 10, 36 6" />
                  <path d="M 2 16 C 5 12, 10 8, 16 6" />
                </svg>
              </span>
            </span>
          )}
          {remainingWords ? ` ${remainingWords}` : ''}
        </span>
        <span className="block mt-3 relative z-10">
          <span className="relative inline-block pb-3.5 text-text-primary font-black">
            {highlight}
            <span className="absolute -bottom-1 left-0 w-full h-4 pointer-events-none select-none text-[#FA8339]">
              <svg viewBox="0 0 160 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full stroke-current" strokeWidth="4.5" strokeLinecap="round">
                <path d="M 2 4 Q 80 10, 158 3" />
                <path d="M 8 10 Q 82 14, 148 9" />
              </svg>
            </span>
          </span>
        </span>
      </h1>
    );
  };

  const handleCopyUpiId = () => {
    if (settings.upiId) {
      navigator.clipboard.writeText(settings.upiId);
      setUpiIdCopied(true);
      setTimeout(() => setUpiIdCopied(false), 2000);
    }
  };

  const handleCTA = () => {
    setPaymentPurpose('Support & Donation');
    setPaymentAmount(250);
    setCustomAmountText('250');
    setIsPaymentChoiceOpen(true);
  };

  const handleCTA2 = () => {
    if (settings.heroCta2Link) {
      if (settings.heroCta2Link.startsWith('http')) {
        window.open(settings.heroCta2Link, '_blank');
      } else {
        navigate(settings.heroCta2Link);
      }
    }
  };

  const handlePayment = (planName: string, amount: number) => {
    if (!settings.upiId) return alert('UPI ID not configured by admin. Please contact support.');
    setPaymentPurpose(`Class ${pricingClassGroup} ${planName.toUpperCase()} Plan`);
    setPaymentAmount(amount);
    setCustomAmountText(amount.toString());
    setIsPaymentChoiceOpen(true);
  };

  return (
    <motion.div 
      ref={containerRef}
      initial={{ opacity: 0, filter: 'blur(5px)' }}
      animate={{ opacity: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, filter: 'blur(5px)' }}
      transition={{ duration: 0.5 }}
      className="relative overflow-x-hidden min-h-screen"
    >
      {/* Absolute Handdrawn decals & organic floating stickers */}
      <FloatingStickers />

      {/* Hero Section */}
      <section 
        id="about" 
        className="relative min-h-screen flex items-center justify-center pt-28 pb-16 lg:pb-28 overflow-hidden"
        onClick={() => setActiveStickerId(null)}
      >
        
        {/* Soft colorful blobs in back */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
          <div 
            className="absolute top-[10%] left-[5%] w-[380px] h-[380px] rounded-full bg-gradient-to-tr from-accent-primary/15 to-transparent blur-[100px]"
          />
          <div 
            className="absolute bottom-[20%] right-[10%] w-[450px] h-[450px] rounded-full bg-gradient-to-tr from-[#ff82a0]/15 to-transparent blur-[120px]"
          />
          {/* Subtle learning theme grid outline */}
          <div className="absolute inset-0 bg-[radial-gradient(#e5d2a5_1px,transparent_1px)] [background-size:24px_24px] opacity-15" />
        </div>

        {/* Dynamic Custom Indigo Splatter Pop Splash with Academic/Targeted Photo */}
        {settings.aboutCornerImageUrl !== "none" && (
          <div className="absolute top-16 xs:top-20 sm:top-24 right-4 xs:right-6 lg:right-12 z-30 w-24 h-24 xs:w-28 xs:h-28 sm:w-36 sm:h-36 md:w-44 md:h-44 xl:w-52 xl:h-52 pointer-events-auto">
            {/* Pop Splash / Water Spill Background Effect */}
            {settings.aboutCornerBackground !== "none" && (
              <div className="absolute inset-0 pointer-events-none scale-140 z-0 select-none" style={{ animationDuration: '4s' }}>
                {settings.aboutCornerBackground === "water_spread" ? (
                  // WATER SPREAD - smooth organic irregular liquid spread flat spill pattern
                  <svg viewBox="0 0 100 100" className="w-full h-full text-accent-primary fill-current opacity-90 filter drop-shadow-[0_16px_32px_rgba(79, 70, 229,0.35)]">
                    <path d="M50 8 C68 5, 87 14, 91 32 C95 48, 81 56, 85 70 C89 84, 69 94, 50 90 C31 86, 12 84, 8 66 C4 48, 16 40, 14 26 C12 11, 32 11, 50 8 Z" />
                    {/* Scattered uneven water drop splatters of varying sizes */}
                    <circle cx="86" cy="18" r="4" />
                    <circle cx="95" cy="44" r="2.8" />
                    <circle cx="80" cy="82" r="3.2" />
                    <circle cx="56" cy="94" r="3.8" />
                    <circle cx="20" cy="85" r="2.7" />
                    <circle cx="6" cy="50" r="4.5" />
                    <circle cx="10" cy="22" r="3.5" />
                    <circle cx="30" cy="6" r="2.2" />
                  </svg>
                ) : (
                  // BALLOON BURST POP - high energy spiking blast with splattered dots
                  <svg viewBox="0 0 100 100" className="w-full h-full text-accent-primary fill-current opacity-90 filter drop-shadow-[0_16px_32px_rgba(79, 70, 229,0.35)]">
                    <path d="M50 14 C64 6, 79 10, 85 24 C91 38, 96 48, 88 64 C80 80, 70 88, 54 90 C38 92, 22 84, 15 72 C8 60, 5 40, 14 26 C23 12, 36 22, 50 14 Z" />
                    {/* Popping spike rays */}
                    <line x1="50" y1="14" x2="52" y2="2" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" />
                    <line x1="85" y1="24" x2="96" y2="15" stroke="var(--accent-primary)" strokeWidth="1.5" strokeLinecap="round" />
                    <line x1="88" y1="64" x2="98" y2="72" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" />
                    {/* Splattered droplets */}
                    <circle cx="85" cy="12" r="3.5" />
                    <circle cx="95" cy="32" r="2.5" />
                    <circle cx="92" cy="56" r="3" />
                    <circle cx="76" cy="80" r="4.2" />
                    <circle cx="48" cy="94" r="2.8" />
                    <circle cx="20" cy="86" r="3.5" />
                    <circle cx="10" cy="58" r="4" />
                    <circle cx="6" cy="34" r="2.6" />
                    <circle cx="14" cy="14" r="3.2" />
                  </svg>
                )}
              </div>
            )}

            {/* Configurable Image Frame / Circular Profile Element - static, no animations */}
            <div 
              className={`absolute inset-1 bg-bg-primary p-1 border border-border-color overflow-hidden shadow-2xl z-10 flex flex-col items-center justify-center text-center ${
                settings.aboutCornerImgShape === "circle" ? "rounded-full" : "rounded-2xl sm:rounded-[28px]"
              }`}
            >
              <div className={`relative w-full h-full overflow-hidden flex items-center justify-center p-4 bg-bg-secondary/40 backdrop-blur-xs ${
                settings.aboutCornerImgShape === "circle" ? "rounded-full" : "rounded-xl sm:rounded-[22px]"
              }`}>
                <NucleusLogo 
                  className="w-4/5 h-4/5 text-text-primary" 
                  logoColor="currentColor" 
                />
                
                {/* Visual Glass highlights */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/10 pointer-events-none" />
              </div>
            </div>
          </div>
        )}

        {/* CUTE DECORATIVE DRAGGABLE STUDY STICKERS BASED ON THEME */}
        <div className="absolute inset-0 pointer-events-none z-10 select-none overflow-hidden">
          {[
            {
              id: "academic-books",
              emoji: settings.studySticker1Emoji || "📚",
              title: settings.studySticker1Title || "STUDY FORCE",
              subtitle: settings.studySticker1Subtitle || "Focus Active",
              popup: settings.studySticker1Popup || "Ignite your study sessions with maximum mental torque! 📚 Keep learning!",
              left: settings.studySticker1Left !== undefined ? settings.studySticker1Left : "2%",
              top: settings.studySticker1Top !== undefined ? settings.studySticker1Top : "22%",
              rotate: settings.studySticker1Rotate !== undefined ? settings.studySticker1Rotate : -12,
              show: settings.studySticker1Show !== false,
              duration: 5.2,
              themeColor: "text-accent-primary border-accent-primary/30 shadow-accent-primary/5 bg-accent-primary/5",
              delay: 0,
              align: "left",
            },
            {
              id: "academic-bulb",
              emoji: settings.studySticker2Emoji || "💡",
              title: settings.studySticker2Title || "DEEP FOCUS",
              subtitle: settings.studySticker2Subtitle || "Active Sparks",
              popup: settings.studySticker2Popup || "A single spark of intuition can illuminate any difficult problem! 💡 Stay curious!",
              left: settings.studySticker2Left !== undefined ? settings.studySticker2Left : "4%",
              top: settings.studySticker2Top !== undefined ? settings.studySticker2Top : "76%",
              rotate: settings.studySticker2Rotate !== undefined ? settings.studySticker2Rotate : 15,
              show: settings.studySticker2Show !== false,
              duration: 6.0,
              themeColor: "text-amber-400 border-amber-400/30 shadow-amber-400/5 bg-amber-400/5",
              delay: 0.4,
              align: "left",
            },
            {
              id: "academic-grad",
              emoji: settings.studySticker3Emoji || "🎓",
              title: settings.studySticker3Title || "AIR 1 GOAL",
              subtitle: settings.studySticker3Subtitle || "IIT Selection",
              popup: settings.studySticker3Popup || "Keep your eyes on the prize. All India Rank 1 starts with persistent everyday discipline! 🎓",
              left: settings.studySticker3Left !== undefined ? settings.studySticker3Left : "47%",
              top: settings.studySticker3Top !== undefined ? settings.studySticker3Top : "12%",
              rotate: settings.studySticker3Rotate !== undefined ? settings.studySticker3Rotate : -8,
              show: settings.studySticker3Show !== false,
              duration: 4.8,
              themeColor: "text-indigo-400 border-indigo-400/30 shadow-indigo-400/5 bg-indigo-400/5",
              delay: 0.8,
              align: "center",
            },
            {
              id: "academic-target",
              emoji: settings.studySticker4Emoji || "🎯",
              title: settings.studySticker4Title || "100% AIM",
              subtitle: settings.studySticker4Subtitle || "Perfect Practice",
              popup: settings.studySticker4Popup || "Accuracy is built by constant deliberate feedback. Refine your aim daily! 🎯",
              left: settings.studySticker4Left !== undefined ? settings.studySticker4Left : "44%",
              top: settings.studySticker4Top !== undefined ? settings.studySticker4Top : "84%",
              rotate: settings.studySticker4Rotate !== undefined ? settings.studySticker4Rotate : 10,
              show: settings.studySticker4Show !== false,
              duration: 5.5,
              themeColor: "text-rose-400 border-rose-400/30 shadow-rose-400/5 bg-rose-400/5",
              delay: 1.2,
              align: "center",
            },
            {
              id: "academic-coffee",
              emoji: settings.studySticker5Emoji || "☕",
              title: settings.studySticker5Title || "NIGHT RUNS",
              subtitle: settings.studySticker5Subtitle || "Midnight Session",
              popup: settings.studySticker5Popup || "The quiet hours are when progress is made. Fuel your academic ambition! ☕",
              left: settings.studySticker5Left !== undefined ? settings.studySticker5Left : "88%",
              top: settings.studySticker5Top !== undefined ? settings.studySticker5Top : "16%",
              rotate: settings.studySticker5Rotate !== undefined ? settings.studySticker5Rotate : -14,
              show: settings.studySticker5Show !== false,
              duration: 5.0,
              themeColor: "text-emerald-400 border-emerald-400/30 shadow-emerald-400/5 bg-emerald-400/5",
              delay: 0.2,
              align: "right",
            },
            {
              id: "academic-brain",
              emoji: settings.studySticker6Emoji || "🧠",
              title: settings.studySticker6Title || "NEURAL GRID",
              subtitle: settings.studySticker6Subtitle || "Concept Clear",
              popup: settings.studySticker6Popup || "Connect the dots, master the formulas, and let neuroplasticity do the rest! 🧠",
              left: settings.studySticker6Left !== undefined ? settings.studySticker6Left : "87%",
              top: settings.studySticker6Top !== undefined ? settings.studySticker6Top : "78%",
              rotate: settings.studySticker6Rotate !== undefined ? settings.studySticker6Rotate : 18,
              show: settings.studySticker6Show !== false,
              duration: 5.8,
              themeColor: "text-[#ff839a] border-[#ff839a]/30 shadow-[#ff839a]/5 bg-[#ff839a]/5",
              delay: 1.6,
              align: "right",
            }
          ].filter(st => st.show).map((st) => {
            const isActive = activeStickerId === st.id;
            return (
              <motion.div
                key={st.id}
                drag
                dragConstraints={{ left: -30, right: 30, top: -30, bottom: 30 }}
                dragElastic={0.5}
                whileDrag={{ scale: 1.15, cursor: "grabbing" }}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveStickerId(isActive ? null : st.id);
                }}
                className={`absolute pointer-events-auto cursor-pointer select-none flex items-center gap-1.5 xs:gap-2.5 px-2 py-1.5 xs:px-3.5 xs:py-2.5 rounded-xl xs:rounded-2xl border backdrop-blur-md transition-all duration-300 group ${
                  isActive 
                    ? "shadow-[0_0_35px_rgba(99, 102, 241,0.45)] ring-2 ring-accent-primary brightness-110 z-40 scale-110" 
                    : "shadow-lg z-20"
                }`}
                style={{
                  left: st.left,
                  top: st.top,
                  borderColor: isActive ? "var(--color-accent-primary, #E5D2A5)" : "var(--theme-border-color, rgba(255,255,255,0.08))"
                }}
                initial={false}
                animate={{
                  opacity: isActive ? 1 : 0.9,
                  scale: isActive ? 1.12 : 1,
                  y: 0,
                  rotate: isActive ? 0 : st.rotate
                }}
                transition={{
                  duration: 0.2,
                  ease: "easeOut"
                }}
                whileHover={{
                  scale: isActive ? 1.15 : 1.08,
                  opacity: 1,
                  borderColor: "var(--color-accent-primary, #E5D2A5)",
                  transition: { type: 'spring', stiffness: 400, damping: 12 }
                }}
              >
                {/* Sticker Die-cut background bloom effect */}
                <div className={`absolute inset-0 rounded-xl xs:rounded-2xl bg-gradient-to-br ${st.themeColor} ${isActive ? 'opacity-40' : 'opacity-20 group-hover:opacity-40'} transition-opacity duration-300 pointer-events-none`} />
                
                {/* Big bold study emoji */}
                <span className="text-sm xs:text-base md:text-xl filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)] select-none">
                  {st.emoji}
                </span>

                {/* Precise miniature labels */}
                <div className="flex flex-col text-left">
                  <span className="text-[7.5px] xs:text-[8px] sm:text-[10px] font-black tracking-widest leading-none font-mono uppercase text-text-primary group-hover:text-accent-primary transition-colors duration-300">
                    {st.title}
                  </span>
                  <span className="text-[6.5px] xs:text-[7px] sm:text-[8px] text-text-muted font-sans font-medium mt-0.5 whitespace-nowrap">
                    {st.subtitle}
                  </span>
                </div>

                {/* Inner highlight glass overlay */}
                <div className="absolute inset-0 rounded-xl xs:rounded-2xl bg-gradient-to-tr from-transparent via-white/5 to-white/10 pointer-events-none" />
                {/* High contrast die-cut outline effect */}
                <div className="absolute -inset-0.5 rounded-[14px] xs:rounded-[18px] border border-white/5 pointer-events-none group-hover:border-accent-primary/20 transition-colors" />

                {/* Popup motivator balloon Speech Bubble */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.85, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.85, y: -10 }}
                      transition={{ type: "spring", stiffness: 350, damping: 18 }}
                      className={`absolute top-full mt-4 w-52 sm:w-72 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-accent-primary/30 bg-zinc-950/95 backdrop-blur-xl shadow-2xl text-left cursor-default pointer-events-auto ${
                        st.align === "left" 
                          ? "left-0" 
                          : st.align === "right" 
                          ? "right-0" 
                          : "left-1/2 -translate-x-1/2"
                      }`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Triangle Pointer */}
                      <div className={`absolute bottom-full border-[8px] border-transparent border-b-zinc-950/95 filter drop-shadow-[0_-1px_1px_rgba(99, 102, 241,0.2)] ${
                        st.align === "left" 
                          ? "left-6" 
                          : st.align === "right" 
                          ? "right-6" 
                          : "left-1/2 -translate-x-1/2"
                      }`} />

                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-base select-none">{st.emoji}</span>
                          <h4 className="text-[10px] font-black tracking-wider font-mono text-accent-primary uppercase">{st.title}</h4>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveStickerId(null);
                          }}
                          className="text-white/40 hover:text-white/90 transition-colors p-1 rounded-md hover:bg-white/5 cursor-pointer text-xs leading-none"
                          title="Dismiss"
                        >
                          ✖
                        </button>
                      </div>

                      <p className="text-xs leading-relaxed text-slate-200 font-sans font-medium select-text">
                        {st.popup}
                      </p>

                      <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[9px] text-text-muted">
                        <span className="font-sans font-semibold tracking-wide uppercase text-[8px] text-accent-primary/80">{st.subtitle}</span>
                        <span className="text-accent-primary/40 font-mono tracking-widest text-[8px]">★ STICKER POWERUP</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-20 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Text/CTA Left */}
          <div className="lg:col-span-7 text-center flex flex-col items-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="w-full flex flex-col items-center"
            >
              {/* Cute Badge with animation */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent-primary/10 border border-accent-primary/30 mb-6 backdrop-blur-md">
                <span className="w-2.5 h-2.5 rounded-full bg-accent-primary animate-pulse"></span>
                <span className="text-xs font-bold tracking-wide text-text-primary uppercase">{settings.heroBadgeText || 'Interactive Modern Learning Hub'}</span>
              </div>

              {/* Huge friendly rounded heading weight with handdrawn highlights */}
              {renderDecoratedTitle(settings.heroTitle)}

              <p className="text-base md:text-lg text-text-secondary max-w-xl mb-10 text-balance leading-relaxed whitespace-pre-line font-medium text-center mx-auto">
                {settings.heroSubtitle}
              </p>
              
               {/* Primary CTA styling matches a cute responsive game style */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto mx-auto">
                <button 
                  onClick={handleCTA}
                  className="theme-btn-themed px-10 py-4.5 bg-accent-primary text-button-text font-bold hover:scale-105 active:scale-95 transition-all duration-300 shadow-[0_8px_25px_rgba(99, 102, 241,0.35)] w-full sm:w-auto flex items-center justify-center gap-2 group cursor-pointer"
                  style={{ borderRadius: 'var(--theme-btn-radius, 9999px)' }}
                >
                  <span>{settings.heroCta1Text || 'Start Learning Info'}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
                </button>
                <button 
                  onClick={handleCTA2} 
                  className="theme-btn-themed px-8 py-4.5 bg-glass-bg border border-border-color text-text-primary font-bold hover:bg-white/5 active:scale-95 transition-all duration-300 flex items-center justify-center gap-2.5 w-full sm:w-auto cursor-pointer"
                  style={{ borderRadius: 'var(--theme-btn-radius, 9999px)' }}
                >
                  <Play className="w-4 h-4 fill-current text-accent-primary" /> 
                  <span>{settings.heroCta2Text || 'Quick Video Preview'}</span>
                </button>
              </div>
            </motion.div>
          </div>

          {/* Cute interactive mock dashboard graphic Right */}
          <div className="lg:col-span-5 h-full relative flex items-center justify-center">
            <div className="relative w-full max-w-[420px]">
              <div 
                className="relative w-full aspect-[10/16] bg-gradient-to-b from-[#4F46E5] to-[#312E81] rounded-[44px] border-[6px] border-white shadow-[0_24px_50px_rgba(79,70,229,0.15)] overflow-hidden flex flex-col items-center justify-center p-4"
              >
                {/* Background SVG Flow Overlay with Crayon Chalk style lines and arrow highlights */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox="0 0 100 160">
                  <defs>
                    <clipPath id="scallopClipHomeHero">
                      {/* Precise quadratic flower-petal scalloped mask */}
                      <path 
                        d="M 50 5 Q 58 11 65 5 Q 73 11 79 7 Q 85 15 91 13 Q 93 22 98 22 Q 98 31 100 35 Q 98 44 98 50 Q 98 56 100 65 Q 98 69 98 78 Q 93 78 91 87 Q 85 85 79 93 Q 73 89 65 95 Q 58 89 50 95 Q 42 89 35 95 Q 27 89 21 93 Q 15 85 9 87 Q 7 78 2 78 Q 2 69 0 65 Q 2 56 2 50 Q 2 44 0 35 Q 2 31 2 22 Q 7 22 9 13 Q 15 15 21 7 Q 27 11 35 5 Q 42 11 50 5 Z"
                      />
                    </clipPath>
                  </defs>

                  {/* Arrow 1: Top-Center (above avatar) pointing curving up-right to Top-Right cloud */}
                  <path 
                    d="M 50,40 C 50,28 56,18 64,22" 
                    fill="none" 
                    stroke="#FFFFFF" 
                    strokeWidth="2.5" 
                    strokeLinecap="round" 
                    strokeDasharray="4 4"
                    className="opacity-95" 
                  />
                  {/* Arrow 1 custom drawn arrowhead */}
                  <path 
                    d="M 58,19 L 64,22 L 62,28" 
                    fill="none" 
                    stroke="#FFFFFF" 
                    strokeWidth="2.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    className="opacity-95"
                  />

                  {/* Yellow fever/spark lines right above Arrow 1 head */}
                  <line x1="64" y1="16" x2="67" y2="10" stroke="#FCD34D" strokeWidth="2" strokeLinecap="round" />
                  <line x1="70" y1="18" x2="75" y2="13" stroke="#FCD34D" strokeWidth="2" strokeLinecap="round" />
                  <line x1="58" y1="17" x2="60" y2="10" stroke="#FCD34D" strokeWidth="2" strokeLinecap="round" />

                  {/* Arrow 2: Center-Right curving down-left to Middle-Left cloud */}
                  <path 
                    d="M 76,42 C 82,58 78,82 56,90" 
                    fill="none" 
                    stroke="#FFFFFF" 
                    strokeWidth="2.5" 
                    strokeLinecap="round" 
                    strokeDasharray="4 4"
                    className="opacity-95" 
                  />
                  {/* Arrow 2 custom drawn arrowhead */}
                  <path 
                    d="M 62,85 L 56,90 L 62,95" 
                    fill="none" 
                    stroke="#FFFFFF" 
                    strokeWidth="2.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    className="opacity-95"
                  />

                  {/* Arrow 3: From Middle-Left cloud curving down-right to Bottom-Center cloud */}
                  <path 
                    d="M 22,104 C 18,116 24,128 35,124" 
                    fill="none" 
                    stroke="#FFFFFF" 
                    strokeWidth="2.5" 
                    strokeLinecap="round" 
                    strokeDasharray="4 4"
                    className="opacity-95" 
                  />
                  {/* Arrow 3 custom drawn arrowhead */}
                  <path 
                    d="M 29,122 L 35,124 L 32,130" 
                    fill="none" 
                    stroke="#FFFFFF" 
                    strokeWidth="2.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    className="opacity-95"
                  />
                </svg>

                {/* Top-Right Cloud */}
                <div className="absolute top-[6%] right-[3%] z-20">
                  <div className="relative w-36 xs:w-40 sm:w-44 select-none group cursor-pointer transition-transform duration-300 hover:scale-105 hover:-rotate-1">
                    <svg className="w-full h-auto drop-shadow-[0_8px_16px_rgba(0,0,0,0.12)]" viewBox="0 0 100 60" fill="#FFFFFF">
                      <path d="M 20,45 C 15,45 10,41 10,36 C 10,30 15,25 21,25 C 23,17 30,11 39,11 C 47,11 54,16 57,23 C 60,19 65,16 71,16 C 79,16 86,23 86,31 C 86,32 86,34 85,35 C 89,35 92,39 92,43 C 92,48 88,52 83,52 L 20,52 Z" />
                    </svg>
                    <div className="absolute inset-x-0 bottom-4 top-5 flex flex-col items-center justify-center p-2 text-center">
                      <span className="text-zinc-800 text-[10px] sm:text-[11px] font-black uppercase tracking-wider font-display leading-tight">
                        IITian Led
                      </span>
                      <span className="text-indigo-600 text-[8px] sm:text-[9px] font-mono font-bold leading-none mt-1 uppercase tracking-widest">
                        Ex-Super 30
                      </span>
                    </div>
                  </div>
                </div>

                {/* Center Scallop Avatar Frame */}
                <div className="absolute top-[28%] left-[50%] -translate-x-1/2 z-20">
                  <div className="relative w-40 h-40 sm:w-48 sm:h-48 flex items-center justify-center select-none group cursor-pointer">
                    <svg className="absolute w-[108%] h-[108%] filter drop-shadow-[0_16px_32px_rgba(0,0,0,0.15)]" viewBox="0 0 100 100">
                      {/* Radiant Background outline shadow layer / glowing scallop */}
                      <path 
                        d="M 50 5 Q 58 11 65 5 Q 73 11 79 7 Q 85 15 91 13 Q 93 22 98 22 Q 98 31 100 35 Q 98 44 98 50 Q 98 56 100 65 Q 98 69 98 78 Q 93 78 91 87 Q 85 85 79 93 Q 73 89 65 95 Q 58 89 50 95 Q 42 89 35 95 Q 27 89 21 93 Q 15 85 9 87 Q 7 78 2 78 Q 2 69 0 65 Q 2 56 2 50 Q 2 44 0 35 Q 2 31 2 22 Q 7 22 9 13 Q 15 15 21 7 Q 27 11 35 5 Q 42 11 50 5 Z"
                        fill="#EEF2F6" 
                        className="transform scale-[1.03] origin-center opacity-90 transition-transform duration-300 group-hover:scale-[1.05]"
                      />
                      <g clipPath="url(#scallopClipHomeHero)">
                        <image 
                          href={settings.aboutTeacherPhotoUrl || settings.aboutCornerImageUrl || "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=400"} 
                          width="100" 
                          height="100" 
                          preserveAspectRatio="xMidYMid slice"
                        />
                      </g>
                    </svg>

                    {/* Small Floating Micro Accent badge over avatar */}
                    <div className="absolute bottom-2 right-2 bg-yellow-400 text-slate-900 text-[8px] font-black px-2 py-0.5 rounded-full border border-white shadow-md uppercase tracking-wider font-mono rotate-6">
                      SELFIES & LIVE
                    </div>
                  </div>
                </div>

                {/* Middle-Left Cloud */}
                <div className="absolute top-[48%] left-[3%] z-20">
                  <div className="relative w-[146px] xs:w-[160px] sm:w-[174px] select-none group cursor-pointer transition-transform duration-300 hover:scale-105 hover:rotate-1">
                    <svg className="w-full h-auto drop-shadow-[0_8px_16px_rgba(0,0,0,0.12)]" viewBox="0 0 100 60" fill="#FFFFFF">
                      <path d="M 20,45 C 15,45 10,41 10,36 C 10,30 15,25 21,25 C 23,17 30,11 39,11 C 47,11 54,16 57,23 C 60,19 65,16 71,16 C 79,16 86,23 86,31 C 86,32 86,34 85,35 C 89,35 92,39 92,43 C 92,48 88,52 83,52 L 20,52 Z" />
                    </svg>
                    <div className="absolute inset-x-0 bottom-4 top-5 flex flex-col items-center justify-center p-2 text-center">
                      <span className="text-zinc-800 text-[10px] sm:text-[11px] font-black uppercase tracking-wider font-display leading-tight">
                        Dynamic Modules
                      </span>
                      <span className="text-indigo-600 text-[8px] sm:text-[9px] font-mono font-bold leading-none mt-1 uppercase tracking-widest">
                        Physics & Math
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom-Center Cloud */}
                <div className="absolute bottom-[6%] left-[28%] z-20">
                  <div className="relative w-40 xs:w-44 sm:w-48 select-none group cursor-pointer transition-transform duration-300 hover:scale-105 hover:-rotate-1">
                    <svg className="w-full h-auto drop-shadow-[0_8px_16px_rgba(0,0,0,0.12)]" viewBox="0 0 100 60" fill="#FFFFFF">
                      <path d="M 20,45 C 15,45 10,41 10,36 C 10,30 15,25 21,25 C 23,17 30,11 39,11 C 47,11 54,16 57,23 C 60,19 65,16 71,16 C 79,16 86,23 86,31 C 86,32 86,34 85,35 C 89,35 92,39 92,43 C 92,48 88,52 83,52 L 20,52 Z" />
                    </svg>
                    <div className="absolute inset-x-0 bottom-4 top-5 flex flex-col items-center justify-center p-2 text-center">
                      <span className="text-zinc-800 text-[10px] sm:text-[11px] font-black uppercase tracking-wider font-display leading-tight">
                        Interactive LMS
                      </span>
                      <span className="text-indigo-600 text-[8px] sm:text-[9px] font-mono font-bold leading-none mt-1 uppercase tracking-widest">
                        10K+ Students
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Materials Showcase */}
      <section id="classes" className="py-24 relative z-20 bg-bg-secondary/40 border-t border-border-color rounded-t-[40px] md:rounded-t-[60px]">
        {/* Soft decorative background glows */}
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-accent-primary/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] bg-purple-500/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 mb-16 text-center">
          
          {/* Main heading in a container to absolute-position the rays and underline */}
          <div className="inline-block relative">
            {/* Handdrawn blue rays (\ | /) above and left of the heading */}
            <div className="absolute -top-10 -left-6 md:-top-12 md:-left-8 text-blue-500 w-12 h-12 opacity-85 select-none pointer-events-none flex items-center justify-center">
              <svg viewBox="0 0 40 40" className="w-10 h-10 stroke-current text-blue-500 animate-pulse" strokeWidth="3" strokeLinecap="round" fill="none">
                <path d="M 12 28 L 4 12" />
                <path d="M 22 30 L 18 4" />
                <path d="M 32 28 L 36 12" />
              </svg>
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-black tracking-tight text-text-primary leading-tight md:leading-normal mb-6 px-4">
              Your Study Resources, <br className="sm:hidden" /> All in{" "}
              <span className="relative inline-block whitespace-nowrap p-1">
                One Place!
                {/* Custom purple highlighter/felt-tip pen underline */}
                <svg className="absolute -bottom-3 left-0 w-full h-4 text-purple-400 dark:text-purple-500 opacity-90" viewBox="0 0 100 10" preserveAspectRatio="none">
                  <path d="M 2 8 C 30 5, 70 4, 98 7" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
                </svg>
              </span>
            </h2>
          </div>

          <p className="text-text-secondary text-sm md:text-base max-w-3xl mx-auto mb-16 leading-relaxed font-semibold">
            {(settings as any).resourcesSubtitle || 
              "Access everything you need to learn smarter, from concise notes and personalized books to interactive tests, insightful blogs, & live video lessons. Study made simple, engaging, and super fun with Nucleus Classes!"}
          </p>

          {/* New Interactive Bento grid from Reference Images */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left mb-16">
            
            {/* Left Column: Big Lavender mockup Notes & PDFs card (Image 1 style) */}
            <motion.div 
              whileHover={{ y: -6 }}
              className="lg:col-span-7 bg-[#F3E8FF] dark:bg-[#1E1E2E] rounded-[36px] p-8 md:p-10 border border-purple-200/50 dark:border-purple-900/40 relative overflow-hidden flex flex-col justify-between min-h-[500px] md:min-h-[560px] shadow-lg group cursor-pointer"
              style={{ borderRadius: 'var(--theme-card-radius, 32px)' }}
              onClick={() => navigate('/learn')}
            >
              {/* Highlight background blobs */}
              <div className="absolute -right-20 -top-20 w-64 h-64 bg-purple-300/30 dark:bg-purple-900/30 rounded-full blur-[100px] pointer-events-none" />
              <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-indigo-300/20 dark:bg-indigo-900/20 rounded-full blur-[100px] pointer-events-none" />

              {/* Text content upper section */}
              <div className="relative z-20">
                <h3 className="font-display font-black text-3xl md:text-4xl text-indigo-950 dark:text-purple-100 mb-3 tracking-tight">
                  Notes & PDFs
                </h3>
                
                <div className="inline-flex items-center gap-1.5 text-indigo-700 dark:text-purple-300 font-bold text-base hover:text-indigo-800 transition-colors">
                  <span className="text-[#8B5CF6] font-extrabold text-lg">Explore now</span>
                  <ArrowRight className="w-5 h-5 text-[#8B5CF6] group-hover:translate-x-1.5 transition-transform" />
                </div>
              </div>

              {/* Stack of interactive handwritten notebook mockups (realistic formula sheets) */}
              <div className="relative w-full h-[280px] md:h-[340px] mt-8 flex items-end justify-center select-none pointer-events-none">
                
                {/* Underneath Notebook Page: Chemistry/Uses of Graphite */}
                <div 
                  className="absolute w-[88%] h-[240px] md:h-[290px] bg-white dark:bg-zinc-900 rounded-2xl shadow-md border border-slate-200/60 dark:border-zinc-800 p-5 md:p-6 flex flex-col text-left transition-all duration-300 origin-bottom"
                  style={{
                    transform: 'none',
                    backgroundImage: 'repeating-linear-gradient(#ffffff 0px, #ffffff 21px, #eef2f6 22px)',
                    backgroundSize: '100% 22px'
                  }}
                >
                  {/* Left padding vertical margin line */}
                  <div className="absolute left-6 top-0 bottom-0 w-[1.5px] bg-red-200" />

                  {/* Chemistry handwritten formulas & Graphite hexa structure */}
                  <div className="pl-6 pt-2 font-handwriting text-[9px] md:text-[10px] text-slate-700 dark:text-slate-300 font-medium leading-[22px] overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] md:text-[12px]"># USES OF GRAPHITE</span>
                      <span className="text-[8px] px-1.5 py-0.5 bg-yellow-100 dark:bg-yellow-950/40 text-yellow-800 dark:text-yellow-200 rounded font-bold font-mono border-none select-none">RANK #1 TIPS</span>
                    </div>

                    <div className="mt-2 font-mono flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-indigo-600 dark:text-indigo-400">COVALENT BONDING</p>
                        <p className="mt-1 leading-snug">• Good conductor of electricity because of free electrons.</p>
                        <p className="mt-1 leading-snug">• Dull & Black in appearance.</p>
                        <p className="mt-1 leading-snug">• Used in Electrodes (Anode / Cathode), battery.</p>
                      </div>
                      
                      {/* Graphite carbon sheets diagram */}
                      <div className="hidden sm:block mr-2 opacity-80">
                        <svg className="w-16 h-12 stroke-slate-500 fill-none" viewBox="0 0 80 60">
                          <polygon points="15,15 25,10 35,15 35,25 25,30 15,25" strokeWidth="1.5" />
                          <polygon points="35,15 45,10 55,15 55,25 45,30 35,25" strokeWidth="1.5" />
                          <polygon points="25,30 35,25 35,25 45,30 45,40 35,45 25,40" strokeWidth="1.5" />
                          <text x="21" y="24" className="text-[6px] font-mono fill-slate-500 border-none select-none">C</text>
                          <text x="41" y="24" className="text-[6px] font-mono fill-slate-500 border-none select-none">C</text>
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Top Overlay Notebook Page: Hydrocarbons & Formulas */}
                <div 
                  className="absolute w-[88%] h-[240px] md:h-[290px] bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-slate-200 dark:border-zinc-700 p-5 md:p-6 flex flex-col text-left transition-all duration-300 origin-bottom"
                  style={{
                    transform: 'translateY(12px)',
                    backgroundImage: 'repeating-linear-gradient(#ffffff 0px, #ffffff 21px, #e2e8f0 22px)',
                    backgroundSize: '100% 22px'
                  }}
                >
                  {/* Left margin red lines */}
                  <div className="absolute left-6 top-0 bottom-0 w-[1.5px] bg-red-200" />
                  
                  {/* Binder notebook rings on left margin to make it look incredibly real */}
                  <div className="absolute left-1 top-6 flex flex-col gap-6 z-10">
                    {[1, 2, 3, 4, 5].map((iPr) => (
                      <div key={iPr} className="w-2.5 h-3.5 rounded-full border border-slate-400 bg-slate-200 shadow-inner flex items-center justify-center">
                        <div className="w-1 h-2 bg-slate-400 rounded-full" />
                      </div>
                    ))}
                  </div>

                  {/* Content of the notebook sheet */}
                  <div className="pl-6 pt-1 font-handwriting text-[9px] md:text-[10px] text-slate-700 dark:text-slate-300 font-medium leading-[22px] overflow-hidden">
                    <p className="font-extrabold text-indigo-900 dark:text-white uppercase tracking-wider text-[11px] md:text-[12px]">SATURATED HYDROCARBONS</p>
                    
                    <div className="mt-2 font-mono grid grid-cols-1 sm:grid-cols-12 gap-2">
                      <div className="sm:col-span-8">
                        <p className="font-bold text-purple-600 dark:text-purple-400">• ALKANES:</p>
                        <p className="text-gray-600 dark:text-gray-300 leading-snug pl-2">Hydrocarbons containing Single covalent bonds. Eg: Methane (<span className="text-red-500 font-bold">CH₄</span>)</p>
                        
                        <p className="font-bold text-purple-600 dark:text-purple-400 mt-1">• UNSATURATED:</p>
                        <p className="text-gray-600 dark:text-gray-300 leading-snug pl-2">Contain double or triple carbon covalent bonds.</p>
                        <p className="text-gray-600 dark:text-gray-300 pl-4 leading-tight font-sans">- Alkenes Formula: <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">CnH₂n</span></p>
                        <p className="text-gray-600 dark:text-gray-300 pl-4 leading-tight font-sans">- Alkynes Formula: <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">CnH₂n₋₂</span></p>
                      </div>

                      {/* Chemical sketch - methane skeletal */}
                      <div className="hidden sm:col-span-4 sm:flex items-center justify-center bg-yellow-50/50 dark:bg-yellow-950/20 p-2 rounded-xl border border-yellow-200/50 dark:border-yellow-900/30 scale-90">
                        <div className="flex flex-col items-center justify-center font-mono text-[9px] text-gray-800 dark:text-gray-200 leading-none">
                          <span>H</span>
                          <span className="h-2.5 w-[1.5px] bg-slate-400 my-0.5"></span>
                          <div className="flex items-center gap-1">
                            <span>H</span>
                            <span className="w-2.5 h-[1.5px] bg-slate-400"></span>
                            <span className="font-extrabold text-red-600">C</span>
                            <span className="w-2.5 h-[1.5px] bg-slate-400"></span>
                            <span>H</span>
                          </div>
                          <span className="h-2.5 w-[1.5px] bg-slate-400 my-0.5"></span>
                          <span>H</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </motion.div>

            {/* Right Column: Dynamic Stacked Bento Cards */}
            <div className="lg:col-span-5 flex flex-col gap-6 justify-between">
              
              {/* Bento Card 1: "Get Notes and PDFs" - Image 2 Style */}
              <motion.div 
                whileHover={{ y: -4, scale: 1.01 }}
                className="bg-[#FFF8EE] dark:bg-[#25201A] border border-amber-200/50 dark:border-amber-900/40 p-6 md:p-8 rounded-[32px] flex items-center justify-between relative overflow-hidden group cursor-pointer shadow-sm hover:shadow-md transition-all h-[155px]"
                onClick={() => navigate('/learn')}
              >
                <div className="flex flex-col justify-center max-w-[70%] z-10">
                  <h3 className="font-display font-bold text-xl md:text-2xl text-slate-800 dark:text-amber-100 tracking-tight leading-snug">
                    Get Notes and PDFs
                  </h3>
                  <p className="text-amber-700/70 dark:text-amber-400/75 text-[11px] font-semibold mt-1 tracking-wide uppercase">
                    Red-highlighted summaries
                  </p>
                </div>

                {/* Custom Notebook spirals & red highlighter pencil SVG (Exact Illustration style!) */}
                <div className="relative pr-2 scale-[1.05] group-hover:scale-110 transition-transform duration-300 z-10">
                  <svg className="w-16 h-16" viewBox="0 0 100 100" fill="none">
                    <rect x="18" y="22" width="56" height="58" rx="8" fill="#FFFBEB" stroke="#D1A153" strokeWidth="3.5" />
                    
                    <line x1="28" y1="36" x2="62" y2="36" stroke="#E2C286" strokeWidth="2.5" strokeLinecap="round" />
                    <line x1="28" y1="46" x2="62" y2="46" stroke="#E2C286" strokeWidth="2.5" strokeLinecap="round" />
                    <line x1="28" y1="56" x2="62" y2="56" stroke="#E2C286" strokeWidth="2.5" strokeLinecap="round" />
                    <line x1="28" y1="66" x2="62" y2="66" stroke="#E2C286" strokeWidth="2.5" strokeLinecap="round" />
                    
                    <rect x="24" y="14" width="5" height="12" rx="2.5" fill="#94A3B8" stroke="#475569" strokeWidth="2" />
                    <rect x="38" y="14" width="5" height="12" rx="2.5" fill="#94A3B8" stroke="#475569" strokeWidth="2" />
                    <rect x="52" y="14" width="5" height="12" rx="2.5" fill="#94A3B8" stroke="#475569" strokeWidth="2" />
                    <rect x="66" y="14" width="5" height="12" rx="2.5" fill="#94A3B8" stroke="#475569" strokeWidth="2" />

                    <g transform="translate(10, -5) rotate(15 50 50)">
                      <rect x="62" y="42" width="12" height="28" rx="3" fill="#EF4444" stroke="#B91C1C" strokeWidth="2" />
                      <path d="M 62 42 L 68 34 L 74 42 Z" fill="#EF4444" stroke="#B91C1C" strokeWidth="2" strokeLinejoin="round" />
                      <polygon points="65,34 68,28 71,28 70,34" fill="#1E293B" />
                      <rect x="64" y="70" width="8" height="4" rx="1" fill="#1E293B" />
                      <rect x="65" y="46" width="3" height="20" fill="#FCA5A5" opacity="0.6" />
                    </g>
                    
                    <path d="M 33 54 L 56 46" stroke="#EF4444" strokeWidth="8" strokeLinecap="round" opacity="0.25" />
                  </svg>
                </div>

                {/* Classic Blue Arrow indicator on top-right */}
                <div className="absolute top-4 right-4 text-blue-500 w-5 h-5 flex items-center justify-center hover:scale-105 transition-transform">
                  <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 stroke-current stroke-[3px]" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </motion.div>

              {/* Bento Card 2: "Watch Live Tutorials" */}
              <motion.div 
                whileHover={{ y: -4, scale: 1.01 }}
                className="bg-[#EEFDFC] dark:bg-[#152524] border border-teal-200/50 dark:border-teal-900/40 p-6 md:p-8 rounded-[32px] flex items-center justify-between relative overflow-hidden group cursor-pointer shadow-sm hover:shadow-md transition-all h-[155px]"
                onClick={() => navigate('/learn')}
              >
                <div className="flex flex-col justify-center max-w-[70%] z-10">
                  <h3 className="font-display font-bold text-xl md:text-2xl text-slate-800 dark:text-teal-100 tracking-tight leading-snug">
                    Watch Video Tutorials
                  </h3>
                  <p className="text-teal-700/70 dark:text-teal-400/75 text-[11px] font-semibold mt-1 tracking-wide uppercase">
                    Interactive Video Assets
                  </p>
                </div>

                {/* Custom Video Camera illustration */}
                <div className="relative pr-2 scale-[1.05] group-hover:scale-110 transition-transform duration-300 z-10 text-teal-600">
                  <svg className="w-16 h-16" viewBox="0 0 100 100" fill="none">
                    <rect x="18" y="28" width="46" height="44" rx="8" fill="#CCFBF1" stroke="#0D9488" strokeWidth="3.5" />
                    <polygon points="64,40 84,30 84,70 64,60" fill="#CCFBF1" stroke="#0D9488" strokeWidth="3.5" strokeLinejoin="round" />
                    <circle cx="41" cy="50" r="8" fill="#0D9488" />
                    <polygon points="38,46 47,50 38,54" fill="#FFFFFF" />
                  </svg>
                </div>

                {/* Top-Right Blue Arrow */}
                <div className="absolute top-4 right-4 text-blue-500 w-5 h-5 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 stroke-current stroke-[3px]" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </motion.div>

              {/* Bento Card 3: "Adaptive Chapter Tests" */}
              <motion.div 
                whileHover={{ y: -4, scale: 1.01 }}
                className="bg-[#FCF0FF] dark:bg-[#25152A] border border-fuchsia-200/50 dark:border-fuchsia-900/40 p-6 md:p-8 rounded-[32px] flex items-center justify-between relative overflow-hidden group cursor-pointer shadow-sm hover:shadow-md transition-all h-[155px]"
                onClick={() => navigate('/learn')}
              >
                <div className="flex flex-col justify-center max-w-[70%] z-10">
                  <h3 className="font-display font-bold text-xl md:text-2xl text-slate-800 dark:text-fuchsia-100 tracking-tight leading-snug">
                    Take Chapter Tests
                  </h3>
                  <p className="text-fuchsia-700/70 dark:text-fuchsia-400/75 text-[11px] font-semibold mt-1 tracking-wide uppercase">
                    Track adaptive marks
                  </p>
                </div>

                {/* Custom checklist board layout */}
                <div className="relative pr-2 scale-[1.05] group-hover:scale-110 transition-transform duration-300 z-10">
                  <svg className="w-16 h-16" viewBox="0 0 100 100" fill="none">
                    <rect x="22" y="24" width="56" height="56" rx="8" fill="#FAE8FF" stroke="#C084FC" strokeWidth="3.5" />
                    <rect x="42" y="14" width="16" height="12" rx="3" fill="#D8B4FE" stroke="#A855F7" strokeWidth="2.5" />
                    
                    {/* Tick markers */}
                    <path d="M 32 40 L 36 44 L 46 32" stroke="#A855F7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M 32 58 L 36 62 L 46 50" stroke="#A855F7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    
                    <line x1="52" y1="38" x2="68" y2="38" stroke="#C084FC" strokeWidth="3" strokeLinecap="round" />
                    <line x1="52" y1="56" x2="68" y2="56" stroke="#C084FC" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                </div>

                {/* Top-Right Blue Arrow */}
                <div className="absolute top-4 right-4 text-blue-500 w-5 h-5 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 stroke-current stroke-[3px]" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </motion.div>

            </div>

          </div>

          {/* Catalog Class Selector Segment */}
          {materials.length > 0 && (
            <div className="pt-12 border-t border-border-color/60 relative z-20">
              <div className="text-center mb-8">
                <span className="text-[10px] px-3 py-1 rounded-full bg-accent-primary/10 text-accent-primary font-black uppercase tracking-widest border border-accent-primary/20">
                  Live Resource Repository
                </span>
                <h4 className="text-2xl font-display font-bold text-text-primary mt-3">
                  Syllabus Documents & Uploads Showcase
                </h4>
              </div>

              {/* Fully styled cute Class selection buttons */}
              <div className="flex flex-wrap items-center justify-center gap-2.5 max-w-4xl mx-auto bg-glass-bg/85 p-2 rounded-3xl border border-border-color backdrop-blur-md mb-10">
                <button 
                  onClick={() => setSelectedClassGroup('all')} 
                  className={`px-5 py-2.5 rounded-2xl text-xs uppercase tracking-widest font-black transition-all cursor-pointer ${
                    selectedClassGroup === 'all' 
                      ? 'bg-accent-primary text-button-text shadow-sm' 
                      : 'text-text-muted hover:text-text-primary hover:bg-white/5'
                  }`}
                >
                  All Levels
                </button>
                {['6', '7', '8', '9', '10', '11', '12', 'dropper'].map((numPr) => (
                  <button 
                    key={numPr}
                    onClick={() => setSelectedClassGroup(numPr)} 
                    className={`px-4.5 py-2.5 rounded-2xl text-xs uppercase tracking-widest font-black transition-all cursor-pointer ${
                      selectedClassGroup === numPr 
                        ? 'bg-accent-primary text-button-text shadow-sm' 
                        : 'text-text-muted hover:text-text-primary hover:bg-white/5'
                    }`}
                  >
                    {numPr === 'dropper' ? 'Droppers' : `Class ${numPr}`}
                  </button>
                ))}
              </div>

              {/* Grid of the resources cards loaded from Database */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {materials
                  .filter(m => selectedClassGroup === 'all' || m.classGroup === selectedClassGroup || !m.classGroup || user?.unlockedMaterials?.includes(m.id))
                  .slice(0, 6)
                  .map((mat, i) => {
                     const hasSpecificAccess = user?.unlockedMaterials?.includes(mat.id);
                     const hasAccess = hasSpecificAccess || user?.role === 'admin' || user?.role === 'superadmin';
                     
                     return (
                       <motion.div 
                         key={mat.id}
                         initial={{ opacity: 0, y: 30 }}
                         whileInView={{ opacity: 1, y: 0 }}
                         viewport={{ once: true, margin: "-50px" }}
                         transition={{ delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                         whileHover={{ y: -8, scale: 1.015 }}
                         className="group relative overflow-hidden rounded-[32px] border bg-glass-bg border-border-color hover:border-accent-primary/40 flex flex-col transition-all duration-300 cursor-pointer shadow-sm hover:shadow-2xl"
                         style={{ borderRadius: 'var(--theme-card-radius, 28px)' }}
                         onClick={() => {
                           if (!user) {
                             alert("login first to unlock this");
                           } else {
                             navigate('/learn');
                           }
                         }}
                       >
                         {/* Gradient background sheen */}
                         <div className="absolute inset-0 bg-gradient-to-tr from-accent-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                         {mat.thumbnailUrl ? (
                           <div className="w-full h-44 bg-bg-secondary relative overflow-hidden border-b border-border-color/50">
                             <img src={mat.thumbnailUrl} alt={mat.title} className="w-full h-full object-cover group-hover:scale-108 transition-all duration-700" />
                             <div className="absolute inset-0 bg-gradient-to-t from-bg-primary/80 to-transparent" />
                             {/* Thumbnail badge for type */}
                             <div className="absolute bottom-3 left-3 px-3 py-1 rounded-full bg-white/95 dark:bg-zinc-900/95 font-bold tracking-wide uppercase text-[8px] flex items-center gap-1">
                               {mat.type === 'note' ? <BookOpen className="w-2.5 h-2.5 text-accent-primary" /> : <Video className="w-2.5 h-2.5 text-[#ff8a9e]" />}
                               <span className="text-text-primary">{mat.type === 'note' ? 'Syllabus Note' : 'Video Tutorial'}</span>
                             </div>
                           </div>
                         ) : null}
                         
                         <div className="p-6 flex flex-col flex-1 relative z-20">
                           <div className="flex items-center justify-between mb-4">
                             {!mat.thumbnailUrl && (
                                <div className={`p-3 rounded-2xl transition-colors duration-500 ${
                                  mat.type === 'note' 
                                    ? 'bg-[#ff8a9e]/10 text-[#ff8a9e]' 
                                    : 'bg-accent-primary/10 text-accent-primary'
                                }`}>
                                  {mat.type === 'note' ? <BookOpen className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                                </div>
                             )}
                             <div className="px-3 py-1.5 rounded-full bg-bg-secondary text-[9px] text-text-muted border border-border-color uppercase tracking-widest font-black font-mono">
                               {mat.classGroup === "all" || !mat.classGroup ? "All Batches" : "Class " + mat.classGroup}
                             </div>
                           </div>

                           <h3 className="font-display text-xl font-bold text-text-primary mb-2 group-hover:text-accent-primary transition-colors duration-300 line-clamp-1 truncate">
                             {mat.title}
                           </h3>
                           
                           <p className="text-text-secondary text-xs font-semibold mb-6 flex-1 leading-relaxed line-clamp-2">
                             {mat.description || 'Unlock this extensive curated educational material compiled by the top rankers.'}
                           </p>

                           <div className="pt-4 border-t border-border-color/40 flex items-center justify-between text-text-muted mt-auto">
                             <div className="flex items-center gap-2 text-xs font-bold transition-all duration-300">
                               {hasAccess ? (
                                 <div className="flex items-center gap-1.5 text-accent-primary group-hover:translate-x-1 transition-transform">
                                   <span>Study Now</span>
                                   <ArrowRight className="w-3.5 h-3.5" />
                                 </div>
                               ) : (
                                 <div className="flex items-center gap-1.5 p-1 rounded-md text-text-muted group-hover:text-text-primary transition-colors">
                                   <Lock className="w-3.5 h-3.5" />
                                   <span>Syllabus Locked</span>
                                 </div>
                               )}
                             </div>
                           </div>
                         </div>
                       </motion.div>
                     );
                  })}
              </div>
            </div>
          )}

        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 relative z-20">
        
        {/* Soft background glow circles */}
        <div className="absolute top-[25%] left-1/2 -translate-x-1/2 w-[500px] h-[550px] bg-gradient-to-tr from-accent-primary/5 via-amber-400/5 to-transparent blur-[110px] pointer-events-none select-none" />

        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12 md:mb-16">
            <div className="inline-block relative">
              {/* Handdrawn pink rays (\ | /) above and left of the heading */}
              <div className="absolute -top-10 -left-6 md:-top-12 md:-left-8 text-[#FF2E93] w-12 h-12 opacity-85 select-none pointer-events-none flex items-center justify-center">
                <svg viewBox="0 0 40 40" className="w-10 h-10 stroke-current text-[#FF2E93]" strokeWidth="3.5" strokeLinecap="round" fill="none">
                  <path d="M 22 22 L 6 12" />
                  <path d="M 24 20 L 14 4" />
                  <path d="M 28 22 L 26 5" />
                </svg>
              </div>

              <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-black tracking-tight text-text-primary leading-tight md:leading-normal mb-6 px-4">
                Explore More From{" "}
                <br className="sm:hidden" />
                <span className="relative inline-block whitespace-nowrap p-1">
                  Nucleus Classes!
                  {/* Custom indigo highlighter/felt-tip pen double underline */}
                  <svg className="absolute -bottom-3.5 left-0 w-full h-4 text-indigo-500 opacity-95" viewBox="0 0 100 10" preserveAspectRatio="none">
                    <path d="M 2 5 C 30 3, 70 2, 98 4" fill="none" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" />
                    <path d="M 12 9 C 42 7, 72 6, 88 8" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                </span>
              </h2>
            </div>
            <p className="text-text-secondary text-sm md:text-lg max-w-2xl mx-auto font-semibold leading-relaxed mt-4">
              {(settings as any).pricingSubtitle || "No hidden high-fees. Select the class level that corresponds to you. Enjoy pure learning with cute stickers and bento templates."}
            </p>
          </div>
          
          {/* Bento Group selection grid */}
          <div className="flex justify-center mb-8 md:mb-16 relative z-20">
             <div className="bg-glass-bg border border-border-color backdrop-blur-md rounded-2xl p-1.5 inline-flex flex-wrap justify-center gap-1 shadow-sm">
                {['6', '7', '8', '9', '10', '11', '12', 'dropper'].map(cls => (
                  <button 
                    key={cls} 
                    onClick={() => setPricingClassGroup(cls)} 
                    className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer uppercase ${
                      pricingClassGroup === cls 
                        ? 'bg-accent-primary text-button-text font-black shadow-md' 
                        : 'text-text-muted hover:text-text-primary'
                    }`}
                  >
                    {cls === 'dropper' ? 'Dropper' : `Class ${cls}`}
                  </button>
                ))}
             </div>
          </div>

          <div 
            ref={pricingContainerRef}
            data-lenis-prevent
            onScroll={handlePricingScroll}
            className="flex flex-row overflow-x-auto md:grid md:grid-cols-3 gap-5 md:gap-8 max-w-5xl mx-auto items-stretch -mx-6 px-6 md:mx-0 md:px-0 pb-10 scrollbar-none snap-x snap-mandatory w-full"
            style={{
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}
          >
            {/* Left padding spacer on mobile */}
            <div className="w-[12px] md:hidden shrink-0" />

            {/* Notes Plan */}
            <motion.div 
              id="notes-pricing-card"
              layout
              animate={{
                scale: activePricingCard === 'notes' ? 1.04 : 0.94,
                opacity: activePricingCard === 'notes' ? 1 : 0.55,
                borderColor: activePricingCard === 'notes' ? 'var(--accent-primary, #e5d2a5)' : 'rgba(255,255,255,0.08)',
                boxShadow: activePricingCard === 'notes' ? '0 15px 40px rgba(99, 102, 241, 0.2)' : '0 4px 12px rgba(0,0,0,0.1)',
                y: activePricingCard === 'notes' ? -8 : 0,
              }}
              transition={{ type: 'spring', stiffness: 220, damping: 25 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => scrollToPlan('notes')}
              className={`p-6 md:p-8 flex flex-col cursor-pointer transition-colors duration-300 relative w-[78vw] max-w-[290px] md:w-auto shrink-0 md:shrink snap-center border bg-glass-bg`}
              style={{ borderRadius: 'var(--theme-card-radius, 28px)' }}
            >
              {activePricingCard === 'notes' && (
                <div className="absolute -top-4.5 left-1/2 -translate-x-1/2 bg-accent-primary text-button-text text-[10px] font-black px-5 py-2 rounded-full uppercase tracking-wider shadow-md border border-white/20">
                  Active Revision
                </div>
              )}
              <div className="mb-6 pt-2">
                <div className="inline-flex px-3 py-1 rounded-full bg-accent-primary/15 text-accent-primary text-[10px] font-black uppercase tracking-widest mb-4">
                  {settings.pricingCard1Badge || "Essential Revision"}
                </div>
                <h3 className="font-display font-black text-2xl text-text-primary mb-2">
                  {settings.pricingCard1Title || "High Grade Notes"}
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed font-semibold">
                  {settings.pricingCard1Desc || "Step-by-step PDF summaries built for immediate exam revision cycles."}
                </p>
              </div>
              <div className="flex items-baseline gap-1.5 mb-8">
                <span className="text-5xl font-black text-text-primary">₹{settings.classPrices?.[pricingClassGroup]?.notes || settings.priceNotes || 99}</span>
                <span className="text-text-muted text-sm font-semibold">/full term</span>
              </div>
              
              <div className="h-px bg-border-color/40 my-1 mb-8" />

              <ul className="text-xs font-bold space-y-4 mb-8 flex-1 text-left">
                {(settings.pricingCard1Features || "Complete Curated Study PDFs,Handwritten Board Materials,Quick Formula Sheets & Decals")
                  .split(',')
                  .map(f => f.trim())
                  .filter(Boolean)
                  .map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-text-secondary">
                      <div className="p-1 rounded-full bg-accent-primary/20 text-accent-primary">
                        <Check className="w-3.5 h-3.5 font-bold" />
                      </div>
                      <span>{feature}</span>
                    </li>
                  ))}
              </ul>
              
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handlePayment('notes', settings.classPrices?.[pricingClassGroup]?.notes || settings.priceNotes || 99);
                }} 
                className="theme-btn-themed w-full py-4.5 rounded-full border border-border-color/80 text-text-primary hover:border-accent-primary hover:bg-accent-primary/10 font-black text-xs uppercase tracking-widest transition-all cursor-pointer mt-auto"
                style={{ borderRadius: 'var(--theme-btn-radius, 9999px)' }}
              >
                Buy Classroom Notes
              </button>
            </motion.div>

            {/* Lectures Plan */}
            <motion.div 
              id="lectures-pricing-card"
              layout
              animate={{
                scale: activePricingCard === 'lectures' ? 1.04 : 0.94,
                opacity: activePricingCard === 'lectures' ? 1 : 0.55,
                borderColor: activePricingCard === 'lectures' ? 'var(--accent-primary, #e5d2a5)' : 'rgba(255,255,255,0.08)',
                boxShadow: activePricingCard === 'lectures' ? '0 15px 40px rgba(99, 102, 241, 0.25)' : '0 4px 12px rgba(0,0,0,0.1)',
                y: activePricingCard === 'lectures' ? -8 : 0,
              }}
              transition={{ type: 'spring', stiffness: 220, damping: 25 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => scrollToPlan('lectures')}
              className={`p-6 md:p-8 flex flex-col relative cursor-pointer transition-colors duration-300 w-[78vw] max-w-[290px] md:w-auto shrink-0 md:shrink snap-center border bg-glass-bg`}
              style={{ borderRadius: 'var(--theme-card-radius, 28px)' }}
            >
              {activePricingCard === 'lectures' && (
                <div className="absolute -top-4.5 left-1/2 -translate-x-1/2 bg-accent-primary text-button-text text-[10px] font-black px-5 py-2 rounded-full uppercase tracking-wider shadow-md border border-white/20">
                  Most Popular Choice
                </div>
              )}
              <div className="mb-6 pt-2">
                <div className="inline-flex px-3 py-1 rounded-full bg-amber-400/15 text-amber-500 text-[10px] font-black uppercase tracking-widest mb-4">
                  {settings.pricingCard2Badge || "Full Video Stream"}
                </div>
                <h3 className="font-display font-black text-2xl text-accent-primary mb-2">
                  {settings.pricingCard2Title || "Lectures Package"}
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed font-semibold">
                  {settings.pricingCard2Desc || "Deeper conceptual lectures featuring interactive workspace guides."}
                </p>
              </div>
              <div className="flex items-baseline gap-1.5 mb-8">
                <span className="text-5xl font-black text-text-primary">₹{settings.classPrices?.[pricingClassGroup]?.lectures || settings.priceLectures || 499}</span>
                <span className="text-text-muted text-sm font-semibold">/full term</span>
              </div>
              
              <div className="h-px bg-accent-primary/20 my-1 mb-8" />

              <ul className="text-xs font-bold space-y-4 mb-8 flex-1 text-left">
                {(settings.pricingCard2Features || "All Chapter Study Notes Included,High-Def Classroom Videos,Peer Doubt Forum Assistance")
                  .split(',')
                  .map(f => f.trim())
                  .filter(Boolean)
                  .map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-text-secondary">
                      <div className="p-1 rounded-full bg-accent-primary/20 text-accent-primary">
                        <Check className="w-3.5 h-3.5 font-bold" />
                      </div>
                      <span className={`${i === 0 ? 'text-text-primary' : ''}`}>{feature}</span>
                    </li>
                  ))}
              </ul>
              
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handlePayment('lectures', settings.classPrices?.[pricingClassGroup]?.lectures || settings.priceLectures || 499);
                }} 
                className="theme-btn-themed w-full py-4.5 rounded-full bg-accent-primary text-button-text font-black text-xs uppercase tracking-widest transition-all cursor-pointer shadow-md mt-auto"
                style={{ borderRadius: 'var(--theme-btn-radius, 9999px)' }}
              >
                Access Full Lectures
              </button>
            </motion.div>

            {/* Premium Plan */}
            <motion.div 
              id="premium-pricing-card"
              layout
              animate={{
                scale: activePricingCard === 'premium' ? 1.04 : 0.94,
                opacity: activePricingCard === 'premium' ? 1 : 0.55,
                borderColor: activePricingCard === 'premium' ? '#ff839a' : 'rgba(255,255,255,0.08)',
                boxShadow: activePricingCard === 'premium' ? '0 15px 40px rgba(255,131,154,0.2)' : '0 4px 12px rgba(0,0,0,0.1)',
                y: activePricingCard === 'premium' ? -8 : 0,
              }}
              transition={{ type: 'spring', stiffness: 220, damping: 25 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => scrollToPlan('premium')}
              className={`p-6 md:p-8 flex flex-col cursor-pointer transition-colors duration-300 relative w-[78vw] max-w-[290px] md:w-auto shrink-0 md:shrink snap-center border bg-glass-bg`}
              style={{ borderRadius: 'var(--theme-card-radius, 28px)' }}
            >
              {activePricingCard === 'premium' && (
                <div className="absolute -top-4.5 left-1/2 -translate-x-1/2 bg-[#ff839a] text-black text-[10px] font-black px-5 py-2 rounded-full uppercase tracking-wider shadow-md border border-white/20">
                  Elite Selection 👑
                </div>
              )}
              <div className="mb-6 pt-2">
                <div className="inline-flex px-3 py-1 rounded-full bg-[#ff8a9e]/10 text-[#ff8a9e] text-[10px] font-black uppercase tracking-widest mb-4">
                  {settings.pricingCard3Badge || "All Inclusive Elite"}
                </div>
                <h3 className="font-display font-black text-2xl text-text-primary mb-2">
                  {settings.pricingCard3Title || "Elite Premium"}
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed font-semibold">
                  {settings.pricingCard3Desc || "1-on-1 personalized mentorship with video courses and study guides."}
                </p>
              </div>
              <div className="flex items-baseline gap-1.5 mb-8">
                <span className="text-5xl font-black text-text-primary">₹{settings.classPrices?.[pricingClassGroup]?.premium || settings.pricePremium || 999}</span>
                <span className="text-text-muted text-sm font-semibold">/full term</span>
              </div>
              
              <div className="h-px bg-border-color/40 my-1 mb-8" />

              <ul className="text-xs font-bold space-y-4 mb-8 flex-1 text-left">
                {(settings.pricingCard3Features || "Comprehensive Study Notes & Videos,Weekly 1-on-1 Mentor Meetup,Personalized Study Calendar")
                  .split(',')
                  .map(f => f.trim())
                  .filter(Boolean)
                  .map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-text-secondary">
                      <div className="p-1 rounded-full bg-accent-primary/20 text-accent-primary">
                        <Check className="w-3.5 h-3.5 font-bold" />
                      </div>
                      <span className={`${i === 1 ? 'text-text-primary' : ''}`}>{feature}</span>
                    </li>
                  ))}
              </ul>
              
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handlePayment('premium', settings.classPrices?.[pricingClassGroup]?.premium || settings.pricePremium || 999);
                }} 
                className="theme-btn-themed w-full py-4.5 rounded-full border border-border-color/80 text-text-primary hover:border-accent-primary hover:bg-accent-primary/10 font-black text-xs uppercase tracking-widest transition-all cursor-pointer mt-auto"
                style={{ borderRadius: 'var(--theme-btn-radius, 9999px)' }}
              >
                Aquire Premium Elite
              </button>
            </motion.div>

            {/* Right padding spacer on mobile */}
            <div className="w-[12px] md:hidden shrink-0" />
          </div>

          {/* Mobile Swipe Indicators */}
          <div className="flex md:hidden justify-center items-center gap-2.5 mt-2 mb-8 select-none">
            {['notes', 'lectures', 'premium'].map((plan, i) => {
              const isActive = activePricingCard === plan;
              let dotActiveBg = 'bg-accent-primary';
              if (plan === 'premium') dotActiveBg = 'bg-[#ff839a]';
              
              return (
                <button
                  key={plan}
                  onClick={() => scrollToPlan(plan)}
                  className={`h-2.5 rounded-full transition-all duration-300 hover:opacity-100 cursor-pointer ${
                    isActive 
                      ? `${dotActiveBg} w-6 shadow-[0_0_12px_rgba(99, 102, 241,0.4)]` 
                      : 'bg-[#f2f2f2]/10 w-2.5 hover:bg-[#f2f2f2]/25'
                  }`}
                  aria-label={`Scroll to plan ${i + 1}`}
                />
              );
            })}
          </div>
        </div>
      </section>

      {/* Mentor Showcase */}
      <section id="teachers" className="py-24 relative z-20 bg-bg-secondary/20 rounded-[40px] md:rounded-[60px] border-t border-b border-border-color">
        <div className="max-w-7xl mx-auto px-6 mb-16 text-left">
          <div className="inline-flex px-3 py-1 rounded-full bg-accent-primary/10 text-accent-primary text-[10px] font-black uppercase tracking-widest mb-4">
            Meet the Masters
          </div>
          <h2 className="text-4xl md:text-5xl font-display font-black tracking-tight text-text-primary mb-4 leading-normal">
            Learn with <span className="text-accent-primary">Distinguished Masters</span>
          </h2>
          <p className="text-text-secondary text-base md:text-lg max-w-xl font-semibold leading-relaxed">
            Our esteemed mentors comprise Top-100 IITians, doctorates, and celebrated national educators. We deliver a standard-setting program.
          </p>
        </div>
        
        {mentors1.length > 0 && <MentorTrack mentors={mentors1} direction="left" />}
        {mentors2.length > 0 && <MentorTrack mentors={mentors2} direction="right" />}
      </section>

      {/* Review Feedback Form */}
      {settings.reviewFormUrl && (
        <section id="review" className="py-24 relative z-20">
          <div className="max-w-3xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-display font-black tracking-tight text-text-primary mb-4 leading-normal">
                Leave a <span className="text-accent-primary">Feedback.</span>
              </h2>
              <p className="text-text-secondary text-base font-semibold">
                Your satisfaction is our focus. Submit your candid thoughts, ideas, and curriculum feedback with our senior mentors.
              </p>
            </div>
            
            <form 
              action={settings.reviewFormUrl} 
              method="POST" 
              className="p-8 backdrop-blur-xl bg-glass-bg border border-border-color/80 space-y-6 shadow-xl"
              style={{ borderRadius: 'var(--theme-card-radius, 32px)' }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                <div>
                  <label htmlFor="name" className="block text-xs uppercase tracking-wider font-bold text-text-secondary mb-2">Full Student Name</label>
                  <input required type="text" id="name" name="name" className="w-full px-5 py-3 rounded-2xl bg-bg-secondary/40 border border-border-color text-text-primary text-sm font-semibold focus:outline-none focus:border-accent-primary/60 transition-colors" />
                </div>
                <div>
                  <label htmlFor="email" className="block text-xs uppercase tracking-wider font-bold text-text-secondary mb-2">Email Identity</label>
                  <input required type="email" id="email" name="email" className="w-full px-5 py-3 rounded-2xl bg-bg-secondary/40 border border-border-color text-text-primary text-sm font-semibold focus:outline-none focus:border-accent-primary/60 transition-colors" />
                </div>
              </div>

              <div className="text-left">
                <label htmlFor="message" className="block text-xs uppercase tracking-wider font-bold text-text-secondary mb-2">Message or Query</label>
                <textarea required id="message" name="message" rows={4} className="w-full px-5 py-3 rounded-2xl bg-bg-secondary/40 border border-border-color text-text-primary text-sm font-semibold focus:outline-none focus:border-accent-primary/60 transition-colors resize-none" placeholder="Enter your comments, feedback or queries here..." />
              </div>

              <div className="text-center pt-2">
                <button 
                  type="submit" 
                  className="theme-btn-themed px-10 py-4 bg-accent-primary text-button-text font-bold uppercase tracking-widest text-xs shadow-md hover:scale-105 transition-all w-full sm:w-auto cursor-pointer"
                  style={{ borderRadius: 'var(--theme-btn-radius, 9999px)' }}
                >
                  Publish My Review
                </button>
              </div>
            </form>
          </div>
        </section>
      )}

      {/* Dynamic UPI Payment / Donation Selection Modal */}
      <AnimatePresence>
        {isPaymentChoiceOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md">
            {/* Backdrop close */}
            <div className="absolute inset-0 cursor-default" onClick={() => setIsPaymentChoiceOpen(false)} />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 8 }}
              transition={{ ease: "easeOut", duration: 0.3 }}
              className="relative w-full max-w-lg md:max-w-3xl bg-zinc-950 border border-zinc-800 shadow-2xl p-6 md:p-8 flex flex-col gap-6 overflow-hidden z-10"
              style={{ borderRadius: 'var(--theme-card-radius, 20px)' }}
            >
              {/* Subtle Elegant Ambient Light */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4/5 h-[1px] bg-gradient-to-r from-transparent via-zinc-700 to-transparent pointer-events-none" />

              {/* Header */}
              <div className="flex items-center justify-between border-b border-zinc-900 pb-5 relative z-10">
                <div className="flex items-center gap-3.5">
                  <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 flex items-center justify-center">
                    <Heart className="w-5 h-5 text-accent-primary fill-accent-primary/20" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-sans font-medium text-lg text-white tracking-tight">
                      {paymentPurpose || `Support ${settings.websiteName}`}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5 font-normal">
                      Secure Peer-to-Peer UPI Payment
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsPaymentChoiceOpen(false)}
                  className="p-2 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white transition-all cursor-pointer hover:bg-zinc-800"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Amount Selection presets & custom input */}
              <div className="flex flex-col gap-3.5 relative z-10">
                <label className="text-xs font-medium tracking-wide text-zinc-300 text-left">
                  Support Amount (₹)
                </label>
                
                {/* Minimalist preset buttons */}
                <div className="grid grid-cols-4 gap-2.5">
                  {[100, 250, 500, 1000].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => {
                        setPaymentAmount(amt);
                        setCustomAmountText(amt.toString());
                      }}
                      className={`py-2.5 rounded-lg font-medium text-sm transition-all border cursor-pointer ${
                        paymentAmount === amt
                          ? 'bg-white text-zinc-950 border-white shadow-md'
                          : 'bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>

                {/* Elegant dynamic input box */}
                <div className="relative mt-1">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-medium text-zinc-500 text-sm">₹</span>
                  <input
                    type="number"
                    value={customAmountText}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomAmountText(val);
                      const parsed = parseInt(val);
                      if (!isNaN(parsed) && parsed > 0) {
                        setPaymentAmount(parsed);
                      }
                    }}
                    className="w-full pl-8 pr-24 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 focus:border-zinc-500 text-white text-sm focus:outline-none transition-all placeholder:text-zinc-600"
                    placeholder="Other amount"
                    min="1"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
                    INR Wallet
                  </span>
                </div>
              </div>

              {/* Administrative Copy UPI Section */}
              <div className="p-3.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 relative z-10">
                <div className="flex flex-col text-left w-full sm:w-auto">
                  <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider leading-none">
                    Recipient Address
                  </span>
                  <span className="text-sm font-mono font-medium text-zinc-200 mt-1.5 selection:bg-zinc-800">
                    {settings.upiId || 'test@upi'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyUpiId}
                  className={`w-full sm:w-auto px-4 py-2 rounded-lg border font-medium text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                    upiIdCopied
                      ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-400'
                      : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                  }`}
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{upiIdCopied ? 'Copied ID' : 'Copy ID'}</span>
                </button>
              </div>

              {/* Payment execution center: Split side-by-side on desktop */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-zinc-900 pt-6 relative z-10 text-left">
                
                {/* Section A: Direct via UPI Donation */}
                <div className="flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                      <Smartphone className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Option 1: Pay directly with App</span>
                    </h4>
                    <p className="text-xs text-zinc-400 leading-relaxed font-normal">
                      Launch GPay, PhonePe, Paytm, or BHIM directly from your device to initiate a safe payment of <strong className="text-zinc-200 font-medium">₹{paymentAmount}</strong>.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <button
                      type="button"
                      onClick={() => {
                        const note = paymentPurpose 
                          ? `${paymentPurpose}${user?.email ? ` | ${user.email}` : ''}`
                          : `Support: ${settings.websiteName || 'Nucleus'} | Amount: ₹${paymentAmount}`;
                        const upiUri = `upi://pay?pa=${settings.upiId || 'test@upi'}&pn=${encodeURIComponent(settings.websiteName || 'Nucleus')}&am=${paymentAmount}&tn=${encodeURIComponent(note)}&cu=INR`;
                        window.location.href = upiUri;
                      }}
                      className="w-full py-3 bg-white text-zinc-950 hover:bg-zinc-100 font-medium text-xs uppercase tracking-widest transition-all rounded-lg flex items-center justify-center gap-2 cursor-pointer shadow-md"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>Launch Payment (₹{paymentAmount})</span>
                    </button>

                    <div className="border-t border-zinc-900 pt-3">
                      <p className="text-[11px] text-zinc-500 font-normal leading-relaxed">
                        Alternatively, manually enter <span className="text-zinc-400 font-medium">{settings.upiId || 'test@upi'}</span> inside your payment application.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Section B: Scan QR Code */}
                <div className="flex flex-col items-center justify-between border-t md:border-t-0 md:border-l border-zinc-900 pt-6 md:pt-0 md:pl-8 text-center gap-4">
                  <div className="w-full text-left md:text-center space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center justify-start md:justify-center gap-2">
                      <QrCode className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Option 2: Scan QR Code</span>
                    </h4>
                    <p className="text-xs text-zinc-500 leading-relaxed max-w-[240px] md:mx-auto font-normal">
                      Scan this QR code with any UPI app on another device to pay <span className="text-zinc-350 font-medium">₹{paymentAmount}</span>.
                    </p>
                  </div>

                  <div className="p-2.5 bg-white rounded-xl shadow-md border border-zinc-200">
                    {settings.upiQrCode ? (
                      <img 
                        src={settings.upiQrCode}
                        alt="Administrative UPI QR Code"
                        className="w-[120px] h-[120px] object-contain rounded mx-auto"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&bgcolor=ffffff&color=000000&data=${encodeURIComponent(
                          `upi://pay?pa=${settings.upiId || 'test@upi'}&pn=${encodeURIComponent(settings.websiteName || 'Nucleus')}&am=${paymentAmount}&tn=${encodeURIComponent(paymentPurpose || 'Donation')}&cu=INR`
                        )}`}
                        alt="UPI Payment QR Code"
                        className="w-[120px] h-[120px] object-contain mx-auto"
                        referrerPolicy="no-referrer"
                      />
                    )}
                  </div>

                  <div className="text-center">
                    <p className="text-[10px] text-zinc-500 font-normal">
                      Supports direct UPI network transfers
                    </p>
                  </div>
                </div>

              </div>

              {/* Informative Security Micro footer */}
              <div className="text-[10px] text-zinc-600 text-center font-normal tracking-wide border-t border-zinc-900 pt-4.5">
                🔒 Secure Transfer | Direct Peer-to-Peer Transaction
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .fade-mask {
          mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
        }
        .animate-spin-slow {
          animation: spin 16s linear infinite;
        }
      `}</style>
    </motion.div>
  );
}
