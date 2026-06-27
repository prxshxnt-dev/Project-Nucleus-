import { create } from "zustand";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth, handleFirestoreError, OperationType } from "../lib/firebase";

export interface ClassItem {
  id: string;
  className: string;
  order?: number;
  isHidden?: boolean;
  createdAt?: any;
}

export interface SubjectItem {
  id: string;
  classId: string;
  subjectName: string;
  order?: number;
  isHidden?: boolean;
  hiddenCategories?: string[];
  createdAt?: any;
}

export interface ChapterItem {
  id: string;
  classId: string;
  subjectId: string;
  chapterName: string;
  createdAt?: any;
}

export interface MaterialItem {
  id: string;
  title: string;
  description?: string;
  url: string;
  type: string; // e.g. "note" | "lecture"
  materialType: string; // e.g. "notes" | "pyqs" | "assignments" | "dpps" | "video_lectures" | "formula_sheets" | "tests"
  classId: string;
  subjectId: string;
  chapterId: string;
  classGroup: string;
  thumbnailUrl: string;
  isHidden: boolean;
  requiredPlan?: "free" | "notes" | "lectures" | "premium" | string;
  downloadCount: number;
  bookmarks: string[];
  createdAt?: any;
  isCloudSynced?: boolean;
  cloudUrl?: string;
}

export interface McqQuestion {
  questionText: string;
  options: string[];
  correctOptionIndex: number;
  explanation?: string;
}

export interface McqTestItem {
  id: string;
  title: string;
  description?: string;
  classId: string;
  subjectId?: string;
  chapterId?: string;
  questions: McqQuestion[];
  createdAt?: any;
  updatedAt?: any;
  authorId: string;
}

interface ContentState {
  classes: ClassItem[];
  subjects: SubjectItem[];
  chapters: ChapterItem[];
  materials: MaterialItem[];
  mcqTests: McqTestItem[];
  loading: boolean;
  
  setClasses: (classes: ClassItem[]) => void;
  setSubjects: (subjects: SubjectItem[]) => void;
  setChapters: (chapters: ChapterItem[]) => void;
  setMaterials: (materials: MaterialItem[]) => void;
  setMcqTests: (mcqTests: McqTestItem[]) => void;
  setLoading: (loading: boolean) => void;

  // Real-time synchronization
  initSync: () => () => void;

  // CRUD Operations
  addClass: (className: string, order: number) => Promise<void>;
  updateClass: (id: string, className: string, order: number, isHidden?: boolean) => Promise<void>;
  deleteClass: (id: string) => Promise<void>;

  addSubject: (classId: string, subjectName: string, order: number) => Promise<void>;
  updateSubject: (id: string, classId: string, subjectName: string, order: number, isHidden?: boolean, hiddenCategories?: string[]) => Promise<void>;
  deleteSubject: (id: string) => Promise<void>;

  addChapter: (classId: string, subjectId: string, chapterName: string) => Promise<void>;
  updateChapter: (id: string, classId: string, subjectId: string, chapterName: string) => Promise<void>;
  deleteChapter: (id: string) => Promise<void>;

  addMaterial: (material: Omit<MaterialItem, "id" | "downloadCount" | "bookmarks">) => Promise<void>;
  updateMaterial: (id: string, material: Partial<MaterialItem>) => Promise<void>;
  deleteMaterial: (id: string) => Promise<void>;

  addMcqTest: (test: Omit<McqTestItem, "id" | "createdAt" | "updatedAt" | "authorId">) => Promise<void>;
  updateMcqTest: (id: string, test: Partial<McqTestItem>) => Promise<void>;
  deleteMcqTest: (id: string) => Promise<void>;
}

