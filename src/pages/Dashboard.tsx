import { motion } from 'motion/react';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { Lock, BookOpen, Video, Trophy, Flame, ArrowLeft, Clock, Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, query, getDocs, doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useNavigate, Link } from 'react-router-dom';
import ReactPlayer from 'react-player';
import { CustomVideoPlayer } from '../components/CustomVideoPlayer';

const planTiers = {
  free: 0,
  notes: 1,
  lectures: 2,
  premium: 3
};

const getEmbedUrl = (url: string) => {
  if (!url) return '';
  
  // YouTube
  const ytRegExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const ytMatch = url.match(ytRegExp);
  if (ytMatch && ytMatch[2].length === 11) {
    return `https://www.youtube.com/embed/${ytMatch[2]}?autoplay=1&mute=0&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&disablekb=1`;
  }

  // Google Drive
  const driveRegExp = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)\/view/;
  const driveMatch = url.match(driveRegExp);
  if (driveMatch && driveMatch[1]) {
    return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
  }

  // PDF
  if (url.toLowerCase().includes('.pdf')) {
    return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
  }

  return url;
};

export default function Dashboard() {
  const { user } = useAuthStore();
  const { settings } = useSettingsStore();
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMaterial, setSelectedMaterial] = useState<any | null>(null);
  const [activeMaterial, setActiveMaterial] = useState<any | null>(null);

  useEffect(() => {
    if (selectedMaterial) {
      setActiveMaterial(selectedMaterial);
    } else {
      const timer = setTimeout(() => setActiveMaterial(null), 300);
      return () => clearTimeout(timer);
    }
  }, [selectedMaterial]);
  const [secureUrl, setSecureUrl] = useState<string>('');
  const [fetchingUrl, setFetchingUrl] = useState(false);
  const [studyMinutes, setStudyMinutes] = useState(0);
  const [upiId, setUpiId] = useState<string>('');
  const [viewingPlans, setViewingPlans] = useState(false);
  const [prices, setPrices] = useState({ notes: 99, lectures: 499, premium: 999 });
  const [selectedClassGroup, setSelectedClassGroup] = useState<string>('all');
  const [showClassSetup, setShowClassSetup] = useState(false);
  const [setupClassGroup, setSetupClassGroup] = useState('11');
  
  const userTier = user ? planTiers[user.planId as keyof typeof planTiers] : 0;
  
  useEffect(() => {
    if (user && !user.classGroup) {
      if (localStorage.getItem(`hasSeenClassSetup_${user.uid}`) !== 'true') {
        setShowClassSetup(true);
      }
    } else if (user?.classGroup) {
      setSelectedClassGroup(user.classGroup);
    }
  }, [user]);

  const handleCloseClassSetup = (open: boolean) => {
    if (!open && user) {
      localStorage.setItem(`hasSeenClassSetup_${user.uid}`, 'true');
      setShowClassSetup(false);
    }
  };

  const handleSaveClass = async () => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        classGroup: setupClassGroup,
        updatedAt: serverTimestamp()
      });
      localStorage.setItem(`hasSeenClassSetup_${user.uid}`, 'true');
      setShowClassSetup(false);
      setSelectedClassGroup(setupClassGroup);
    } catch (e) {
      console.error(e);
      alert('Failed to save class.');
    }
  };
  
  useEffect(() => {
    getDoc(doc(db, 'settings', 'global')).then(snap => {
      if (snap.exists()) {
        const d = snap.data();
        setUpiId(d.upiId || '');
        setPrices({
          notes: d.priceNotes || 99,
          lectures: d.priceLectures || 499,
          premium: d.pricePremium || 999
        });
      }
    });
  }, []);

  const handlePayment = (planName: string, amount: number) => {
    if (!upiId || !user) return alert('UPI ID not configured by admin.');
    const note = `Plan: ${planName} | Email: ${user.email}`;
    const encodedNote = encodeURIComponent(note);
    const upiUri = `upi://pay?pa=${upiId}&pn=Admin&am=${amount}&tn=${encodedNote}&cu=INR`;
    window.location.href = upiUri;
  };

  const isGuest = user?.role === 'guest';
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMaterials = async () => {
      // If guest, don't fetch or show materials
      if (isGuest) {
        setLoading(false);
        return;
      }
      try {
        const q = query(collection(db, 'materials'));
        const snapshot = await getDocs(q);
        const mats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMaterials(mats);
      } catch (error) {
        console.error('Error fetching materials', error);
      } finally {
        setLoading(false);
      }
    };
    fetchMaterials();
  }, [isGuest]);

  useEffect(() => {
    if (!user || user.role === 'guest') return;

    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    let updates: any = {};
    let needsUpdate = false;

    if (user.lastStudyDate !== todayStr) {
      updates.todayStudyMinutes = 0;
      updates.lastStudyDate = todayStr;
      needsUpdate = true;
      setStudyMinutes(0);
    } else {
      setStudyMinutes(user.todayStudyMinutes || 0);
    }

    if (user.lastStreakDate && user.lastStreakDate < yesterday) {
      if ((user.streak || 0) > 0) {
        updates.streak = 0;
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      updates.updatedAt = serverTimestamp();
      updateDoc(doc(db, 'users', user.uid), updates).catch(console.error);
    }
  }, [user?.uid]); // Intentionally not deeply depending on user to avoid infinite loops

  useEffect(() => {
    if (!selectedMaterial || !user) {
      setSecureUrl('');
      return;
    }
    const reqTier = planTiers[selectedMaterial.requiredPlan as keyof typeof planTiers];
    const hasAccess = (userTier >= reqTier) || (user.unlockedMaterials?.includes(selectedMaterial.id)) || selectedMaterial.type === 'video' || selectedMaterial.type === 'lecture';
    
    if (hasAccess) {
      setFetchingUrl(true);
      if (selectedMaterial.url) {
        // Fallback for un-migrated materials that still have the URL publicly exposed
        setSecureUrl(selectedMaterial.url);
        setFetchingUrl(false);
      } else {
        getDoc(doc(db, 'materials_secure', selectedMaterial.id)).then((d) => {
          if (d.exists()) {
            setSecureUrl(d.data().url);
          }
        }).catch(err => {
          console.error("Failed to load secure material URL:", err);
        }).finally(() => {
          setFetchingUrl(false);
        });
      }
    }
  }, [selectedMaterial, user, userTier]);

  useEffect(() => {
    if (!selectedMaterial || !user) return;
    const reqTier = planTiers[selectedMaterial.requiredPlan as keyof typeof planTiers];
    const hasAccess = (userTier >= reqTier) || (user.unlockedMaterials?.includes(selectedMaterial.id));
    
    if (!hasAccess) return;

    // Fast simulation for demo: 1 second = 1 minute of study time, goal 60 mins.
    const timer = setInterval(() => {
      setStudyMinutes(prev => {
        const newMins = prev + 1;
        
        if (newMins % 5 === 0 || newMins === 60) {
           const todayStr = new Date().toISOString().split('T')[0];
           let updates: any = { todayStudyMinutes: newMins };
           
           if (newMins >= 60 && user.lastStreakDate !== todayStr) {
              updates.streak = (user.streak || 0) + 1;
              updates.lastStreakDate = todayStr;
           }
           
           updates.updatedAt = serverTimestamp();
           updateDoc(doc(db, 'users', user.uid), updates).catch(console.error);
        }
        
        return newMins;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [selectedMaterial, userTier, user?.lastStreakDate, user?.streak, user?.uid, user?.unlockedMaterials]);

  if (!user) return <div className="min-h-screen"></div>;

  return (
    <motion.div 
      initial={{ opacity: 0, filter: 'blur(5px)' }}
      animate={{ opacity: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, filter: 'blur(5px)' }}
      transition={{ duration: 0.5 }}
      className="min-h-screen pt-24 pb-32 px-6 md:px-12 max-w-7xl mx-auto"
    >
      <Link 
        to="/" 
        className="inline-flex items-center gap-2 text-white/50 hover:text-white transition-colors mb-8 text-sm font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Link>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-12"
      >
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl font-display font-medium tracking-tight mb-2">Welcome back, {user.displayName?.split(' ')[0]}.</h1>
            <p className="text-white/50">{isGuest ? 'Your account is pending activation.' : 'Continue your journey to excellence.'}</p>
          </div>
          
          {!isGuest && (
            <div className="flex gap-4">
              <div className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
                <div className="p-2 rounded-full bg-orange-500/20 text-orange-500">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-white/50 font-medium tracking-wide uppercase">Current Streak</p>
                  <p className="text-lg font-medium text-white">{user.streak || 0} Days</p>
                </div>
              </div>
              
              <div className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3 relative overflow-hidden group">
                <div className="absolute top-0 left-0 bottom-0 bg-[#E5D2A5]/10 z-0 transition-all duration-300" style={{ width: `${Math.min(100, (studyMinutes / 60) * 100)}%` }}></div>
                <div className="p-2 rounded-full bg-[#E5D2A5]/20 text-[#E5D2A5] z-10">
                  <Clock className="w-5 h-5" />
                </div>
                <div className="z-10">
                  <p className="text-xs text-white/50 font-medium tracking-wide uppercase">Today's Goal</p>
                  <p className="text-lg font-medium text-white capitalize">{studyMinutes >= 60 ? 'Completed' : `${studyMinutes} / 60 Min`}</p>
                </div>
              </div>

              <div className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
                <div className="p-2 rounded-full bg-[#E5D2A5]/20 text-[#E5D2A5]">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-white/50 font-medium tracking-wide uppercase">Your Plan</p>
                  <p className="text-lg font-medium text-white capitalize">{user.planId === 'free' ? 'Basic' : user.planId}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display font-medium text-white/90">Recent Materials</h2>
            <div className="flex flex-wrap items-center gap-1 sm:gap-2 bg-white/5 p-1 rounded-xl border border-white/10">
                <button onClick={() => setSelectedClassGroup('all')} className={`px-3 sm:px-4 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${selectedClassGroup === 'all' ? 'bg-[#E5D2A5] text-[#070709]' : 'text-white/60 hover:text-white'}`}>All</button>
                <button onClick={() => setSelectedClassGroup('6')} className={`px-3 sm:px-4 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${selectedClassGroup === '6' ? 'bg-[#E5D2A5] text-[#070709]' : 'text-white/60 hover:text-white'}`}>6</button>
                <button onClick={() => setSelectedClassGroup('7')} className={`px-3 sm:px-4 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${selectedClassGroup === '7' ? 'bg-[#E5D2A5] text-[#070709]' : 'text-white/60 hover:text-white'}`}>7</button>
                <button onClick={() => setSelectedClassGroup('8')} className={`px-3 sm:px-4 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${selectedClassGroup === '8' ? 'bg-[#E5D2A5] text-[#070709]' : 'text-white/60 hover:text-white'}`}>8</button>
                <button onClick={() => setSelectedClassGroup('9')} className={`px-3 sm:px-4 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${selectedClassGroup === '9' ? 'bg-[#E5D2A5] text-[#070709]' : 'text-white/60 hover:text-white'}`}>9</button>
                <button onClick={() => setSelectedClassGroup('10')} className={`px-3 sm:px-4 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${selectedClassGroup === '10' ? 'bg-[#E5D2A5] text-[#070709]' : 'text-white/60 hover:text-white'}`}>10</button>
                <button onClick={() => setSelectedClassGroup('11')} className={`px-3 sm:px-4 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${selectedClassGroup === '11' ? 'bg-[#E5D2A5] text-[#070709]' : 'text-white/60 hover:text-white'}`}>11</button>
                <button onClick={() => setSelectedClassGroup('12')} className={`px-3 sm:px-4 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${selectedClassGroup === '12' ? 'bg-[#E5D2A5] text-[#070709]' : 'text-white/60 hover:text-white'}`}>12</button>
                <button onClick={() => setSelectedClassGroup('dropper')} className={`px-3 sm:px-4 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${selectedClassGroup === 'dropper' ? 'bg-[#E5D2A5] text-[#070709]' : 'text-white/60 hover:text-white'}`}>Dropper</button>
            </div>
          </div>
          
          {isGuest ? (
            <div className="text-center py-12 rounded-2xl bg-white/5 border border-white/10 text-white/50 flex flex-col items-center justify-center">
              <Lock className="w-8 h-8 mb-4 text-[#E5D2A5]" />
              <p>Content is locked.</p>
              <p className="text-sm">You must be promoted to a Student to view dashboard materials.</p>
            </div>
          ) : loading ? (
             <div className="space-y-4">
               {[1,2,3].map(i => (
                 <div key={i} className="w-full h-24 rounded-2xl bg-white/5 animate-pulse border border-white/5"></div>
               ))}
             </div>
          ) : (
            materials.length > 0 ? (
              <div className="space-y-4">
                {materials.filter(m => selectedClassGroup === 'all' || m.classGroup === selectedClassGroup || !m.classGroup).map((mat) => {
                  const reqTier = planTiers[mat.requiredPlan as keyof typeof planTiers];
                  const hasSpecificAccess = user?.unlockedMaterials?.includes(mat.id);
                  const isLocked = userTier < reqTier && !hasSpecificAccess;
                  
                  return (
                    <motion.div 
                      key={mat.id}
                      onClick={() => setSelectedMaterial(mat)}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      whileHover={{ scale: 1.02 }}
                      className={`group relative overflow-hidden rounded-2xl border p-5 flex items-center gap-5 transition-all duration-300 bg-black/40 border-white/5 hover:border-[#E5D2A5]/30 cursor-pointer shadow-lg hover:shadow-[0_8px_30px_rgba(229,210,165,0.1)]`}
                    >
                      {mat.thumbnailUrl ? (
                        <div className="w-20 h-20 shrink-0 rounded-2xl overflow-hidden bg-white/5 relative group-hover:scale-105 transition-transform duration-500">
                          <img src={mat.thumbnailUrl} alt={mat.title} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                        </div>
                      ) : (
                        <div className={`p-5 rounded-2xl shrink-0 transition-colors duration-300 ${mat.type === 'note' ? 'bg-white/5 text-white/70 group-hover:bg-white/10 group-hover:text-white' : 'bg-[#E5D2A5]/5 text-[#E5D2A5]/70 group-hover:bg-[#E5D2A5]/10 group-hover:text-[#E5D2A5]'}`}>
                          {mat.type === 'note' ? <BookOpen className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-display font-medium text-lg text-white mb-1.5 truncate group-hover:text-[#E5D2A5] transition-colors">{mat.title}</h3>
                        <p className="text-sm text-white/50 line-clamp-2 leading-relaxed">{mat.description}</p>
                      </div>
                      
                      {isLocked ? (
                        <div className="flex flex-col items-end gap-2 shrink-0">
                           <div className="p-3 rounded-full bg-red-500/10 text-red-400 group-hover:bg-red-500/20 transition-colors">
                             <Lock className="w-4 h-4" />
                           </div>
                           <span className="text-[10px] font-medium text-white/30 uppercase tracking-widest hidden sm:block">Requires {mat.requiredPlan}</span>
                        </div>
                      ) : (
                         <div className="shrink-0 px-6 py-2.5 rounded-full bg-white/5 text-white text-sm font-medium border border-white/10 group-hover:bg-gradient-to-r group-hover:from-[#E5D2A5] group-hover:to-[#D4BE8D] group-hover:text-black group-hover:border-transparent group-hover:scale-105 transition-all duration-300 shadow-md">
                           View
                         </div>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12 rounded-2xl bg-white/5 border border-white/10 text-white/50">
                No materials available yet.
              </div>
            )
          )}
        </div>
        
        <div className="space-y-6">
           <div className="p-6 rounded-3xl bg-gradient-to-br from-[#E5D2A5]/10 to-transparent border border-[#E5D2A5]/20">
             <h3 className="font-display text-xl font-medium text-white mb-2">Upgrade to Premium</h3>
             <p className="text-sm text-white/70 mb-6">Unlock all lectures, exclusive notes, and personalized mentorship.</p>
             <button onClick={() => setViewingPlans(true)} className="w-full py-3 rounded-full bg-[#E5D2A5] text-[#070709] font-medium shadow-[0_0_15px_rgba(229,210,165,0.2)] hover:bg-[#f4ecd8] transition-colors">
               View Plans
             </button>
           </div>
        </div>
      </div>

      <Dialog open={viewingPlans} onOpenChange={setViewingPlans}>
        <DialogContent className="sm:max-w-[900px] bg-[#070709] border border-white/10 text-white p-8">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-3xl font-display font-medium text-center">Unlock Your Potential</DialogTitle>
            <DialogDescription className="text-white/50 text-center text-base mt-2">
              Select the plan that fits your goals. Upgrade to start learning right away.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Notes Plan */}
            <div className="p-8 rounded-3xl border border-white/10 bg-white/5 flex flex-col hover:border-white/20 transition-colors">
              <div className="mb-6">
                <h3 className="font-display font-medium text-xl text-white mb-2">Notes</h3>
                <p className="text-sm text-white/50">Perfect for quick revisions.</p>
              </div>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-4xl font-medium text-white">₹{selectedClassGroup && settings.classPrices?.[selectedClassGroup]?.notes ? settings.classPrices[selectedClassGroup].notes : prices.notes}</span>
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
              <button onClick={() => handlePayment('notes', selectedClassGroup && settings.classPrices?.[selectedClassGroup]?.notes ? settings.classPrices[selectedClassGroup].notes : prices.notes)} className="w-full py-3.5 rounded-full border border-white/20 text-white hover:bg-white/10 font-medium transition-colors">
                Select Plan
              </button>
            </div>

            {/* Lectures Plan */}
            <div className="p-8 rounded-3xl border border-[#E5D2A5] bg-[#E5D2A5]/5 flex flex-col relative shadow-[0_0_30px_rgba(229,210,165,0.1)]">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#E5D2A5] text-[#070709] text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider shadow-lg">
                Most Popular
              </div>
              <div className="mb-6">
                <h3 className="font-display font-medium text-xl text-[#E5D2A5] mb-2">Lectures</h3>
                <p className="text-sm text-white/50">Deep dive with video courses.</p>
              </div>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-4xl font-medium text-white">₹{selectedClassGroup && settings.classPrices?.[selectedClassGroup]?.lectures ? settings.classPrices[selectedClassGroup].lectures : prices.lectures}</span>
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
              <button onClick={() => handlePayment('lectures', selectedClassGroup && settings.classPrices?.[selectedClassGroup]?.lectures ? settings.classPrices[selectedClassGroup].lectures : prices.lectures)} className="w-full py-3.5 rounded-full bg-[#E5D2A5] text-[#070709] hover:bg-[#f4ecd8] font-medium transition-colors shadow-lg">
                Select Plan
              </button>
            </div>

            {/* Premium Plan */}
            <div className="p-8 rounded-3xl border border-white/10 bg-white/5 flex flex-col hover:border-white/20 transition-colors">
              <div className="mb-6">
                <h3 className="font-display font-medium text-xl text-white mb-2">Premium</h3>
                <p className="text-sm text-white/50">The ultimate learning experience.</p>
              </div>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-4xl font-medium text-white">₹{selectedClassGroup && settings.classPrices?.[selectedClassGroup]?.premium ? settings.classPrices[selectedClassGroup].premium : prices.premium}</span>
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
              <button onClick={() => handlePayment('premium', selectedClassGroup && settings.classPrices?.[selectedClassGroup]?.premium ? settings.classPrices[selectedClassGroup].premium : prices.premium)} className="w-full py-3.5 rounded-full border border-white/20 text-white hover:bg-white/10 font-medium transition-colors">
                Select Plan
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showClassSetup} onOpenChange={handleCloseClassSetup}>
        <DialogContent className="sm:max-w-[400px] bg-[#070709] border border-white/10 text-white rounded-3xl" showCloseButton={true}>
          <DialogHeader>
            <DialogTitle className="text-2xl font-display font-medium text-center">Hey there! 👋</DialogTitle>
            <DialogDescription className="text-white/50 text-center">Please let us know which class you are in so we can personalize your experience.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-4">
            <button onClick={() => setSetupClassGroup('8')} className={`px-4 py-3 rounded-xl border text-left font-medium transition-colors ${setupClassGroup === '8' ? 'bg-[#E5D2A5]/10 border-[#E5D2A5] text-[#E5D2A5]' : 'bg-transparent border-white/10 text-white hover:bg-white/5'}`}>
              Class 8
            </button>
            <button onClick={() => setSetupClassGroup('9')} className={`px-4 py-3 rounded-xl border text-left font-medium transition-colors ${setupClassGroup === '9' ? 'bg-[#E5D2A5]/10 border-[#E5D2A5] text-[#E5D2A5]' : 'bg-transparent border-white/10 text-white hover:bg-white/5'}`}>
              Class 9
            </button>
            <button onClick={() => setSetupClassGroup('10')} className={`px-4 py-3 rounded-xl border text-left font-medium transition-colors ${setupClassGroup === '10' ? 'bg-[#E5D2A5]/10 border-[#E5D2A5] text-[#E5D2A5]' : 'bg-transparent border-white/10 text-white hover:bg-white/5'}`}>
              Class 10
            </button>
            <button onClick={() => setSetupClassGroup('11')} className={`px-4 py-3 rounded-xl border text-left font-medium transition-colors ${setupClassGroup === '11' ? 'bg-[#E5D2A5]/10 border-[#E5D2A5] text-[#E5D2A5]' : 'bg-transparent border-white/10 text-white hover:bg-white/5'}`}>
              Class 11
            </button>
            <button onClick={() => setSetupClassGroup('12')} className={`px-4 py-3 rounded-xl border text-left font-medium transition-colors ${setupClassGroup === '12' ? 'bg-[#E5D2A5]/10 border-[#E5D2A5] text-[#E5D2A5]' : 'bg-transparent border-white/10 text-white hover:bg-white/5'}`}>
              Class 12
            </button>
            <button onClick={() => setSetupClassGroup('dropper')} className={`px-4 py-3 rounded-xl border text-left font-medium transition-colors ${setupClassGroup === 'dropper' ? 'bg-[#E5D2A5]/10 border-[#E5D2A5] text-[#E5D2A5]' : 'bg-transparent border-white/10 text-white hover:bg-white/5'}`}>
              Dropper
            </button>
          </div>
          <div className="mt-6">
            <button onClick={handleSaveClass} className="w-full py-3 rounded-full bg-[#E5D2A5] text-[#070709] font-medium shadow-[0_0_15px_rgba(229,210,165,0.2)] hover:bg-[#f4ecd8] transition-colors">
              Continue
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedMaterial} onOpenChange={(open) => !open && setSelectedMaterial(null)}>
        <DialogContent className="sm:max-w-[800px] bg-[#070709] border border-white/10 text-white p-0 overflow-hidden">
          {activeMaterial && (
            <>
              <DialogHeader className="p-6 pb-0">
                <DialogTitle className="text-2xl font-display font-medium text-white flex items-center justify-between">
                  <span>{activeMaterial.title}</span>
                  {(userTier < planTiers[activeMaterial.requiredPlan as keyof typeof planTiers] && !user?.unlockedMaterials?.includes(activeMaterial.id)) && (
                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide bg-white/10 px-3 py-1.5 rounded-full text-white/60">
                      <Lock className="w-3 h-3" />
                      Locked
                    </div>
                  )}
                </DialogTitle>
                <DialogDescription className="text-white/50 mt-2">
                  {activeMaterial.description}
                </DialogDescription>
              </DialogHeader>

              <div className={`w-full ${activeMaterial.type === 'note' ? 'bg-black/50 aspect-auto h-[60vh] md:h-[70vh]' : 'bg-transparent aspect-video p-6 pb-8'} relative flex items-center justify-center`}>
                {(activeMaterial.type !== 'video' && activeMaterial.type !== 'lecture' && Math.max(0, userTier) < planTiers[activeMaterial.requiredPlan as keyof typeof planTiers] && !user?.unlockedMaterials?.includes(activeMaterial.id)) ? (
                  <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center flex-col p-8 text-center z-10 border-t border-white/5">
                    <Lock className="w-12 h-12 text-[#E5D2A5] mb-4" />
                    <h3 className="text-2xl font-display font-medium text-white mb-2">Content Locked</h3>
                    <p className="text-white/60 mb-6 max-w-md">
                      Upgrade your plan to {activeMaterial.requiredPlan} to explore this content.
                    </p>
                    <button onClick={() => { setSelectedMaterial(null); setViewingPlans(true); }} className="px-6 py-3 rounded-full bg-[#E5D2A5] text-[#070709] font-medium shadow-[0_0_20px_rgba(229,210,165,0.2)] hover:bg-[#f4ecd8] transition-colors">
                      View Upgrade Plans
                    </button>
                  </div>
                ) : fetchingUrl && activeMaterial.type !== 'video' && activeMaterial.type !== 'lecture' ? (
                  <div className="flex items-center justify-center p-8 bg-black/80 w-full h-full text-white/50 animate-pulse">
                     Loading secure content...
                  </div>
                ) : (activeMaterial.type === 'video' || activeMaterial.type === 'lecture') || ReactPlayer.canPlay(secureUrl || activeMaterial.url) ? (
                  <CustomVideoPlayer url={secureUrl || activeMaterial.url} playing={!!selectedMaterial} />
                ) : (
                  <div className="relative w-full h-full pointer-events-auto">
                    <iframe
                      src={getEmbedUrl(secureUrl || activeMaterial.url)}
                      className={`w-full h-full border-none transition-opacity duration-500 opacity-100`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      sandbox="allow-scripts allow-same-origin allow-presentation"
                      onContextMenu={(e) => e.preventDefault()}
                    />
                    {/* Invisible overlay over the top bar to block clicks on video title/channel profile */}
                    <div className="absolute top-0 left-0 right-0 h-[80px] bg-transparent z-10 cursor-default" />
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
