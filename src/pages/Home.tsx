import { motion, useScroll, useTransform, AnimatePresence } from 'motion/react';
import { useEffect, useState, useRef } from 'react';
import { Play, BookOpen, Video, Lock, Check, X } from 'lucide-react';
import { signInWithGoogle, db } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { useNavigate } from 'react-router-dom';
import { collection, query, getDocs, limit, orderBy } from 'firebase/firestore';



function MentorTrack({ mentors, direction = 'left', onSelect }: { mentors: any[], direction?: 'left' | 'right', onSelect: (m: any) => void }) {
  // Duplicate for infinite scroll
  const dupMentors = [...mentors, ...mentors];
  
  return (
    <div className="flex w-full overflow-hidden relative fade-mask py-4">
      <motion.div 
        initial={{ x: direction === 'left' ? 0 : '-50%' }}
        animate={{ x: direction === 'left' ? '-50%' : 0 }}
        transition={{ 
          duration: 25, 
          ease: 'linear', 
          repeat: Infinity 
        }}
        className="flex gap-6 px-3 whitespace-nowrap min-w-max animate-scroll"
      >
        {dupMentors.map((m, i) => (
          <div 
            key={i} 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSelect(m);
            }}
            className="group relative w-[240px] p-4 bg-white/5 border border-white/10 hover:border-[#E5D2A5]/30 rounded-2xl cursor-pointer transition-all duration-300 flex flex-col gap-3 text-left whitespace-normal shadow-[0_4px_30px_rgba(0,0,0,0.4)] z-30"
          >
            {/* Small rectangular shape image with rounded corners */}
            <div 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSelect(m);
              }}
              className="w-full h-[150px] rounded-xl overflow-hidden bg-white/5 relative cursor-pointer"
            >
              <img 
                src={m.image} 
                alt={m.name} 
                className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500 ease-out cursor-pointer"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-300"></div>
            </div>

            {/* Teacher basic details */}
            <div className="flex flex-col flex-1 justify-between min-h-[70px]">
              <div>
                <h3 className="font-display font-medium text-base text-white group-hover:text-[#E5D2A5] transition-colors duration-300 line-clamp-1 truncate">{m.name}</h3>
                <p className="text-xs text-white/50 line-clamp-1 truncate mb-2">{m.role}</p>
              </div>
              
              <div className="text-[11px] text-[#E5D2A5]/80 font-medium flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity duration-300 select-none">
                <span>View profile & exp</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </div>
          </div>
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

  const y1 = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  
  const { user } = useAuthStore();
  const { settings } = useSettingsStore();
  const navigate = useNavigate();
  const [materials, setMaterials] = useState<any[]>([]);
  const [mentors1, setMentors1] = useState<any[]>([]);
  const [mentors2, setMentors2] = useState<any[]>([]);
  const [selectedClassGroup, setSelectedClassGroup] = useState<string>('all');
  const [pricingClassGroup, setPricingClassGroup] = useState<string>('11');
  const [selectedMentor, setSelectedMentor] = useState<any | null>(null);

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
      className="relative"
    >
      {/* Hero Section */}
      <section id="about" className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20 pb-32">
        {/* Cinematic Blur Backgrounds */}
        <motion.div 
          style={{ y: y1, opacity }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] rounded-full bg-gradient-to-br from-[#E5D2A5]/10 to-transparent blur-[120px] pointer-events-none"
        />
        <motion.div
           style={{ y: y2 }}
           className="absolute -top-32 -right-32 w-[600px] h-[600px] bg-blue-500/5 blur-[150px] rounded-full pointer-events-none"
        />

        <div className="max-w-5xl mx-auto px-6 relative z-10 text-center">
          <motion.div
             initial={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
             animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
             transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-[#E5D2A5] animate-pulse"></span>
              <span className="text-xs font-medium tracking-wide text-white/80">{settings.heroBadgeText}</span>
            </div>
            <h1 className="text-6xl md:text-8xl font-display font-medium tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 mb-8 text-balance">
              {settings.heroTitle}
            </h1>
            <p className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto mb-10 text-balance leading-relaxed whitespace-pre-line">
              {settings.heroSubtitle}
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button 
                onClick={handleCTA}
                className="px-8 py-4 rounded-full bg-[#E5D2A5] text-[#070709] font-medium hover:bg-[#f4ecd8] hover:scale-105 active:scale-95 transition-all duration-300 shadow-[0_0_30px_rgba(229,210,165,0.3)] w-full sm:w-auto"
              >
                {settings.heroCta1Text}
              </button>
              <button onClick={handleCTA2} className="px-8 py-4 rounded-full bg-transparent border border-white/10 text-white font-medium hover:bg-white/5 transition-all duration-300 flex items-center justify-center gap-2 w-full sm:w-auto">
                <Play className="w-4 h-4" /> {settings.heroCta2Text}
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Materials Showcase */}
      {materials.length > 0 && (
        <section id="classes" className="py-24 relative z-20 bg-[#070709] border-t border-white/5">
          <div className="max-w-7xl mx-auto px-6 mb-16 text-center">
            <h2 className="text-3xl md:text-5xl font-display font-medium tracking-tight mb-4">Explore Premium <span className="text-[#E5D2A5]">Content.</span></h2>
            <p className="text-white/50 text-lg max-w-2xl mx-auto mb-8">Get a glimpse of our expertly curated notes, video lectures, and exclusive resources.</p>
            
            <div className="flex flex-wrap items-center justify-center gap-2 mb-12">
              <button onClick={() => setSelectedClassGroup('all')} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedClassGroup === 'all' ? 'bg-[#E5D2A5] text-[#070709]' : 'bg-white/5 border border-white/10 text-white/60 hover:text-white'}`}>All Classes</button>
              <button onClick={() => setSelectedClassGroup('6')} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedClassGroup === '6' ? 'bg-[#E5D2A5] text-[#070709]' : 'bg-white/5 border border-white/10 text-white/60 hover:text-white'}`}>Class 6</button>
              <button onClick={() => setSelectedClassGroup('7')} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedClassGroup === '7' ? 'bg-[#E5D2A5] text-[#070709]' : 'bg-white/5 border border-white/10 text-white/60 hover:text-white'}`}>Class 7</button>
              <button onClick={() => setSelectedClassGroup('8')} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedClassGroup === '8' ? 'bg-[#E5D2A5] text-[#070709]' : 'bg-white/5 border border-white/10 text-white/60 hover:text-white'}`}>Class 8</button>
              <button onClick={() => setSelectedClassGroup('9')} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedClassGroup === '9' ? 'bg-[#E5D2A5] text-[#070709]' : 'bg-white/5 border border-white/10 text-white/60 hover:text-white'}`}>Class 9</button>
              <button onClick={() => setSelectedClassGroup('10')} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedClassGroup === '10' ? 'bg-[#E5D2A5] text-[#070709]' : 'bg-white/5 border border-white/10 text-white/60 hover:text-white'}`}>Class 10</button>
              <button onClick={() => setSelectedClassGroup('11')} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedClassGroup === '11' ? 'bg-[#E5D2A5] text-[#070709]' : 'bg-white/5 border border-white/10 text-white/60 hover:text-white'}`}>Class 11</button>
              <button onClick={() => setSelectedClassGroup('12')} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedClassGroup === '12' ? 'bg-[#E5D2A5] text-[#070709]' : 'bg-white/5 border border-white/10 text-white/60 hover:text-white'}`}>Class 12</button>
              <button onClick={() => setSelectedClassGroup('dropper')} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedClassGroup === 'dropper' ? 'bg-[#E5D2A5] text-[#070709]' : 'bg-white/5 border border-white/10 text-white/60 hover:text-white'}`}>Dropper</button>
            </div>
          </div>
          
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {materials.filter(m => selectedClassGroup === 'all' || m.classGroup === selectedClassGroup || !m.classGroup || user?.unlockedMaterials?.includes(m.id)).slice(0, 6).map((mat, i) => {
               const hasSpecificAccess = user?.unlockedMaterials?.includes(mat.id);
               const hasAccess = hasSpecificAccess || user?.role === 'admin' || user?.role === 'superadmin';
               
               return (
                 <motion.div 
                   key={mat.id}
                   initial={{ opacity: 0, y: 30 }}
                   whileInView={{ opacity: 1, y: 0 }}
                   viewport={{ once: true, margin: "-50px" }}
                   transition={{ delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                   className="group relative overflow-hidden rounded-3xl border bg-black/40 border-white/5 hover:border-[#E5D2A5]/30 flex flex-col transition-all duration-500 cursor-pointer shadow-lg hover:shadow-[0_8px_40px_rgba(229,210,165,0.15)]"
                   onClick={() => hasAccess ? navigate('/dashboard') : navigate('/dashboard')}
                 >
                   {mat.thumbnailUrl && (
                     <div className="w-full h-40 bg-black/50 relative overflow-hidden">
                       <img src={mat.thumbnailUrl} alt={mat.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                       <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                     </div>
                   )}
                   <div className="absolute inset-0 bg-gradient-to-br from-[#E5D2A5]/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                   
                   <div className="p-6 flex flex-col flex-1 relative z-10 z-20">
                     <div className="flex items-center justify-between mb-5">
                       {!mat.thumbnailUrl && (
                          <div className={`p-4 rounded-2xl transition-colors duration-500 ${mat.type === 'note' ? 'bg-white/5 text-white/50 group-hover:bg-white/10 group-hover:text-white' : 'bg-[#E5D2A5]/5 text-[#E5D2A5]/50 group-hover:bg-[#E5D2A5]/10 group-hover:text-[#E5D2A5]'}`}>
                            {mat.type === 'note' ? <BookOpen className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                          </div>
                       )}
                       <div className={`px-4 py-1.5 rounded-full bg-white/5 text-[10px] text-white/50 border border-white/10 uppercase tracking-widest font-medium group-hover:border-[#E5D2A5]/20 group-hover:text-[#E5D2A5] transition-colors duration-500 ${mat.thumbnailUrl ? 'ml-auto' : ''}`}>
                         {mat.classGroup === "all" || !mat.classGroup ? "All Classes" : "Class " + mat.classGroup}
                       </div>
                     </div>
                     <h3 className="font-display text-2xl font-medium text-white mb-3 group-hover:text-[#E5D2A5] transition-colors duration-500 relative z-10">{mat.title}</h3>
                     <p className="text-white/40 text-sm mb-8 flex-1 leading-relaxed relative z-10">{mat.description}</p>
                     <div className="pt-5 border-t border-white/5 flex items-center justify-between text-white/30 group border-t-white/10 relative z-10">
                       <div className="flex items-center gap-2 text-sm font-medium tracking-wide">
                         {hasAccess ? (
                           <div className="flex items-center gap-3 text-[#E5D2A5] group-hover:text-[#f4ecd8] transition-colors duration-300">
                             <div className="p-2 rounded-full bg-[#E5D2A5]/10 group-hover:bg-[#E5D2A5]/20 group-hover:scale-110 transition-all duration-300">
                               <Play className="w-3.5 h-3.5 fill-current" />
                             </div>
                             <span>View Content</span>
                           </div>
                         ) : (
                           <div className="flex items-center gap-3 text-white/40 group-hover:text-white transition-colors duration-300">
                             <Lock className="w-4 h-4" />
                             <span>Locked</span>
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
            <button onClick={handleCTA} className="px-8 py-3 rounded-full bg-white/5 text-white border border-white/10 hover:bg-white/10 transition-colors">
              View All Materials
            </button>
          </div>
        </section>
      )}

      {/* Pricing Section */}
      <section id="pricing" className="py-24 relative z-20 bg-[#070709] border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-5xl font-display font-medium tracking-tight mb-4">Invest in Your <span className="text-[#E5D2A5]">Future.</span></h2>
            <p className="text-white/50 text-lg max-w-2xl mx-auto">Choose the perfect plan to accelerate your learning journey.</p>
          </div>
          
          <div className="flex justify-center mb-12 relative z-20">
             <div className="bg-white/5 border border-white/10 rounded-full p-1 inline-flex flex-wrap justify-center gap-1">
                {['6', '7', '8', '9', '10', '11', '12', 'dropper'].map(cls => (
                  <button 
                    key={cls} 
                    onClick={() => setPricingClassGroup(cls)} 
                    className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${pricingClassGroup === cls ? 'bg-[#E5D2A5] text-[#070709]' : 'text-white/60 hover:text-white'}`}
                  >
                    {cls === 'dropper' ? 'Dropper' : `Class ${cls}`}
                  </button>
                ))}
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Notes Plan */}
            <div className="p-8 rounded-3xl border border-white/10 bg-white/5 flex flex-col hover:border-white/20 transition-colors">
              <div className="mb-6">
                <h3 className="font-display font-medium text-xl text-white mb-2">Notes</h3>
                <p className="text-sm text-white/50">Perfect for quick revisions.</p>
              </div>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-4xl font-medium text-white">₹{settings.classPrices?.[pricingClassGroup]?.notes || settings.priceNotes || 99}</span>
                <span className="text-white/50 text-sm">/year</span>
              </div>
              <ul className="text-sm space-y-4 mb-8 flex-1">
                <li className="flex items-start gap-3 text-white/70">
                  <Check className="w-5 h-5 text-[#E5D2A5] shrink-0" />
                  <span>Complete PDF Notes</span>
                </li>
                <li className="flex items-start gap-3 text-white/70">
                  <Check className="w-5 h-5 text-[#E5D2A5] shrink-0" />
                  <span>Revision Materials</span>
                </li>
                <li className="flex items-start gap-3 text-white/70">
                  <Check className="w-5 h-5 text-[#E5D2A5] shrink-0" />
                  <span>Basic Support</span>
                </li>
              </ul>
              <button 
                onClick={() => handlePayment('notes', settings.classPrices?.[pricingClassGroup]?.notes || settings.priceNotes || 99)} 
                className="w-full py-3.5 rounded-full border border-white/20 text-white hover:bg-white/10 font-medium transition-colors"
                >
                Get Started
              </button>
            </div>

            {/* Lectures Plan */}
            <div className="p-8 rounded-3xl border border-[#E5D2A5] bg-[#E5D2A5]/5 flex flex-col relative shadow-[0_0_30px_rgba(229,210,165,0.1)] scale-100 md:scale-105 z-10">
               <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#E5D2A5] text-[#070709] text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider shadow-lg">
                Most Popular
              </div>
              <div className="mb-6">
                <h3 className="font-display font-medium text-xl text-[#E5D2A5] mb-2">Lectures</h3>
                <p className="text-sm text-white/50">Deep dive with video courses.</p>
              </div>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-4xl font-medium text-white">₹{settings.classPrices?.[pricingClassGroup]?.lectures || settings.priceLectures || 499}</span>
                <span className="text-white/50 text-sm">/year</span>
              </div>
              <ul className="text-sm space-y-4 mb-8 flex-1">
                <li className="flex items-start gap-3 text-white/70">
                  <Check className="w-5 h-5 text-[#E5D2A5] shrink-0" />
                  <span>Everything in Notes</span>
                </li>
                <li className="flex items-start gap-3 text-white/70">
                  <Check className="w-5 h-5 text-[#E5D2A5] shrink-0" />
                  <span className="text-white">HD Video Lectures</span>
                </li>
                <li className="flex items-start gap-3 text-white/70">
                  <Check className="w-5 h-5 text-[#E5D2A5] shrink-0" />
                  <span>Doubt Clearing</span>
                </li>
              </ul>
              <button 
                onClick={() => handlePayment('lectures', settings.classPrices?.[pricingClassGroup]?.lectures || settings.priceLectures || 499)} 
                className="w-full py-3.5 rounded-full bg-[#E5D2A5] text-[#070709] hover:bg-[#f4ecd8] font-medium transition-colors shadow-lg"
                >
                Get Started
              </button>
            </div>

            {/* Premium Plan */}
            <div className="p-8 rounded-3xl border border-white/10 bg-white/5 flex flex-col hover:border-white/20 transition-colors">
              <div className="mb-6">
                <h3 className="font-display font-medium text-xl text-white mb-2">Premium</h3>
                <p className="text-sm text-white/50">The ultimate learning experience.</p>
              </div>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-4xl font-medium text-white">₹{settings.classPrices?.[pricingClassGroup]?.premium || settings.pricePremium || 999}</span>
                <span className="text-white/50 text-sm">/year</span>
              </div>
              <ul className="text-sm space-y-4 mb-8 flex-1">
                <li className="flex items-start gap-3 text-white/70">
                  <Check className="w-5 h-5 text-[#E5D2A5] shrink-0" />
                  <span>Everything in Lectures</span>
                </li>
                <li className="flex items-start gap-3 text-white/70">
                  <Check className="w-5 h-5 text-[#E5D2A5] shrink-0" />
                  <span className="text-white">1-on-1 Mentorship</span>
                </li>
                <li className="flex items-start gap-3 text-white/70">
                  <Check className="w-5 h-5 text-[#E5D2A5] shrink-0" />
                  <span className="text-white">Mock Test Series</span>
                </li>
              </ul>
              <button 
                onClick={() => handlePayment('premium', settings.classPrices?.[pricingClassGroup]?.premium || settings.pricePremium || 999)} 
                className="w-full py-3.5 rounded-full border border-white/20 text-white hover:bg-white/10 font-medium transition-colors"
                >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Mentor Showcase */}
      <section id="teachers" className="py-24 relative z-20 bg-[#070709]">
        <div className="max-w-7xl mx-auto px-6 mb-16">
          <h2 className="text-3xl md:text-5xl font-display font-medium tracking-tight mb-4">Learn from the <span className="text-[#E5D2A5]">Masters.</span></h2>
          <p className="text-white/50 text-lg max-w-xl">Our faculty comprises the nation's top rankers and distinguished educators. No compromise on quality.</p>
        </div>
        
        {mentors1.length > 0 && <MentorTrack mentors={mentors1} direction="left" onSelect={setSelectedMentor} />}
        {mentors2.length > 0 && <MentorTrack mentors={mentors2} direction="right" onSelect={setSelectedMentor} />}
      </section>

      <AnimatePresence>
        {selectedMentor && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedMentor(null)}
              className="absolute inset-0 bg-black/85 backdrop-blur-md"
            />
            
            {/* Modal Container */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="relative w-full max-w-lg bg-[#0d0d12] border border-white/10 rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-10 p-6 md:p-8 flex flex-col gap-6 hover:border-[#E5D2A5]/25 transition-colors duration-300"
            >
              {/* Close Button at Top-Right */}
              <button 
                onClick={() => setSelectedMentor(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-colors z-20 cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
              
              {/* Header: Small Rounded Square Profile Pic + Name & Specialization */}
              <div className="flex items-center gap-5">
                {/* Small rounded square profile picture */}
                <div className="w-16 h-16 md:w-20 h-20 shrink-0 rounded-xl overflow-hidden border border-white/10 bg-[#0f0f14] flex items-center justify-center shadow-lg">
                  <img 
                    src={selectedMentor.image} 
                    alt={selectedMentor.name} 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer"
                  />
                </div>
                
                <div className="flex flex-col text-left">
                  <span className="text-[#E5D2A5] font-display font-medium text-[10px] tracking-widest uppercase mb-1">FACULTY PROFILE</span>
                  <h3 className="font-display font-semibold text-xl md:text-2xl text-white leading-tight mb-1">{selectedMentor.name}</h3>
                  <p className="text-white/60 text-xs md:text-sm line-clamp-1">{selectedMentor.role}</p>
                </div>
              </div>
              
              {/* Exp Badge & Bio */}
              <div className="space-y-4 border-t border-white/5 pt-4 text-left">
                {/* Experience */}
                <div>
                  <span className="text-white/40 text-[10px] font-display uppercase tracking-wider block mb-1.5">EXPERIENCE</span>
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#E5D2A5]/10 border border-[#E5D2A5]/20 text-xs text-[#E5D2A5] font-medium">
                    {selectedMentor.experience || 'Distinguished Educator'}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <span className="text-white/40 text-[10px] font-display uppercase tracking-wider block mb-1">BACKGROUND & BIO</span>
                  <p className="text-white/75 text-sm leading-relaxed">
                    {selectedMentor.description || 'Dedicated to inspiring students, breaking down complex principles, and guiding them to stellar success in high-profile competitive examinations.'}
                  </p>
                </div>
              </div>

              {/* Bottom Close Button */}
              <div className="border-t border-white/5 pt-4 flex justify-end">
                <button 
                  onClick={() => setSelectedMentor(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white/80 hover:text-white font-medium text-xs transition-all duration-300 flex items-center gap-1.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Close Profile</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {settings.reviewFormUrl && (
        <section id="review" className="py-24 relative z-20 bg-[#070709] border-t border-white/5">
          <div className="max-w-3xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-5xl font-display font-medium tracking-tight mb-4">Leave a <span className="text-[#E5D2A5]">Review.</span></h2>
              <p className="text-white/50 text-lg">We value your feedback. Share your thoughts and experiences with us.</p>
            </div>
            
            <form action={settings.reviewFormUrl} method="POST" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm text-white/60 mb-2">Full Name</label>
                  <input required type="text" id="name" name="name" className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5]" />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm text-white/60 mb-2">Email Address</label>
                  <input required type="email" id="email" name="email" className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5]" />
                </div>
              </div>
              <div>
                <label htmlFor="message" className="block text-sm text-white/60 mb-2">Your Message</label>
                <textarea required id="message" name="message" className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5] h-32 resize-none"></textarea>
              </div>
              <div className="text-center">
                <button type="submit" className="px-8 py-3 rounded-full bg-[#E5D2A5] text-[#070709] font-medium shadow-[0_0_15px_rgba(229,210,165,0.2)] hover:bg-[#f4ecd8] transition-colors w-full sm:w-auto">
                  Submit Review
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
      `}</style>
    </motion.div>
  );
}
