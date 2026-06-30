import { motion } from 'motion/react';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { Lock, BookOpen, Video, Trophy, Flame, ArrowLeft, Clock, Check, Sparkles, ChevronRight, GraduationCap, PlayCircle, Loader, RefreshCw, Folder, FolderOpen, Search, Download, Bookmark, FileText, Pencil, Trash2 } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, getDocs, doc, updateDoc, setDoc, getDoc, serverTimestamp, addDoc, where, onSnapshot, increment, deleteDoc } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useNavigate, Link } from 'react-router-dom';
import ReactPlayer from 'react-player';
import { CustomVideoPlayer } from '../components/CustomVideoPlayer';
import SecurePdfViewer from '../components/SecurePdfViewer';
import { FloatingStickers } from '../components/FloatingStickers';
import OrbitalLoader from '../components/OrbitalLoader';
import { Skeleton } from '../components/Skeleton';

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
  const navigate = useNavigate();

  const [toast, setToast] = useState<{ message: string; isError?: boolean } | null>(null);
  const showToast = (message: string, isError = false) => {
    setToast({ message, isError });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

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
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [chapters, setChapters] = useState<any[]>([]);
  const [mcqTests, setMcqTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Paid Batch states
  const [purchasedBatchIds, setPurchasedBatchIds] = useState<string[]>([]);
  const [showPurchaseBatchId, setShowPurchaseBatchId] = useState<string | null>(null);
  const [batchDashboardTab, setBatchDashboardTab] = useState<string>("subjects");
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [doubts, setDoubts] = useState<any[]>([]);
  const [isPaying, setIsPaying] = useState<boolean>(false);
  const [paymentSuccess, setPaymentSuccess] = useState<boolean>(false);
  const [doubtText, setDoubtText] = useState<string>("");
  const [newAnnouncementTitle, setNewAnnouncementTitle] = useState<string>("");
  const [newAnnouncementContent, setNewAnnouncementContent] = useState<string>("");
  const [replyDoubtId, setReplyDoubtId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<string>("");
  const [userUtr, setUserUtr] = useState<string>("");

  // Inline edit/delete dialog states
  const [inlineEditingBatch, setInlineEditingBatch] = useState<any | null>(null);
  const [inlineEditingSubject, setInlineEditingSubject] = useState<any | null>(null);
  const [inlineEditingChapter, setInlineEditingChapter] = useState<any | null>(null);
  const [inlineDeletingItem, setInlineDeletingItem] = useState<{ type: 'batch' | 'subject' | 'chapter'; id: string; name: string } | null>(null);

  // Folder routing states
  const [activeClassId, setActiveClassId] = useState<string | null>(null);
  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(null);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("Notes");
  const [studentSearchQuery, setStudentSearchQuery] = useState<string>("");
  const [recentlyViewed, setRecentlyViewed] = useState<string[]>([]);

  // Load recently viewed materials on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('nucleus_recently_viewed');
      if (saved) {
        setRecentlyViewed(JSON.parse(saved));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleInlineSaveBatch = async (updatedFields: any) => {
    if (!inlineEditingBatch) return;
    try {
      await updateDoc(doc(db, "classes", inlineEditingBatch.id), updatedFields);
      setInlineEditingBatch(null);
      showToast("Batch properties updated successfully!");
    } catch (err: any) {
      console.error(err);
      showToast(`Failed to update batch: ${err.message || err}`, true);
    }
  };

  const handleInlineSaveSubject = async (name: string, isHidden: boolean) => {
    if (!inlineEditingSubject) return;
    try {
      await updateDoc(doc(db, "subjects", inlineEditingSubject.id), {
        subjectName: name,
        isHidden
      });
      setInlineEditingSubject(null);
      showToast("Subject properties updated successfully!");
    } catch (err: any) {
      console.error(err);
      showToast(`Failed to update subject: ${err.message || err}`, true);
    }
  };

  const handleInlineSaveChapter = async (name: string) => {
    if (!inlineEditingChapter) return;
    try {
      await updateDoc(doc(db, "chapters", inlineEditingChapter.id), {
        chapterName: name
      });
      setInlineEditingChapter(null);
      showToast("Chapter properties updated successfully!");
    } catch (err: any) {
      console.error(err);
      showToast(`Failed to update chapter: ${err.message || err}`, true);
    }
  };

  const handleInlineDelete = async () => {
    if (!inlineDeletingItem) return;
    const { type, id, name } = inlineDeletingItem;
    try {
      if (type === 'batch') {
        await deleteDoc(doc(db, "classes", id));
        // Cascade subjects
        const subs = subjects.filter(s => s.classId === id);
        for (const s of subs) {
          await deleteDoc(doc(db, "subjects", s.id));
        }
        // Cascade chapters
        const chaps = chapters.filter(c => c.classId === id);
        for (const c of chaps) {
          await deleteDoc(doc(db, "chapters", c.id));
        }
        // Cascade materials
        const mats = materials.filter(m => m.classId === id);
        for (const m of mats) {
          await deleteDoc(doc(db, "materials", m.id));
        }
        if (activeClassId === id) {
          setActiveClassId(null);
          setActiveSubjectId(null);
          setActiveChapterId(null);
        }
      } else if (type === 'subject') {
        await deleteDoc(doc(db, "subjects", id));
        // Cascade chapters
        const chaps = chapters.filter(c => c.subjectId === id);
        for (const c of chaps) {
          await deleteDoc(doc(db, "chapters", c.id));
        }
        // Cascade materials
        const mats = materials.filter(m => m.subjectId === id);
        for (const m of mats) {
          await deleteDoc(doc(db, "materials", m.id));
        }
        if (activeSubjectId === id) {
          setActiveSubjectId(null);
          setActiveChapterId(null);
        }
      } else if (type === 'chapter') {
        await deleteDoc(doc(db, "chapters", id));
        // Cascade materials
        const mats = materials.filter(m => m.chapterId === id);
        for (const m of mats) {
          await deleteDoc(doc(db, "materials", m.id));
        }
        if (activeChapterId === id) {
          setActiveChapterId(null);
        }
      }
      showToast(`${name} deleted successfully!`);
      setInlineDeletingItem(null);
    } catch (err: any) {
      console.error(err);
      showToast(`Failed to delete: ${err.message || err}`, true);
    }
  };

  // Auto-switch active category if it gets hidden for the active subject
  useEffect(() => {
    if (activeSubjectId) {
      const activeSubjItem = subjects.find(s => s.id === activeSubjectId);
      const hiddenCategories = activeSubjItem?.hiddenCategories || [];
      const isUserAdmin = user?.role === 'admin' || user?.role === 'superadmin';
      
      const allTabs = ['Notes', 'PYQs', 'Assignments', 'DPPs', 'Videos', 'Formula Sheets', 'Tests'];
      const visibleTabs = allTabs.filter(tab => !hiddenCategories.includes(tab));
      
      if (visibleTabs.length > 0 && !visibleTabs.includes(activeCategory)) {
        setActiveCategory(visibleTabs[0]);
      }
    }
  }, [activeSubjectId, subjects, user?.role, activeCategory]);

  const handleViewMaterial = (mat: any) => {
    if (!mat?.url) return;
    try {
      // Add to recently viewed list
      const currentList = [mat.id, ...recentlyViewed.filter(id => id !== mat.id)].slice(0, 5);
      setRecentlyViewed(currentList);
      localStorage.setItem('nucleus_recently_viewed', JSON.stringify(currentList));
    } catch (e) {
      console.error(e);
    }
    setSelectedMaterial(mat);
  };

  const handleIncrementDownloadInDashboard = async (mat: any, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!mat?.url) return;
    try {
      await updateDoc(doc(db, 'materials', mat.id), {
        downloadCount: increment(1)
      });
      window.open(mat.url, '_blank');
    } catch (e) {
      console.error(e);
      window.open(mat.url, '_blank');
    }
  };

  const handleToggleBookmarkInDashboard = async (materialId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!user) {
      alert("Please login to bookmark material.");
      return;
    }
    try {
      const mat = materials.find(m => m.id === materialId);
      if (!mat) return;
      const userBookmarksArray = mat.bookmarks || [];
      let updatedBookmarks = [...userBookmarksArray];
      if (userBookmarksArray.includes(user.uid)) {
        updatedBookmarks = updatedBookmarks.filter(uid => uid !== user.uid);
      } else {
        updatedBookmarks.push(user.uid);
      }
      await updateDoc(doc(db, 'materials', materialId), {
        bookmarks: updatedBookmarks
      });
    } catch (e) {
      console.error(e);
    }
  };

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
      navigate('/select-standard');
    } else if (user?.classGroup) {
      setSelectedClassGroup(user.classGroup);
      setSetupClassGroup(user.classGroup);
    }
  }, [user?.uid, user?.classGroup, navigate]);

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

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  // Load Classes, Subjects, Chapters and Materials in Real-time (Synchronization)
  useEffect(() => {
    if (!user) return;

    setLoading(true);

    const unsubClasses = onSnapshot(collection(db, 'classes'), (snap) => {
      const classesList = snap.docs.map(gdoc => ({ id: gdoc.id, ...gdoc.data() as any }));
      // Sort classes by order if defined
      classesList.sort((a, b) => {
        if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
        return a.className.localeCompare(b.className);
      });
      setClasses(classesList);
    }, (error) => {
      console.error(error);
    });

    const unsubSubjects = onSnapshot(collection(db, 'subjects'), (snap) => {
      const subjectsList = snap.docs.map(gdoc => ({ id: gdoc.id, ...gdoc.data() as any }));
      subjectsList.sort((a, b) => {
        if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
        return a.subjectName.localeCompare(b.subjectName);
      });
      setSubjects(subjectsList);
    }, (error) => {
      console.error(error);
    });

    const unsubChapters = onSnapshot(collection(db, 'chapters'), (snap) => {
      const chaptersList = snap.docs.map(gdoc => ({ id: gdoc.id, ...gdoc.data() as any }));
      chaptersList.sort((a, b) => a.chapterName.localeCompare(b.chapterName));
      setChapters(chaptersList);
    }, (error) => {
      console.error(error);
    });

    const unsubMaterials = onSnapshot(collection(db, 'materials'), (snap) => {
      const matsList = snap.docs.map(gdoc => ({ id: gdoc.id, ...gdoc.data() as any }));
      setMaterials(matsList);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'materials');
      setLoading(false);
    });

    const unsubPurchases = onSnapshot(collection(db, 'purchases'), (snap) => {
      const ids = snap.docs
        .filter(doc => doc.data().userId === user.uid && (doc.data().status === 'completed' || doc.data().status === 'approved'))
        .map(doc => doc.data().batchId);
      setPurchasedBatchIds(ids);
    }, (error) => {
      console.error("Purchases sync error:", error);
    });

    const unsubAnnouncements = onSnapshot(collection(db, 'announcements'), (snap) => {
      const list = snap.docs.map(gdoc => ({ id: gdoc.id, ...gdoc.data() as any }));
      list.sort((a, b) => {
        const t1 = a.createdAt?.seconds || 0;
        const t2 = b.createdAt?.seconds || 0;
        return t2 - t1;
      });
      setAnnouncements(list);
    }, (error) => {
      console.error("Announcements sync error:", error);
    });

    const unsubDoubts = onSnapshot(collection(db, 'doubts'), (snap) => {
      const list = snap.docs.map(gdoc => ({ id: gdoc.id, ...gdoc.data() as any }));
      list.sort((a, b) => {
        const t1 = a.createdAt?.seconds || 0;
        const t2 = b.createdAt?.seconds || 0;
        return t2 - t1;
      });
      setDoubts(list);
    }, (error) => {
      console.error("Doubts sync error:", error);
    });

    const unsubMcqTests = onSnapshot(collection(db, 'mcq_tests'), (snap) => {
      const list = snap.docs.map(gdoc => ({ id: gdoc.id, ...gdoc.data() as any }));
      setMcqTests(list);
    }, (error) => {
      console.error("MCQ Tests sync error:", error);
    });

    return () => {
      unsubClasses();
      unsubSubjects();
      unsubChapters();
      unsubMaterials();
      unsubPurchases();
      unsubAnnouncements();
      unsubDoubts();
      unsubMcqTests();
    };
  }, [user?.uid]);

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
      getDoc(doc(db, 'materials_secure', selectedMaterial.id)).then((d) => {
        if (d.exists() && d.data().url) {
          setSecureUrl(d.data().url);
          setFetchingUrl(false);
        } else {
          // Fallback to live materials collection document
          getDoc(doc(db, 'materials', selectedMaterial.id)).then((mSnap) => {
            if (mSnap.exists()) {
              const mData = mSnap.data();
              setSecureUrl(mData.url || mData.fileUrl || '');
            } else {
              setSecureUrl('');
            }
          }).catch(err => {
            console.error("Dashboard.tsx fallback fetch error:", err);
            setSecureUrl(selectedMaterial.url || '');
          }).finally(() => {
            setFetchingUrl(false);
          });
        }
      }).catch(err => {
        console.error("Dashboard.tsx error fetching from materials_secure, trying backup:", err);
        // Backup live fetch from main details
        getDoc(doc(db, 'materials', selectedMaterial.id)).then((mSnap) => {
          if (mSnap.exists()) {
            const mData = mSnap.data();
            setSecureUrl(mData.url || mData.fileUrl || '');
          } else {
            setSecureUrl(selectedMaterial.url || '');
          }
        }).catch(fallbackErr => {
          console.error("Dashboard.tsx double fallback failure:", fallbackErr);
          setSecureUrl(selectedMaterial.url || '');
        }).finally(() => {
          setFetchingUrl(false);
        });
      });
    }
  }, [selectedMaterial?.id, user?.uid, user?.role, user?.unlockedMaterials?.join(',')]);

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
                  <p className="text-lg font-black text-text-primary leading-none capitalize mt-1 text-[#4F46E5]">
                    {user.classGroup === 'all' || !user.classGroup ? 'All Classes' : `Class ${user.classGroup}`}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>

  {/* Home Dashboard Integration & Bento Widgets */}
      <div className="mb-10 text-left">
        {/* Widget 2: Continue Learning */}
        <div className="bg-glass-bg border border-border-color p-6 rounded-3xl flex flex-col justify-between w-full">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                <Clock className="w-4 h-4" />
              </span>
              <h3 className="font-display font-black text-sm uppercase tracking-wider text-text-primary">Continue Learning</h3>
            </div>
            <p className="text-xs text-text-secondary mb-4">Pick up your recent modules or bookmarked files.</p>
          </div>
          <div className="space-y-2 max-h-[140px] overflow-y-auto custom-scrollbar">
            {materials.filter(m => user && (recentlyViewed.includes(m.id) || m.bookmarks?.includes(user.uid))).slice(0, 3).map((mat) => (
              <div
                key={mat.id}
                onClick={() => setSelectedMaterial(mat)}
                className="p-2 rounded-xl bg-bg-secondary/40 border border-border-color/60 flex items-center justify-between gap-3 text-xs hover:border-accent-primary/30 cursor-pointer group"
              >
                <div className="truncate text-left flex-1">
                  <p className="font-bold text-text-primary group-hover:text-accent-primary transition-colors truncate">{mat.title}</p>
                  <p className="text-[10px] text-text-muted capitalize">{mat.materialType || mat.type || 'study guide'}</p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-text-muted shrink-0" />
              </div>
            ))}
            {materials.filter(m => user && (recentlyViewed.includes(m.id) || m.bookmarks?.includes(user.uid))).length === 0 && (
              <p className="text-xs text-text-muted text-center py-4 italic">No recent pages. Search files below to continue!</p>
            )}
          </div>
        </div>
      </div>

      {/* Modern Class-wise Folder Explorer Interface */}
      <div
        id="my-classes-directory"
        className="w-full bg-glass-bg border border-border-color p-6 md:p-8 mb-12 text-left relative overflow-hidden"
        style={{ borderRadius: 'var(--theme-card-radius, 32px)' }}
      >
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent-primary/10 via-accent-primary/40 to-accent-primary/10" />
        
        {/* Header Ribbon */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-display font-black text-text-primary flex items-center gap-2.5">
              <span>📂 My Classes Folder System</span>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-accent-primary/15 text-accent-primary border border-accent-primary/20 tracking-wider uppercase font-mono">
                Live Directory Sync
              </span>
            </h2>
            <p className="text-xs text-text-secondary mt-1">
              Browse nested files, class subjects, assignments, PYQs, and test modules dynamically.
            </p>
          </div>

          {/* Breadcrumb Navigation bar */}
          <div className="flex items-center gap-1.5 py-1.5 px-3 rounded-full bg-bg-secondary/60 border border-border-color text-xs text-text-secondary max-w-full overflow-x-auto select-none font-mono">
            <span
              onClick={() => {
                setActiveClassId(null);
                setActiveSubjectId(null);
                setActiveChapterId(null);
              }}
              className="hover:text-accent-primary cursor-pointer transition-colors"
            >
              School
            </span>
            {activeClassId && (
              <>
                <ChevronRight className="w-3 h-3 text-text-muted shrink-0" />
                <span
                  onClick={() => {
                    setActiveSubjectId(null);
                    setActiveChapterId(null);
                  }}
                  className="hover:text-accent-primary cursor-pointer transition-colors max-w-[80px] truncate"
                >
                  {classes.find(c => c.id === activeClassId)?.className || activeClassId.replace('class_', '').toUpperCase()}
                </span>
              </>
            )}
            {activeSubjectId && (
              <>
                <ChevronRight className="w-3 h-3 text-text-muted shrink-0" />
                <span
                  onClick={() => {
                    setActiveChapterId(null);
                  }}
                  className="hover:text-accent-primary cursor-pointer transition-colors max-w-[100px] truncate"
                >
                  {subjects.find(s => s.id === activeSubjectId)?.subjectName || 'Subject'}
                </span>
              </>
            )}
            {activeChapterId && (
              <>
                <ChevronRight className="w-3 h-3 text-text-muted shrink-0" />
                <span className="text-accent-primary max-w-[100px] truncate">
                  {chapters.find(c => c.id === activeChapterId)?.chapterName || 'Chapter'}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Level 0: Display Class Folders */}
        {loading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              <Skeleton variant="folder" count={5} />
            </div>
            <div className="h-4 bg-border-color/30 rounded w-1/4 animate-pulse mt-8" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton variant="card" count={3} />
            </div>
          </div>
        ) : (
          <>
            {activeClassId === null && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {(classes.length > 0 ? classes : [
                  { id: 'class_jee', className: 'Class 12 JEE Elite 2026', price: 4999, discountPrice: 2499, teacherName: 'Alok Pandey', validity: '12 Months', badge: 'Popular', description: 'Complete syllabus preparation for JEE Main & Advanced.' },
                  { id: 'class_neet', className: 'Class 12 NEET Alpha 2026', price: 4999, discountPrice: 1999, teacherName: 'Dr. R.K. Sen', validity: '12 Months', badge: 'New', description: 'Comprehensive syllabus preparation for NEET Medical entrances.' },
                  { id: 'class_10', className: 'Class 10 CBSE Board 2026', price: 2999, discountPrice: 999, teacherName: 'S.K. Gupta', validity: 'Lifetime', badge: 'Limited', description: 'Complete board examination prep with solved DPPs and mocks.' }
                ])
                  .filter(cls => {
                    // Admins and superadmins see all batches
                    if (user?.role === 'admin' || user?.role === 'superadmin') return true;

                    // If they purchased/enrolled in a batch, show it
                    if (purchasedBatchIds.includes(cls.id)) return true;

                    // Standard users do not see hidden classes
                    if (cls.isHidden) return false;

                    // If user has no classGroup set yet, or 'all', show all
                    if (!user?.classGroup || user.classGroup === 'all') return true;

                    const userClass = user.classGroup.toLowerCase();
                    const className = cls.className.toLowerCase();
                    const classId = cls.id.toLowerCase();
                    const classGroupField = (cls.classGroup || '').toLowerCase();

                    // Check if class information matches user's classGroup
                    const matchesName = className.includes(userClass);
                    const matchesId = classId.includes(userClass) || classId.replace('class_', '') === userClass;
                    const matchesGroup = classGroupField === userClass || classGroupField.includes(userClass);

                    // Add robust synonyms for common classes/exams
                    let matchesSynonym = false;
                    if (userClass === 'dropper') {
                      matchesSynonym = className.includes('drop') || className.includes('repeat') || classId.includes('drop');
                    } else if (userClass === 'jee') {
                      matchesSynonym = className.includes('jee') || className.includes('iit') || classId.includes('jee');
                    } else if (userClass === 'neet') {
                      matchesSynonym = className.includes('neet') || className.includes('medical') || classId.includes('neet');
                    }

                    return matchesName || matchesId || matchesGroup || matchesSynonym;
                  })
                  .map((cls) => {
                    const subCount = subjects.filter(s => s.classId === cls.id).length;
                    const isClsHidden = cls.isHidden === true;
                    const isPurchased = purchasedBatchIds.includes(cls.id) || user?.role === 'admin' || user?.role === 'superadmin';
                    const hasDiscount = cls.discountPrice && cls.discountPrice < cls.price;
                    const thumb = cls.thumbnailUrl || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60";
                    
                    return (
                      <div
                        key={cls.id}
                        onClick={() => {
                          if (isPurchased) {
                            setActiveClassId(cls.id);
                            setBatchDashboardTab("subjects");
                            setActiveSubjectId(null);
                            setActiveChapterId(null);
                          } else {
                            setShowPurchaseBatchId(cls.id);
                          }
                        }}
                        className={`group rounded-3xl overflow-hidden bg-gradient-to-b from-bg-secondary/60 to-bg-secondary/15 border border-border-color cursor-pointer hover:shadow-xl hover:scale-[1.01] transition-all relative duration-300 flex flex-col h-full text-left ${
                          isClsHidden ? "border-red-500/30 opacity-75" : "hover:border-accent-primary/50"
                        }`}
                      >
                        {/* Badge Banner */}
                        {cls.badge && (
                          <span className="absolute top-3 left-3 z-10 text-[8px] font-black tracking-widest bg-accent-primary text-zinc-950 px-2 py-1 rounded-full uppercase shadow-lg">
                            {cls.badge}
                          </span>
                        )}

                        {/* Admin Inline Edit/Delete Quick Actions */}
                        {(user?.role === 'admin' || user?.role === 'superadmin') && (
                          <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => setInlineEditingBatch(cls)}
                              className="p-1.5 rounded-lg bg-black/60 hover:bg-black/80 border border-white/10 text-white hover:text-accent-primary transition-all shadow-md cursor-pointer"
                              title="Edit Batch"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setInlineDeletingItem({ type: 'batch', id: cls.id, name: cls.className })}
                              className="p-1.5 rounded-lg bg-black/60 hover:bg-red-950 hover:border-red-500 border border-white/10 text-white hover:text-red-400 transition-all shadow-md cursor-pointer"
                              title="Delete Batch"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        {/* Status badge */}
                        {isClsHidden && !(user?.role === 'admin' || user?.role === 'superadmin') && (
                          <span className="absolute top-3 right-3 z-10 text-[8px] font-black tracking-widest bg-red-500 text-white px-2 py-1 rounded-full uppercase">
                            HIDDEN
                          </span>
                        )}

                        {/* Thumbnail container */}
                        <div className="relative w-full aspect-[16/10] overflow-hidden bg-black/40">
                          <img 
                            src={thumb} 
                            alt={cls.className}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                          
                          {/* Price / Enrolled badge */}
                          <div className="absolute bottom-3 right-3">
                            {isPurchased ? (
                              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider backdrop-blur-md flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                Enrolled
                              </span>
                            ) : (
                              <div className="flex items-center gap-1.5 bg-black/60 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-md">
                                {hasDiscount && (
                                  <span className="text-white/40 line-through text-[9px] font-mono">
                                    ₹{cls.price}
                                  </span>
                                )}
                                <span className="text-accent-primary text-[11px] font-black font-mono">
                                  ₹{cls.discountPrice || cls.price || 0}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Card Content */}
                        <div className="p-5 flex-1 flex flex-col justify-between">
                          <div>
                            {/* Instructor & Category row */}
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="text-[9px] uppercase font-black tracking-widest text-accent-primary/80">
                                {cls.category || "General"}
                              </span>
                              <span className="text-[10px] font-medium text-text-muted">
                                {cls.validity || "Lifetime"}
                              </span>
                            </div>

                            <h4 className="font-display font-black text-base text-text-primary group-hover:text-accent-primary transition-colors line-clamp-1">
                              {cls.className}
                            </h4>
                            
                            <p className="text-xs text-text-muted mt-1.5 line-clamp-2 leading-relaxed min-h-[2.5rem]">
                              {cls.description || "Access structured mock modules, subject courses, DPPs, chapter lectures, and study keys."}
                            </p>
                          </div>

                          {/* Instructor and Metrics row */}
                          <div className="border-t border-white/5 pt-4 mt-4 flex items-center justify-between text-[11px]">
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center font-bold text-[10px] text-accent-primary border border-white/5">
                                {(cls.teacherName || "F")[0]}
                              </div>
                              <span className="text-text-muted truncate max-w-[100px]">
                                {cls.teacherName || "Senior Faculty"}
                              </span>
                            </div>
                            <span className="text-text-muted font-bold">
                              {subCount} Subjects
                            </span>
                          </div>

                          {/* CTA Button */}
                          <div className="mt-4 pt-1">
                            <button className={`w-full py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                              isPurchased 
                                ? "bg-white/5 border border-white/10 hover:bg-white/10 text-white" 
                                : "bg-accent-primary hover:bg-accent-primary/90 text-zinc-950 font-black"
                            }`}>
                              {isPurchased ? (
                                <>
                                  <span>Continue Learning</span>
                                  <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                                </>
                              ) : (
                                <>
                                  <span>Buy Now</span>
                                  <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

        {/* Level 1: Paid Batch Dashboard with nested sub-tabs */}
        {activeClassId !== null && activeSubjectId === null && (() => {
          const batch = classes.find(c => c.id === activeClassId) || {
            className: activeClassId === 'class_jee' ? 'Class 12 JEE Elite 2026' : activeClassId === 'class_neet' ? 'Class 12 NEET Alpha 2026' : 'Class 10 CBSE Board 2026',
            teacherName: activeClassId === 'class_jee' ? 'Alok Pandey' : activeClassId === 'class_neet' ? 'Dr. R.K. Sen' : 'S.K. Gupta',
            validity: '12 Months Access'
          };
          return (
            <div className="space-y-6">
              
              {/* Batch Hero Header & Meta Panels */}
              <div className="p-6 rounded-3xl bg-gradient-to-r from-bg-secondary/40 via-bg-secondary/15 to-transparent border border-border-color relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-left">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setActiveClassId(null)}
                      className="p-1 px-3 rounded-lg text-xs font-black bg-bg-secondary/60 border border-border-color text-text-muted hover:text-accent-primary transition-colors cursor-pointer mr-1 uppercase tracking-wider"
                    >
                      ← Back to Batches
                    </button>
                    <span className="text-[9px] uppercase font-black tracking-widest bg-accent-primary/10 text-accent-primary px-2 py-0.5 rounded-full border border-accent-primary/20">
                      Active Batch Enrollment
                    </span>
                  </div>
                  <h3 className="font-display font-black text-2xl text-text-primary mt-1">
                    {batch.className}
                  </h3>
                  <p className="text-xs text-text-muted font-medium">
                    Led by <span className="text-text-primary font-bold">{batch.teacherName || "Senior Faculty"}</span> • Valid till: <span className="text-text-primary font-bold">{batch.validity || "Lifetime"}</span>
                  </p>
                </div>
              </div>

              {/* Batch Dashboard Tab selection menu */}
              <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden bg-bg-secondary/30 p-1.5 rounded-2xl border border-border-color">
                {[
                  { id: "subjects", label: "Syllabus Subjects", icon: "📚" },
                  { id: "videos", label: "Recorded Lectures", icon: "🎥" },
                  { id: "notes", label: "Study PDFs & Keys", icon: "📝" },
                  { id: "assignments", label: "Daily DPPs", icon: "📂" },
                  { id: "tests", label: "MCQ Tests", icon: "✏️" },
                  { id: "announcements", label: "Notice Board", icon: "📢" },
                  { id: "doubts", label: "Doubt Q&A board", icon: "❓" },
                  { id: "resources", label: "Study Resources", icon: "📎" },
                  { id: "progress", label: "Study Analytics", icon: "📈" }
                ].map((tabItem) => {
                  const isActive = batchDashboardTab === tabItem.id;
                  return (
                    <button
                      key={tabItem.id}
                      onClick={() => setBatchDashboardTab(tabItem.id)}
                      className={`px-4 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 relative ${
                        isActive
                          ? 'bg-accent-primary text-zinc-950 shadow-md font-bold'
                          : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                      }`}
                    >
                      <span>{tabItem.icon}</span>
                      <span>{tabItem.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Sub-tab view components */}
              <div className="pt-2">

                {/* TAB 1: Subjects Grid folders */}
                {batchDashboardTab === "subjects" && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {subjects
                      .filter(s => s.classId === activeClassId && ((user?.role === 'admin' || user?.role === 'superadmin') || !s.isHidden))
                      .map((subj) => {
                        const chapCount = chapters.filter(c => c.subjectId === subj.id).length;
                        const isSubjHidden = subj.isHidden === true;
                        return (
                          <div
                            key={subj.id}
                            onClick={() => {
                              setActiveSubjectId(subj.id);
                              setActiveChapterId(null);
                            }}
                            className={`group p-5 rounded-2xl bg-gradient-to-br from-bg-secondary/40 to-bg-secondary/10 border cursor-pointer hover:scale-[1.02] transition-all relative text-left ${
                              isSubjHidden
                                ? "border-red-500/30 opacity-75"
                                : "border-border-color hover:border-accent-primary/60"
                            }`}
                          >
                            {isSubjHidden && !(user?.role === 'admin' || user?.role === 'superadmin') && (
                              <span className="absolute top-2.5 right-2.5 text-[8px] font-black font-mono tracking-wider bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded border border-red-500/20">
                                HIDDEN
                              </span>
                            )}

                            {/* Admin Quick Actions */}
                            {(user?.role === 'admin' || user?.role === 'superadmin') && (
                              <div className="absolute top-2.5 right-2.5 z-30 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => setInlineEditingSubject(subj)}
                                  className="p-1 rounded bg-black/60 hover:bg-black/80 border border-white/10 text-white hover:text-accent-primary transition-all cursor-pointer"
                                  title="Edit Subject"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => setInlineDeletingItem({ type: 'subject', id: subj.id, name: subj.subjectName })}
                                  className="p-1 rounded bg-black/60 hover:bg-red-950 hover:border-red-500 border border-white/10 text-white hover:text-red-400 transition-all cursor-pointer"
                                  title="Delete Subject"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500 group-hover:text-black transition-all mb-4">
                              <Folder className="w-6 h-6 shrink-0 fill-current" />
                            </div>
                            <h4 className="font-display font-black text-base text-text-primary group-hover:text-indigo-400 transition-colors truncate">
                              {subj.subjectName}
                            </h4>
                            <p className="text-[10px] text-text-muted mt-1 uppercase font-mono tracking-wider">
                              {chapCount} Chapters
                            </p>
                          </div>
                        );
                      })}
                    {subjects.filter(s => s.classId === activeClassId && ((user?.role === 'admin' || user?.role === 'superadmin') || !s.isHidden)).length === 0 && (
                      <div className="p-8 text-center bg-bg-secondary/20 border border-dashed border-border-color rounded-2xl col-span-full">
                        <p className="text-xs text-text-muted font-mono">No subjects added for this batch standard yet.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: Recorded Lectures */}
                {batchDashboardTab === "videos" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
                    {materials
                      .filter(m => m.classId === activeClassId && (m.materialType === 'video_lectures' || m.type === 'lecture'))
                      .map((mat) => {
                        return (
                          <div key={mat.id} className="group rounded-2xl overflow-hidden border border-border-color bg-gradient-to-b from-bg-secondary/50 to-transparent flex flex-col justify-between p-4 gap-3">
                            <div className="aspect-video rounded-xl bg-black/40 overflow-hidden relative">
                              <img 
                                src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500&auto=format&fit=crop" 
                                alt={mat.title}
                                className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                              />
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <div className="w-12 h-12 rounded-full bg-accent-primary text-zinc-950 flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-all cursor-pointer" onClick={() => handleViewMaterial(mat)}>
                                  ▶
                                </div>
                              </div>
                            </div>
                            <div>
                              <h4 className="font-bold text-sm text-text-primary line-clamp-1 group-hover:text-accent-primary transition-colors">{mat.title}</h4>
                              <p className="text-xs text-text-muted mt-1 line-clamp-2">{mat.description || "Video lecture module."}</p>
                            </div>
                            <button onClick={() => handleViewMaterial(mat)} className="w-full py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs uppercase font-black tracking-wider transition-colors cursor-pointer">
                              Play Lecture
                            </button>
                          </div>
                        );
                      })}
                    {materials.filter(m => m.classId === activeClassId && (m.materialType === 'video_lectures' || m.type === 'lecture')).length === 0 && (
                      <div className="p-10 text-center bg-bg-secondary/10 border border-dashed border-border-color rounded-2xl col-span-full">
                        <p className="text-xs text-text-muted italic">No video lectures synced under this batch folder yet.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: Study PDFs & Notes */}
                {batchDashboardTab === "notes" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                    {materials
                      .filter(m => m.classId === activeClassId && (m.materialType === 'notes' || m.materialType === 'formula_sheets'))
                      .map((mat) => {
                        return (
                          <div key={mat.id} className="p-4 rounded-xl border border-border-color bg-bg-secondary/20 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                                <FileText className="w-5 h-5" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-bold text-xs text-text-primary truncate">{mat.title}</h4>
                                <p className="text-[10px] text-text-muted truncate">{mat.description || "Lecture study notes."}</p>
                              </div>
                            </div>
                            <button onClick={() => handleViewMaterial(mat)} className="px-3 py-1.5 bg-accent-primary text-zinc-950 rounded-lg text-[10px] font-black uppercase tracking-wider hover:scale-[1.02] transition-transform cursor-pointer shrink-0">
                              View PDF
                            </button>
                          </div>
                        );
                      })}
                    {materials.filter(m => m.classId === activeClassId && (m.materialType === 'notes' || m.materialType === 'formula_sheets')).length === 0 && (
                      <div className="p-10 text-center bg-bg-secondary/10 border border-dashed border-border-color rounded-2xl col-span-full">
                        <p className="text-xs text-text-muted italic">No study notes synced under this batch folder yet.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 4: DPPs & Assignments */}
                {batchDashboardTab === "assignments" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                    {materials
                      .filter(m => m.classId === activeClassId && (m.materialType === 'assignments' || m.materialType === 'dpps'))
                      .map((mat) => {
                        return (
                          <div key={mat.id} className="p-4 rounded-xl border border-border-color bg-bg-secondary/20 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
                                <Folder className="w-5 h-5" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-bold text-xs text-text-primary truncate">{mat.title}</h4>
                                <p className="text-[10px] text-text-muted truncate">{mat.description || "Worksheet assignments."}</p>
                              </div>
                            </div>
                            <button onClick={() => handleViewMaterial(mat)} className="px-3 py-1.5 bg-accent-primary text-zinc-950 rounded-lg text-[10px] font-black uppercase tracking-wider hover:scale-[1.02] transition-transform cursor-pointer shrink-0">
                              Open DPP
                            </button>
                          </div>
                        );
                      })}
                    {materials.filter(m => m.classId === activeClassId && (m.materialType === 'assignments' || m.materialType === 'dpps')).length === 0 && (
                      <div className="p-10 text-center bg-bg-secondary/10 border border-dashed border-border-color rounded-2xl col-span-full">
                        <p className="text-xs text-text-muted italic">No assignment folders or daily practice problems synced under this batch folder yet.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 5: MCQ mock Tests */}
                {batchDashboardTab === "tests" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                    {mcqTests
                      .filter(t => t.classId === activeClassId)
                      .map((test) => {
                        return (
                          <div key={test.id} className="p-5 rounded-2xl border border-border-color bg-bg-secondary/20 flex flex-col justify-between gap-4">
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[9px] uppercase font-black tracking-widest text-accent-primary">
                                  Mock Test Series
                                </span>
                                <span className="text-[10px] text-text-muted">
                                  {test.questions?.length || 0} Questions
                                </span>
                              </div>
                              <h4 className="font-bold text-sm text-text-primary">{test.title}</h4>
                              <p className="text-xs text-text-muted mt-1 leading-relaxed">
                                {test.description || "Full mock test simulation with analytical report keys."}
                              </p>
                            </div>
                            <button onClick={() => {
                              showToast("Starting Test Simulator... Redirecting to Exam Hall.", false);
                            }} className="w-full py-2 bg-accent-primary text-zinc-950 rounded-xl text-xs font-black uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer">
                              Attempt Test Now
                            </button>
                          </div>
                        );
                      })}
                    {mcqTests.filter(t => t.classId === activeClassId).length === 0 && (
                      <div className="p-10 text-center bg-bg-secondary/10 border border-dashed border-border-color rounded-2xl col-span-full">
                        <p className="text-xs text-text-muted italic">No interactive mock MCQ tests assigned to this batch yet.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 6: Announcements noticeboard */}
                {batchDashboardTab === "announcements" && (() => {
                  const batchAnnouncements = announcements.filter(a => a.batchId === activeClassId);
                  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

                  const handlePostAnnouncement = async (e: React.FormEvent) => {
                    e.preventDefault();
                    const titleVal = (e.currentTarget as any).title.value.trim();
                    const contentVal = (e.currentTarget as any).content.value.trim();
                    if (!titleVal || !contentVal) {
                      showToast("Please fill in all announcement parameters.", true);
                      return;
                    }

                    try {
                      await addDoc(collection(db, 'announcements'), {
                        title: titleVal,
                        content: contentVal,
                        batchId: activeClassId,
                        createdAt: serverTimestamp(),
                        author: user.displayName || user.email,
                      });
                      showToast("Announcement broadcast successfully!", false);
                      (e.currentTarget as any).reset();
                    } catch (err) {
                      console.error("Announcement failed:", err);
                      showToast("Failed to broadcast announcement.", true);
                    }
                  };

                  return (
                    <div className="space-y-6 text-left max-w-3xl mx-auto">
                      {isAdmin && (
                        <form onSubmit={handlePostAnnouncement} className="p-5 rounded-2xl border border-white/10 bg-white/5 space-y-4">
                          <h4 className="text-xs font-black uppercase text-accent-primary tracking-widest">
                            📢 Broadcast New Announcement (Admin Controls)
                          </h4>
                          <div className="space-y-3">
                            <input 
                              type="text" 
                              name="title" 
                              placeholder="Announcement Title (e.g., Live session on Tuesday)"
                              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-accent-primary"
                            />
                            <textarea 
                              name="content" 
                              placeholder="Announcement Body content / details / syllabus updates..."
                              rows={3}
                              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-accent-primary resize-none"
                            />
                          </div>
                          <button type="submit" className="px-4 py-2 bg-accent-primary text-zinc-950 rounded-xl text-xs font-black uppercase tracking-wider transition-transform hover:scale-[1.01] cursor-pointer">
                            Post Announcement
                          </button>
                        </form>
                      )}

                      <div className="space-y-4">
                        {batchAnnouncements.map((ann) => {
                          return (
                            <div key={ann.id} className="p-5 rounded-2xl border border-border-color bg-bg-secondary/20 space-y-2">
                              <div className="flex items-center justify-between">
                                <h4 className="font-black text-sm text-text-primary">{ann.title}</h4>
                                <span className="text-[9px] font-mono text-text-muted">
                                  {ann.createdAt?.seconds ? new Date(ann.createdAt.seconds * 1000).toLocaleDateString() : "Just now"}
                                </span>
                              </div>
                              <p className="text-xs text-text-muted leading-relaxed whitespace-pre-line">{ann.content}</p>
                              <div className="text-[10px] text-accent-primary/80 font-bold uppercase tracking-wider pt-1">
                                By {ann.author || "Faculty"}
                              </div>
                            </div>
                          );
                        })}

                        {batchAnnouncements.length === 0 && (
                          <div className="p-10 text-center bg-bg-secondary/10 border border-dashed border-border-color rounded-2xl">
                            <p className="text-xs text-text-muted italic">No batch announcements posted yet.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* TAB 7: doubts Clearance Q&A board */}
                {batchDashboardTab === "doubts" && (() => {
                  const batchDoubts = doubts.filter(d => d.batchId === activeClassId);
                  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

                  const handlePostDoubt = async (e: React.FormEvent) => {
                    e.preventDefault();
                    const questionVal = (e.currentTarget as any).question.value.trim();
                    if (!questionVal) return;

                    try {
                      await addDoc(collection(db, 'doubts'), {
                        question: questionVal,
                        userId: user.uid,
                        userName: user.displayName || user.email.split('@')[0],
                        batchId: activeClassId,
                        createdAt: serverTimestamp(),
                        status: 'unresolved'
                      });
                      showToast("Doubt submitted to faculty panel!", false);
                      (e.currentTarget as any).reset();
                    } catch (err) {
                      console.error("Doubt post failed:", err);
                      showToast("Failed to post doubt.", true);
                    }
                  };

                  const handleReplyDoubt = async (doubtId: string, replyContent: string) => {
                    if (!replyContent.trim()) return;

                    try {
                      await updateDoc(doc(db, 'doubts', doubtId), {
                        answer: replyContent,
                        repliedBy: user.displayName || user.email,
                        repliedAt: serverTimestamp(),
                        status: 'resolved'
                      });
                      showToast("Doubt resolved successfully!", false);
                      setReplyDoubtId(null);
                      setReplyText("");
                    } catch (err) {
                      console.error("Doubt reply failed:", err);
                      showToast("Failed to post answer.", true);
                    }
                  };

                  return (
                    <div className="space-y-6 text-left max-w-3xl mx-auto">
                      {/* Ask a Doubt Form */}
                      <form onSubmit={handlePostDoubt} className="p-5 rounded-2xl border border-white/10 bg-white/5 space-y-4">
                        <h4 className="text-xs font-black uppercase text-accent-primary tracking-widest">
                          ❓ Have a question? Ask our Senior Faculty Panel
                        </h4>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            name="question" 
                            placeholder="Type your academic doubt here (e.g. Can you explain equation 4 of Lecture 2?)"
                            className="flex-grow bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-accent-primary"
                          />
                          <button type="submit" className="px-5 py-2.5 bg-accent-primary text-zinc-950 rounded-xl text-xs font-black uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer whitespace-nowrap">
                            Submit Doubt
                          </button>
                        </div>
                      </form>

                      {/* Doubt board lists */}
                      <div className="space-y-4">
                        {batchDoubts.map((doubt) => {
                          return (
                            <div key={doubt.id} className="p-5 rounded-2xl border border-border-color bg-bg-secondary/20 space-y-4">
                              <div>
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-[10px] font-bold text-accent-primary/80">
                                    Question by @{doubt.userName || "Student"}
                                  </span>
                                  <span className="text-[9px] font-mono text-text-muted">
                                    {doubt.createdAt?.seconds ? new Date(doubt.createdAt.seconds * 1000).toLocaleDateString() : "Just now"}
                                  </span>
                                </div>
                                <h4 className="font-bold text-sm text-text-primary leading-relaxed">{doubt.question}</h4>
                              </div>

                              {/* Answers thread */}
                              {doubt.answer ? (
                                <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-xl space-y-1 text-left">
                                  <div className="flex items-center justify-between mb-1 text-[10px]">
                                    <span className="text-emerald-400 font-bold">✓ Verified Answer by Faculty</span>
                                    <span className="text-text-muted font-mono">
                                      {doubt.repliedAt?.seconds ? new Date(doubt.repliedAt.seconds * 1000).toLocaleDateString() : "Just now"}
                                    </span>
                                  </div>
                                  <p className="text-xs text-text-muted leading-relaxed whitespace-pre-line">{doubt.answer}</p>
                                  <div className="text-[9px] text-text-muted pt-1">
                                    Answered by {doubt.repliedBy || "Instructor"}
                                  </div>
                                </div>
                              ) : (
                                <div className="bg-amber-500/5 border border-amber-500/10 p-4 rounded-xl text-left">
                                  <p className="text-xs text-amber-400 font-bold">⏳ Faculty Review Pending</p>
                                  <p className="text-[11px] text-text-muted mt-0.5">Your senior faculty will review and post an answer shortly.</p>
                                </div>
                              )}

                              {/* Admin Reply controls */}
                              {isAdmin && !doubt.answer && (
                                <div className="text-left">
                                  {replyDoubtId === doubt.id ? (
                                    <div className="space-y-2 mt-2">
                                      <textarea
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        placeholder="Type answer reply here..."
                                        rows={2}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-accent-primary resize-none"
                                      />
                                      <div className="flex gap-2">
                                        <button 
                                          onClick={() => handleReplyDoubt(doubt.id, replyText)}
                                          className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-black rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer"
                                        >
                                          Submit Answer
                                        </button>
                                        <button 
                                          onClick={() => { setReplyDoubtId(null); setReplyText(""); }}
                                          className="px-4 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <button 
                                      onClick={() => setReplyDoubtId(doubt.id)}
                                      className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl text-xs uppercase font-bold tracking-wider cursor-pointer"
                                    >
                                      Answer Doubt
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {batchDoubts.length === 0 && (
                          <div className="p-10 text-center bg-bg-secondary/10 border border-dashed border-border-color rounded-2xl">
                            <p className="text-xs text-text-muted italic">No academic doubts posted under this batch yet.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* TAB 8: Resources Links */}
                {batchDashboardTab === "resources" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                    {materials
                      .filter(m => m.classId === activeClassId && (m.materialType === 'resources' || m.type === 'zip' || m.url?.includes('drive.google.com')))
                      .map((mat) => {
                        return (
                          <div key={mat.id} className="p-4 rounded-xl border border-border-color bg-bg-secondary/20 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                                <Folder className="w-5 h-5" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-bold text-xs text-text-primary truncate">{mat.title}</h4>
                                <p className="text-[10px] text-text-muted truncate">{mat.description || "Reference syllabus resource."}</p>
                              </div>
                            </div>
                            <a href={mat.url} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-accent-primary text-zinc-950 rounded-lg text-[10px] font-black uppercase tracking-wider hover:scale-[1.02] transition-transform cursor-pointer shrink-0">
                              Download
                            </a>
                          </div>
                        );
                      })}
                    {materials.filter(m => m.classId === activeClassId && (m.materialType === 'resources' || m.type === 'zip' || m.url?.includes('drive.google.com'))).length === 0 && (
                      <div className="p-10 text-center bg-bg-secondary/10 border border-dashed border-border-color rounded-2xl col-span-full">
                        <p className="text-xs text-text-muted italic">No external resource keys or reference download ZIPs added yet.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 9: Study Analytics */}
                {batchDashboardTab === "progress" && (() => {
                  const totalLectures = materials.filter(m => m.classId === activeClassId && (m.materialType === 'video_lectures' || m.type === 'lecture')).length;
                  const completedCount = Math.floor(totalLectures * 0.35);
                  const progressPct = totalLectures > 0 ? Math.round((completedCount / totalLectures) * 100) : 0;

                  return (
                    <div className="space-y-6 text-left max-w-2xl mx-auto">
                      <div className="bg-bg-secondary/20 border border-border-color rounded-2xl p-6 space-y-4">
                        <h4 className="text-xs font-black uppercase text-accent-primary tracking-widest">
                          📈 Your Learning Progress Statistics
                        </h4>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs font-bold text-white">
                            <span>Course Completion Rate</span>
                            <span>{progressPct}%</span>
                          </div>
                          <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden">
                            <div className="h-full bg-accent-primary rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-2 text-xs">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-text-muted">Total Lectures</span>
                            <p className="text-lg font-black text-white">{totalLectures} lectures</p>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-text-muted">Completed Lectures</span>
                            <p className="text-lg font-black text-white">{completedCount} lectures</p>
                          </div>
                        </div>
                      </div>

                      {/* Bookmark list */}
                      <div className="bg-bg-secondary/20 border border-border-color rounded-2xl p-6 space-y-4">
                        <h4 className="text-xs font-black uppercase text-accent-primary tracking-widest">
                          🔖 Bookmarked Materials ({materials.filter(m => m.classId === activeClassId && m.bookmarks?.includes(user?.uid)).length})
                        </h4>
                        <div className="space-y-2">
                          {materials
                            .filter(m => m.classId === activeClassId && m.bookmarks?.includes(user?.uid))
                            .map((bkm) => (
                              <div key={bkm.id} className="flex items-center justify-between gap-3 text-xs p-3 rounded-xl bg-black/25 border border-white/5">
                                <span className="text-white font-bold truncate">{bkm.title}</span>
                                <button onClick={() => handleViewMaterial(bkm)} className="text-accent-primary hover:underline font-bold text-[10px] uppercase tracking-wider cursor-pointer shrink-0">
                                  Open View
                                </button>
                              </div>
                            ))}
                          {materials.filter(m => m.classId === activeClassId && m.bookmarks?.includes(user?.uid)).length === 0 && (
                            <p className="text-xs text-text-muted italic">Bookmarked materials will appear here for easy shortcut access.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

              </div>
            </div>
          );
        })()}

        {/* Level 2: Display Chapter Folders under Subject */}
        {activeClassId !== null && activeSubjectId !== null && activeChapterId === null && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => {
                  setActiveSubjectId(null);
                  setActiveChapterId(null);
                }}
                className="p-1 px-3 rounded-lg text-xs font-bold bg-bg-secondary border border-border-color hover:text-accent-primary transition-colors cursor-pointer"
              >
                ← Back to Subjects
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {chapters.filter(c => c.subjectId === activeSubjectId).map((chap) => {
                // Count materials matching this chapter
                const mCount = materials.filter(m => m.chapterId === chap.id).length;
                return (
                  <div
                    key={chap.id}
                    onClick={() => {
                      setActiveChapterId(chap.id);
                    }}
                    className="group p-5 rounded-2xl bg-gradient-to-br from-bg-secondary/40 to-bg-secondary/10 border border-border-color hover:border-accent-primary/60 cursor-pointer hover:scale-[1.02] transition-all relative"
                  >
                    {/* Admin Quick Actions */}
                    {(user?.role === 'admin' || user?.role === 'superadmin') && (
                      <div className="absolute top-2.5 right-2.5 z-30 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setInlineEditingChapter(chap)}
                          className="p-1 rounded bg-black/60 hover:bg-black/80 border border-white/10 text-white hover:text-accent-primary transition-all cursor-pointer"
                          title="Edit Chapter"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => setInlineDeletingItem({ type: 'chapter', id: chap.id, name: chap.chapterName })}
                          className="p-1 rounded bg-black/60 hover:bg-red-950 hover:border-red-500 border border-white/10 text-white hover:text-red-400 transition-all cursor-pointer"
                          title="Delete Chapter"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    <div className="w-11 h-11 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-450 group-hover:bg-purple-500 group-hover:text-black transition-all mb-4">
                      <FolderOpen className="w-5.5 h-5.5 shrink-0" />
                    </div>
                    <h5 className="font-display font-black text-sm text-text-primary group-hover:text-purple-400 transition-colors truncate">
                      {chap.chapterName}
                    </h5>
                    <p className="text-[10px] text-text-muted mt-1 uppercase font-mono tracking-wider">
                      {mCount} Materials
                    </p>
                  </div>
                );
              })}
              {chapters.filter(c => c.subjectId === activeSubjectId).length === 0 && (
                <div className="p-8 text-center bg-bg-secondary/20 border border-dashed border-border-color rounded-2xl col-span-full">
                  <p className="text-xs text-text-muted font-mono">No chapter folders available in this subject module yet.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Level 3: Display Categorized Files listing under selected Chapter */}
        {activeClassId !== null && activeSubjectId !== null && activeChapterId !== null && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <button
                onClick={() => {
                  setActiveChapterId(null);
                }}
                className="p-1 px-3 rounded-lg text-xs font-bold bg-bg-secondary border border-border-color hover:text-accent-primary transition-colors cursor-pointer"
              >
                ← Back to Chapters
              </button>

              {/* Dynamic Folder Search Panel */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-text-muted pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search file name..."
                  value={studentSearchQuery}
                  onChange={(e) => setStudentSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-black/30 border border-border-color text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-primary"
                />
              </div>
            </div>

            {/* Material Categories Tabs bar inside Chapter */}
            <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden bg-bg-secondary/40 p-1.5 rounded-2xl border border-border-color">
              {(() => {
                const activeSubjItem = subjects.find(s => s.id === activeSubjectId);
                const hiddenCategories = activeSubjItem?.hiddenCategories || [];
                const isUserAdmin = user?.role === 'admin' || user?.role === 'superadmin';
                const allTabs = [
                  { label: 'Notes', icon: '📝' },
                  { label: 'PYQs', icon: '🏆' },
                  { label: 'Assignments', icon: '📂' },
                  { label: 'DPPs', icon: '📚' },
                  { label: 'Videos', icon: '🎥' },
                  { label: 'Formula Sheets', icon: '📐' },
                  { label: 'Tests', icon: '✏️' }
                ];
                return allTabs
                  .filter((catTab) => !hiddenCategories.includes(catTab.label))
                  .map((catTab) => {
                    return (
                      <button
                        key={catTab.label}
                        onClick={() => setActiveCategory(catTab.label)}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 relative ${
                          activeCategory === catTab.label
                            ? 'bg-accent-primary text-zinc-950 shadow-md font-bold'
                            : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                        }`}
                      >
                        <span>{catTab.icon}</span>
                        <span>{catTab.label}</span>
                      </button>
                    );
                  });
              })()}
            </div>

            {/* Render matched materials files */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(() => {
                const filteredFiles = materials.filter((mat) => {
                  // Must match active chapter doc reference or class/subject hierarchy
                  const mClass = mat.classId === activeClassId || mat.classGroup === activeClassId.replace('class_', '');
                  const mSubj = mat.subjectId === activeSubjectId;
                  const mChap = mat.chapterId === activeChapterId;
                  if (!mClass || !mSubj || !mChap) return false;

                  // Must match activeCategory
                  const mType = (mat.materialType || '').toLowerCase();
                  const type = (mat.type || '').toLowerCase();
                  const normCat = activeCategory.toLowerCase();
                  let catMatch = false;

                  if (normCat === 'notes') {
                    catMatch = mType === 'notes' || mType === 'note' || type === 'note' || type === 'notes';
                  } else if (normCat === 'videos') {
                    catMatch = mType === 'video_lectures' || mType === 'videos' || mType === 'video' || type === 'lecture' || type === 'video' || type === 'videos';
                  } else if (normCat === 'pyqs') {
                    catMatch = mType === 'pyqs' || mType === 'pyq';
                  } else if (normCat === 'assignments') {
                    catMatch = mType === 'assignments' || mType === 'assignment';
                  } else if (normCat === 'dpps') {
                    catMatch = mType === 'dpps' || mType === 'dpp';
                  } else if (normCat === 'formula sheets') {
                    catMatch = mType === 'formula_sheets' || mType === 'formula_sheet' || normCat.includes('formula') || (mat.title && mat.title.toLowerCase().includes('formula'));
                  } else if (normCat === 'tests') {
                    catMatch = mType === 'tests' || mType === 'test';
                  }

                  if (!catMatch) return false;

                  // Must match search query
                  if (studentSearchQuery.trim()) {
                    return mat.title.toLowerCase().includes(studentSearchQuery.toLowerCase().trim());
                  }
                  return true;
                });

                if (filteredFiles.length === 0) {
                  return (
                    <div className="p-10 text-center bg-bg-secondary/10 border border-dashed border-border-color rounded-2xl col-span-full">
                      <p className="text-xs text-text-muted italic">No {activeCategory} documents synced under this chapter folder.</p>
                    </div>
                  );
                }

                return filteredFiles.map((mat) => {
                  const isBookmarked = user && mat.bookmarks?.includes(user.uid);
                  const isVideoFile = mat.type === 'lecture' || mat.materialType === 'video_lectures' || (mat.url && mat.url.includes('youtube.com'));
                  return (
                    <div
                      key={mat.id}
                      className="p-5 rounded-2xl border border-border-color bg-gradient-to-br from-bg-secondary/40 to-transparent flex flex-col justify-between gap-4 relative overflow-hidden group"
                    >
                      <div className="flex gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                          isVideoFile ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'
                        }`}>
                          {isVideoFile ? <Video className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <h4 className="font-bold text-sm text-text-primary group-hover:text-accent-primary transition-colors truncate">
                            {mat.title}
                          </h4>
                          <p className="text-xs text-text-muted mt-1 line-clamp-2 leading-relaxed">
                            {mat.description || 'No summary parameters provided for this curriculum sheet.'}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[9px] font-mono text-text-muted">
                            {mat.downloadCount !== undefined && (
                              <span>⬇ {mat.downloadCount} downloads</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 border-t border-border-color/40 pt-3 mt-1">
                        <button
                          onClick={() => handleViewMaterial(mat)}
                          className="flex-1 py-2 rounded-xl bg-accent-primary text-[#050508] font-black uppercase tracking-wider text-[10px] hover:bg-accent-primary/80 transition-colors cursor-pointer"
                        >
                          View {isVideoFile ? 'Lecture' : 'PDF'}
                        </button>
                        
                        {mat.url && !isVideoFile && (
                          <button
                            onClick={(e) => handleIncrementDownloadInDashboard(mat, e)}
                            className="p-2 rounded-xl bg-bg-secondary hover:text-accent-primary transition-colors cursor-pointer border border-border-color"
                            title="Download module"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                        
                        <button
                          onClick={(e) => handleToggleBookmarkInDashboard(mat.id, e)}
                          className={`p-2 rounded-xl bg-bg-secondary transition-colors cursor-pointer border border-border-color ${
                            isBookmarked ? 'text-accent-primary border-accent-primary/30 bg-accent-primary/5' : 'hover:text-accent-primary'
                          }`}
                          title="Bookmark file"
                        >
                          <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
                        </button>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}
          </>
        )}
      </div>

      {/* Sidebar and Promo Widgets Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left shrink-0 mt-8">
           
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
                boxShadow: activeDashboardPricingCard === 'notes' ? '0 15px 40px rgba(99, 102, 241, 0.2)' : '0 4px 12px rgba(0,0,0,0.1)',
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
                boxShadow: activeDashboardPricingCard === 'lectures' ? '0 15px 40px rgba(99, 102, 241, 0.25)' : '0 4px 12px rgba(0,0,0,0.1)',
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
                      ? `${dotActiveBg} w-6 shadow-[0_0_12px_rgba(99, 102, 241,0.4)]` 
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
                  <div className="flex flex-col items-center justify-center gap-3 p-8 bg-bg-secondary w-full h-full text-text-secondary font-bold text-xs min-h-[300px]">
                     <OrbitalLoader size="md" text="Securing academic URL streams..." />
                  </div>
                ) : (activeMaterial.type === 'video' || activeMaterial.type === 'lecture') || ReactPlayer.canPlay(secureUrl || activeMaterial.url) ? (
                  <CustomVideoPlayer url={secureUrl || activeMaterial.url} playing={!!selectedMaterial} course={activeMaterial} />
                ) : (
                  <SecurePdfViewer url={secureUrl || activeMaterial.url} title={activeMaterial.title} />
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 🌟 PREMIUM PAID BATCH PURCHASE OVERLAY */}
      {showPurchaseBatchId && (() => {
        const batch = classes.find(c => c.id === showPurchaseBatchId);
        if (!batch) return null;
        const thumb = batch.thumbnailUrl || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60";
        const banner = batch.bannerUrl || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&auto=format&fit=crop&q=80";
        const hasDiscount = batch.discountPrice && batch.discountPrice < batch.price;

        const payUpiId = batch.upiId || settings?.upiId || 'test@upi';
        const amount = batch.discountPrice || batch.price || 0;
        const note = `${batch.className} - ${user?.email}`;
        const upiUri = `upi://pay?pa=${payUpiId}&pn=${encodeURIComponent(settings?.websiteName || 'Nucleus')}&am=${amount}&tn=${encodeURIComponent(note)}&cu=INR`;
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiUri)}`;

        const handlePurchaseSimulator = async () => {
          if (!userUtr.trim()) {
            showToast("Please enter your payment Transaction ID (UTR)", true);
            return;
          }
          setIsPaying(true);
          try {
            // Simulate brief security check
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Create Firebase Purchase Document in 'pending' status
            await setDoc(doc(db, 'purchases', `${user.uid}_${batch.id}`), {
              userId: user.uid,
              email: user.email,
              batchId: batch.id,
              batchName: batch.className,
              purchaseDate: serverTimestamp(),
              amountPaid: amount,
              utr: userUtr.trim(),
              status: 'pending' // Admin must approve this to unlock!
            });

            setPaymentSuccess(true);
            showToast("Payment details submitted! Awaiting Admin verification.", false);
            
            setTimeout(() => {
              setShowPurchaseBatchId(null);
              setPaymentSuccess(false);
              setIsPaying(false);
              setUserUtr("");
            }, 3000);
          } catch (e: any) {
            console.error("Purchase error:", e);
            showToast("Submission failed. Please try again.", true);
            setIsPaying(false);
          }
        };

        return (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex justify-center overflow-y-auto p-4 md:p-6 text-left">
            <div className="w-full max-w-4xl my-auto bg-gradient-to-b from-bg-secondary/90 to-bg-secondary/60 border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative">
              
              {/* Close Button */}
              <button 
                onClick={() => setShowPurchaseBatchId(null)}
                className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/40 border border-white/10 hover:bg-white/15 text-white/80 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              >
                ✕
              </button>

              {/* Banner / Header */}
              <div className="relative w-full h-48 md:h-64 bg-black/60 overflow-hidden">
                <img 
                  src={banner} 
                  alt={batch.className}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-bg-secondary via-bg-secondary/40 to-transparent" />
                
                {/* Float Badge */}
                <div className="absolute bottom-4 left-6 md:left-8 flex flex-col gap-2">
                  <span className="text-[10px] font-black tracking-widest bg-accent-primary text-zinc-950 px-3 py-1 rounded-full uppercase self-start shadow-md">
                    {batch.badge || "Enrollment Open"}
                  </span>
                  <h2 className="text-2xl md:text-3xl font-display font-black text-white leading-tight drop-shadow-md">
                    {batch.className}
                  </h2>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 md:p-8">
                {/* Details Section */}
                <div className="md:col-span-2 space-y-6">
                  <div>
                    <h3 className="text-sm font-black uppercase text-accent-primary tracking-wider mb-2">
                      About this Batch
                    </h3>
                    <p className="text-sm text-text-muted leading-relaxed">
                      {batch.description || "Access structured mock modules, subject courses, DPPs, chapter lectures, and study keys."}
                    </p>
                  </div>

                  {/* Highlights Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-accent-primary/10 flex items-center justify-center text-accent-primary mt-0.5">
                        <Folder className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-[10px] uppercase font-black text-text-muted tracking-wider">Course Syllabus</h4>
                        <p className="text-xs font-bold text-white mt-0.5">{subjects.filter(s => s.classId === batch.id).length} Core Subjects</p>
                      </div>
                    </div>
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mt-0.5">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-[10px] uppercase font-black text-text-muted tracking-wider">Study Validity</h4>
                        <p className="text-xs font-bold text-white mt-0.5">{batch.validity || "Lifetime Access"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Features Included Checklist */}
                  <div>
                    <h3 className="text-sm font-black uppercase text-accent-primary tracking-wider mb-3">
                      Features Included
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-white/80">
                      {[
                        "🎥 Premium Recorded Video Lectures",
                        "📝 Daily Practice Problems (DPPs)",
                        "📑 NCERT Solutions & Revision Notes",
                        "✏️ Full Syllabus MCQ Test Series",
                        "❓ 24/7 Doubt Section Q&A Board",
                        "📥 Offline Video & PDF Downloads"
                      ].map((feat, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-xl border border-white/5">
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Instructor Biography */}
                  <div className="border-t border-white/5 pt-6">
                    <h3 className="text-sm font-black uppercase text-accent-primary tracking-wider mb-3">
                      Batch Instructor
                    </h3>
                    <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                      <div className="w-12 h-12 rounded-full bg-accent-primary/10 flex items-center justify-center text-accent-primary font-black text-xl border border-white/10">
                        {(batch.teacherName || "F")[0]}
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white">{batch.teacherName || "Senior Faculty"}</h4>
                        <p className="text-xs text-text-muted mt-0.5">Renowned educator with over 10+ years of teaching expertise.</p>
                      </div>
                    </div>
                  </div>

                  {/* Preview Video if available */}
                  {batch.previewVideoUrl && (
                    <div className="border-t border-white/5 pt-6">
                      <h3 className="text-sm font-black uppercase text-accent-primary tracking-wider mb-3">
                        Watch Intro Video
                      </h3>
                      <div className="aspect-video w-full rounded-2xl overflow-hidden border border-white/10 bg-black/40 relative">
                        <iframe
                          src={batch.previewVideoUrl.includes("youtube.com") || batch.previewVideoUrl.includes("youtu.be")
                            ? batch.previewVideoUrl.replace("watch?v=", "embed/").split("&")[0]
                            : batch.previewVideoUrl
                          }
                          title="Intro Video"
                          className="w-full h-full"
                          allowFullScreen
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Pricing / Checkout Column */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 h-fit space-y-6">
                  <div className="text-center">
                    <span className="text-[10px] uppercase font-black text-text-muted tracking-widest">
                      Special Offer Pricing
                    </span>
                    <div className="flex items-center justify-center gap-2 mt-1">
                      {hasDiscount && (
                        <span className="text-text-muted line-through text-sm font-mono">
                          ₹{batch.price}
                        </span>
                      )}
                      <span className="text-3xl font-black font-mono text-accent-primary">
                        ₹{batch.discountPrice || batch.price || 0}
                      </span>
                    </div>
                    <p className="text-[10px] text-emerald-400 mt-1 font-bold">
                      {hasDiscount ? `Save ₹${batch.price - batch.discountPrice}! Limited period offer.` : "Safe One-Time Payment"}
                    </p>
                  </div>

                  {/* Secured Checkout UPI Payment & QR Verification */}
                  <div className="border-t border-white/5 pt-4 space-y-4 text-xs">
                     <h4 className="font-bold text-center text-white/80 uppercase tracking-wide text-[10px] flex items-center justify-center gap-1">
                       <span>🔒 Secure UPI Payment checkout</span>
                     </h4>

                     <div className="bg-black/30 p-4 rounded-2xl border border-white/5 text-center space-y-3.5">
                       <p className="text-[10px] text-text-muted leading-relaxed">
                         Scan this dynamic QR Code using any UPI App (GPay, PhonePe, Paytm, etc.) to complete your transaction of <strong className="text-accent-primary">₹{amount}</strong>.
                       </p>

                       {/* Dynamic QR Code */}
                       <div className="bg-white p-2.5 rounded-2xl w-36 h-36 mx-auto shadow-lg flex items-center justify-center border border-white/10">
                         <img
                           src={qrCodeUrl}
                           alt="Payment QR Code"
                           className="w-full h-full object-contain"
                           referrerPolicy="no-referrer"
                         />
                       </div>

                       <div className="text-[10px] text-zinc-400 font-mono select-all truncate bg-black/40 px-2.5 py-1.5 rounded-xl border border-white/5">
                         UPI ID: {payUpiId}
                       </div>

                       {/* Direct App Link Redirection */}
                       <a
                         href={upiUri}
                         onClick={() => {
                           showToast("Redirecting to UPI payment app...", false);
                         }}
                         className="inline-flex items-center justify-center gap-1.5 w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all"
                       >
                         <span>⚡ Open / Pay via UPI App</span>
                       </a>
                     </div>
                     
                     <div className="space-y-3 text-left">
                       <div>
                         <label className="block text-[9px] uppercase font-bold text-text-muted mb-1">Student Registered Email</label>
                         <input 
                           type="text" 
                           disabled 
                           value={user?.email || ""} 
                           className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-[11px] text-white/60 select-none cursor-not-allowed"
                         />
                       </div>
                       <div>
                         <label className="block text-[9px] uppercase font-bold text-text-muted mb-1">Enter Payment Ref UTR / Transaction ID *</label>
                         <input 
                           type="text" 
                           required
                           placeholder="e.g. 12-digit UTR or Txn ID" 
                           value={userUtr}
                           onChange={(e) => setUserUtr(e.target.value)}
                           className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-[11px] text-white focus:outline-none focus:border-accent-primary font-mono"
                         />
                         <p className="text-[9px] text-white/30 mt-1">Please paste the transaction reference ID shown in your UPI app to verify payment.</p>
                       </div>
                     </div>

                     <button
                       onClick={handlePurchaseSimulator}
                       disabled={isPaying}
                       className="w-full bg-accent-primary hover:bg-accent-primary/90 text-zinc-950 font-black py-3 rounded-xl uppercase tracking-wider transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                     >
                       {isPaying ? (
                         <>
                           <RefreshCw className="w-4 h-4 animate-spin" />
                           <span>Submitting Proof...</span>
                         </>
                       ) : paymentSuccess ? (
                         <span>✨ Submitted Successfully!</span>
                       ) : (
                         <span>Submit Payment Details</span>
                       )}
                     </button>

                     <div className="flex items-center justify-center gap-1.5 text-[9px] text-text-muted">
                       <span>✓ SSL Encrypted QR Generation</span>
                     </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        );
      })()}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 backdrop-blur-md animate-fade-in text-xs font-bold border transition-all ${
          toast.isError 
            ? 'bg-red-500/10 text-red-500 border-red-500/20' 
            : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
        }`}>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Inline Editing Batch Modal */}
      {inlineEditingBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-white/10 rounded-3xl p-6 w-full max-w-lg space-y-4 text-left">
            <div>
              <h3 className="text-lg font-black text-white font-display">🖋️ Edit Paid Batch</h3>
              <p className="text-xs text-text-muted mt-0.5">Modify properties of this course batch standard.</p>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const data = new FormData(form);
              const updated = {
                className: data.get("className") as string,
                price: Number(data.get("price")),
                discountPrice: Number(data.get("discountPrice")),
                teacherName: data.get("teacherName") as string,
                validity: data.get("validity") as string,
                description: data.get("description") as string,
                upiId: data.get("upiId") as string,
              };
              await handleInlineSaveBatch(updated);
            }} className="space-y-3.5">
              <div>
                <label className="block text-[10px] uppercase font-black text-white/40 mb-1">Batch Name</label>
                <input
                  name="className"
                  type="text"
                  required
                  defaultValue={inlineEditingBatch.className}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-accent-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-black text-white/40 mb-1">Price (₹)</label>
                  <input
                    name="price"
                    type="number"
                    required
                    defaultValue={inlineEditingBatch.price || 0}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-accent-primary"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-black text-white/40 mb-1">Discount Price (₹)</label>
                  <input
                    name="discountPrice"
                    type="number"
                    defaultValue={inlineEditingBatch.discountPrice || 0}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-accent-primary"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-black text-white/40 mb-1">Teacher</label>
                  <input
                    name="teacherName"
                    type="text"
                    defaultValue={inlineEditingBatch.teacherName || ""}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-accent-primary"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-black text-white/40 mb-1">Validity</label>
                  <input
                    name="validity"
                    type="text"
                    defaultValue={inlineEditingBatch.validity || "Lifetime"}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-accent-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] uppercase font-black text-white/40 mb-1">UPI ID (Set for this Batch)</label>
                <input
                  name="upiId"
                  type="text"
                  placeholder="e.g. upihandle@ybl"
                  defaultValue={inlineEditingBatch.upiId || ""}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-accent-primary"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-black text-white/40 mb-1">Description</label>
                <textarea
                  name="description"
                  rows={2}
                  defaultValue={inlineEditingBatch.description || ""}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-accent-primary"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 bg-accent-primary text-zinc-950 font-black uppercase text-xs py-2.5 rounded-xl hover:opacity-90 cursor-pointer">
                  Save Changes
                </button>
                <button type="button" onClick={() => setInlineEditingBatch(null)} className="px-4 bg-white/10 text-white font-bold uppercase text-xs rounded-xl hover:bg-white/15 cursor-pointer">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inline Editing Subject Modal */}
      {inlineEditingSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-white/10 rounded-3xl p-6 w-full max-w-sm space-y-4 text-left">
            <div>
              <h3 className="text-lg font-black text-white font-display">🖋️ Edit Subject Folder</h3>
              <p className="text-xs text-text-muted mt-0.5">Modify this subject folder's details.</p>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const data = new FormData(form);
              const name = data.get("subjectName") as string;
              const isHidden = data.get("isHidden") === "true";
              await handleInlineSaveSubject(name, isHidden);
            }} className="space-y-3.5">
              <div>
                <label className="block text-[10px] uppercase font-black text-white/40 mb-1">Subject Name</label>
                <input
                  name="subjectName"
                  type="text"
                  required
                  defaultValue={inlineEditingSubject.subjectName}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-accent-primary"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-black text-white/40 mb-1">Visibility Status</label>
                <select
                  name="isHidden"
                  defaultValue={inlineEditingSubject.isHidden ? "true" : "false"}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-accent-primary"
                >
                  <option value="false">Active / Visible</option>
                  <option value="true">Hidden</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 bg-accent-primary text-zinc-950 font-black uppercase text-xs py-2.5 rounded-xl hover:opacity-90 cursor-pointer">
                  Save Changes
                </button>
                <button type="button" onClick={() => setInlineEditingSubject(null)} className="px-4 bg-white/10 text-white font-bold uppercase text-xs rounded-xl hover:bg-white/15 cursor-pointer">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inline Editing Chapter Modal */}
      {inlineEditingChapter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-white/10 rounded-3xl p-6 w-full max-w-sm space-y-4 text-left">
            <div>
              <h3 className="text-lg font-black text-white font-display">🖋️ Edit Chapter Folder</h3>
              <p className="text-xs text-text-muted mt-0.5">Modify this chapter folder's name.</p>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const data = new FormData(form);
              const name = data.get("chapterName") as string;
              await handleInlineSaveChapter(name);
            }} className="space-y-3.5">
              <div>
                <label className="block text-[10px] uppercase font-black text-white/40 mb-1">Chapter Name</label>
                <input
                  name="chapterName"
                  type="text"
                  required
                  defaultValue={inlineEditingChapter.chapterName}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-accent-primary"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 bg-accent-primary text-zinc-950 font-black uppercase text-xs py-2.5 rounded-xl hover:opacity-90 cursor-pointer">
                  Save Changes
                </button>
                <button type="button" onClick={() => setInlineEditingChapter(null)} className="px-4 bg-white/10 text-white font-bold uppercase text-xs rounded-xl hover:bg-white/15 cursor-pointer">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inline Deletion Confirmation Modal */}
      {inlineDeletingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-red-500/25 rounded-3xl p-6 w-full max-w-sm space-y-4 text-left">
            <div>
              <h3 className="text-lg font-black text-white font-display text-red-400">⚠️ Confirm Deletion</h3>
              <p className="text-xs text-text-muted mt-1.5 leading-relaxed">
                Are you sure you want to delete <strong className="text-white">{inlineDeletingItem.name}</strong>?
                This operation is <span className="text-red-400 font-bold">irreversible</span> and will perform cascading deletions of all nested folders and study materials within it.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={handleInlineDelete} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-black uppercase text-xs py-2.5 rounded-xl transition-all cursor-pointer">
                Delete Permanently
              </button>
              <button onClick={() => setInlineDeletingItem(null)} className="px-4 bg-white/10 text-white font-bold uppercase text-xs rounded-xl hover:bg-white/15 cursor-pointer">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </motion.div>
  );
}
