import { motion, useScroll, useTransform } from 'motion/react';
import { useEffect, useState, useRef } from 'react';
import { Play, BookOpen, Video, Lock, Check } from 'lucide-react';
import { signInWithGoogle, db } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { useNavigate } from 'react-router-dom';
import { collection, query, getDocs, limit, orderBy } from 'firebase/firestore';



function MentorTrack({ mentors, direction = 'left' }: { mentors: any[], direction?: 'left' | 'right' }) {
  // Duplicate for infinite scroll
  const dupMentors = [...mentors, ...mentors];
  
  return (
    <div className="flex w-full overflow-hidden relative fade-mask py-4">
      <motion.div 
        initial={{ x: direction === 'left' ? 0 : '-50%' }}
        animate={{ x: direction === 'left' ? '-50%' : 0 }}
        transition={{ 
          duration: 20, 
          ease: 'linear', 
          repeat: Infinity 
        }}
        className="flex gap-6 px-3 whitespace-nowrap min-w-max"
      >
        {dupMentors.map((m, i) => (
          <div key={i} className="group relative w-[280px] h-[360px] rounded-2xl overflow-hidden cursor-pointer">
            <img 
              src={m.image} 
              alt={m.name} 
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-all duration-700 ease-out"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
            <div className="absolute bottom-6 left-6 p-1">
              <h3 className="font-display font-medium text-lg text-white mb-1">{m.name}</h3>
              <p className="text-sm text-white/80">{m.role}</p>
            </div>
            {/* Hover details */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 backdrop-blur-sm transition-all duration-300 flex items-center justify-center">
              <button className="px-6 py-2.5 rounded-full bg-white/10 text-white backdrop-blur-md border border-white/20 font-medium text-sm">View Profile</button>
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
              <button onClick={() => setSelectedClassGroup('8')} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedClassGroup === '8' ? 'bg-[#E5D2A5] text-[#070709]' : 'bg-white/5 border border-white/10 text-white/60 hover:text-white'}`}>Class 8</button>
              <button onClick={() => setSelectedClassGroup('9')} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedClassGroup === '9' ? 'bg-[#E5D2A5] text-[#070709]' : 'bg-white/5 border border-white/10 text-white/60 hover:text-white'}`}>Class 9</button>
              <button onClick={() => setSelectedClassGroup('10')} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedClassGroup === '10' ? 'bg-[#E5D2A5] text-[#070709]' : 'bg-white/5 border border-white/10 text-white/60 hover:text-white'}`}>Class 10</button>
              <button onClick={() => setSelectedClassGroup('11')} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedClassGroup === '11' ? 'bg-[#E5D2A5] text-[#070709]' : 'bg-white/5 border border-white/10 text-white/60 hover:text-white'}`}>Class 11</button>
              <button onClick={() => setSelectedClassGroup('12')} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedClassGroup === '12' ? 'bg-[#E5D2A5] text-[#070709]' : 'bg-white/5 border border-white/10 text-white/60 hover:text-white'}`}>Class 12</button>
              <button onClick={() => setSelectedClassGroup('dropper')} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedClassGroup === 'dropper' ? 'bg-[#E5D2A5] text-[#070709]' : 'bg-white/5 border border-white/10 text-white/60 hover:text-white'}`}>Dropper</button>
            </div>
          </div>
          
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {materials.filter(m => selectedClassGroup === 'all' || m.classGroup === selectedClassGroup || !m.classGroup).slice(0, 6).map((mat, i) => {
               const reqTier = planTiers[mat.requiredPlan as keyof typeof planTiers] || 0;
               const hasSpecificAccess = user?.unlockedMaterials?.includes(mat.id);
               const hasAccess = userTier >= reqTier || hasSpecificAccess;
               
               return (
                 <motion.div 
                   key={mat.id}
                   initial={{ opacity: 0, y: 20 }}
                   whileInView={{ opacity: 1, y: 0 }}
                   viewport={{ once: true, margin: "-50px" }}
                   transition={{ delay: i * 0.1, duration: 0.5 }}
                   className="relative overflow-hidden rounded-2xl border bg-white/5 border-white/10 p-6 flex flex-col"
                 >
                   <div className="flex items-center justify-between mb-4">
                     <div className={`p-3 rounded-xl ${mat.type === 'note' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>
                       {mat.type === 'note' ? <BookOpen className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                     </div>
                     <div className="px-3 py-1 rounded-full bg-white/5 text-xs text-white/50 border border-white/10 uppercase tracking-wider font-medium">
                       {mat.requiredPlan}
                     </div>
                   </div>
                   <h3 className="font-display text-xl font-medium text-white mb-2">{mat.title}</h3>
                   <p className="text-white/50 text-sm mb-6 flex-1">{mat.description}</p>
                   <div className="pt-4 border-t border-white/10 flex items-center justify-between text-white/40 group cursor-pointer hover:text-white transition-colors" onClick={() => hasAccess ? navigate('/dashboard') : document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}>
                     <div className="flex items-center gap-2 text-sm font-medium">
                       {hasAccess ? (
                         <>
                           <Play className="w-4 h-4" />
                           <span>View Content</span>
                         </>
                       ) : (
                         <>
                           <Lock className="w-4 h-4" />
                           <span>Subscribe to unlock</span>
                         </>
                       )}
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
                {['8', '9', '10', '11', '12', 'dropper'].map(cls => (
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
        
        {mentors1.length > 0 && <MentorTrack mentors={mentors1} direction="left" />}
        {mentors2.length > 0 && <MentorTrack mentors={mentors2} direction="right" />}
      </section>

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
