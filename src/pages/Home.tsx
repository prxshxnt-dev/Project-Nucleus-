import { motion, useScroll, useTransform, AnimatePresence } from 'motion/react';
import { useEffect, useState, useRef } from 'react';
import { Play, BookOpen, Video, Lock, Check, X, Sparkles, Star, Trophy, ArrowRight, Heart, Feather, Coffee } from 'lucide-react';
import { signInWithGoogle, db } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { useNavigate } from 'react-router-dom';
import { collection, query, getDocs, limit, orderBy } from 'firebase/firestore';
import { FloatingStickers } from '../components/FloatingStickers';

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

  useEffect(() => {
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
  }, []);

  const planTiers = {
    free: 0,
    notes: 1,
    lectures: 2,
    premium: 3
  };
  const userTier = user ? planTiers[user.planId as keyof typeof planTiers] : 0;

  const handleCTA = () => {
    if (settings.heroCta1Link) {
      if (settings.heroCta1Link.startsWith('http')) {
        window.open(settings.heroCta1Link, '_blank');
      } else {
        navigate(settings.heroCta1Link);
      }
      return;
    }
    if (user) {
       navigate(user.role === 'admin' || user.role === 'superadmin' ? '/admin' : '/dashboard');
    } else {
       signInWithGoogle();
    }
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
    if (!user) {
      alert("Please sign in first to proceed with payment.");
      signInWithGoogle();
      return;
    }
    const note = `Class: ${pricingClassGroup} | Plan: ${planName} | Email: ${user.email}`;
    const encodedNote = encodeURIComponent(note);
    const upiUri = `upi://pay?pa=${settings.upiId}&pn=Admin&am=${amount}&tn=${encodedNote}&cu=INR`;
    window.location.href = upiUri;
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
        
        {/* Soft colorful blobs floating in back */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
          <motion.div 
            animate={{ 
              x: [0, 40, -20, 0],
              y: [0, -30, 40, 0],
              scale: [1, 1.1, 0.95, 1],
            }}
            transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-[10%] left-[5%] w-[380px] h-[380px] rounded-full bg-gradient-to-tr from-accent-primary/15 to-transparent blur-[100px]"
          />
          <motion.div 
            animate={{ 
              x: [0, -50, 30, 0],
              y: [0, 40, -30, 0],
              scale: [1, 0.9, 1.1, 1],
            }}
            transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute bottom-[20%] right-[10%] w-[450px] h-[450px] rounded-full bg-gradient-to-tr from-[#ff82a0]/15 to-transparent blur-[120px]"
          />
          {/* Subtle learning theme grid outline */}
          <div className="absolute inset-0 bg-[radial-gradient(#e5d2a5_1px,transparent_1px)] [background-size:24px_24px] opacity-15" />
        </div>

        {/* Dynamic Custom Orange Splatter Pop Splash with Academic/Targeted Photo */}
        {settings.aboutCornerImageUrl !== "none" && (
          <div className="absolute top-16 xs:top-20 sm:top-24 right-4 xs:right-6 lg:right-12 z-30 w-24 h-24 xs:w-28 xs:h-28 sm:w-36 sm:h-36 md:w-44 md:h-44 xl:w-52 xl:h-52 pointer-events-auto">
            {/* Pop Splash / Water Spill Background Effect */}
            {settings.aboutCornerBackground !== "none" && (
              <div className="absolute inset-0 pointer-events-none scale-140 z-0 select-none animate-pulse" style={{ animationDuration: '4s' }}>
                {settings.aboutCornerBackground === "water_spread" ? (
                  // WATER SPREAD - smooth organic irregular liquid spread flat spill pattern
                  <svg viewBox="0 0 100 100" className="w-full h-full text-[#ff7a00] fill-current opacity-90 filter drop-shadow-[0_16px_32px_rgba(255,122,0,0.5)]">
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
                  <svg viewBox="0 0 100 100" className="w-full h-full text-[#ff7a00] fill-current opacity-90 filter drop-shadow-[0_16px_32px_rgba(255,122,0,0.5)]">
                    <path d="M50 14 C64 6, 79 10, 85 24 C91 38, 96 48, 88 64 C80 80, 70 88, 54 90 C38 92, 22 84, 15 72 C8 60, 5 40, 14 26 C23 12, 36 22, 50 14 Z" />
                    {/* Popping spike rays */}
                    <line x1="50" y1="14" x2="52" y2="2" stroke="#ff7a00" strokeWidth="2" strokeLinecap="round" />
                    <line x1="85" y1="24" x2="96" y2="15" stroke="#ff7a00" strokeWidth="1.5" strokeLinecap="round" />
                    <line x1="88" y1="64" x2="98" y2="72" stroke="#ff7a00" strokeWidth="2" strokeLinecap="round" />
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

            {/* Configurable Image Frame / Circular Profile Element */}
            <motion.div 
              whileHover={{ scale: 1.05, rotate: 1.5 }}
              className={`absolute inset-1 bg-zinc-950/95 p-1 border border-[#ff7a00]/40 overflow-hidden shadow-2xl z-10 flex flex-col items-center justify-center text-center backdrop-blur-md ${
                settings.aboutCornerImgShape === "circle" ? "rounded-full" : "rounded-2xl sm:rounded-[28px]"
              }`}
            >
              <div className={`relative w-full h-full overflow-hidden group ${
                settings.aboutCornerImgShape === "circle" ? "rounded-full" : "rounded-xl sm:rounded-[22px]"
              }`}>
                <img 
                  src={settings.aboutCornerImageUrl || "https://images.unsplash.com/photo-1614064641938-3bbee52942c7?auto=format&fit=crop&q=80&w=400"} 
                  alt="Custom corner branding"
                  className="w-full h-full object-cover brightness-95 group-hover:brightness-110 transition-all duration-300"
                  referrerPolicy="no-referrer"
                />
                
                {/* Visual Glass highlights */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/10 pointer-events-none" />
              </div>
            </motion.div>
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
              left: "2%",
              top: "22%",
              rotate: -12,
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
              left: "4%",
              top: "76%",
              rotate: 15,
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
              left: "47%",
              top: "12%",
              rotate: -8,
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
              left: "44%",
              top: "84%",
              rotate: 10,
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
              left: "88%",
              top: "16%",
              rotate: -14,
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
              left: "87%",
              top: "78%",
              rotate: 18,
              duration: 5.8,
              themeColor: "text-[#ff839a] border-[#ff839a]/30 shadow-[#ff839a]/5 bg-[#ff839a]/5",
              delay: 1.6,
              align: "right",
            }
          ].map((st) => {
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
                className={`absolute pointer-events-auto cursor-pointer select-none hidden lg:flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl border backdrop-blur-md transition-all duration-300 group ${
                  isActive 
                    ? "shadow-[0_0_35px_rgba(229,210,165,0.45)] ring-2 ring-accent-primary brightness-110 z-40 scale-110" 
                    : "shadow-lg z-20"
                }`}
                style={{
                  left: st.left,
                  top: st.top,
                  borderColor: isActive ? "var(--color-accent-primary, #E5D2A5)" : "var(--theme-border-color, rgba(255,255,255,0.08))"
                }}
                initial={{ opacity: 0, scale: 0.8, y: 15 }}
                animate={{
                  opacity: isActive ? 1 : 0.9,
                  scale: isActive ? 1.12 : 1,
                  y: isActive ? 0 : [0, -10, 0],
                  rotate: isActive ? 0 : [st.rotate, st.rotate + 3, st.rotate - 3, st.rotate]
                }}
                transition={{
                  opacity: { duration: 0.3 },
                  scale: { duration: 0.3 },
                  y: isActive ? { duration: 0.3 } : {
                    repeat: Infinity,
                    duration: st.duration,
                    ease: "easeInOut",
                    delay: st.delay
                  },
                  rotate: isActive ? { duration: 0.3 } : {
                    repeat: Infinity,
                    duration: st.duration * 1.1,
                    ease: "easeInOut",
                    delay: st.delay
                  }
                }}
                whileHover={{
                  scale: isActive ? 1.15 : 1.08,
                  opacity: 1,
                  borderColor: "var(--color-accent-primary, #E5D2A5)",
                  transition: { type: 'spring', stiffness: 400, damping: 12 }
                }}
              >
                {/* Sticker Die-cut background bloom effect */}
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${st.themeColor} ${isActive ? 'opacity-40' : 'opacity-20 group-hover:opacity-40'} transition-opacity duration-300 pointer-events-none`} />
                
                {/* Big bold study emoji */}
                <span className="text-xl filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)] select-none">
                  {st.emoji}
                </span>

                {/* Precise miniature labels */}
                <div className="flex flex-col text-left">
                  <span className="text-[10px] font-black tracking-widest leading-none font-mono uppercase text-text-primary group-hover:text-accent-primary transition-colors duration-300">
                    {st.title}
                  </span>
                  <span className="text-[8px] text-text-muted font-sans font-medium mt-0.5 whitespace-nowrap">
                    {st.subtitle}
                  </span>
                </div>

                {/* Inner highlight glass overlay */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-transparent via-white/5 to-white/10 pointer-events-none" />
                {/* High contrast die-cut outline effect */}
                <div className="absolute -inset-0.5 rounded-[18px] border border-white/5 pointer-events-none group-hover:border-accent-primary/20 transition-colors" />

                {/* Popup motivator balloon Speech Bubble */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.85, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.85, y: -10 }}
                      transition={{ type: "spring", stiffness: 350, damping: 18 }}
                      className={`absolute top-full mt-4 w-72 p-4 rounded-2xl border border-accent-primary/30 bg-zinc-950/95 backdrop-blur-xl shadow-2xl text-left cursor-default pointer-events-auto ${
                        st.align === "left" 
                          ? "left-0" 
                          : st.align === "right" 
                          ? "right-0" 
                          : "left-1/2 -translate-x-1/2"
                      }`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Triangle Pointer */}
                      <div className={`absolute bottom-full border-[8px] border-transparent border-b-zinc-950/95 filter drop-shadow-[0_-1px_1px_rgba(229,210,165,0.2)] ${
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
          <div className="lg:col-span-7 text-left flex flex-col items-start">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="w-full"
            >
              {/* Cute Badge with animation */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent-primary/10 border border-accent-primary/30 mb-6 backdrop-blur-md">
                <span className="w-2.5 h-2.5 rounded-full bg-accent-primary animate-pulse"></span>
                <span className="text-xs font-bold tracking-wide text-text-primary uppercase">{settings.heroBadgeText || 'Interactive Modern Learning Hub'}</span>
              </div>

              {/* Huge friendly rounded heading weight */}
              <h1 className="text-5xl md:text-7xl font-display font-black tracking-tight text-text-primary mb-6 leading-[1.1] text-balance">
                {settings.heroTitle}
              </h1>

              <p className="text-base md:text-lg text-text-secondary max-w-xl mb-10 text-balance leading-relaxed whitespace-pre-line font-medium">
                {settings.heroSubtitle}
              </p>
              
              {/* Primary CTA styling matches a cute responsive game style */}
              <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                <button 
                  onClick={handleCTA}
                  className="theme-btn-themed px-10 py-4.5 bg-accent-primary text-button-text font-bold hover:scale-105 active:scale-95 transition-all duration-300 shadow-[0_8px_25px_rgba(229,210,165,0.35)] w-full sm:w-auto flex items-center justify-center gap-2 group cursor-pointer"
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
            <motion.div
              initial={{ opacity: 0, scale: 0.9, rotate: 2 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 100 }}
              className="relative w-full max-w-[420px]"
            >
              {/* Soft visual card representing kid learning stats with rounded edges */}
              <div 
                className="w-full bg-glass-bg border border-border-color backdrop-blur-xl p-6 shadow-2xl relative overflow-hidden"
                style={{ 
                  borderRadius: 'var(--theme-card-radius, 32px)',
                  display: settings.aboutShowMockCard !== false ? 'block' : 'none'
                }}
              >
                {/* Visual header */}
                <div className="flex items-center justify-between mb-8 border-b border-border-color/40 pb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#ff839a]" />
                    <div className="w-3 h-3 rounded-full bg-accent-primary" />
                    <div className="w-3 h-3 rounded-full bg-emerald-400" />
                  </div>
                  <span className="text-[10px] uppercase tracking-widest text-text-muted font-bold font-mono">Student-LMS v1.2</span>
                </div>

                {/* Simulated course progress widget */}
                <div className="space-y-4">
                  {/* Streak Card Widget */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-accent-primary/10 to-amber-500/10 border border-accent-primary/20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-full bg-amber-400 text-button-text">
                        <Trophy className="w-5 h-5 fill-current" />
                      </div>
                      <div className="text-left">
                        <h4 className="font-bold text-sm text-text-primary leading-tight">
                          {settings.aboutMockCardTitle || 'Physics Expert'}
                        </h4>
                        <p className="text-[10px] text-text-muted">
                          {settings.aboutMockCardSubtitle || 'Daily Challenge streak'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-black text-accent-primary font-display">
                        {settings.aboutMockCardValue || '8 Days 🔥'}
                      </span>
                    </div>
                  </div>

                  {/* Math progress capsule */}
                  <div 
                    className="p-4 rounded-2xl bg-bg-secondary/80 border border-border-color/80 flex flex-col gap-2"
                    style={{
                      display: settings.aboutShowCalculusCard !== false ? 'flex' : 'none'
                    }}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-[#ff839a]" />
                        <span className="text-xs font-bold text-text-primary">{settings.aboutCalculusTitle || 'Calculus Foundation'}</span>
                      </div>
                      <span className="text-xs font-bold text-accent-primary">{settings.aboutCalculusBadge || 'Class 11'}</span>
                    </div>
                    {/* Progress Bar */}
                    <div className="h-2 rounded-full bg-border-color/60 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-accent-primary to-amber-400 rounded-full" style={{ width: `${settings.aboutCalculusProgress !== undefined ? settings.aboutCalculusProgress : 74}%` }} />
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-text-muted mt-1">
                      <span>{settings.aboutCalculusLectureText || '14 Lectures Watched'}</span>
                      <span>{settings.aboutCalculusPercentText || '74% Complete'}</span>
                    </div>
                  </div>

                  {/* Rating widget */}
                  <div 
                    className="p-4 rounded-2xl bg-bg-secondary/40 border border-border-color/60 flex items-center gap-4"
                    style={{
                      display: settings.aboutShowRatingCard !== false ? 'flex' : 'none'
                    }}
                  >
                    <div className="w-10 h-10 rounded-full bg-[#ff839a]/10 flex items-center justify-center text-[#ff839a]">
                      <Heart className="w-5 h-5 fill-current" />
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <p className="text-xs font-black text-text-primary truncate">{settings.aboutRatingTitle || '10,000+ Active Students'}</p>
                      <p className="text-[10px] text-text-muted">{settings.aboutRatingDesc || 'Highly recommended study app'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Mini Decorative Bubbles on corners */}
              <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -top-6 -right-6 px-4 py-2 bg-[#ff839a] text-white text-xs font-black rounded-full shadow-lg flex items-center gap-1.5 border border-white/20 select-none z-30"
                style={{
                  display: settings.aboutShowIitianBadge !== false ? 'flex' : 'none'
                }}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{settings.aboutIitianBadgeText || 'IITian Led 🚀'}</span>
              </motion.div>

              <motion.div 
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                className="absolute -bottom-6 -left-6 p-3 bg-accent-primary text-button-text font-black rounded-2xl shadow-lg flex items-center gap-2 border border-white/20 select-none z-30 text-xs text-left"
                style={{
                  display: settings.aboutShowLiveDoubts !== false ? 'flex' : 'none'
                }}
              >
                <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-ping" />
                <span>{settings.aboutLiveDoubtsText || 'Live Doubts Active'}</span>
              </motion.div>
            </motion.div>
          </div>

        </div>
      </section>

      {/* Materials Showcase */}
      {materials.length > 0 && (
        <section id="classes" className="py-24 relative z-20 bg-bg-secondary/40 border-t border-border-color-none rounded-t-[40px] md:rounded-t-[60px] border-t border-border-color">
          <div className="max-w-7xl mx-auto px-6 mb-16 text-center">
            {/* Soft decorative flower or stars */}
            <div className="w-12 h-12 bg-accent-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-accent-primary border border-accent-primary/25 animate-spin-slow">
              <Star className="w-6 h-6 fill-current" />
            </div>
            
            <h2 className="text-4xl md:text-5xl font-display font-black tracking-tight text-text-primary mb-4 leading-normal">
              Explore Premium <span className="text-accent-primary">Lessons & Notes</span>
            </h2>
            <p className="text-text-secondary text-base md:text-lg max-w-2xl mx-auto mb-10 leading-relaxed font-semibold">
              Get an instant look at high-grade course notes, clear explanations, and interactive video lecture assets built by academic rankers.
            </p>
            
            {/* Fully styled cute Class selection buttons */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 max-w-4xl mx-auto bg-glass-bg/85 p-2 rounded-3xl border border-border-color backdrop-blur-md">
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
          </div>
          
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
                     onClick={() => navigate('/dashboard')}
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
          <div className="mt-16 text-center">
            <button 
              onClick={handleCTA} 
              className="theme-btn-themed px-8 py-3.5 bg-glass-bg text-text-primary font-bold border border-border-color hover:border-accent-primary/50 hover:bg-white/5 transition-all text-sm cursor-pointer"
              style={{ borderRadius: 'var(--theme-btn-radius, 9999px)' }}
            >
              Browse Complete Syllabus Catalog
            </button>
          </div>
        </section>
      )}

      {/* Pricing Section */}
      <section id="pricing" className="py-24 relative z-20">
        
        {/* Soft background glow circles */}
        <div className="absolute top-[25%] left-1/2 -translate-x-1/2 w-[500px] h-[550px] bg-gradient-to-tr from-accent-primary/5 via-amber-400/5 to-transparent blur-[110px] pointer-events-none select-none" />

        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-8 md:mb-16">
            <div className="w-12 h-12 bg-[#ff839a]/10 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4 text-[#ff839a] border border-[#ff839a]/25 animate-bounce">
              <Sparkles className="w-5 h-5 fill-current" />
            </div>
            
            <h2 className="text-3xl md:text-5xl font-display font-black tracking-tight text-text-primary mb-3 md:mb-4 leading-normal">
              A Premium Education to <span className="text-accent-primary">Shape Your Life.</span>
            </h2>
            <p className="text-text-secondary text-sm md:text-lg max-w-2xl mx-auto font-semibold leading-relaxed">
              No hidden high-fees. Select the class level that corresponds to you. Enjoy pure learning with cute stickers and bento templates.
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
                boxShadow: activePricingCard === 'notes' ? '0 15px 40px rgba(229, 210, 165, 0.2)' : '0 4px 12px rgba(0,0,0,0.1)',
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
                  Active Revision 🚀
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
                boxShadow: activePricingCard === 'lectures' ? '0 15px 40px rgba(229, 210, 165, 0.25)' : '0 4px 12px rgba(0,0,0,0.1)',
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
                  Most Popular Choice 🚀
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
                      ? `${dotActiveBg} w-6 shadow-[0_0_12px_rgba(229,210,165,0.4)]` 
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
              <div className="w-12 h-12 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-[#ff839a] border border-[#ff839a]/30 animate-pulse">
                <Heart className="w-5 h-5 fill-current text-accent-primary" />
              </div>

              <h2 className="text-4xl md:text-5xl font-display font-black tracking-tight text-text-primary mb-4 leading-normal">
                Leave a <span className="text-accent-primary">Feedback Core.</span>
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
                <label htmlFor="message" className="block text-xs uppercase tracking-wider font-bold text-text-secondary mb-2">Your Thoughts</label>
                <textarea required id="message" name="message" className="w-full px-5 py-3 rounded-2xl bg-bg-secondary/40 border border-border-color text-text-primary text-sm font-semibold focus:outline-none focus:border-accent-primary/60 h-36 resize-none transition-colors" placeholder="Message content goes here..."></textarea>
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
