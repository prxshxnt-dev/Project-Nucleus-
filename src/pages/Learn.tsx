import { motion } from 'motion/react';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { Lock, BookOpen, Video, Trophy, ArrowLeft, Clock, Sparkles, PlayCircle, Loader, GraduationCap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, getDocs, doc, updateDoc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useNavigate, Link } from 'react-router-dom';
import ReactPlayer from 'react-player';
import { CustomVideoPlayer } from '../components/CustomVideoPlayer';
import SecurePdfViewer from '../components/SecurePdfViewer';
import { FloatingStickers } from '../components/FloatingStickers';
import { SyllabusRenderer, getDefaultSyllabus } from '../components/SyllabusRenderer';
import OrbitalLoader from '../components/OrbitalLoader';
import QuickNoteButton from '../components/QuickNoteButton';

const planTiers = {
  free: 0,
  notes: 1,
  lectures: 2,
  premium: 3
};

export default function Learn() {
  const { user, loading: authLoading } = useAuthStore();
  const { settings } = useSettingsStore();
  const navigate = useNavigate();

  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMaterial, setSelectedMaterial] = useState<any | null>(null);
  const [activeMaterial, setActiveMaterial] = useState<any | null>(null);
  const [secureUrl, setSecureUrl] = useState<string>('');
  const [fetchingUrl, setFetchingUrl] = useState(false);
  const [studyMinutes, setStudyMinutes] = useState(0);
  const [selectedClassGroup, setSelectedClassGroup] = useState<string>('11'); // default to 11 or user's preference

  useEffect(() => {
    if (selectedMaterial) {
      setActiveMaterial(selectedMaterial);
    } else {
      const timer = setTimeout(() => setActiveMaterial(null), 300);
      return () => clearTimeout(timer);
    }
  }, [selectedMaterial]);

  // Sync default class preference
  useEffect(() => {
    if (user?.classGroup && user.classGroup !== 'all') {
      setSelectedClassGroup(user.classGroup);
    }
  }, [user?.uid, user?.classGroup]);

  // Auth gate
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/');
    }
  }, [user?.uid, authLoading, navigate]);

  // Fetch all materials
  useEffect(() => {
    const fetchMaterials = async () => {
      if (!user) return;
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
  }, [user?.uid]);

  // Secure URL retrieval for PDFs and videos
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
            console.error("Learn.tsx fallback fetch error:", err);
            setSecureUrl(selectedMaterial.url || '');
          }).finally(() => {
            setFetchingUrl(false);
          });
        }
      }).catch(err => {
        console.error("Learn.tsx error fetching from materials_secure, trying backup:", err);
        // Backup live fetch from main details
        getDoc(doc(db, 'materials', selectedMaterial.id)).then((mSnap) => {
          if (mSnap.exists()) {
            const mData = mSnap.data();
            setSecureUrl(mData.url || mData.fileUrl || '');
          } else {
            setSecureUrl(selectedMaterial.url || '');
          }
        }).catch(fallbackErr => {
          console.error("Learn.tsx double fallback failure:", fallbackErr);
          setSecureUrl(selectedMaterial.url || '');
        }).finally(() => {
          setFetchingUrl(false);
        });
      });
    }
  }, [selectedMaterial?.id, user?.uid, user?.role, user?.unlockedMaterials?.join(',')]);

  // Tracking study minutes when learning in the Learn page as well!
  useEffect(() => {
    if (!selectedMaterial || !user) return;
    const hasSpecificAccess = user?.unlockedMaterials?.includes(selectedMaterial.id);
    const hasFullAccess = user?.role === 'admin' || user?.role === 'superadmin';
    const hasAccess = hasSpecificAccess || hasFullAccess;
    
    if (!hasAccess) return;

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
  }, [selectedMaterial?.id, user?.lastStreakDate, user?.streak, user?.uid, user?.unlockedMaterials?.join(',')]);

  if (!user) return <div className="min-h-screen"></div>;

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const filtered = materials.filter(m => {
    if (m.isHidden && !isAdmin) return false;
    // Show lessons matching specific classGroup/syllabus strictly, avoiding individual unlocked overrides unless they match the class/general
    if (selectedClassGroup === 'all') return true;
    return m.classGroup === selectedClassGroup || m.classGroup === 'all' || !m.classGroup;
  });

  // Group filtered materials by section
  const sectionsMap: { [section: string]: any[] } = {};
  filtered.forEach(m => {
    const sec = m.section || 'General Curriculum';
    if (!sectionsMap[sec]) {
      sectionsMap[sec] = [];
    }
    sectionsMap[sec].push(m);
  });

  const classOptions = ['all', '6', '7', '8', '9', '10', '11', '12', 'dropper'];

  return (
    <motion.div 
      initial={{ opacity: 0, filter: 'blur(5px)' }}
      animate={{ opacity: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, filter: 'blur(5px)' }}
      transition={{ duration: 0.5 }}
      className="min-h-screen pt-24 pb-32 px-4 md:px-12 max-w-7xl mx-auto relative text-left"
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
        
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-accent-primary/10 text-accent-primary text-xs font-black">
          <BookOpen className="w-3.5 h-3.5 animate-pulse" />
          <span>SYLLABUS PORTAL</span>
        </div>
      </div>

      {/* Beautiful Title Header */}
      <div className="mb-10 text-left bg-gradient-to-r from-bg-secondary/60 to-transparent p-6 rounded-3xl border border-border-color">
         <h1 className="text-3xl md:text-4xl font-display font-black text-text-primary leading-tight mb-2">
           Course Curriculum & Syllabus
         </h1>
         <p className="text-xs md:text-sm font-semibold text-text-muted max-w-2xl">
           Explore standard classes curriculum guides, reference PDF study templates, and video conceptual walkthrough. Select your grade option below to filter topics.
         </p>
      </div>

      {/* Modern, Highly Custom Interactive Card with Class tabs */}
      <div className="space-y-8">
        
        {/* Class selector horizontal control bar */}
        <div className="bg-glass-bg border border-border-color rounded-3xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-accent-primary shrink-0" />
            <span className="text-xs font-black uppercase tracking-widest text-accent-primary font-mono">Select Grade / Target Batch</span>
          </div>

          <div className="flex flex-wrap items-center gap-1 bg-bg-secondary p-1.5 rounded-2xl border border-border-color/60">
             {classOptions.map((cls) => (
                <button
                  key={cls}
                  onClick={() => setSelectedClassGroup(cls)}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wide transition-all cursor-pointer ${
                    selectedClassGroup === cls 
                      ? 'bg-accent-primary text-button-text shadow-md'
                      : 'text-text-secondary hover:text-text-primary hover:bg-accent-primary/10'
                  }`}
                >
                  {cls === 'all' ? 'All Classes' : cls === 'dropper' ? 'Dropper' : `Class ${cls}`}
                </button>
             ))}
          </div>
        </div>

        {/* Dynamic Detailed Class Syllabus Block */}
        {selectedClassGroup !== 'all' && (
          <div className="bg-glass-bg border border-border-color rounded-3xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-accent-primary" />
              <h2 className="text-sm sm:text-base font-display font-black text-text-primary uppercase tracking-wider">
                Class {selectedClassGroup === 'dropper' ? 'Dropper' : selectedClassGroup} Study Syllabus & Outline
              </h2>
            </div>
            <div className="p-5 rounded-2xl bg-bg-secondary border border-border-color/60 text-black">
              <SyllabusRenderer text={settings.classSyllabuses?.[selectedClassGroup] || getDefaultSyllabus(selectedClassGroup)} />
            </div>
          </div>
        )}

        {/* Dynamic Curriculum divided by sections rendering */}
        <div className="bg-glass-bg border border-border-color rounded-3xl p-6 sm:p-8 min-h-[400px]">
          {loading ? (
             <div className="space-y-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-3 animate-pulse">
                    <div className="h-6 bg-border-color/50 rounded-md w-1/4" />
                    <div className="h-24 bg-border-color/30 rounded-2xl w-full" />
                  </div>
                ))}
             </div>
          ) : Object.keys(sectionsMap).length === 0 ? (
             <div className="text-center py-20 flex flex-col items-center justify-center gap-4 text-text-muted">
                <div className="p-4 rounded-full bg-border-color/50 text-text-secondary">
                  <Lock className="w-8 h-8 opacity-60" />
                </div>
                <div className="space-y-1">
                   <h3 className="text-lg font-black text-text-primary uppercase tracking-wide">No Syllabus Materials Added</h3>
                   <p className="text-xs font-semibold max-w-sm">No chapters or resources configured in this batch. Kindly toggle another class selector option above.</p>
                </div>
             </div>
          ) : (
            <div className="space-y-12">
               {Object.entries(sectionsMap).map(([sectionName, sectionMats]) => (
                  <div key={sectionName} className="space-y-4">
                     {/* Gorgeous High Contrast Section Separator & Heading */}
                     <div className="flex items-center gap-3">
                        <h3 className="font-display font-black text-xs sm:text-sm uppercase tracking-widest text-accent-primary bg-accent-primary/10 px-4 py-2 rounded-xl border border-accent-primary/20 shadow-sm font-mono">
                          {sectionName}
                        </h3>
                        <div className="h-[1px] flex-1 bg-gradient-to-r from-border-color/80 to-transparent" />
                     </div>

                     {/* Grid of Materials in Section */}
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       {sectionMats.map((mat) => {
                          return (
                            <motion.div
                              key={mat.id}
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              whileHover={{ scale: 1.015, y: -2, boxShadow: "0 10px 25px rgba(241, 90, 41, 0.08)" }}
                              whileTap={{ scale: 0.985 }}
                              transition={{ type: "spring", stiffness: 380, damping: 30 }}
                              className="relative overflow-hidden p-4 rounded-xl bg-card border border-border-color/80 flex items-center justify-between text-left shadow-sm hover:border-accent-primary cursor-pointer transition-colors duration-200"
                              onClick={() => setSelectedMaterial(mat)}
                            >
                              <div className="absolute inset-0 bg-gradient-to-r from-accent-primary/[0.01] to-transparent pointer-events-none" />

                              <div className="flex items-center gap-3 min-w-0 pr-2">
                                 <span className="text-accent-primary text-sm font-semibold select-none shrink-0 font-mono">✦</span>
                                 <h4 className="font-display font-bold text-sm text-text-primary truncate">
                                    {mat.title}
                                 </h4>
                              </div>

                              <div className="shrink-0 flex items-center gap-2 select-none">
                                 {mat.type === 'note' ? (
                                   <span className="text-[7px] font-black tracking-wider uppercase bg-sky-500/10 text-sky-400 px-1.5 py-0.5 rounded border border-sky-400/10">Syllabus doc</span>
                                 ) : (
                                   <span className="text-[7px] font-black tracking-wider uppercase bg-[#ff839a]/10 text-[#ff839a] px-1.5 py-0.5 rounded border border-[#ff839a]/10">Video lecture</span>
                                 )}
                                 {mat.isHidden && (
                                   <span className="text-[7px] font-black tracking-wider uppercase bg-red-500/15 text-red-400 px-1.5 py-0.5 rounded">Hidden</span>
                                 )}
                              </div>
                            </motion.div>
                          );
                       })}
                     </div>
                  </div>
               ))}
            </div>
          )}
        </div>

      </div>

      {/* Material selection secure view */}
      <Dialog open={!!selectedMaterial} onOpenChange={(open) => !open && setSelectedMaterial(null)}>
        <DialogContent className="sm:max-w-[800px] bg-bg-primary border border-border-color text-text-primary p-0 overflow-hidden rounded-3xl student-secure-view">
          {activeMaterial && (
            <div className="text-left py-0">
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

              {/* Float Quick Note button if student has valid unlocks/access */}
              {user && (user?.unlockedMaterials?.includes(activeMaterial.id) || user?.role === 'admin' || user?.role === 'superadmin') && (
                <QuickNoteButton 
                  materialId={activeMaterial.id} 
                  materialTitle={activeMaterial.title}
                  userId={user.uid}
                  userEmail={user.email || ''}
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

    </motion.div>
  );
}