export const useContentStore = create<ContentState>((set, get) => ({
  classes: [],
  subjects: [],
  chapters: [],
  materials: [],
  mcqTests: [],
  loading: true,

  setClasses: (classes) => set({ classes }),
  setSubjects: (subjects) => set({ subjects }),
  setChapters: (chapters) => set({ chapters }),
  setMaterials: (materials) => set({ materials }),
  setMcqTests: (mcqTests) => set({ mcqTests }),
  setLoading: (loading) => set({ loading }),

  initSync: () => {
    set({ loading: true });

    const unsubClasses = onSnapshot(
      collection(db, "classes"),
      (snap) => {
        const list = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as ClassItem);
        list.sort((a, b) => {
          const orderA = a.order !== undefined ? a.order : 0;
          const orderB = b.order !== undefined ? b.order : 0;
          if (orderA !== orderB) return orderA - orderB;
          return a.className.localeCompare(b.className);
        });
        set({ classes: list });
      },
      (err) => {
        console.error("Error syncing classes:", err);
      }
    );

    const unsubSubjects = onSnapshot(
      collection(db, "subjects"),
      (snap) => {
        const list = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as SubjectItem);
        list.sort((a, b) => {
          const orderA = a.order !== undefined ? a.order : 0;
          const orderB = b.order !== undefined ? b.order : 0;
          if (orderA !== orderB) return orderA - orderB;
          return a.subjectName.localeCompare(b.subjectName);
        });
        set({ subjects: list });
      },
      (err) => {
        console.error("Error syncing subjects:", err);
      }
    );

    const unsubChapters = onSnapshot(
      collection(db, "chapters"),
      (snap) => {
        const list = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as ChapterItem);
        list.sort((a, b) => a.chapterName.localeCompare(b.chapterName));
        set({ chapters: list });
      },
      (err) => {
        console.error("Error syncing chapters:", err);
      }
    );

    const unsubMaterials = onSnapshot(
      collection(db, "materials"),
      (snap) => {
        const list = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as MaterialItem);
        // Sort newest first
        list.sort((a, b) => {
          const timeA = a.createdAt?.seconds || 0;
          const timeB = b.createdAt?.seconds || 0;
          return timeB - timeA;
        });
        set({ materials: list, loading: false });
      },
      (err) => {
        console.error("Error syncing materials:", err);
        set({ loading: false });
      }
    );

    const unsubMcqTests = onSnapshot(
      collection(db, "mcq_tests"),
      (snap) => {
        const list = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as McqTestItem);
        // Sort newest first
        list.sort((a, b) => {
          const timeA = a.createdAt?.seconds || 0;
          const timeB = b.createdAt?.seconds || 0;
          return timeB - timeA;
        });
        set({ mcqTests: list });
      },
      (err) => {
        console.error("Error syncing mcq_tests:", err);
      }
    );

    return () => {
      unsubClasses();
      unsubSubjects();
      unsubChapters();
      unsubMaterials();
      unsubMcqTests();
    };
  },

  addClass: async (className, order) => {
    const path = "classes";
    try {
      await addDoc(collection(db, path), {
        className,
        order: Number(order) || 0,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  },

  updateClass: async (id, className, order, isHidden) => {
    const path = `classes/${id}`;
    try {
      const updateData: any = {
        className,
        order: Number(order) || 0,
      };
      if (isHidden !== undefined) {
        updateData.isHidden = isHidden;
      }
      await updateDoc(doc(db, "classes", id), updateData);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  },

  deleteClass: async (id) => {
    const path = `classes/${id}`;
    try {
      await deleteDoc(doc(db, "classes", id));
      
      // Cascade delete subjects
      const state = get();
      const subsToDelete = state.subjects.filter((s) => s.classId === id);
      for (const s of subsToDelete) {
        await deleteDoc(doc(db, "subjects", s.id));
      }
      
      // Cascade delete chapters
      const chapsToDelete = state.chapters.filter((c) => c.classId === id);
      for (const c of chapsToDelete) {
        await deleteDoc(doc(db, "chapters", c.id));
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  },

  addSubject: async (classId, subjectName, order) => {
    const path = "subjects";
    try {
      await addDoc(collection(db, path), {
        classId,
        subjectName,
        order: Number(order) || 0,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  },

  updateSubject: async (id, classId, subjectName, order, isHidden, hiddenCategories) => {
    const path = `subjects/${id}`;
    try {
      const updateData: any = {
        classId,
        subjectName,
        order: Number(order) || 0,
      };
      if (isHidden !== undefined) {
        updateData.isHidden = isHidden;
      }
      if (hiddenCategories !== undefined) {
        updateData.hiddenCategories = hiddenCategories;
      }
      await updateDoc(doc(db, "subjects", id), updateData);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  },

  deleteSubject: async (id) => {
    const path = `subjects/${id}`;
    try {
      await deleteDoc(doc(db, "subjects", id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  },

  addChapter: async (classId, subjectId, chapterName) => {
    const path = "chapters";
    try {
      await addDoc(collection(db, path), {
        classId,
        subjectId,
        chapterName,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  },

  updateChapter: async (id, classId, subjectId, chapterName) => {
    const path = `chapters/${id}`;
    try {
      await updateDoc(doc(db, "chapters", id), {
        classId,
        subjectId,
        chapterName,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  },

  deleteChapter: async (id) => {
    const path = `chapters/${id}`;
    try {
      await deleteDoc(doc(db, "chapters", id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  },

  addMaterial: async (material) => {
    const path = "materials";
    try {
      const docRef = await addDoc(collection(db, path), {
        ...material,
        downloadCount: 0,
        bookmarks: [],
        createdAt: serverTimestamp(),
      });
      if (material.url) {
        await setDoc(doc(db, "materials_secure", docRef.id), { url: material.url });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  },

  updateMaterial: async (id, material) => {
    const path = `materials/${id}`;
    try {
      await updateDoc(doc(db, "materials", id), material);
      if (material.url) {
        await setDoc(doc(db, "materials_secure", id), { url: material.url });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  },

  deleteMaterial: async (id) => {
    const path = `materials/${id}`;
    try {
      await deleteDoc(doc(db, "materials", id));
      await deleteDoc(doc(db, "materials_secure", id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  },

  addMcqTest: async (test) => {
    const path = "mcq_tests";
    try {
      const authorId = auth.currentUser?.uid || "system";
      await addDoc(collection(db, path), {
        ...test,
        authorId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  },

  updateMcqTest: async (id, test) => {
    const path = `mcq_tests/${id}`;
    try {
      await updateDoc(doc(db, "mcq_tests", id), {
        ...test,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  },

  deleteMcqTest: async (id) => {
    const path = `mcq_tests/${id}`;
    try {
      await deleteDoc(doc(db, "mcq_tests", id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  },
}));
