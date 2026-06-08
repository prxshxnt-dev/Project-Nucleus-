import { motion, AnimatePresence } from 'motion/react';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { 
  db, 
  handleFirestoreError, 
  OperationType 
} from '../lib/firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp, 
  increment,
  onSnapshot
} from 'firebase/firestore';
import { 
  Folder, 
  FileText, 
  Video, 
  Image as ImageIcon, 
  Archive, 
  Plus, 
  Search, 
  ChevronRight, 
  ArrowLeft, 
  Download, 
  Bookmark, 
  BookmarkCheck, 
  Clock, 
  Sparkles, 
  Trash2, 
  Edit3, 
  Move, 
  Sliders,
  UploadCloud, 
  BookOpen, 
  Filter, 
  Grid, 
  List, 
  Eye, 
  FolderPlus, 
  RefreshCw, 
  Home as HomeIcon,
  HelpCircle,
  TrendingUp,
  Award,
  BookMarked
} from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import SecurePdfViewer from '../components/SecurePdfViewer';
import { CustomVideoPlayer } from '../components/CustomVideoPlayer';
import { FloatingStickers } from '../components/FloatingStickers';
import OrbitalLoader from '../components/OrbitalLoader';
import QuickNoteButton from '../components/QuickNoteButton';

// Define TS Types matches firebase-blueprint.json
interface ClassItem {
  id: string;
  className: string;
  order?: number;
}

interface SubjectItem {
  id: string;
  classId: string;
  subjectName: string;
  order?: number;
}

interface ChapterItem {
  id: string;
  subjectId: string;
  chapterName: string;
}

interface MaterialItem {
  id: string;
  title: string;
  description: string;
  classId: string;
  subjectId: string;
  chapterId: string;
  materialType: string; // 'notes', 'pyqs', 'assignments', 'dpps', 'practice_sheets', 'video_lectures', 'formula_sheets', 'mind_maps', 'sample_papers', 'tests'
  fileUrl: string;
  fileType: 'pdf' | 'video' | 'image' | 'zip';
  uploadDate: any;
  downloadCount?: number;
  bookmarks?: string[];
  createdAt?: any;
  updatedAt?: any;
  authorId?: string;
  requiredPlan?: 'free' | 'notes' | 'lectures' | 'premium';
}

const CATEGORIES = [
  { id: 'notes', label: 'Notes', color: 'from-amber-500 to-orange-600' },
  { id: 'pyqs', label: 'PYQs', color: 'from-orange-500 to-red-600' },
  { id: 'assignments', label: 'Assignments', color: 'from-red-500 to-rose-600' },
  { id: 'dpps', label: 'DPPs', color: 'from-pink-500 to-rose-600' },
  { id: 'practice_sheets', label: 'Practice Sheets', color: 'from-purple-500 to-indigo-600' },
  { id: 'video_lectures', label: 'Video Lectures', color: 'from-blue-500 to-sky-600' },
  { id: 'formula_sheets', label: 'Formula Sheets', color: 'from-teal-500 to-emerald-600' },
  { id: 'mind_maps', label: 'Mind Maps', color: 'from-emerald-500 to-green-600' },
  { id: 'sample_papers', label: 'Sample Papers', color: 'from-yellow-500 to-amber-600' },
  { id: 'tests', label: 'Tests', color: 'from-red-500 to-amber-600' }
];

