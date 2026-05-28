import { motion } from 'motion/react';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { Lock, BookOpen, Video, Trophy, Flame, ArrowLeft, Clock, Check, Sparkles, ChevronRight, GraduationCap, PlayCircle, Loader, RefreshCw } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, getDocs, doc, updateDoc, setDoc, getDoc, serverTimestamp, addDoc, where, onSnapshot } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useNavigate, Link } from 'react-router-dom';
import ReactPlayer from 'react-player';
import { CustomVideoPlayer } from '../components/CustomVideoPlayer';
import SecurePdfViewer from '../components/SecurePdfViewer';
import { FloatingStickers } from '../components/FloatingStickers';

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
  const { user, loading: authLoading, setUser } = useAuthStore();
  const { settings } = useSettingsStore();

  const [deviceBlock, setDeviceBlock] = useState<boolean>(false);
  const [activeDevices, setActiveDevices] = useState<any[]>([]);
  const [currentDeviceId, setCurrentDeviceId] = useState<string>('');

  const registerMyDevice = async (devId: string) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'active_devices'), {
        userId: user.uid,
        deviceId: devId,
        deviceModel: navigator.userAgent.includes('Mobile') ? 'Mobile Smartphone' : 'Desktop Browser',
        userAgent: navigator.userAgent,
        ipAddress: "157.34.12.98", // Simulated secure IP
        lastActive: serverTimestamp(),
        createdAt: serverTimestamp(),
        status: 'active'
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'active_devices');
    }
    try {
      await addDoc(collection(db, 'login_history'), {
        userId: user.uid,
        email: user.email,
        deviceId: devId,
        ipAddress: "157.34.12.98",
        timestamp: serverTimestamp(),
        deviceModel: navigator.userAgent.includes('Mobile') ? 'Mobile Smartphone' : 'Desktop Browser',
        status: 'success'
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'login_history');
    }
  };

  const updateDeviceActive = async (docId: string) => {
    try {
      await updateDoc(doc(db, 'active_devices', docId), {
        lastActive: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `active_devices/${docId}`);
    }
  };

  const handleKickDevice = async (sessionDocId: string) => {
    try {
      await updateDoc(doc(db, 'active_devices', sessionDocId), {
        status: 'forced_out',
        lastActive: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `active_devices/${sessionDocId}`);
    }
  };

  // Real-time device synchronization effect
  useEffect(() => {
    if (!user) return;
    
    let devId = localStorage.getItem('nucleus_secure_device_id');
    if (!devId) {
      devId = 'dev_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
      localStorage.setItem('nucleus_secure_device_id', devId);
    }
    setCurrentDeviceId(devId);

    let lastUpdateTime = 0;

    const q = query(collection(db, 'active_devices'), where('userId', '==', user.uid));
    const unsubSessions = onSnapshot(q, (snap) => {
      const devices = snap.docs.map(gdoc => ({ id: gdoc.id, ...gdoc.data() as any }));
      const activeList = devices.filter((d: any) => d.status === 'active');
      setActiveDevices(activeList);

      const myDeviceRecord = devices.find((d: any) => d.deviceId === devId);
      
      const isMyDeviceActive = activeList.some((d: any) => d.deviceId === devId);
      
      // Device rate/concurrency limitations are disabled for free, unlimited access
      setDeviceBlock(false);

      if (!isMyDeviceActive) {
        lastUpdateTime = Date.now();
        registerMyDevice(devId);
      } else {
        if (myDeviceRecord) {
          const now = Date.now();
          // Rate-limit the heartbeat update to once every 60 seconds to prevent infinite write-trigger-update loop
          if (now - lastUpdateTime > 60000) {
            lastUpdateTime = now;
            updateDeviceActive(myDeviceRecord.id);
          }
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'active_devices');
    });

    return () => unsubSessions();
  }, [user?.uid, settings?.secMaxDeviceLimit]);

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
  
  const [activeDashboardPricingCard, setActiveDashboardPricingCard] = useState<string>('lectures');
  const dashboardPricingContainerRef = useRef<HTMLDivElement | null>(null);

  const handleDashboardPricingScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (window.innerWidth >= 768) return;
    const container = e.currentTarget;
    const children = Array.from(container.children) as HTMLElement[];
    const cardChildren = children.filter(child => child.id && child.id.endsWith('-dashboard-pricing-card'));
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
      if (matchedPlan !== activeDashboardPricingCard) {
        setActiveDashboardPricingCard(matchedPlan);
      }
    }
  };

  const scrollDashboardToPlan = (plan: string) => {
    setActiveDashboardPricingCard(plan);
    if (!dashboardPricingContainerRef.current) return;
    const container = dashboardPricingContainerRef.current;
    
    const children = Array.from(container.children).filter(
      (c) => (c as HTMLElement).id && (c as HTMLElement).id.endsWith('-dashboard-pricing-card')
    ) as HTMLElement[];
    const plans = ['notes', 'lectures', 'premium'];
    const index = plans.indexOf(plan);
    
    if (index !== -1 && children[index]) {
      const child = children[index];
      const containerWidth = container.offsetWidth;
      const childWidth = child.offsetWidth;
      const scrollToLeft = child.offsetLeft - (containerWidth - childWidth) / 2;
      container.scrollTo({
        left: scrollToLeft,
        behavior: 'smooth'
      });
    }
  };
  
  const userTier = user ? planTiers[user.planId as keyof typeof planTiers] : 0;
  
  useEffect(() => {
    if (user && !user.classGroup) {
      if (localStorage.getItem(`hasSeenClassSetup_${user.uid}`) !== 'true') {
        setShowClassSetup(true);
      }
    } else if (user?.classGroup) {
      setSelectedClassGroup(user.classGroup);
      setSetupClassGroup(user.classGroup);
    }
  }, [user?.uid, user?.classGroup]);

  const handleCloseClassSetup = (open: boolean) => {
    if (!open && user) {
      localStorage.setItem(`hasSeenClassSetup_${user.uid}`, 'true');
      setShowClassSetup(false);
    }
  };

  const handleSaveClass = async () => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid), {
        classGroup: setupClassGroup,
        updatedAt: serverTimestamp()
      }, { merge: true });
      localStorage.setItem(`hasSeenClassSetup_${user.uid}`, 'true');
      
      // Update local authStore state instantly so changes display right away
      setUser({
        ...user,
        classGroup: setupClassGroup
      });
      
      setSelectedClassGroup(setupClassGroup);
      setShowClassSetup(false);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${user.uid}`);
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
    }).catch(err => {
      handleFirestoreError(err, OperationType.GET, 'settings/global');
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
    if (!authLoading && !user) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchMaterials = async () => {
      const hasUnlocked = user?.unlockedMaterials && user.unlockedMaterials.length > 0;
      // If guest and has no explicitly unlocked materials, don't fetch or show materials
      if (isGuest && !hasUnlocked) {
        setLoading(false);
        return;
      }
      try {
        const q = query(collection(db, 'materials'));
        const snapshot = await getDocs(q);
        const mats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMaterials(mats);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'materials');
      } finally {
        setLoading(false);
      }
    };
    fetchMaterials();
  }, [isGuest, user?.unlockedMaterials?.join(',')]);

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
      setDoc(doc(db, 'users', user.uid), updates, { merge: true }).catch((error) => {
        handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
      });
    }
  }, [user?.uid]); // Intentionally not deeply depending on user to avoid loops

  useEffect(() => {
    if (!selectedMaterial || !user) {
      setSecureUrl('');
      return;
    }
    const hasSpecificAccess = user?.unlockedMaterials?.includes(selectedMaterial.id);
    const hasFullAccess = user?.role === 'admin' || user?.role === 'superadmin';
    const hasAccess = hasSpecificAccess || hasFullAccess;
    
    if (hasAccess) {
      setFetchingUrl(true);
      if (selectedMaterial.url) {
        // Fallback for un-migrated materials that still have URL publicly exposed
        setSecureUrl(selectedMaterial.url);
        setFetchingUrl(false);
      } else {
        getDoc(doc(db, 'materials_secure', selectedMaterial.id)).then((d) => {
          if (d.exists()) {
            setSecureUrl(d.data().url);
          }
        }).catch(err => {
          handleFirestoreError(err, OperationType.GET, `materials_secure/${selectedMaterial.id}`);
        }).finally(() => {
          setFetchingUrl(false);
        });
      }
    }
  }, [selectedMaterial?.id, selectedMaterial?.url, user?.uid, user?.role, user?.unlockedMaterials?.join(',')]);

  useEffect(() => {
    if (!selectedMaterial || !user) return;
    const hasSpecificAccess = user?.unlockedMaterials?.includes(selectedMaterial.id);
    const hasFullAccess = user?.role === 'admin' || user?.role === 'superadmin';
    const hasAccess = hasSpecificAccess || hasFullAccess;
    
    if (!hasAccess) return;

    // Fast simulation: 1 second = 1 minute of study time, goal 60 mins.
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
           setDoc(doc(db, 'users', user.uid), updates, { merge: true }).catch((error) => {
              handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
           });
        }
        
        return newMins;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [selectedMaterial?.id, userTier, user?.lastStreakDate, user?.streak, user?.uid, user?.unlockedMaterials?.join(',')]);

  if (!user) return <div className="min-h-screen"></div>;

  if (deviceBlock) {
    return (
      <div className="min-h-screen pt-28 pb-32 px-4 md:px-12 flex items-center justify-center bg-background text-foreground select-none relative overflow-hidden">
        {/* Decorative Grid Panel background */}
        <div className="absolute inset-0 bg-[radial-gradient(var(--border-color)_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none opacity-30" />
        
        <div className="w-full max-w-xl p-8 md:p-10 border border-border-color bg-card rounded-3xl relative z-10 shadow-lg text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-accent-primary/10 border-2 border-accent-primary flex items-center justify-center mx-auto text-accent-primary animate-pulse">
            <Lock className="w-7 h-7" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-display font-black uppercase tracking-tight text-text-primary">
              Device Limit Exceeded
            </h2>
            <p className="text-accent-primary font-mono text-xs uppercase tracking-widest font-black">
              DRM Active Protection Protocol
            </p>
          </div>

          <p className="text-text-secondary text-xs leading-relaxed max-w-md mx-auto">
            Your premium educational access allows you to stream courses on up to <span className="text-accent-primary font-bold">{settings.secMaxDeviceLimit || 2}</span> devices concurrently. To verify accountability, you must drop an active device session below to authorize this browser node.
          </p>

          {/* Active device lists with Kick Actions */}
          <div className="border border-border-color rounded-2xl bg-bg-secondary/40 overflow-hidden divide-y divide-border-color text-left max-h-[220px] overflow-y-auto">
            {activeDevices.map((dev: any) => {
              const isMe = dev.deviceId === currentDeviceId;
              return (
                <div key={dev.id} className="p-4 flex items-center justify-between text-xs gap-2">
                  <div className="space-y-1 truncate">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-text-primary font-sans">{dev.deviceModel || 'Unknown Device'}</span>
                      {isMe && <span className="px-1.5 py-0.5 rounded-md bg-accent-primary/10 text-accent-primary text-[8px] font-black font-mono uppercase">This Browser</span>}
                    </div>
                    <p className="text-text-muted text-[10px] font-mono flex items-center gap-1.5">
                      <span>IP: {dev.ipAddress || '127.0.0.1'}</span>
                    </p>
                  </div>

                  <button
                    onClick={() => handleKickDevice(dev.id)}
                    className="shrink-0 px-3 py-2 text-[10px] font-mono font-black uppercase tracking-wider rounded-lg bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 active:scale-[0.97] transition-all cursor-pointer"
                  >
                    Terminate
                  </button>
                </div>
              );
            })}
            
            {activeDevices.length === 0 && (
              <div className="p-6 text-center text-zinc-500 text-xs font-mono">
                No active device registered. Checking status...
              </div>
            )}
          </div>

          <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest flex items-center justify-center gap-1.5">
            <span>Security ID: {currentDeviceId.slice(0, 12)}...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, filter: 'blur(5px)' }}
      animate={{ opacity: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, filter: 'blur(5px)' }}
      transition={{ duration: 0.5 }}
      className="min-h-screen pt-24 pb-32 px-4 md:px-12 max-w-7xl mx-auto relative"
    >
      <FloatingStickers />

      <div className="flex items-center justify-between mb-8">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors text-sm font-bold"
        >
          <ArrowLeft className="w-4 h-4 text-accent-primary" />
          <span>Back to Home</span>
        </Link>
        
        <div className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-accent-primary/10 text-accent-primary text-xs font-black">
          <GraduationCap className="w-3.5 h-3.5" />
          <span>STUDENT DASHBOARD</span>
        </div>
      </div>

      {/* Modern Greeting & Stats Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-10 bg-glass-bg border border-border-color p-6 md:p-8"
        style={{ borderRadius: 'var(--theme-card-radius, 32px)' }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          
          {/* Welcome profile section */}
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-full border-2 border-accent-primary/50 overflow-hidden bg-bg-secondary flex-shrink-0 flex items-center justify-center p-0.5 shadow-md">
              <div className="w-full h-full rounded-full overflow-hidden bg-bg-primary flex items-center justify-center">
                {user.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt={user.displayName} 
                    className="w-full h-full object-cover rounded-full" 
                    referrerPolicy="no-referrer" 
                  />
                ) : (
                  <div className="text-xl font-bold text-accent-primary capitalize">
                    {user.displayName ? user.displayName.charAt(0) : user.email.charAt(0)}
                  </div>
                )}
              </div>
            </div>
            <div className="text-left">
              <h1 className="text-2xl md:text-3.5xl font-display font-black tracking-tight text-text-primary mb-1 flex items-center gap-2">
                <span>Hello, {user.displayName?.split(' ')[0] || 'Friend'}!</span>
                <span className="animate-bounce">👋</span>
              </h1>
              <p className="text-sm text-text-secondary font-medium">
                {isGuest 
                  ? 'Your student authorization is pending admin review.' 
                  : 'Ready to master your chapters today? Let\'s dive in!'}
              </p>
            </div>
          </div>
          
          {/* Bento-style Stats cards */}
          {!isGuest && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:w-auto">
              {/* Stat 1: Study Streak */}
              <div className="px-5 py-3.5 rounded-2xl bg-bg-secondary/60 border border-border-color/80 flex items-center gap-3 text-left">
                <div className="p-2.5 rounded-2xl bg-[#ff8a9e]/10 text-[#ff8a9e]">
                  <Flame className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <p className="text-[10px] text-text-muted font-bold tracking-wider uppercase leading-none mb-1">Study Streak</p>
                  <p className="text-lg font-black text-text-primary leading-none">{user.streak || 0} Days</p>
                </div>
              </div>
              
              {/* Stat 2: Daily Timer Progression */}
              <div className="px-5 py-3.5 rounded-2xl bg-bg-secondary/60 border border-border-color/80 flex items-center gap-3 text-left relative overflow-hidden">
                <div 
                  className="absolute left-0 top-0 bottom-0 bg-accent-primary/5 transition-all duration-500 ease-out" 
                  style={{ width: `${Math.min(100, (studyMinutes / 60) * 100)}%` }}
                />
                <div className="p-2.5 rounded-2xl bg-accent-primary/10 text-accent-primary z-10">
                  <Clock className="w-5 h-5" />
                </div>
                <div className="z-10">
                  <p className="text-[10px] text-text-muted font-bold tracking-wider uppercase leading-none mb-1">Today's Focus</p>
                  <p className="text-lg font-black text-text-primary leading-none">
                    {studyMinutes >= 60 ? 'Goal Met! 👑' : `${studyMinutes} / 60 m`}
                  </p>
                </div>
              </div>

              {/* Stat 3: Study Batch Group */}
              <div 
                onClick={() => {
                  setSetupClassGroup(user.classGroup || '11');
                  setShowClassSetup(true);
                }}
                className="px-5 py-3.5 rounded-2xl bg-bg-secondary/60 border border-border-color/80 flex items-center gap-3 text-left hover:border-accent-primary/55 hover:bg-bg-secondary cursor-pointer transition-all duration-200 group relative"
                title="Click to select or modify Class details"
              >
                <div className="p-2.5 rounded-2xl bg-amber-400/10 text-amber-500 group-hover:bg-amber-400/20 transition-colors">
                  <Trophy className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-[10px] text-text-muted font-bold tracking-wider uppercase leading-none">Study Batch</p>
                    <span className="text-[9px] font-black uppercase text-accent-primary bg-accent-primary/10 px-1 py-0.5 rounded border border-accent-primary/15 tracking-wide">Edit</span>
                  </div>
                  <p className="text-lg font-black text-text-primary leading-none capitalize mt-1 text-[#F15A29]">
                    {user.classGroup === 'all' || !user.classGroup ? 'All Classes' : `Class ${user.classGroup}`}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Main Grid View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">
        
        {/* Left Side: Course lessons list */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl md:text-2xl font-display font-black text-text-primary">{settings.syllabusSectionName || "Curriculum Course Materials"}</h2>
              <p className="text-xs text-text-secondary font-medium mt-1">Select chapters below to load video content and study guides.</p>
            </div>
            
            {/* Soft, beautiful filter buttons row */}
            <div className="flex flex-col sm:items-end gap-2.5">
              <div className="flex flex-wrap items-center gap-1 bg-glass-bg p-1.5 rounded-2xl border border-border-color shrink-0 self-start sm:self-auto">
                  {['all', '6', '7', '8', '9', '10', '11', '12', 'dropper'].map((clsKey) => (
                    <button 
                      key={clsKey}
                      onClick={() => setSelectedClassGroup(clsKey)} 
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        selectedClassGroup === clsKey 
                          ? 'bg-accent-primary text-button-text shadow-sm' 
                          : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                      }`}
                    >
                      {clsKey === 'all' ? 'All' : clsKey}
                    </button>
                  ))}
              </div>

              {user && selectedClassGroup !== 'all' && selectedClassGroup !== user.classGroup && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={async () => {
                    try {
                      await setDoc(doc(db, 'users', user.uid), {
                        classGroup: selectedClassGroup,
                        updatedAt: serverTimestamp()
                      }, { merge: true });
                      setUser({
                        ...user,
                        classGroup: selectedClassGroup
                      });
                    } catch (e) {
                      handleFirestoreError(e, OperationType.UPDATE, `users/${user.uid}`);
                    }
                  }}
                  className="px-3.5 py-1.5 rounded-xl text-[10px] uppercase font-black tracking-widest bg-[#F15A29]/15 text-[#F15A29] hover:bg-[#F15A29] hover:text-black border border-[#F15A29]/30 transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-auto shadow-sm"
                >
                  <span>Save Class {selectedClassGroup === 'dropper' ? 'Dropper' : selectedClassGroup} as My Batch</span>
                  <span>💾</span>
                </motion.button>
              )}
            </div>
          </div>
          
          {/* Materials Showcase lists */}
          {isGuest && (!user?.unlockedMaterials || user.unlockedMaterials.length === 0) ? (
            <div 
              className="text-center py-16 bg-glass-bg border border-border-color text-text-secondary flex flex-col items-center justify-center gap-3"
              style={{ borderRadius: 'var(--theme-card-radius, 28px)' }}
            >
              <div className="w-14 h-14 bg-red-400/10 text-red-400 border border-red-400/20 rounded-full flex items-center justify-center text-xl">
                <Lock className="w-6 h-6 animate-pulse" />
              </div>
              <h3 className="text-lg font-bold text-text-primary">Ecosystem Materials Locked</h3>
              <p className="text-sm text-text-muted max-w-sm mx-auto font-medium">
                Your guest profile does not possess study course items. Kindly request promotion from the administrator panel to proceed.
              </p>
            </div>
          ) : loading ? (
             <div className="space-y-4">
               {[1,2,3].map((i) => (
                 <div 
                   key={i} 
                   className="w-full h-24 rounded-2xl bg-bg-secondary/40 border border-border-color animate-pulse flex items-center p-5 gap-4"
                 >
                   <div className="w-12 h-12 bg-border-color/60 rounded-xl" />
                   <div className="space-y-2 flex-1">
                     <div className="h-4 bg-border-color/60 rounded-full w-1/3" />
                     <div className="h-3 bg-border-color/60 rounded-full w-1/2" />
                   </div>
                   <div className="w-16 h-8 bg-border-color/60 rounded-full" />
                 </div>
               ))}
             </div>
          ) : (
            (() => {
              const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
              const filtered = materials.filter(m => {
                if (m.isHidden && !isAdmin) return false;
                return selectedClassGroup === 'all' || m.classGroup === selectedClassGroup || !m.classGroup || user?.unlockedMaterials?.includes(m.id);
              });
              
              if (filtered.length === 0) {
                return (
                  <div 
                    className="text-center py-16 bg-glass-bg border border-border-color text-text-secondary w-full"
                    style={{ borderRadius: 'var(--theme-card-radius, 24px)' }}
                  >
                    No study materials found matching this batch filter. Check back shortly!
                  </div>
                );
              }
              
              // Group materials by section
              const sectionsMap: { [section: string]: any[] } = {};
              filtered.forEach(m => {
                const sec = m.section || 'General Curriculum';
                if (!sectionsMap[sec]) {
                  sectionsMap[sec] = [];
                }
                sectionsMap[sec].push(m);
              });
              
              return (
                <div className="space-y-10 w-full">
                  {Object.entries(sectionsMap).map(([sectionName, sectionMats]) => (
                    <div key={sectionName} className="space-y-4">
                      {/* Section Separator & Heading */}
                      <div className="flex items-center gap-3 pt-2">
                        <h4 className="font-display font-black text-xs uppercase tracking-widest text-accent-primary bg-accent-primary/10 px-3.5 py-1.5 rounded-xl border border-border-color/40 shadow-sm">
                          {sectionName}
                        </h4>
                        <div className="h-[1px] flex-1 bg-gradient-to-r from-border-color/85 to-transparent" />
                      </div>
                      
                      {/* Materials Cards inside this Section */}
                      <div className="space-y-4">
                        {sectionMats.map((mat) => {
                          const hasSpecificAccess = user?.unlockedMaterials?.includes(mat.id);
                          const hasFullAccess = isAdmin;
                          const isLocked = !hasSpecificAccess && !hasFullAccess;
                          
                          return (
                            <motion.div 
                              key={mat.id}
                              onClick={() => setSelectedMaterial(mat)}
                              initial={{ opacity: 0, y: 10 }}
                              whileInView={{ opacity: 1, y: 0 }}
                              viewport={{ once: true }}
                              whileHover={{ y: -4, scale: 1.01, boxShadow: "0 10px 25px rgba(241, 90, 41, 0.05)" }}
                              whileTap={{ scale: 0.99 }}
                              transition={{ type: "spring", stiffness: 380, damping: 30 }}
                              className={`group relative overflow-hidden p-3.5 sm:p-5 flex flex-col xs:flex-row items-stretch xs:items-center gap-4 sm:gap-5 bg-glass-bg border border-border-color hover:border-accent-primary/40 cursor-pointer shadow-sm transition-colors duration-200`}
                              style={{ borderRadius: 'var(--theme-card-radius, 24px)' }}
                            >
                              {/* Soft visual glow plat */}
                              <div className="absolute inset-0 bg-gradient-to-r from-accent-primary/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                              {mat.thumbnailUrl ? (
                                <div className="w-full xs:w-20 h-32 xs:h-20 shrink-0 rounded-2xl overflow-hidden bg-bg-secondary relative border border-border-color/40">
                                  <img src={mat.thumbnailUrl} alt={mat.title} className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                                </div>
                              ) : (
                                <div className={`p-4 rounded-2xl self-start xs:self-auto shrink-0 transition-colors duration-300 ${
                                  mat.type === 'note' 
                                    ? 'bg-[#ff8a9e]/10 text-[#ff8a9e]' 
                                    : 'bg-accent-primary/10 text-accent-primary'
                                }`}>
                                  {mat.type === 'note' ? <BookOpen className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                                </div>
                              )}

                              <div className="flex-1 min-w-0 pr-2 text-left">
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                  <h3 className="font-display font-black text-base sm:text-lg text-text-primary truncate group-hover:text-accent-primary transition-colors">
                                    {mat.title}
                                  </h3>
                                  {mat.type === 'note' ? (
                                    <span className="shrink-0 text-[8px] font-extrabold uppercase bg-sky-100 dark:bg-sky-500/10 text-sky-600 dark:text-sky-300 px-2 py-0.5 rounded-md">Note</span>
                                  ) : (
                                    <span className="shrink-0 text-[8px] font-extrabold uppercase bg-[#ff839a]/10 text-[#ff839a] px-2 py-0.5 rounded-md">Video</span>
                                  )}
                                  {mat.isHidden && (
                                    <span className="shrink-0 text-[8px] font-extrabold uppercase bg-red-400/20 text-red-400 px-2 py-0.5 rounded-md">Hidden</span>
                                  )}
                                </div>
                                <p className="text-xs font-semibold text-text-secondary line-clamp-2 leading-relaxed">
                                  {mat.description || 'Access notes, conceptual materials, or helpful guidelines to reinforce learning.'}
                                </p>
                              </div>
                              
                              {isLocked ? (
                                <div className="flex flex-row xs:flex-col items-center xs:items-end justify-between xs:justify-center gap-1.5 shrink-0 bg-red-400/5 border border-red-400/10 p-2.5 rounded-2xl w-full xs:w-auto mt-2 xs:mt-0">
                                   <div className="p-1 px-1.5 rounded-lg bg-red-500/15 text-red-500">
                                     <Lock className="w-3.5 h-3.5" />
                                   </div>
                                   <span className="text-[8px] font-black text-red-400 uppercase tracking-widest font-mono">Locked</span>
                                </div>
                              ) : (
                                 <div className="self-end xs:self-auto shrink-0 flex items-center justify-center p-3 rounded-full bg-accent-primary/10 hover:bg-accent-primary text-accent-primary hover:text-button-text group-hover:scale-105 transition-all duration-300 mt-2 xs:mt-0">
                                   <PlayCircle className="w-6 h-6 fill-current" />
                                 </div>
                              )}
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()
          )}
        </div>
        
        {/* Right Side Sidebar widgets */}
        <div className="lg:col-span-4 space-y-6">
           
           {/* Widget 1: Elite premium subscription upgrade banner */}
           <div 
             className="p-6 bg-gradient-to-br from-accent-primary/15 via-amber-400/[0.02] to-transparent border border-accent-primary/30 relative overflow-hidden shadow-sm"
             style={{ borderRadius: 'var(--theme-card-radius, 28px)' }}
           >
             <div className="absolute -top-3 -right-3 w-28 h-28 bg-accent-primary/10 rounded-full blur-2xl pointer-events-none" />
             
             <div className="flex items-center gap-2 text-accent-primary font-black text-xs uppercase tracking-wider mb-3">
               <Sparkles className="w-4 h-4 text-accent-primary animate-pulse" />
               <span>PREMIUM ADVANTAGE</span>
             </div>
             
             <h3 className="font-display text-xl font-black text-text-primary mb-2">Acquire Academic Elite</h3>
             <p className="text-xs font-semibold text-text-secondary mb-6 leading-relaxed">
               Gain instant classroom clearance for video lectures, syllabus note compilations, 1-on-1 counselor guidance, and high mock test setups.
             </p>
             
             <button 
               onClick={() => setViewingPlans(true)} 
               className="theme-btn-themed w-full py-3.5 bg-accent-primary text-button-text font-bold uppercase tracking-wider text-xs shadow-md hover:scale-[1.02] transition-transform cursor-pointer"
               style={{ borderRadius: 'var(--theme-btn-radius, 9999px)' }}
             >
               Explore Term Plans
             </button>
           </div>

           {/* Widget 2: Continuous Live Goal Assist tracker */}
           <div 
             className="p-6 bg-glass-bg border border-border-color"
             style={{ borderRadius: 'var(--theme-card-radius, 28px)' }}
           >
             <h4 className="font-display font-black text-base text-text-primary mb-4 flex items-center gap-2">
               <Flame className="w-4 h-4 text-[#ff8a9e]" />
               <span>Today's Learning Target</span>
             </h4>

             <div className="space-y-4">
               <div className="flex justify-between items-center text-xs">
                 <span className="text-text-secondary font-semibold">Active Minutes Logged</span>
                 <span className="text-accent-primary font-bold">{studyMinutes} mins</span>
               </div>
               
               {/* Progress circular bar line simulated */}
               <div className="h-3.5 rounded-full bg-bg-secondary border border-border-color overflow-hidden p-0.5">
                  <div 
                    className="h-full bg-gradient-to-r from-[#ff839a] to-accent-primary rounded-full transition-all duration-300" 
                    style={{ width: `${Math.min(100, (studyMinutes / 60) * 100)}%` }}
                  />
               </div>

               <p className="text-[10px] text-text-muted font-medium italic leading-relaxed text-left">
                 TIP: Simulating study progress live. Opening any lessons secures automatic timers incrementing streak days when 60 minutes are met.
               </p>
             </div>
           </div>

        </div>
      </div>

      {/* Upgrades Plan Modal Dialog */}
      <Dialog open={viewingPlans} onOpenChange={setViewingPlans}>
        <DialogContent className="sm:max-w-[850px] top-[46%] md:top-1/2 max-h-[92vh] overflow-y-auto bg-bg-primary border border-border-color text-text-primary p-4 md:p-8 rounded-[24px] md:rounded-[32px]">
          {/* Back to Dashboard sign */}
          <div className="flex justify-start mb-1">
            <button 
              onClick={() => setViewingPlans(false)}
              className="inline-flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors text-xs font-bold uppercase tracking-wider cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-accent-primary" />
              <span>Back to Dashboard</span>
            </button>
          </div>

          <DialogHeader className="mb-4 md:mb-6 text-center">
            <DialogTitle className="text-xl md:text-3xl font-display font-black text-text-primary">
              Expand Your Learning Horizons
            </DialogTitle>
            <DialogDescription className="text-text-secondary text-xs md:text-sm font-semibold max-w-lg mx-auto mt-1 md:mt-2">
              Select an academy package. Make the final payment via safe UPI scan channels to secure instant authorization.
            </DialogDescription>
          </DialogHeader>
          
          <div 
            ref={dashboardPricingContainerRef}
            data-lenis-prevent
            onScroll={handleDashboardPricingScroll}
            className="flex flex-row overflow-x-auto md:grid md:grid-cols-3 gap-4 md:gap-8 max-w-5xl mx-auto items-stretch -mx-4 px-4 md:mx-0 md:px-0 pb-6 md:pb-10 scrollbar-none snap-x snap-mandatory w-full min-w-0"
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
              id="notes-dashboard-pricing-card"
              layout
              animate={{
                scale: activeDashboardPricingCard === 'notes' ? 1.04 : 0.94,
                opacity: activeDashboardPricingCard === 'notes' ? 1 : 0.7,
                borderColor: activeDashboardPricingCard === 'notes' ? 'var(--accent-primary, #e5d2a5)' : 'rgba(255,255,255,0.08)',
                boxShadow: activeDashboardPricingCard === 'notes' ? '0 15px 40px rgba(229, 210, 165, 0.2)' : '0 4px 12px rgba(0,0,0,0.1)',
                y: activeDashboardPricingCard === 'notes' ? -4 : 0,
              }}
              transition={{ type: 'spring', stiffness: 220, damping: 25 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => scrollDashboardToPlan('notes')}
              className="p-5 rounded-[20px] border bg-glass-bg flex flex-col justify-between cursor-pointer w-[74vw] max-w-[245px] md:w-auto shrink-0 md:shrink snap-center transition-colors duration-300 border-border-color"
            >
              <div>
                <span className="text-[9px] font-black uppercase text-[#ff8a9e] tracking-widest bg-[#ff8a9e]/10 px-2.5 py-1 rounded-md mb-4 inline-block">Study Docs</span>
                <h3 className="font-display font-black text-xl text-text-primary mb-1">High Grade Notes</h3>
                <p className="text-[11px] text-text-secondary font-medium leading-relaxed mb-4">Pure handwritten material for rapid revision cycles.</p>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-3xl font-black text-text-primary">₹{selectedClassGroup && settings.classPrices?.[selectedClassGroup]?.notes ? settings.classPrices[selectedClassGroup].notes : prices.notes}</span>
                  <span className="text-text-muted text-xs font-semibold">/full term</span>
                </div>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handlePayment('notes', selectedClassGroup && settings.classPrices?.[selectedClassGroup]?.notes ? settings.classPrices[selectedClassGroup].notes : prices.notes);
                }}
                className="w-full py-3 bg-glass-bg hover:bg-[#ff8a9e]/10 border border-border-color text-text-primary font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                Scan UPI Code
              </button>
            </motion.div>

            {/* Lectures Plan */}
            <motion.div 
              id="lectures-dashboard-pricing-card"
              layout
              animate={{
                scale: activeDashboardPricingCard === 'lectures' ? 1.04 : 0.94,
                opacity: activeDashboardPricingCard === 'lectures' ? 1 : 0.7,
                borderColor: activeDashboardPricingCard === 'lectures' ? 'var(--accent-primary, #e5d2a5)' : 'rgba(255,255,255,0.08)',
                boxShadow: activeDashboardPricingCard === 'lectures' ? '0 15px 40px rgba(229, 210, 165, 0.25)' : '0 4px 12px rgba(0,0,0,0.1)',
                y: activeDashboardPricingCard === 'lectures' ? -4 : 0,
              }}
              transition={{ type: 'spring', stiffness: 220, damping: 25 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => scrollDashboardToPlan('lectures')}
              className="p-5 rounded-[20px] border bg-glass-bg flex flex-col justify-between relative cursor-pointer w-[74vw] max-w-[245px] md:w-auto shrink-0 md:shrink snap-center transition-colors duration-300 border-border-color"
            >
              {activeDashboardPricingCard === 'lectures' && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent-primary text-button-text text-[9px] font-black px-4 py-1 rounded-full uppercase tracking-wider">
                  Full Choice
                </div>
              )}
              <div className="pt-2">
                <span className="text-[9px] font-black uppercase text-accent-primary tracking-widest bg-accent-primary/10 px-2.5 py-1 rounded-md mb-4 inline-block font-mono">Lectures</span>
                <h3 className="font-display font-black text-xl text-accent-primary mb-1">Lectures Plan</h3>
                <p className="text-[11px] text-text-secondary font-medium leading-relaxed mb-4">Complete concept videos with peer help desk access.</p>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-3xl font-black text-text-primary">₹{selectedClassGroup && settings.classPrices?.[selectedClassGroup]?.lectures ? settings.classPrices[selectedClassGroup].lectures : prices.lectures}</span>
                  <span className="text-text-muted text-xs font-semibold">/full term</span>
                </div>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handlePayment('lectures', selectedClassGroup && settings.classPrices?.[selectedClassGroup]?.lectures ? settings.classPrices[selectedClassGroup].lectures : prices.lectures);
                }}
                className="w-full py-3 bg-accent-primary text-button-text font-bold text-xs uppercase tracking-wider rounded-xl transition-all hover:scale-[1.02] cursor-pointer"
              >
                Scan UPI Code
              </button>
            </motion.div>

            {/* Premium Plan */}
            <motion.div 
              id="premium-dashboard-pricing-card"
              layout
              animate={{
                scale: activeDashboardPricingCard === 'premium' ? 1.04 : 0.94,
                opacity: activeDashboardPricingCard === 'premium' ? 1 : 0.7,
                borderColor: activeDashboardPricingCard === 'premium' ? '#ff839a' : 'rgba(255,255,255,0.08)',
                boxShadow: activeDashboardPricingCard === 'premium' ? '0 15px 40px rgba(255,131,154,0.2)' : '0 4px 12px rgba(0,0,0,0.1)',
                y: activeDashboardPricingCard === 'premium' ? -4 : 0,
              }}
              transition={{ type: 'spring', stiffness: 220, damping: 25 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => scrollDashboardToPlan('premium')}
              className="p-5 rounded-[20px] border bg-glass-bg flex flex-col justify-between cursor-pointer w-[74vw] max-w-[245px] md:w-auto shrink-0 md:shrink snap-center transition-colors duration-300 border-border-color"
            >
              <div>
                <span className="text-[9px] font-black uppercase text-amber-500 tracking-widest bg-amber-500/10 px-2.5 py-1 rounded-md mb-4 inline-block">Personal Care</span>
                <h3 className="font-display font-black text-xl text-text-primary mb-1">Elite Premium</h3>
                <p className="text-[11px] text-text-secondary font-medium leading-relaxed mb-4">1-on-1 advisor matching for customized calendars and counseling.</p>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-3xl font-black text-text-primary">₹{selectedClassGroup && settings.classPrices?.[selectedClassGroup]?.premium ? settings.classPrices[selectedClassGroup].premium : prices.premium}</span>
                  <span className="text-text-muted text-xs font-semibold">/full term</span>
                </div>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handlePayment('premium', selectedClassGroup && settings.classPrices?.[selectedClassGroup]?.premium ? settings.classPrices[selectedClassGroup].premium : prices.premium);
                }}
                className="w-full py-3 bg-glass-bg hover:bg-white/5 border border-border-color text-text-primary font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                Scan UPI Code
              </button>
            </motion.div>

            {/* Right padding spacer on mobile */}
            <div className="w-[12px] md:hidden shrink-0" />
          </div>

          {/* Dialog Mobile Swipe Indicators */}
          <div className="flex md:hidden justify-center items-center gap-2.5 mt-2 mb-4 select-none">
            {['notes', 'lectures', 'premium'].map((plan, i) => {
              const isActive = activeDashboardPricingCard === plan;
              let dotActiveBg = 'bg-accent-primary';
              if (plan === 'premium') dotActiveBg = 'bg-[#ff839a]';
              
              return (
                <button
                  key={plan}
                  onClick={() => scrollDashboardToPlan(plan)}
                  className={`h-2.5 rounded-full transition-all duration-300 hover:opacity-100 cursor-pointer ${
                    isActive 
                      ? `${dotActiveBg} w-6 shadow-[0_0_12px_rgba(229,210,165,0.4)]` 
                      : 'bg-[#f2f2f2]/10 w-2.5 hover:bg-[#f2f2f2]/25'
                  }`}
                  aria-label={`Scroll to dashboard plan ${i + 1}`}
                />
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Personalized Class setup entry form */}
      <Dialog open={showClassSetup} onOpenChange={handleCloseClassSetup}>
        <DialogContent className="sm:max-w-[400px] bg-bg-primary border border-border-color text-text-primary rounded-3xl" showCloseButton={true}>
          <DialogHeader>
            <DialogTitle className="text-xl font-display font-black text-center flex items-center justify-center gap-1.5">
              <span>Choose Your Batch</span>
            </DialogTitle>
            <DialogDescription className="text-text-muted text-center text-xs font-semibold mt-1">
              Select your active grade below. We will customize your curriculum lesson catalog appropriately!
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2.5 mt-4">
            {['8', '9', '10', '11', '12', 'dropper'].map((clsNum) => (
              <button 
                key={clsNum}
                onClick={() => setSetupClassGroup(clsNum)} 
                className={`px-4 py-3 rounded-2xl border text-center font-bold text-xs uppercase tracking-widest transition-all cursor-pointer ${
                  setupClassGroup === clsNum 
                    ? 'bg-accent-primary/15 border-accent-primary text-accent-primary' 
                    : 'bg-transparent border-border-color text-text-secondary hover:bg-white/5'
                }`}
              >
                {clsNum === 'dropper' ? 'Dropper' : `Class ${clsNum}`}
              </button>
            ))}
          </div>
          <div className="mt-6">
            <button 
              onClick={handleSaveClass} 
              className="theme-btn-themed w-full py-3.5 bg-accent-primary text-button-text font-black text-xs uppercase tracking-widest shadow-md hover:scale-[1.01] cursor-pointer"
              style={{ borderRadius: 'var(--theme-btn-radius, 9999px)' }}
            >
              Configure Batch
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Material selection secure view */}
      <Dialog open={!!selectedMaterial} onOpenChange={(open) => !open && setSelectedMaterial(null)}>
        <DialogContent className="sm:max-w-[800px] bg-bg-primary border border-border-color text-text-primary p-0 overflow-hidden rounded-3xl student-secure-view">
          {activeMaterial && (
            <div className="text-left">
              <DialogHeader className="p-6 pb-4 border-b border-border-color/50">
                <DialogTitle className="text-xl font-display font-black text-text-primary flex items-center justify-between gap-4">
                  <span>{activeMaterial.title}</span>
                  {(!user?.unlockedMaterials?.includes(activeMaterial.id) && !(user?.role === 'admin' || user?.role === 'superadmin')) && (
                    <div className="flex items-center gap-1 bg-red-400/10 px-2.5 py-1.5 rounded-full text-red-500 text-[10px] font-bold">
                      <Lock className="w-3 h-3" />
                      Locked
                    </div>
                  )}
                </DialogTitle>
                <DialogDescription className="text-text-secondary text-xs font-semibold mt-1.5 leading-relaxed">
                  {activeMaterial.description || 'Watch step-by-step guidance lectures or review course summary materials.'}
                </DialogDescription>
              </DialogHeader>
  
              <div className={`w-full ${activeMaterial.type === 'note' ? 'bg-bg-secondary aspect-auto h-[60vh] md:h-[70vh]' : 'bg-bg-primary aspect-video p-6 pb-8'} relative flex items-center justify-center`}>
                {(!user?.unlockedMaterials?.includes(activeMaterial.id) && !(user?.role === 'admin' || user?.role === 'superadmin')) ? (
                  <div className="absolute inset-0 bg-bg-primary/95 backdrop-blur-md flex items-center justify-center flex-col p-8 text-center z-10 border-t border-border-color">
                    <div className="w-14 h-14 bg-red-400/15 border border-red-400/20 text-red-400 rounded-full flex items-center justify-center text-xl mb-4">
                      <Lock className="w-6 h-6 animate-pulse" />
                    </div>
                    <h3 className="text-xl font-display font-black text-text-primary mb-2">Study Docs Restricted</h3>
                    <p className="text-text-secondary text-xs font-semibold mb-6 max-w-sm">
                      We require active course purchase clearing before you may stream PDF notes or secure chapter lessons.
                    </p>
                    <button 
                      onClick={() => setSelectedMaterial(null)} 
                      className="px-6 py-2.5 rounded-full bg-border-color/80 hover:bg-border-color border border-border-color text-text-primary text-xs font-black uppercase tracking-wider cursor-pointer"
                    >
                      Close View
                    </button>
                  </div>
                ) : fetchingUrl && activeMaterial.type !== 'video' && activeMaterial.type !== 'lecture' ? (
                  <div className="flex flex-col items-center justify-center gap-3 p-8 bg-bg-secondary w-full h-full text-text-secondary font-bold text-xs">
                     <Loader className="w-6 h-6 animate-spin text-accent-primary" />
                     <span>Securing academic URL streams...</span>
                  </div>
                ) : (activeMaterial.type === 'video' || activeMaterial.type === 'lecture') || ReactPlayer.canPlay(secureUrl || activeMaterial.url) ? (
                  <CustomVideoPlayer url={secureUrl || activeMaterial.url} playing={!!selectedMaterial} />
                ) : (
                  <SecurePdfViewer url={secureUrl || activeMaterial.url} title={activeMaterial.title} />
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