export default function Library() {
  const { user, loading: authLoading } = useAuthStore();
  const { settings } = useSettingsStore();
  const navigate = useNavigate();

  // DB States
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [chapters, setChapters] = useState<ChapterItem[]>([]);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Seeding lock triggers
  const [seeding, setSeeding] = useState(false);

  // Student navigation and filter states
  const [activeTab, setActiveTab] = useState<'classes' | 'notes' | 'tests' | 'pyqs' | 'videos' | 'downloads' | 'home'>('home');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Navigation Breadcrumbs & Folder History
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // UI display settings
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Previewer modals
  const [previewMaterial, setPreviewMaterial] = useState<MaterialItem | null>(null);
  const [secureFileUrl, setSecureFileUrl] = useState<string>('');
  const [fetchingUrl, setFetchingUrl] = useState(false);

  // Admin specific UI triggers & States
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminAction, setAdminAction] = useState<'create_class' | 'create_subject' | 'create_chapter' | 'upload_material' | 'rename_folder' | 'move_material' | 'bulk_upload'>('upload_material');
  
  // Form values
  const [newClassName, setNewClassName] = useState('');
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectClassId, setNewSubjectClassId] = useState('');
  const [newChapterName, setNewChapterName] = useState('');
  const [newChapterSubjectId, setNewChapterSubjectId] = useState('');

  // Material Form
  const [matTitle, setMatTitle] = useState('');
  const [matDesc, setMatDesc] = useState('');
  const [matClassId, setMatClassId] = useState('');
  const [matSubjId, setMatSubjId] = useState('');
  const [matChapId, setMatChapId] = useState('');
  const [matType, setMatType] = useState('notes');
  const [matRequiredPlan, setMatRequiredPlan] = useState<'free' | 'notes' | 'lectures' | 'premium'>('free');
  
  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [directFileUrl, setDirectFileUrl] = useState('');

  // Move Material form
  const [movingMaterialId, setMovingMaterialId] = useState<string | null>(null);
  const [moveTargetClassId, setMoveTargetClassId] = useState('');
  const [moveTargetSubjectId, setMoveTargetSubjectId] = useState('');
  const [moveTargetChapterId, setMoveTargetChapterId] = useState('');

  // Rename modal state
  const [renameTarget, setRenameTarget] = useState<{ type: 'class' | 'subject' | 'chapter'; id: string; currentName: string } | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Notification Toast state
  const [toastMessage, setToastMessage] = useState<{ text: string; error?: boolean } | null>(null);

  const showToast = (text: string, isError = false) => {
    setToastMessage({ text, error: isError });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Auth Guard
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  // Load Main Database Collections in Real-time
  useEffect(() => {
    if (!user) return;

    setLoading(true);

    const unsubClasses = onSnapshot(collection(db, 'classes'), (snap) => {
      const classesList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassItem));
      // Sort classes by order if defined
      classesList.sort((a, b) => {
        if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
        return a.className.localeCompare(b.className);
      });
      setClasses(classesList);

      // Auto seed if empty
      if (snap.empty && !seeding) {
        seedDefaultLibrary();
      }
    }, (error) => {
      console.error(error);
      showToast('Error syncing classes.', true);
    });

    const unsubSubjects = onSnapshot(collection(db, 'subjects'), (snap) => {
      const subjectsList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SubjectItem));
      // Sort subjects by order if defined
      subjectsList.sort((a, b) => {
        if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
        return a.subjectName.localeCompare(b.subjectName);
      });
      setSubjects(subjectsList);
    }, (error) => {
      console.error(error);
    });

    const unsubChapters = onSnapshot(collection(db, 'chapters'), (snap) => {
      const chaptersList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChapterItem));
      chaptersList.sort((a, b) => a.chapterName.localeCompare(b.chapterName));
      setChapters(chaptersList);
    }, (error) => {
      console.error(error);
    });

    const unsubMaterials = onSnapshot(collection(db, 'materials'), (snap) => {
      const matsList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MaterialItem));
      setMaterials(matsList);
      setLoading(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
    });

    return () => {
      unsubClasses();
      unsubSubjects();
      unsubChapters();
      unsubMaterials();
    };
  }, [user?.uid, seeding]);

  const loadData = async () => {
    // Real-time synchronization is fully active via onSnapshot listeners. No manual refetch required.
  };

  // Seed Default Structured Material Layout Helper
  const seedDefaultLibrary = async () => {
    setSeeding(true);
    showToast('Initializing secure Class-wise Library System...', false);
    try {
      const defaultClasses = [
        { id: 'class_6', className: 'Class 6' },
        { id: 'class_7', className: 'Class 7' },
        { id: 'class_8', className: 'Class 8' },
        { id: 'class_9', className: 'Class 9' },
        { id: 'class_10', className: 'Class 10' },
        { id: 'class_11', className: 'Class 11' },
        { id: 'class_12', className: 'Class 12' },
        { id: 'class_jee', className: 'JEE' },
        { id: 'class_neet', className: 'NEET' },
        { id: 'class_droppers', className: 'Droppers' }
      ];

      // Batch Write Classes
      for (const cls of defaultClasses) {
        await setDoc(doc(db, 'classes', cls.id), { className: cls.className });
      }

      // Default Subjects Configuration
      const defaultSubjects = [
        // Class 6
        { id: 'class_6_math', classId: 'class_6', subjectName: 'Mathematics' },
        { id: 'class_6_sci', classId: 'class_6', subjectName: 'Science' },
        { id: 'class_6_eng', classId: 'class_6', subjectName: 'English' },
        { id: 'class_6_sst', classId: 'class_6', subjectName: 'Social Science' },
        // Class 11
        { id: 'class_11_phy', classId: 'class_11', subjectName: 'Physics' },
        { id: 'class_11_chem', classId: 'class_11', subjectName: 'Chemistry' },
        { id: 'class_11_math', classId: 'class_11', subjectName: 'Mathematics' },
        { id: 'class_11_bio', classId: 'class_11', subjectName: 'Biology' },
        // JEE
        { id: 'class_jee_phy', classId: 'class_jee', subjectName: 'Physics' },
        { id: 'class_jee_chem', classId: 'class_jee', subjectName: 'Chemistry' },
        { id: 'class_jee_math', classId: 'class_jee', subjectName: 'Mathematics' },
        // NEET
        { id: 'class_neet_phy', classId: 'class_neet', subjectName: 'Physics' },
        { id: 'class_neet_chem', classId: 'class_neet', subjectName: 'Chemistry' },
        { id: 'class_neet_bio', classId: 'class_neet', subjectName: 'Biology' }
      ];

      for (const subj of defaultSubjects) {
        await setDoc(doc(db, 'subjects', subj.id), { classId: subj.classId, subjectName: subj.subjectName });
      }

      // Default Chapters Configuration
      const defaultChapters = [
        { id: 'class_11_phy_units', subjectId: 'class_11_phy', chapterName: 'Units & Dimensions' },
        { id: 'class_11_phy_kin', subjectId: 'class_11_phy', chapterName: 'Kinematics' },
        { id: 'class_11_phy_nlm', subjectId: 'class_11_phy', chapterName: 'Laws of Motion' },
        { id: 'class_jee_math_cal', subjectId: 'class_jee_math', chapterName: 'Limits & Calculus' },
        { id: 'class_jee_math_coord', subjectId: 'class_jee_math', chapterName: 'Coordinate Geometry' },
        { id: 'class_neet_bio_cell', subjectId: 'class_neet_bio', chapterName: 'Cell: The Unit of Life' }
      ];

      for (const chap of defaultChapters) {
        await setDoc(doc(db, 'chapters', chap.id), { subjectId: chap.subjectId, chapterName: chap.chapterName });
      }

      // Add one sample material in Notes
      const sampleId = 'sample_notes_01';
      await setDoc(doc(db, 'materials', sampleId), {
        title: 'Units and Dimensions Formula Note',
        description: 'Complete board and JEE formula reference handbook for Class 11 Units & Dimensions.',
        classId: 'class_11',
        subjectId: 'class_11_phy',
        chapterId: 'class_11_phy_units',
        materialType: 'notes',
        fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        fileType: 'pdf',
        downloadCount: 42,
        bookmarks: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        authorId: user?.uid || 'admin',
        requiredPlan: 'free'
      });

      showToast('Library initialized with default curriculum groups.', false);
      await loadData();
    } catch (e) {
      console.error(e);
      showToast('Seeding index directory system failed.', true);
    } finally {
      setSeeding(false);
    }
  };

  // Secure Material URL retrieval & Bookmark handling
  useEffect(() => {
    if (!previewMaterial) {
      setSecureFileUrl('');
      return;
    }

    setFetchingUrl(true);
    // If Admin/Creator has uploaded or exists securely, let's load
    if (previewMaterial.fileUrl) {
      setSecureFileUrl(previewMaterial.fileUrl);
      setFetchingUrl(false);
    } else {
      getDoc(doc(db, 'materials_secure', previewMaterial.id)).then((dSnap) => {
        if (dSnap.exists()) {
          setSecureFileUrl(dSnap.data().url);
        } else {
          setSecureFileUrl('');
        }
      }).catch(err => {
        console.error(err);
      }).finally(() => {
        setFetchingUrl(false);
      });
    }

    // Increment View / Progress record automatically
    if (user) {
      const progRef = doc(db, 'users', user.uid);
      updateDoc(progRef, {
        unlockedMaterials: increment(0) // Dummy to trigger, or append to unlock lists
      }).catch(() => {});
    }

  }, [previewMaterial, user?.uid]);

  const toggleBookmark = async (materialId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!user) return;
    
    try {
      const mat = materials.find(m => m.id === materialId);
      if (!mat) return;

      const userBookmarksArray = mat.bookmarks || [];
      let updatedBookmarks = [...userBookmarksArray];

      if (userBookmarksArray.includes(user.uid)) {
        updatedBookmarks = updatedBookmarks.filter(uid => uid !== user.uid);
        showToast('Bookmark removed.');
      } else {
        updatedBookmarks.push(user.uid);
        showToast('Bookmark added successfully!');
      }

      await updateDoc(doc(db, 'materials', materialId), {
        bookmarks: updatedBookmarks
      });

      // Update local state
      setMaterials(prev => prev.map(m => m.id === materialId ? { ...m, bookmarks: updatedBookmarks } : m));
    } catch (e) {
      console.error(e);
      showToast('Bookmark state modification failed.', true);
    }
  };

  const incrementDownload = async (materialId: string) => {
    try {
      await updateDoc(doc(db, 'materials', materialId), {
        downloadCount: increment(1)
      });
      setMaterials(prev => prev.map(m => m.id === materialId ? { ...m, downloadCount: (m.downloadCount || 0) + 1 } : m));
    } catch (e) {
      console.error(e);
    }
  };

  // Upload Attachment Helper (Base64 file uploader)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const uploadFileToServer = async () => {
    if (!selectedFile || !user) return;
    setIsUploading(true);
    setUploadProgress(15);

    try {
      // FileReader to serialize file to base64
      const reader = new FileReader();
      reader.readAsDataURL(selectedFile);
      reader.onload = async () => {
        const base64Data = reader.result as string;
        setUploadProgress(50);

        const response = await fetch('/api/library/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: selectedFile.name,
            fileType: selectedFile.type,
            fileData: base64Data,
            userEmail: user.email
          })
        });

        const resData = await response.json();
        setUploadProgress(90);

        if (response.ok && resData.fileUrl) {
          setDirectFileUrl(resData.fileUrl);
          showToast('Attachment uploaded successfully to Cloud Node.');
          setUploadProgress(100);
        } else {
          showToast(resData.error || 'Cloud file write operation failed.', true);
        }
        setIsUploading(false);
      };
      reader.onerror = () => {
        showToast('Failed to parse file buffer streams.', true);
        setIsUploading(false);
      };
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || 'Host sandbox node upload error.', true);
      setIsUploading(false);
    }
  };

  // Add Directory Forms
  const handleCreateClass = async () => {
    if (!newClassName.trim()) return showToast('Class name is required!', true);
    try {
      const newId = 'class_' + newClassName.toLowerCase().replace(/[^a-z0-9]/g, '_');
      await setDoc(doc(db, 'classes', newId), { className: newClassName });
      showToast(`Structured standard ${newClassName} added.`);
      setNewClassName('');
      await loadData();
    } catch (e) {
      showToast('Error registering class standard.', true);
    }
  };

  const handleCreateSubject = async () => {
    if (!newSubjectName.trim() || !newSubjectClassId) return showToast('All fields required!', true);
    try {
      const newId = `${newSubjectClassId}_${newSubjectName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      await setDoc(doc(db, 'subjects', newId), {
        classId: newSubjectClassId,
        subjectName: newSubjectName
      });
      showToast(`Subject ${newSubjectName} cataloged successfully.`);
      setNewSubjectName('');
      await loadData();
    } catch (e) {
      showToast('Error registering subject folder.', true);
    }
  };

  const handleCreateChapter = async () => {
    if (!newChapterName.trim() || !newChapterSubjectId) return showToast('All fields required!', true);
    try {
      const newId = `${newChapterSubjectId}_${newChapterName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      await setDoc(doc(db, 'chapters', newId), {
        subjectId: newChapterSubjectId,
        chapterName: newChapterName
      });
      showToast(`Chapter ${newChapterName} registered.`);
      setNewChapterName('');
      await loadData();
    } catch (e) {
      showToast('Error creating chapter indexes.', true);
    }
  };

  // Add Material creation
  const handleUploadMaterial = async () => {
    if (!matTitle.trim() || !matClassId || !matSubjId || !matChapId || !directFileUrl) {
      return showToast('Complete all fields & upload a valid file!', true);
    }

    try {
      let fileExt = 'pdf';
      if (directFileUrl.toLowerCase().endsWith('.png') || directFileUrl.toLowerCase().endsWith('.jpg') || directFileUrl.toLowerCase().endsWith('.jpeg')) {
        fileExt = 'image';
      } else if (directFileUrl.toLowerCase().includes('youtube') || directFileUrl.toLowerCase().endsWith('.mp4') || directFileUrl.toLowerCase().endsWith('.mkv')) {
        fileExt = 'video';
      } else if (directFileUrl.toLowerCase().endsWith('.zip') || directFileUrl.toLowerCase().endsWith('.rar')) {
        fileExt = 'zip';
      }

      const matData = {
        title: matTitle,
        description: matDesc,
        classId: matClassId,
        subjectId: matSubjId,
        chapterId: matChapId,
        materialType: matType,
        fileUrl: directFileUrl,
        fileType: fileExt,
        downloadCount: 0,
        bookmarks: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        authorId: user?.uid || 'admin',
        requiredPlan: matRequiredPlan
      };

      const docRef = await addDoc(collection(db, 'materials'), matData);
      
      // Mirror to materials_secure for fallback
      await setDoc(doc(db, 'materials_secure', docRef.id), { url: directFileUrl });

      showToast('Material uploaded successfully to Database system!');
      setMatTitle('');
      setMatDesc('');
      setDirectFileUrl('');
      setSelectedFile(null);
      setUploadProgress(0);
      setShowAdminModal(false);
      await loadData();
    } catch (e) {
      showToast('Failed to insert item details in firestore catalog.', true);
    }
  };

  // Delete Action for folders or materials
  const handleDeleteMaterial = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!window.confirm('Are you sure you want to permanently delete this material? This is irreversible.')) return;
    try {
      await deleteDoc(doc(db, 'materials', id));
      await deleteDoc(doc(db, 'materials_secure', id));
      showToast('Material deleted from database.');
      await loadData();
    } catch (e) {
      showToast('Delete material operation failed.', true);
    }
  };

  const handleDeleteFolder = async (type: 'class' | 'subject' | 'chapter', id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete this ${type} folder and all its directory mappings?`)) return;
    try {
      if (type === 'class') {
        await deleteDoc(doc(db, 'classes', id));
      } else if (type === 'subject') {
        await deleteDoc(doc(db, 'subjects', id));
      } else if (type === 'chapter') {
        await deleteDoc(doc(db, 'chapters', id));
      }
      showToast(`${type} folder removed successfully.`);
      await loadData();
    } catch (e) {
      showToast('Folder deletion failed.', true);
    }
  };

  // Move Material Action
  const handleMoveMaterial = async () => {
    if (!movingMaterialId || !moveTargetClassId || !moveTargetSubjectId || !moveTargetChapterId) {
      return showToast('Select a valid destination path!', true);
    }

    try {
      await updateDoc(doc(db, 'materials', movingMaterialId), {
        classId: moveTargetClassId,
        subjectId: moveTargetSubjectId,
        chapterId: moveTargetChapterId,
        updatedAt: new Date().toISOString()
      });
      showToast('Material moved successfully to the new structure!');
      setMovingMaterialId(null);
      setMoveTargetClassId('');
      setMoveTargetSubjectId('');
      setMoveTargetChapterId('');
      setShowAdminModal(false);
      await loadData();
    } catch (e) {
      showToast('Failed to move resource across target nodes.', true);
    }
  };

  // Rename Action
  const handleRenameFolder = async () => {
    if (!renameTarget || !renameValue.trim()) return showToast('Rename value required!', true);

    try {
      if (renameTarget.type === 'class') {
        await updateDoc(doc(db, 'classes', renameTarget.id), { className: renameValue });
      } else if (renameTarget.type === 'subject') {
        await updateDoc(doc(db, 'subjects', renameTarget.id), { subjectName: renameValue });
      } else if (renameTarget.type === 'chapter') {
        await updateDoc(doc(db, 'chapters', renameTarget.id), { chapterName: renameValue });
      }
      showToast('Folder renamed successfully!');
      setRenameTarget(null);
      setRenameValue('');
      await loadData();
    } catch (e) {
      showToast('Folder rename operations failed.', true);
    }
  };

  // Filters calculation
  const filteredMaterials = materials.filter(m => {
    // Left sidebar views
    if (activeTab === 'notes' && m.materialType !== 'notes') return false;
    if (activeTab === 'tests' && m.materialType !== 'tests') return false;
    if (activeTab === 'pyqs' && m.materialType !== 'pyqs') return false;
    if (activeTab === 'videos' && m.materialType !== 'video_lectures') return false;
    if (activeTab === 'downloads' && m.downloadCount && m.downloadCount < 1) return false;

    // Hierarchy browsing filters
    if (selectedClassId && m.classId !== selectedClassId) return false;
    if (selectedSubjectId && m.subjectId !== selectedSubjectId) return false;
    if (selectedChapterId && m.chapterId !== selectedChapterId) return false;
    if (selectedCategory && m.materialType !== selectedCategory) return false;

    // Query text filters
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return m.title.toLowerCase().includes(q) || m.description.toLowerCase().includes(q);
    }

    return true;
  });

  // Derived arrays
  const bookmarkedMaterials = materials.filter(m => user && m.bookmarks?.includes(user.uid));
  const recentUploads = [...materials].sort((a,b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()).slice(0, 4);
  const mostDownloaded = [...materials].sort((a,b) => (b.downloadCount || 0) - (a.downloadCount || 0)).slice(0, 4);

  // Filter components counts
  const notesCount = materials.filter(m => m.materialType === 'notes').length;
  const testsCount = materials.filter(m => m.materialType === 'tests').length;
  const pyqsCount = materials.filter(m => m.materialType === 'pyqs').length;
  const videosCount = materials.filter(m => m.materialType === 'video_lectures').length;

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-zinc-900 pt-24 pb-32">
      <FloatingStickers />
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-28 right-6 z-50 px-6 py-3.5 rounded-2xl shadow-xl text-white text-xs font-semibold flex items-center gap-2 ${
              toastMessage.error ? 'bg-red-600' : 'bg-orange-600'
            }`}
          >
            <span>✨</span>
            <span>{toastMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-4 md:px-12">
        {/* Core Header Panel */}
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white border border-orange-100 rounded-3xl p-6 shadow-sm">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest font-bold text-orange-600 mb-1">
              <BookOpen className="w-4 h-4 animate-pulse" />
              <span>Nucleus Content Library</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-display font-black tracking-tight text-zinc-950">
              Study Guides & Resources
            </h1>
            <p className="text-xs font-semibold text-zinc-500 mt-0.5">
              Premium curated files compiled by specialized Super-IITians and Academic Doctors.
            </p>
          </div>

          <div className="flex gap-2.5">
            <button 
              onClick={loadData}
              className="px-4 py-2 text-xs font-bold border border-zinc-200 bg-white hover:bg-zinc-50 rounded-xl transition duration-200 flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
            {isAdmin && (
              <button 
                onClick={() => {
                  setAdminAction('upload_material');
                  setShowAdminModal(true);
                }}
                className="px-4 py-2 text-xs font-bold bg-orange-600 text-white hover:bg-orange-700 rounded-xl transition duration-200 flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Admin Actions</span>
              </button>
            )}
          </div>
        </div>

        {/* Workspace Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Side navigation Sidebar */}
          <div className="lg:col-span-3 bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm space-y-6 text-left">
            <div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-3 mb-2">Navigation</p>
              <nav className="space-y-1">
                {[
                  { id: 'home', label: 'Library Home', icon: HomeIcon, count: null },
                  { id: 'classes', label: 'Class Standards', icon: Folder, count: classes.length },
                  { id: 'notes', label: 'Study Notes', icon: FileText, count: notesCount },
                  { id: 'tests', label: 'Online Tests', icon: Award, count: testsCount },
                  { id: 'pyqs', label: 'JEE/NEET PYQs', icon: TrendingUp, count: pyqsCount },
                  { id: 'videos', label: 'Video Lectures', icon: Video, count: videosCount },
                  { id: 'downloads', label: 'My Downloads', icon: Download, count: materials.filter(m => m.downloadCount && m.downloadCount > 0).length }
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id as any);
                        // Reset deep hierarchies to home tabs
                        if (item.id === 'home' || item.id === 'classes') {
                          setSelectedClassId(null);
                          setSelectedSubjectId(null);
                          setSelectedChapterId(null);
                          setSelectedCategory(null);
                        }
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                        activeTab === item.id 
                          ? 'bg-orange-50 text-orange-600 shadow-sm' 
                          : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${activeTab === item.id ? 'text-orange-600' : 'text-zinc-400'}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.count !== null && (
                        <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                          activeTab === item.id ? 'bg-orange-100 text-orange-600' : 'bg-zinc-100 text-zinc-500'
                        }`}>
                          {item.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Quick Filter Section */}
            <div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-3 mb-2">Direct Categories</p>
              <div className="grid grid-cols-1 gap-1">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategory(cat.id === selectedCategory ? null : cat.id);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-left text-xs font-bold transition cursor-pointer ${
                      selectedCategory === cat.id
                        ? 'bg-orange-50 text-orange-700 border-l-2 border-orange-500'
                        : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
                    }`}
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Premium Plan Info Spot */}
            <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-orange-400/15 rounded-full pointer-events-none blur-sm" />
              <div className="z-10 relative">
                <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Batch Sync Active</span>
                </p>
                <p className="text-[11px] text-zinc-700 font-bold mt-1">
                  Selected standard course material is customized to your profile standard class ({user?.classGroup || 'All'}).
                </p>
              </div>
            </div>
          </div>

          {/* Main Area */}
          <div className="lg:col-span-9 space-y-8 text-left">
            
            {/* Search and view toggle row */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search notes, formula guides, PYQs, tests..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs font-medium bg-white border border-zinc-200 focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none rounded-2xl transition duration-150"
                />
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-2 bg-white border border-zinc-200 rounded-2xl p-1 shrink-0">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-xl transition cursor-pointer ${viewMode === 'grid' ? 'bg-orange-100 text-orange-600' : 'text-zinc-400 hover:text-zinc-600'}`}
                  title="Grid View"
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-xl transition cursor-pointer ${viewMode === 'list' ? 'bg-orange-100 text-orange-600' : 'text-zinc-400 hover:text-zinc-600'}`}
                  title="List View"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Breadcrumb Navigation trail */}
            <div className="flex flex-wrap items-center gap-2 bg-white px-4 py-2 border border-zinc-100 rounded-xl text-xs font-semibold text-zinc-500 shadow-sm">
              <button 
                onClick={() => {
                  setSelectedClassId(null);
                  setSelectedSubjectId(null);
                  setSelectedChapterId(null);
                  setSelectedCategory(null);
                }}
                className="hover:text-orange-600 cursor-pointer text-[11px]"
              >
                Study Library
              </button>
              
              {selectedClassId && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-300" />
                  <button 
                    onClick={() => {
                      setSelectedSubjectId(null);
                      setSelectedChapterId(null);
                      setSelectedCategory(null);
                    }}
                    className="hover:text-orange-600 cursor-pointer text-[11px]"
                  >
                    {classes.find(c => c.id === selectedClassId)?.className || selectedClassId}
                  </button>
                </>
              )}

              {selectedSubjectId && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-300" />
                  <button 
                    onClick={() => {
                      setSelectedChapterId(null);
                      setSelectedCategory(null);
                    }}
                    className="hover:text-orange-600 cursor-pointer text-[11px]"
                  >
                    {subjects.find(s => s.id === selectedSubjectId)?.subjectName || selectedSubjectId}
                  </button>
                </>
              )}

              {selectedChapterId && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-300" />
                  <button 
                    onClick={() => {
                      setSelectedCategory(null);
                    }}
                    className="hover:text-orange-600 cursor-pointer text-[11px]"
                  >
                    {chapters.find(c => c.id === selectedChapterId)?.chapterName || selectedChapterId}
                  </button>
                </>
              )}

              {selectedCategory && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-300" />
                  <span className="text-orange-600 text-[11px] font-bold">
                    {CATEGORIES.find(c => c.id === selectedCategory)?.label || selectedCategory}
                  </span>
                </>
              )}
            </div>

            {/* Library Home (Recommended & Spotlight) */}
            {activeTab === 'home' && !selectedClassId && (
              <div className="space-y-8">
                {/* Visual Banners and Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Bookmarks Hub spot */}
                  <div className="bg-white border border-zinc-200 p-6 rounded-3xl relative overflow-hidden shadow-sm shadow-orange-100 flex flex-col justify-between">
                    <div>
                      <div className="w-9 h-9 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600 mb-4">
                        <BookMarked className="w-5 h-5 animate-pulse" />
                      </div>
                      <h3 className="text-sm font-black text-zinc-900 uppercase tracking-tight">Bookmarks Vault</h3>
                      <p className="text-xs text-zinc-500 mt-1">Quick retrieval of flagged assignments and formula Mind Maps.</p>
                    </div>
                    
                    <div className="mt-6 flex flex-col gap-2">
                      {bookmarkedMaterials.map(m => (
                        <div 
                          key={m.id} 
                          onClick={() => setPreviewMaterial(m)}
                          className="p-2 border border-zinc-100 bg-zinc-50 hover:bg-orange-50/50 rounded-xl flex items-center justify-between text-xs font-bold text-zinc-800 cursor-pointer transition"
                        >
                          <span className="truncate max-w-[80%]">{m.title}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
                        </div>
                      ))}
                      {bookmarkedMaterials.length === 0 && (
                        <p className="text-xs text-zinc-400 italic">No bookmarked materials yet. Tap bookmark on files to list here!</p>
                      )}
                    </div>
                  </div>

                  {/* Syllabus Match Indicator Card */}
                  <div className="bg-white border border-zinc-200 p-6 rounded-3xl relative overflow-hidden shadow-sm shadow-orange-100 flex flex-col justify-between">
                    <div>
                      <div className="w-9 h-9 rounded-2xl bg-[#ff8a9e]/10 flex items-center justify-center text-[#ff8a9e] mb-4">
                        <Award className="w-5 h-5 animate-bounce" />
                      </div>
                      <h3 className="text-sm font-black text-zinc-900 uppercase tracking-tight">Active Batch Progression</h3>
                      <p className="text-xs text-zinc-500 mt-1">Interactive modules specifically matched for you based on Class selection.</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">My Current Standard</span>
                        <span className="text-xs font-black text-orange-600 uppercase">Class {user?.classGroup || 'All'}</span>
                      </div>
                      <Link 
                        to="/dashboard"
                        className="px-3.5 py-1.5 text-[10px] font-bold bg-[#FAF9F5] hover:bg-zinc-100 border border-zinc-200 text-zinc-800 rounded-xl transition"
                      >
                        Adjust Batch ⚙️
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Structured Classes List Folders */}
                <div>
                  <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4">Browse Directory Folders</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                    {classes.map((cls) => (
                      <div
                        key={cls.id}
                        onClick={() => {
                          setSelectedClassId(cls.id);
                          setActiveTab('classes');
                        }}
                        className="bg-white p-5 border border-zinc-200 rounded-3xl hover:border-orange-400/60 hover:shadow-md transition duration-250 cursor-pointer text-center relative group"
                      >
                        {isAdmin && (
                          <button 
                            onClick={(e) => handleDeleteFolder('class', cls.id, e)}
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 text-zinc-400 hover:text-red-500 rounded-lg hover:bg-red-50/50 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <div className="w-12 h-12 bg-orange-100/35 rounded-2xl flex items-center justify-center mx-auto text-orange-500 mb-3 group-hover:scale-110 transition duration-200">
                          <Folder className="w-6 h-6 fill-current" />
                        </div>
                        <span className="text-xs font-black text-zinc-900 block truncate">{cls.className}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Uploads Section */}
                <div>
                  <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4">Recently Added Study Materials</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {recentUploads.map(m => (
                      <div
                        key={m.id}
                        onClick={() => setPreviewMaterial(m)}
                        className="p-4 border border-zinc-200 bg-white hover:border-orange-300 rounded-2xl flex items-center gap-4 transition cursor-pointer"
                      >
                        <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center flex-shrink-0">
                          {m.fileType === 'pdf' ? <FileText className="w-5 h-5" /> : m.fileType === 'video' ? <Video className="w-5 h-5" /> : <Archive className="w-5 h-5" />}
                        </div>
                        <div className="overflow-hidden flex-1 text-left">
                          <span className="text-[10px] font-bold text-orange-500 uppercase tracking-wide">{m.materialType}</span>
                          <h4 className="text-xs font-bold text-zinc-900 truncate leading-snug">{m.title}</h4>
                          <p className="text-[10px] text-zinc-500 truncate mt-0.5">{m.description}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-zinc-300" />
                      </div>
                    ))}
                    {recentUploads.length === 0 && (
                      <p className="text-xs text-zinc-400 italic">No study materials in the library catalog yet.</p>
                    )}
                  </div>
                </div>

                {/* Most Downloaded Section */}
                <div>
                  <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4">Most Downloaded Reference Sheets</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {mostDownloaded.map(m => (
                      <div
                        key={m.id}
                        onClick={() => setPreviewMaterial(m)}
                        className="p-4 border border-zinc-200 bg-white hover:border-orange-300 rounded-2xl flex items-center gap-4 transition cursor-pointer"
                      >
                        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                          <Download className="w-5 h-5" />
                        </div>
                        <div className="overflow-hidden flex-1 text-left">
                          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wide">{m.downloadCount || 0} Downloads</span>
                          <h4 className="text-xs font-bold text-zinc-900 truncate leading-snug">{m.title}</h4>
                          <p className="text-[10px] text-zinc-500 truncate mt-0.5">{m.description}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-zinc-300" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Folder Browsing Views */}
            {activeTab === 'classes' && (
              <div>
                {/* 0. No Class Node Selected -> Show Class standard selection folders */}
                {!selectedClassId && (
                  <div className="space-y-6">
                    <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest">
                      Select Class Standard
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                      {classes.map((cls) => (
                        <div
                          key={cls.id}
                          onClick={() => {
                            setSelectedClassId(cls.id);
                          }}
                          className="bg-white p-5 border border-zinc-200 rounded-3xl hover:border-orange-400/60 hover:shadow-md transition duration-250 cursor-pointer text-center relative group"
                        >
                          {isAdmin && (
                            <button 
                              onClick={(e) => handleDeleteFolder('class', cls.id, e)}
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 text-zinc-400 hover:text-red-500 rounded-lg hover:bg-red-50/50 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <div className="w-12 h-12 bg-orange-100/35 rounded-2xl flex items-center justify-center mx-auto text-orange-500 mb-3 group-hover:scale-110 transition duration-200">
                            <Folder className="w-6 h-6 fill-current" />
                          </div>
                          <span className="text-xs font-black text-zinc-900 block truncate">{cls.className}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 1. Classes Node Selected -> Show Subjects Belonging to Class */}
                {selectedClassId && !selectedSubjectId && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setSelectedClassId(null)}
                        className="p-1 px-2 text-xs font-bold border border-zinc-200 hover:bg-zinc-50 rounded-lg flex items-center gap-1 cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>All Standards</span>
                      </button>
                      <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest">
                        {classes.find(c => c.id === selectedClassId)?.className} Subjects
                      </h3>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {subjects.filter(s => s.classId === selectedClassId).map((subj) => (
                        <div
                          key={subj.id}
                          onClick={() => setSelectedSubjectId(subj.id)}
                          className="bg-white p-5 border border-zinc-200 rounded-3xl hover:border-orange-400/65 hover:shadow-md transition duration-250 cursor-pointer text-center relative group"
                        >
                          {isAdmin && (
                            <button 
                              onClick={(e) => handleDeleteFolder('subject', subj.id, e)}
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 text-zinc-400 hover:text-red-500 rounded-lg hover:bg-red-50/50 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto text-amber-500 mb-3">
                            <Folder className="w-6 h-6 fill-current" />
                          </div>
                          <span className="text-xs font-black text-zinc-900 block truncate">{subj.subjectName}</span>
                        </div>
                      ))}
                      {subjects.filter(s => s.classId === selectedClassId).length === 0 && (
                        <p className="text-xs text-zinc-400 italic p-4 col-span-full">No subjects cataloged under this class yet.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* 2. Subject Node Selected -> Show Chapters Belonging to Subject */}
                {selectedSubjectId && !selectedChapterId && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setSelectedSubjectId(null)}
                        className="p-1 px-2 text-xs font-bold border border-zinc-200 hover:bg-zinc-50 rounded-lg flex items-center gap-1 cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>All Subjects</span>
                      </button>
                      <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest">
                        Chapters in {subjects.find(s => s.id === selectedSubjectId)?.subjectName}
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {chapters.filter(c => c.subjectId === selectedSubjectId).map((chap) => (
                        <div
                          key={chap.id}
                          onClick={() => setSelectedChapterId(chap.id)}
                          className="bg-white p-4 border border-zinc-200 rounded-2xl hover:border-orange-400/60 transition duration-250 cursor-pointer flex items-center gap-3 relative group text-left"
                        >
                          <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center">
                            <Folder className="w-5 h-5 fill-current" />
                          </div>
                          <div className="flex-1 overflow-hidden">
                            <span className="text-xs font-black text-zinc-950 block truncate">{chap.chapterName}</span>
                          </div>
                          {isAdmin && (
                            <button 
                              onClick={(e) => handleDeleteFolder('chapter', chap.id, e)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-red-500 rounded-lg hover:bg-red-50/50 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <ChevronRight className="w-4 h-4 text-zinc-300" />
                        </div>
                      ))}
                      {chapters.filter(c => c.subjectId === selectedSubjectId).length === 0 && (
                        <p className="text-xs text-zinc-400 italic p-4 col-span-full">No chapter subfolders index created for this subject yet.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* 3. Deep Browsing (Chapter Selected) -> Displays Categories Notes/PYQs/DPPs etc folder hubs */}
                {selectedChapterId && !selectedCategory && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setSelectedChapterId(null)}
                        className="p-1 px-2 text-xs font-bold border border-zinc-200 hover:bg-zinc-50 rounded-lg flex items-center gap-1 cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>All Chapters</span>
                      </button>
                      <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest">
                        Category Folders inside {chapters.find(c => c.id === selectedChapterId)?.chapterName}
                      </h3>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {CATEGORIES.map((cat) => {
                        const itemsLength = materials.filter(m => m.chapterId === selectedChapterId && m.materialType === cat.id).length;
                        return (
                          <div
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className="bg-white border border-zinc-200 p-5 rounded-3xl hover:border-orange-400/60 hover:shadow-sm transition cursor-pointer text-center relative group"
                          >
                            <div className={`w-11 h-11 rounded-2xl bg-gradient-to-tr ${cat.color} opacity-85 text-white flex items-center justify-center mx-auto mb-3`}>
                              <Folder className="w-5.5 h-5.5 fill-current" />
                            </div>
                            <span className="text-xs font-black text-zinc-900 block truncate">{cat.label}</span>
                            <span className="text-[10px] font-bold text-zinc-400 block mt-1">{itemsLength} files</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 4. Categorized files listings */}
                {selectedCategory && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setSelectedCategory(null)}
                        className="p-1 px-2 text-xs font-bold border border-zinc-200 hover:bg-zinc-50 rounded-lg flex items-center gap-1 cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>All Categories</span>
                      </button>
                      <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest">
                        {CATEGORIES.find(c => c.id === selectedCategory)?.label} Files
                      </h3>
                    </div>

                    {/* Renders material items lists below */}
                  </div>
                )}
              </div>
            )}

            {/* General Filtered Materials Feed View */}
            {(activeTab !== 'home' && (!selectedClassId || selectedCategory || activeTab !== 'classes')) && (
              <div>
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredMaterials.map((mat) => {
                      const isBookmarked = mat.bookmarks?.includes(user?.uid || '');
                      return (
                        <div
                          key={mat.id}
                          onClick={() => setPreviewMaterial(mat)}
                          className="bg-white border border-zinc-200 hover:border-orange-400/50 hover:shadow-md rounded-2xl p-5 transition duration-200 flex flex-col justify-between cursor-pointer relative group text-left"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="px-2 py-0.5 rounded-lg bg-orange-50 text-[10px] uppercase font-black tracking-wide text-orange-600">
                                {CATEGORIES.find(c => c.id === mat.materialType)?.label || mat.materialType}
                              </span>

                              <div className="flex items-center gap-1">
                                <button
                                  onClick={(e) => toggleBookmark(mat.id, e)}
                                  className="p-1.5 text-zinc-400 hover:text-orange-500 rounded-lg hover:bg-zinc-100 transition"
                                  title="Bookmark"
                                >
                                  {isBookmarked ? (
                                    <BookmarkCheck className="w-3.5 h-3.5 text-orange-600 fill-current" />
                                  ) : (
                                    <Bookmark className="w-3.5 h-3.5" />
                                  )}
                                </button>

                                {isAdmin && (
                                  <>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setMovingMaterialId(mat.id);
                                        setMoveTargetClassId(mat.classId);
                                        setMoveTargetSubjectId(mat.subjectId);
                                        setMoveTargetChapterId(mat.chapterId);
                                        setAdminAction('move_material');
                                        setShowAdminModal(true);
                                      }}
                                      className="p-1.5 text-zinc-400 hover:text-orange-600 rounded-lg hover:bg-zinc-100 transition"
                                      title="Move Materials"
                                    >
                                      <Move className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={(e) => handleDeleteMaterial(mat.id, e)}
                                      className="p-1.5 text-zinc-400 hover:text-red-500 rounded-lg hover:bg-red-5/50 transition"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>

                            <h3 className="text-xs font-black text-zinc-950 leading-snug">
                              {mat.title}
                            </h3>
                            <p className="text-[11px] text-zinc-500 mt-1 line-clamp-2">
                              {mat.description}
                            </p>
                          </div>

                          <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-[11px] font-semibold text-zinc-400">
                            <span className="flex items-center gap-1">
                              <Download className="w-3.5 h-3.5" />
                              <span>{mat.downloadCount || 0} hits</span>
                            </span>
                            <span className="capitalize text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-lg text-[9px] font-bold">
                              {mat.fileType || 'pdf'}
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    {filteredMaterials.length === 0 && (
                      <div className="col-span-full py-16 text-center bg-white border border-zinc-200 rounded-3xl p-6 text-zinc-400 text-xs italic">
                        No materials found matching current filters.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="border border-zinc-200 bg-white rounded-3xl overflow-hidden divide-y divide-zinc-100 shadow-sm">
                    {filteredMaterials.map((mat) => {
                      const isBookmarked = mat.bookmarks?.includes(user?.uid || '');
                      return (
                        <div
                          key={mat.id}
                          onClick={() => setPreviewMaterial(mat)}
                          className="p-4 flex items-center justify-between gap-4 hover:bg-zinc-50/50 cursor-pointer transition text-left"
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-9 h-9 rounded-xl bg-orange-100/40 text-orange-600 flex items-center justify-center flex-shrink-0">
                              {mat.fileType === 'pdf' ? (
                                <FileText className="w-4 h-4" />
                              ) : mat.fileType === 'video' ? (
                                <Video className="w-4 h-4" />
                              ) : (
                                <Archive className="w-4 h-4" />
                              )}
                            </div>
                            <div className="overflow-hidden">
                              <h4 className="text-xs font-black text-zinc-950 truncate leading-snug">
                                {mat.title}
                              </h4>
                              <p className="text-[10px] text-zinc-500 truncate mt-0.5">
                                {mat.description}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-zinc-100 text-zinc-500 text-[10px] font-bold uppercase">
                              {mat.materialType}
                            </span>
                            
                            <button
                              onClick={(e) => toggleBookmark(mat.id, e)}
                              className="p-1 text-zinc-400 hover:text-orange-500 rounded-lg transition"
                            >
                              {isBookmarked ? (
                                <BookmarkCheck className="w-4 h-4 text-orange-600 fill-current" />
                              ) : (
                                <Bookmark className="w-4 h-4" />
                              )}
                            </button>

                            {isAdmin && (
                              <button
                                onClick={(e) => handleDeleteMaterial(mat.id, e)}
                                className="p-1 text-zinc-400 hover:text-red-500 rounded-lg transition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}

                            <ChevronRight className="w-4 h-4 text-zinc-300" />
                          </div>
                        </div>
                      );
                    })}

                    {filteredMaterials.length === 0 && (
                      <p className="p-8 text-center text-zinc-400 text-xs italic">
                        No materials matching target filter paths.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modern Dialog Previewer and Admin Modal panel drawer fallback popups */}
      {previewMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-md p-4">
          <div className="w-full max-w-4xl bg-white rounded-3xl border border-zinc-200 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="bg-zinc-50 px-6 py-4 border-b border-zinc-200 flex justify-between items-center shrink-0">
              <div className="text-left">
                <span className="text-[10px] font-bold text-orange-600 uppercase tracking-widest bg-orange-50 px-2 py-0.5 rounded-md">
                  Preview Study Document
                </span>
                <h3 className="text-sm font-black text-zinc-950 block truncate mt-1">
                  {previewMaterial.title}
                </h3>
              </div>
              <button 
                onClick={() => setPreviewMaterial(null)}
                className="p-1 px-3 text-xs bg-zinc-200 hover:bg-zinc-300 rounded-xl transition font-bold"
              >
                Close ✕
              </button>
            </div>

            {/* Display viewer */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#FAF9F5] flex flex-col items-center justify-center">
              {fetchingUrl ? (
                <div className="py-20 text-center text-zinc-400 flex flex-col items-center gap-2">
                  <OrbitalLoader size="md" text="Retrieving direct secure URL..." />
                </div>
              ) : secureFileUrl ? (
                <div className="w-full h-full min-h-[450px]">
                  {previewMaterial.fileType === 'pdf' ? (
                    <div className="w-full h-full border border-zinc-200 rounded-2xl overflow-hidden shadow-inner">
                      <SecurePdfViewer url={secureFileUrl} title={previewMaterial.title} />
                    </div>
                  ) : previewMaterial.fileType === 'video' ? (
                    <div className="w-full h-full max-w-2xl mx-auto rounded-2xl overflow-hidden bg-black flex items-center justify-center shadow-lg">
                      <CustomVideoPlayer url={secureFileUrl} playing={true} course={previewMaterial} />
                    </div>
                  ) : previewMaterial.fileType === 'image' ? (
                    <div className="max-w-md mx-auto rounded-2xl overflow-hidden bg-white border p-3 flex items-center justify-center shadow-md">
                      <img src={secureFileUrl} alt={previewMaterial.title} className="max-w-full h-auto object-contain rounded-xl shadow-inner" />
                    </div>
                  ) : (
                    <div className="py-16 text-center text-zinc-500 space-y-4">
                      <Archive className="w-12 h-12 mx-auto text-zinc-400 animate-bounce" />
                      <p className="text-xs font-bold">This is a structured document file payload ({previewMaterial.fileType || 'zip'}) that cannot be previewed natively.</p>
                      <button
                        onClick={() => {
                          incrementDownload(previewMaterial.id);
                          window.open(secureFileUrl, '_blank');
                        }}
                        className="px-6 py-2.5 text-xs font-bold bg-orange-600 text-white rounded-xl shadow hover:bg-orange-700 transition flex items-center gap-1.5 mx-auto cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download Extension File Now</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-16 text-center space-y-3">
                  <p className="text-xs font-bold text-red-500">Access Denied logic restriction active.</p>
                  <p className="text-xs text-zinc-500">Your current plan subscription profile doesn't unlock files with plan limits: {previewMaterial.requiredPlan || 'basic'}.</p>
                </div>
              )}
            </div>

            {/* Modal Bottom control features */}
            <div className="bg-zinc-50 px-6 py-4 border-t border-zinc-200 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
              <span className="text-[10px] font-bold text-zinc-400 select-none">
                Nucleus DRM Block protection prevents copying, screenshotting, or print dumping.
              </span>
              <div className="flex gap-2">
                {secureFileUrl && (
                  <button
                    onClick={() => {
                      incrementDownload(previewMaterial.id);
                      window.open(secureFileUrl, '_blank');
                    }}
                    className="px-4 py-2 text-xs font-bold border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-orange-600" />
                    <span>Download File</span>
                  </button>
                )}
                <button 
                  onClick={() => setPreviewMaterial(null)}
                  className="px-5 py-2 text-xs font-bold bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition cursor-pointer"
                >
                  Return to Directory
                </button>
              </div>
            </div>
          </div>
          
          {/* Quick mind note floating trigger */}
          {user && secureFileUrl && (
            <QuickNoteButton
              materialId={previewMaterial.id}
              materialTitle={previewMaterial.title}
              userId={user.uid}
              userEmail={user.email || ''}
            />
          )}
        </div>
      )}

      {/* Admin Operations Dialog Panel drawer */}
      {showAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[#FAF9F5] border border-orange-100 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="bg-white border-b border-zinc-200 px-6 py-4 flex items-center justify-between">
              <div className="text-left">
                <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest flex items-center gap-1">
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Admin Library Workspace</span>
                </span>
                <h3 className="text-sm font-black text-zinc-950 mt-1">Configure Directory System</h3>
              </div>
              <button 
                onClick={() => setShowAdminModal(false)}
                className="p-1 px-3 text-xs bg-zinc-200 hover:bg-zinc-300 rounded-xl transition"
              >
                Close ✕
              </button>
            </div>

            {/* Mode selection tabs */}
            <div className="bg-white border-b border-zinc-200 px-6 py-2 flex gap-2 overflow-x-auto shrink-0 select-none">
              {[
                { id: 'create_class', label: '+ Class' },
                { id: 'create_subject', label: '+ Subject' },
                { id: 'create_chapter', label: '+ Chapter' },
                { id: 'upload_material', label: '+ Material' },
                { id: 'move_material', label: 'Move Material' }
              ].map((act) => (
                <button
                  key={act.id}
                  onClick={() => setAdminAction(act.id as any)}
                  className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wide rounded-lg whitespace-nowrap transition cursor-pointer ${
                    adminAction === act.id ? 'bg-orange-600 text-white shadow-sm' : 'text-zinc-500 hover:bg-zinc-50'
                  }`}
                >
                  {act.label}
                </button>
              ))}
            </div>

            {/* Option specific rendering forms */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-left">
              {adminAction === 'create_class' && (
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-zinc-800 uppercase">Create Standard Folder</h4>
                  <p className="text-[10px] text-zinc-500">Registers a new class standard hierarchy node in the study material index tree.</p>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-600 block mb-1">Class Standard Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Class 11, Class 12, JEE, NEET"
                      value={newClassName}
                      onChange={(e) => setNewClassName(e.target.value)}
                      className="w-full text-xs font-medium border border-zinc-200 focus:border-orange-400 p-2.5 rounded-xl bg-white outline-none"
                    />
                  </div>
                  <button
                    onClick={handleCreateClass}
                    className="w-full text-xs font-bold py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl shadow transition mt-2 cursor-pointer"
                  >
                    Create Structure Node
                  </button>
                </div>
              )}

              {adminAction === 'create_subject' && (
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-zinc-800 uppercase">Catalog Subject Folder</h4>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-600 block mb-1">Parent Standard Class</label>
                    <select
                      value={newSubjectClassId}
                      onChange={(e) => setNewSubjectClassId(e.target.value)}
                      className="w-full text-xs font-medium border border-zinc-200 p-2.5 rounded-xl bg-white outline-none"
                    >
                      <option value="">Select Parent Class...</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.className}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-600 block mb-1">Subject Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Physics, Chemistry, Biology"
                      value={newSubjectName}
                      onChange={(e) => setNewSubjectName(e.target.value)}
                      className="w-full text-xs font-medium border border-zinc-200 focus:border-orange-400 p-2.5 rounded-xl bg-white outline-none"
                    />
                  </div>
                  <button
                    onClick={handleCreateSubject}
                    className="w-full text-xs font-bold py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl shadow transition mt-2 cursor-pointer"
                  >
                    Catalog Subject Node
                  </button>
                </div>
              )}

              {adminAction === 'create_chapter' && (
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-zinc-800 uppercase">Add Chapter Subfolder</h4>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-600 block mb-1">Parent Subject</label>
                    <select
                      value={newChapterSubjectId}
                      onChange={(e) => setNewChapterSubjectId(e.target.value)}
                      className="w-full text-xs font-medium border border-zinc-200 p-2.5 rounded-xl bg-white outline-none"
                    >
                      <option value="">Select Subject Folder...</option>
                      {subjects.map(s => (
                        <option key={s.id} value={s.id}>
                          {classes.find(c => c.id === s.classId)?.className} — {s.subjectName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-600 block mb-1">Chapter Subfolder Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Kinematics, Mole Concept, Cell Biology"
                      value={newChapterName}
                      onChange={(e) => setNewChapterName(e.target.value)}
                      className="w-full text-xs font-medium border border-zinc-200 p-2.5 rounded-xl bg-white outline-none"
                    />
                  </div>
                  <button
                    onClick={handleCreateChapter}
                    className="w-full text-xs font-bold py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl shadow transition mt-2 cursor-pointer"
                  >
                    Create Chapter Subfolder
                  </button>
                </div>
              )}

              {adminAction === 'upload_material' && (
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-zinc-800 uppercase">Upload Premium Material</h4>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-zinc-600 block mb-1">Target Class</label>
                      <select
                        value={matClassId}
                        onChange={(e) => setMatClassId(e.target.value)}
                        className="w-full text-xs font-medium border border-zinc-200 p-2.5 rounded-xl bg-white"
                      >
                        <option value="">Select Class...</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.className}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-zinc-600 block mb-1">Target Subject</label>
                      <select
                        value={matSubjId}
                        onChange={(e) => setMatSubjId(e.target.value)}
                        className="w-full text-xs font-medium border border-zinc-200 p-2.5 rounded-xl bg-white"
                      >
                        <option value="">Select Subject...</option>
                        {subjects.filter(s => s.classId === matClassId).map(s => <option key={s.id} value={s.id}>{s.subjectName}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-zinc-600 block mb-1">Target Chapter Folder</label>
                    <select
                      value={matChapId}
                      onChange={(e) => setMatChapId(e.target.value)}
                      className="w-full text-xs font-medium border border-zinc-200 p-2.5 rounded-xl bg-white"
                    >
                      <option value="">Select Chapter...</option>
                      {chapters.filter(c => c.subjectId === matSubjId).map(c => <option key={c.id} value={c.id}>{c.chapterName}</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-zinc-600 block mb-1">Category Type</label>
                      <select
                        value={matType}
                        onChange={(e) => setMatType(e.target.value)}
                        className="w-full text-xs font-medium border border-zinc-200 p-2.5 rounded-xl bg-white"
                      >
                        {CATEGORIES.map(cat => <option key={cat.id} value={cat.id}>{cat.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-zinc-600 block mb-1">Access Tier Lock</label>
                      <select
                        value={matRequiredPlan}
                        onChange={(e) => setMatRequiredPlan(e.target.value as any)}
                        className="w-full text-xs font-medium border border-zinc-200 p-2.5 rounded-xl bg-white"
                      >
                        <option value="free">Free Access</option>
                        <option value="notes">Notes Tier</option>
                        <option value="lectures">Lectures Tier</option>
                        <option value="premium">Premium Access</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-zinc-600 block mb-1">Material Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Kinematics Formula Notes Handout"
                      value={matTitle}
                      onChange={(e) => setMatTitle(e.target.value)}
                      className="w-full text-xs font-medium border border-zinc-200 p-2.5 rounded-xl bg-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-zinc-600 block mb-1">Brief Description</label>
                    <textarea
                      placeholder="e.g. Complete chapter formulas summary, tricks and sample PYQ calculations"
                      value={matDesc}
                      onChange={(e) => setMatDesc(e.target.value)}
                      className="w-full text-xs font-medium border border-zinc-200 p-2.5 rounded-xl bg-white outline-none h-16"
                    />
                  </div>

                  {/* Attachment Upload Panel with Drag and Drop feedback */}
                  <div className="p-4 border-2 border-dashed border-zinc-300 rounded-2xl bg-zinc-50 flex flex-col items-center justify-center text-center">
                    <UploadCloud className="w-8 h-8 text-zinc-400 mb-2 animate-bounce" />
                    <p className="text-[10px] font-bold text-zinc-600">Drag or select PDF, Video, Image, or ZIP here</p>
                    <input 
                      type="file" 
                      onChange={handleFileChange} 
                      className="hidden" 
                      id="admin-library-uploader-file" 
                    />
                    <label 
                      htmlFor="admin-library-uploader-file"
                      className="mt-2 text-[10px] uppercase tracking-wider bg-orange-600 text-white font-bold p-1 px-3 rounded-md hover:bg-orange-700 transition cursor-pointer"
                    >
                      Select Document ...
                    </label>
                    {selectedFile && (
                      <div className="mt-3 w-full space-y-1.5">
                        <p className="text-[10px] text-orange-600 font-bold truncate">File: {selectedFile.name}</p>
                        <button
                          onClick={uploadFileToServer}
                          disabled={isUploading}
                          className="px-4 py-1.5 bg-orange-600 text-white rounded-lg text-[10px] font-bold hover:bg-orange-700 transition flex items-center justify-center gap-1 mx-auto cursor-pointer"
                        >
                          {isUploading ? `Uploading ${uploadProgress}%` : 'Execute Sandbox Upload'}
                        </button>
                      </div>
                    )}
                    {directFileUrl && (
                      <p className="text-[9px] text-green-600 font-bold mt-1 max-w-full truncate">Mounted: {directFileUrl}</p>
                    )}
                  </div>

                  <button
                    onClick={handleUploadMaterial}
                    disabled={!directFileUrl}
                    className="w-full text-xs font-bold py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl shadow transition mt-2 disabled:bg-zinc-300 cursor-pointer"
                  >
                    Catalog Study material
                  </button>
                </div>
              )}

              {adminAction === 'move_material' && (
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-zinc-800 uppercase">Relocate Materials inside Hierarchy</h4>
                  <p className="text-[10px] text-zinc-500">Relocates materials between target Classes, Subjects, and Chapters smoothly.</p>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-600 block mb-1">Select Material to Relocate</label>
                    <select
                      value={movingMaterialId || ''}
                      onChange={(e) => setMovingMaterialId(e.target.value)}
                      className="w-full text-xs font-medium border border-zinc-200 p-2.5 rounded-xl bg-white"
                    >
                      <option value="">Choose item...</option>
                      {materials.map(m => (
                        <option value={m.id} key={m.id}>{m.title}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-zinc-600 block mb-1">Destination Class</label>
                      <select
                        value={moveTargetClassId}
                        onChange={(e) => setMoveTargetClassId(e.target.value)}
                        className="w-full text-xs font-medium border border-zinc-200 p-2.5 rounded-xl bg-white"
                      >
                        <option value="">Select Destination...</option>
                        {classes.map(c => <option value={c.id} key={c.id}>{c.className}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-zinc-600 block mb-1">Destination Subject</label>
                      <select
                        value={moveTargetSubjectId}
                        onChange={(e) => setMoveTargetSubjectId(e.target.value)}
                        className="w-full text-xs font-medium border border-zinc-200 p-2.5 rounded-xl bg-white"
                      >
                        <option value="">Select Subject...</option>
                        {subjects.filter(s => s.classId === moveTargetClassId).map(s => <option value={s.id} key={s.id}>{s.subjectName}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-zinc-600 block mb-1">Destination Chapter</label>
                    <select
                      value={moveTargetChapterId}
                      onChange={(e) => setMoveTargetChapterId(e.target.value)}
                      className="w-full text-xs font-medium border border-zinc-200 p-2.5 rounded-xl bg-white"
                    >
                      <option value="">Select Chapter...</option>
                      {chapters.filter(c => c.subjectId === moveTargetSubjectId).map(c => <option value={c.id} key={c.id}>{c.chapterName}</option>)}
                    </select>
                  </div>

                  <button
                    onClick={handleMoveMaterial}
                    className="w-full text-xs font-bold py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl shadow transition mt-2 cursor-pointer"
                  >
                    Move Document Item
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
