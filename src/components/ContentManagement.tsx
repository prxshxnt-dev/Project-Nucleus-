import React, { useState, useEffect } from "react";
import { useContentStore } from "../store/contentStore";
import { ContentCard } from "./ContentCard";
import { RefreshCw, Search, Plus, Trash2, Edit2, FolderOpen, Video, FileText } from "lucide-react";

export function ContentManagement() {
  const {
    classes,
    subjects,
    chapters,
    materials,
    loading,
    initSync,
    addClass,
    updateClass,
    deleteClass,
    addSubject,
    updateSubject,
    deleteSubject,
    addChapter,
    updateChapter,
    deleteChapter,
    addMaterial,
    updateMaterial,
    deleteMaterial,
  } = useContentStore();

  const [activeSubTab, setActiveSubTab] = useState<"classes" | "subjects" | "chapters" | "materials" | "upload">("classes");
  const [toast, setToast] = useState<{ message: string; isError?: boolean } | null>(null);

  const showToast = (message: string, isError = false) => {
    setToast({ message, isError });
  };

  useEffect(() => {
    const unsub = initSync();
    return () => unsub();
  }, [initSync]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Form states for Classes
  const [classId, setClassId] = useState<string | null>(null);
  const [classNameState, setClassNameState] = useState("");
  const [classOrder, setClassOrder] = useState<number>(0);

  // Form states for Subjects
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [subClassId, setSubClassId] = useState("");
  const [subName, setSubName] = useState("");
  const [subOrder, setSubOrder] = useState<number>(0);

  // Form states for Chapters
  const [chapterId, setChapterId] = useState<string | null>(null);
  const [chapClassId, setChapClassId] = useState("");
  const [chapSubId, setChapSubId] = useState("");
  const [chapName, setChapName] = useState("");

  // Form states for Materials
  const [materialId, setMaterialId] = useState<string | null>(null);
  const [matClassId, setMatClassId] = useState("");
  const [matSubId, setMatSubId] = useState("");
  const [matChapId, setMatChapId] = useState("");
  const [matTitle, setMatTitle] = useState("");
  const [matDesc, setMatDesc] = useState("");
  const [matUrl, setMatUrl] = useState("");
  const [matType, setMatType] = useState<"note" | "lecture">("note");
  const [matCategory, setMatCategory] = useState<"notes" | "pyqs" | "assignments" | "dpps" | "video_lectures" | "formula_sheets" | "tests">("notes");
  const [matThumb, setMatThumb] = useState("");
  const [matHidden, setMatHidden] = useState(false);
  const [matGroup, setMatGroup] = useState("all");
  const [matPlan, setMatPlan] = useState("free");

  // Filters for materials explorer & views
  const [searchQuery, setSearchQuery] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterSub, setFilterSub] = useState("");
  const [filterChap, setFilterChap] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  // Filter scopes for Subjects dashboard and Chapters dashboard
  const [subjectListFilterClass, setSubjectListFilterClass] = useState("");
  const [chapterListFilterClass, setChapterListFilterClass] = useState("");
  const [chapterListFilterSub, setChapterListFilterSub] = useState("");

  // Auto-set child listings when parent class updates
  useEffect(() => {
    if (activeSubTab === "subjects" && subjectListFilterClass) {
      setSubClassId(subjectListFilterClass);
    }
    if (activeSubTab === "chapters" && chapterListFilterClass) {
      setChapClassId(chapterListFilterClass);
    }
  }, [subjectListFilterClass, chapterListFilterClass, activeSubTab]);

  // Submit Handlers
  const handleClassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classNameState.trim()) return showToast("Class Name is required", true);
    try {
      if (classId) {
        await updateClass(classId, classNameState, classOrder);
        showToast("Class standard updated in index registry!");
      } else {
        await addClass(classNameState, classOrder);
        showToast("New Class standard deployed to database!");
      }
      setClassNameState("");
      setClassOrder(0);
      setClassId(null);
    } catch (err: any) {
      showToast("Class operation failed", true);
    }
  };

  const handleSubjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subClassId) return showToast("Please select parent Class Standard", true);
    if (!subName.trim()) return showToast("Subject Name is required", true);
    try {
      if (subjectId) {
        await updateSubject(subjectId, subClassId, subName, subOrder);
        showToast("Subject folder updated successfully!");
      } else {
        await addSubject(subClassId, subName, subOrder);
        showToast("New Subject folder created!");
      }
      setSubName("");
      setSubOrder(0);
      setSubjectId(null);
    } catch (err: any) {
      showToast("Subject operation failed", true);
    }
  };

  const handleChapterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chapClassId) return showToast("Please select parent Class Standard", true);
    if (!chapSubId) return showToast("Please select parent Subject Folder", true);
    if (!chapName.trim()) return showToast("Chapter Name is required", true);
    try {
      if (chapterId) {
        await updateChapter(chapterId, chapClassId, chapSubId, chapName);
        showToast("Chapter folder updated successfully!");
      } else {
        await addChapter(chapClassId, chapSubId, chapName);
        showToast("New Chapter folder added!");
      }
      setChapName("");
      setChapterId(null);
    } catch (err: any) {
      showToast("Chapter operation failed", true);
    }
  };

  const handleMaterialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matClassId) return showToast("Please assign standard Class mapping", true);
    if (!matSubId) return showToast("Please assign Subject folder mapping", true);
    if (!matChapId) return showToast("Please assign Chapter subfolder mapping", true);
    if (!matTitle.trim()) return showToast("Material Title is required", true);
    if (!matUrl.trim()) return showToast("Secure Link URL is required", true);

    const isVideo = matType === "lecture" || matCategory === "video_lectures";
    const payload = {
      title: matTitle,
      description: matDesc,
      url: matUrl,
      fileUrl: matUrl,
      type: matType,
      fileType: (isVideo ? "video" : "pdf") as any,
      materialType: matCategory,
      classId: matClassId,
      subjectId: matSubId,
      chapterId: matChapId,
      classGroup: matGroup,
      thumbnailUrl: matThumb || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=200",
      isHidden: matHidden,
      requiredPlan: matPlan,
    };

    try {
      if (materialId) {
        await updateMaterial(materialId, payload);
        showToast("Resource details updated successfully!");
      } else {
        await addMaterial(payload);
        showToast("Study resource uploaded to cloud directory!");
      }
      handleCancelMaterialEdit();
    } catch (err: any) {
      showToast("Material action failed", true);
    }
  };

  const handleCancelMaterialEdit = () => {
    setMaterialId(null);
    setMatTitle("");
    setMatDesc("");
    setMatUrl("");
    setMatThumb("");
    setMatHidden(false);
    setMatGroup("all");
    setMatPlan("free");
    setActiveSubTab("materials");
  };

  // Safe Cascade Delete Class Folder
  const handleDelClass = async (id: string, name: string) => {
    if (!window.confirm(`Deleting Class "${name}" will cascade-delete all subjects, chapters, and materials mapped here. Proceed?`)) return;
    try {
      await deleteClass(id);
      showToast("Class and all mapped nested assets deleted!");
    } catch (e) {
      showToast("Failed to delete Class", true);
    }
  };

  // Safe Cascade Delete Subject Folder
  const handleDelSubject = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete Subject "${name}"?`)) return;
    try {
      await deleteSubject(id);
      showToast("Subject folder deleted successfully!");
    } catch (e) {
      showToast("Failed to delete Subject", true);
    }
  };

  // Safe Cascade Delete Chapter Folder
  const handleDelChapter = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete Chapter "${name}"?`)) return;
    try {
      await deleteChapter(id);
      showToast("Chapter folder deleted successfully!");
    } catch (e) {
      showToast("Failed to delete Chapter", true);
    }
  };

  // Delete Material
  const handleDelMaterial = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove document "${name}" from storage database?`)) return;
    try {
      await deleteMaterial(id);
      showToast("Material resource block removed!");
    } catch (e) {
      showToast("Failed to delete material", true);
    }
  };

  return (
    <div className="w-full bg-zinc-950/60 border border-white/10 p-4 md:p-8 rounded-3xl relative text-left min-h-[600px] flex flex-col lg:flex-row gap-8 font-sans">
      
      {/* Floating State Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3.5 rounded-2xl border shadow-2xl transition-all duration-300 transform translate-y-0 scale-100 ${
          toast.isError
            ? "bg-red-955/90 border-red-500/20 text-red-300 text-xs font-black shadow-red-500/10"
            : "bg-emerald-955/90 border-emerald-500/20 text-emerald-300 text-xs font-black shadow-emerald-500/10"
        }`}>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Modern Glassmorphic Left Sidebar */}
      <div className="w-full lg:w-64 shrink-0 flex flex-col gap-2 border-b lg:border-b-0 lg:border-r border-white/5 pb-6 lg:pb-0 lg:pr-6">
        <h3 className="text-[10px] font-black uppercase text-white/30 tracking-widest mb-3 select-none text-left">
          Folders & Resources
        </h3>
        
        {[
          { id: "classes", label: "🏫 Classes standard", count: classes.length },
          { id: "subjects", label: "📚 Subject Folders", count: subjects.length },
          { id: "chapters", label: "📂 Chapter Folders", count: chapters.length },
          { id: "materials", label: "📄 Vault Database", count: materials.length },
          { id: "upload", label: "🚀 Live Upload Hub", count: undefined },
        ].map((subb) => (
          <button
            key={subb.id}
            onClick={() => setActiveSubTab(subb.id as any)}
            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center justify-between border ${
              activeSubTab === subb.id
                ? "bg-[var(--primary-custom,#F15A29)] text-zinc-950 shadow-[var(--theme-shadow-glow)] border-transparent"
                : "text-white/70 hover:text-white hover:bg-white/5 border-transparent hover:border-white/5"
            }`}
          >
            <span>{subb.label}</span>
            {subb.count !== undefined && (
              <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full ${
                activeSubTab === subb.id ? "bg-black/15 text-zinc-950" : "bg-white/10 text-white/50"
              }`}>
                {subb.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Main Panel Content Window */}
      <div className="flex-1 min-w-0">
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-50">
            <RefreshCw className="w-8 h-8 animate-spin text-primary mb-3" />
            <p className="text-xs font-bold text-white/40">Syncing database changes in real-time...</p>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* 1. CLASSES SUB-TAB */}
            {activeSubTab === "classes" && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div>
                    <h3 className="text-lg font-black text-white font-display uppercase tracking-tight">Class standards folders</h3>
                    <p className="text-xs text-white/50 mt-0.5">Primary standard directories like Class 11, JEE, Drop-out sections.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  {/* Class Add/Edit card */}
                  <div className="theme-card-themed bg-white/5 p-5 border border-white/10 h-fit">
                    <h4 className="text-xs font-black uppercase text-primary/95 mb-4">
                      {classId ? "🖋️ Edit Class Folder properties" : "📂 Register new Standard Folder"}
                    </h4>
                    <form onSubmit={handleClassSubmit} className="space-y-4">
                      <div>
                        <label className="block text-[10px] uppercase font-black text-white/40 mb-1.5">Class Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Class 11, NEET Batch, JEE Prep"
                          value={classNameState}
                          onChange={(e) => setClassNameState(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary placeholder-white/20"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-black text-white/40 mb-1.5 font-mono">Ordering Priority weight</label>
                        <input
                          type="number"
                          placeholder="0"
                          value={classOrder || ""}
                          onChange={(e) => setClassOrder(Number(e.target.value) || 0)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary font-mono placeholder-white/20"
                        />
                        <span className="text-[9px] text-white/30 block mt-1.5 leading-normal">
                          Folders sort dynamically by ordering priority weight ascending.
                        </span>
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <button type="submit" className="flex-1 bg-primary text-zinc-950 font-black uppercase text-[10px] py-2.5 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer">
                          {classId ? "Save Changes" : "Create Folder"}
                        </button>
                        {classId && (
                          <button
                            type="button"
                            onClick={() => {
                              setClassId(null);
                              setClassNameState("");
                              setClassOrder(0);
                            }}
                            className="bg-white/10 text-white font-bold uppercase text-[10px] px-3 py-2.5 rounded-xl hover:bg-white/15 transition-all cursor-pointer"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </form>
                  </div>

                  {/* Class Grid */}
                  <div className="xl:col-span-2 space-y-4">
                    {classes.length === 0 ? (
                      <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/5 opacity-40 text-xs">
                        No class folders mapped. Enter a name above to begin layout construction!
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-sans">
                        {classes.map((cls) => {
                          const subCount = subjects.filter(s => s.classId === cls.id).length;
                          return (
                            <div key={cls.id} className="relative group">
                              <ContentCard
                                type="folder"
                                folderType="class"
                                title={cls.className}
                                description={`Priority sequence: ${cls.order || 0}`}
                                count={subCount}
                                onEdit={(e) => {
                                  e.stopPropagation();
                                  setClassId(cls.id);
                                  setClassNameState(cls.className);
                                  setClassOrder(cls.order || 0);
                                }}
                                onDelete={(e) => {
                                  e.stopPropagation();
                                  handleDelClass(cls.id, cls.className);
                                }}
                                onClick={() => {
                                  setSubjectListFilterClass(cls.id);
                                  setActiveSubTab("subjects");
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 2. SUBJECTS SUB-TAB */}
            {activeSubTab === "subjects" && (
              <div className="space-y-6 animate-fadeIn font-sans">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div>
                    <h3 className="text-lg font-black text-white font-display uppercase tracking-tight">Subject category directories</h3>
                    <p className="text-xs text-white/50 mt-0.5">Configure sub-topics like Physics, Organic Chemistry, or Quantitative Reasoning.</p>
                  </div>
                </div>

                {/* Filters */}
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase text-white/40">Selected Class:</span>
                    <select
                      value={subjectListFilterClass}
                      onChange={(e) => setSubjectListFilterClass(e.target.value)}
                      className="bg-black/60 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-primary font-bold cursor-pointer"
                    >
                      <option value="">All standards</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.className}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  {/* Subject Add/Edit */}
                  <div className="theme-card-themed bg-white/5 p-5 border border-white/10 h-fit">
                    <h4 className="text-xs font-black uppercase text-primary mb-4 animate-pulse">
                      {subjectId ? "🖋️ Edit Subject Folder parameters" : "📚 Register new Subject subfolder"}
                    </h4>
                    <form onSubmit={handleSubjectSubmit} className="space-y-4">
                      <div>
                        <label className="block text-[10px] uppercase font-black text-white/40 mb-1.5">Parent class standard *</label>
                        <select
                          required
                          value={subClassId}
                          onChange={(e) => setSubClassId(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:border-primary focus:outline-none"
                        >
                          <option value="">-- Class Standard --</option>
                          {classes.map(c => <option key={c.id} value={c.id}>{c.className}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-black text-white/40 mb-1.5 font-sans">Subject Title *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Physics, Chemistry, Zoology"
                          value={subName}
                          onChange={(e) => setSubName(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary placeholder-white/20"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-black text-white/40 mb-1.5 font-mono">Ordering Priority weight</label>
                        <input
                          type="number"
                          placeholder="0"
                          value={subOrder || ""}
                          onChange={(e) => setSubOrder(Number(e.target.value) || 0)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary font-mono placeholder-white/20"
                        />
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <button type="submit" className="flex-1 bg-primary text-zinc-950 font-black uppercase text-[10px] py-2.5 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer">
                          {subjectId ? "Save Changes" : "Build Subject"}
                        </button>
                        {subjectId && (
                          <button
                            type="button"
                            onClick={() => {
                              setSubjectId(null);
                              setSubName("");
                              setSubOrder(0);
                            }}
                            className="bg-white/10 text-white font-bold uppercase text-[10px] px-3 py-2.5 rounded-xl hover:bg-white/15 transition-all cursor-pointer"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </form>
                  </div>

                  {/* Subject grids */}
                  <div className="xl:col-span-2 space-y-4">
                    {subjects.filter(s => !subjectListFilterClass || s.classId === subjectListFilterClass).length === 0 ? (
                      <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/5 opacity-40 text-xs">
                        No subject folders mapped for selected standard class scope. Create one on the left panel!
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {subjects
                          .filter(s => !subjectListFilterClass || s.classId === subjectListFilterClass)
                          .map((subj) => {
                            const parentName = classes.find(c => c.id === subj.classId)?.className || "None";
                            const chapCount = chapters.filter(c => c.subjectId === subj.id).length;
                            return (
                              <div key={subj.id} className="relative group flex flex-col justify-between">
                                <ContentCard
                                  type="folder"
                                  folderType="subject"
                                  title={subj.subjectName}
                                  description={`Scope: ${parentName} (Priority: ${subj.order || 0})`}
                                  count={chapCount}
                                  onEdit={(e) => {
                                    e.stopPropagation();
                                    setSubjectId(subj.id);
                                    setSubClassId(subj.classId);
                                    setSubName(subj.subjectName);
                                    setSubOrder(subj.order || 0);
                                  }}
                                  onDelete={(e) => {
                                    e.stopPropagation();
                                    handleDelSubject(subj.id, subj.subjectName);
                                  }}
                                  onClick={() => {
                                    setChapterListFilterClass(subj.classId);
                                    setChapterListFilterSub(subj.id);
                                    setActiveSubTab("chapters");
                                  }}
                                />
                                <div className="flex items-center gap-2 mt-2 z-10 justify-end flex-wrap">
                                  <button
                                    className="bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500 hover:text-black py-1 px-3 rounded-lg text-[9px] font-black uppercase tracking-wider cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setChapClassId(subj.classId);
                                      setChapSubId(subj.id);
                                      setActiveSubTab("chapters");
                                      showToast("Presets class and subject for chapters ledger!");
                                    }}
                                  >
                                    + Chapter
                                  </button>
                                  <button
                                    className="bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500 hover:text-black py-1 px-3 rounded-lg text-[9px] font-black uppercase tracking-wider cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setMatClassId(subj.classId);
                                      setMatSubId(subj.id);
                                      setActiveSubTab("upload");
                                      showToast("Preserving mappings inside Upload Center!");
                                    }}
                                  >
                                    + Upload file
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 3. CHAPTERS SUB-TAB */}
            {activeSubTab === "chapters" && (
              <div className="space-y-6 animate-fadeIn font-sans">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div>
                    <h3 className="text-lg font-black text-white font-display uppercase tracking-tight">Chapter ledger catalogs</h3>
                    <p className="text-xs text-white/50 mt-0.5">Map lesson directories e.g., "Limits & Derivatives", "Wave Mechanics".</p>
                  </div>
                </div>

                {/* Filter selectors */}
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-black text-white/40">Class Context:</span>
                    <select
                      value={chapterListFilterClass}
                      onChange={(e) => {
                        setChapterListFilterClass(e.target.value);
                        setChapterListFilterSub("");
                      }}
                      className="bg-black/60 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-primary font-bold flex-1 cursor-pointer"
                    >
                      <option value="">All classes</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.className}</option>)}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-black text-white/40">Subject Context:</span>
                    <select
                      value={chapterListFilterSub}
                      onChange={(e) => setChapterListFilterSub(e.target.value)}
                      className="bg-black/60 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-primary font-bold flex-1 disabled:opacity-40 cursor-pointer"
                      disabled={!chapterListFilterClass}
                    >
                      <option value="">All subjects</option>
                      {subjects
                        .filter(s => s.classId === chapterListFilterClass)
                        .map(s => <option key={s.id} value={s.id}>{s.subjectName}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  {/* Chapter Add/Edit */}
                  <div className="theme-card-themed bg-white/5 p-5 border border-white/10 h-fit">
                    <h4 className="text-xs font-black uppercase text-primary mb-4">
                      {chapterId ? "🖋️ Rename Chapter Unit" : "📂 Register new Chapter Section"}
                    </h4>
                    <form onSubmit={handleChapterSubmit} className="space-y-4">
                      <div>
                        <label className="block text-[10px] uppercase font-black text-white/40 mb-1.5">Class Scope *</label>
                        <select
                          required
                          value={chapClassId}
                          onChange={(e) => {
                            setChapClassId(e.target.value);
                            setChapSubId("");
                          }}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:border-primary focus:outline-none"
                        >
                          <option value="">-- Select Class --</option>
                          {classes.map(c => <option key={c.id} value={c.id}>{c.className}</option>)}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-black text-white/40 mb-1.5">Subject Scope *</label>
                        <select
                          required
                          value={chapSubId}
                          onChange={(e) => setChapSubId(e.target.value)}
                          disabled={!chapClassId}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:border-primary focus:outline-none disabled:opacity-40"
                        >
                          <option value="">-- Select Subject --</option>
                          {subjects
                            .filter(s => s.classId === chapClassId)
                            .map(s => <option key={s.id} value={s.id}>{s.subjectName}</option>)}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-black text-white/40 mb-1.5 font-sans">Chapter Title *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Waves & Oscillations, Electrochemistry"
                          value={chapName}
                          onChange={(e) => setChapName(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary placeholder-white/20"
                        />
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <button type="submit" className="flex-1 bg-primary text-zinc-950 font-black uppercase text-[10px] py-2.5 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer">
                          {chapterId ? "Approve Rename" : "Build Chapter"}
                        </button>
                        {chapterId && (
                          <button
                            type="button"
                            onClick={() => {
                              setChapterId(null);
                              setChapName("");
                            }}
                            className="bg-white/10 text-white font-bold uppercase text-[10px] px-3 py-2.5 rounded-xl hover:bg-white/15 transition-all cursor-pointer"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </form>
                  </div>

                  {/* Chapter Grid */}
                  <div className="xl:col-span-2 space-y-4">
                    {chapters
                      .filter(ch => (!chapterListFilterClass || ch.classId === chapterListFilterClass) && (!chapterListFilterSub || ch.subjectId === chapterListFilterSub))
                      .length === 0 ? (
                      <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/5 opacity-40 text-xs">
                        No chapters mapped in selected hierarchy. Build a chapter in left panel to deploy items!
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {chapters
                          .filter(ch => (!chapterListFilterClass || ch.classId === chapterListFilterClass) && (!chapterListFilterSub || ch.subjectId === chapterListFilterSub))
                          .map((ch) => {
                            const matchingClass = classes.find(c => c.id === ch.classId)?.className || "None";
                            const matchingSub = subjects.find(s => s.id === ch.subjectId)?.subjectName || "None";
                            const fileCount = materials.filter(m => m.chapterId === ch.id).length;
                            return (
                              <div key={ch.id} className="relative group">
                                <ContentCard
                                  type="folder"
                                  folderType="chapter"
                                  title={ch.chapterName}
                                  description={`${matchingClass} ➔ ${matchingSub}`}
                                  count={fileCount}
                                  onEdit={(e) => {
                                    e.stopPropagation();
                                    setChapterId(ch.id);
                                    setChapClassId(ch.classId);
                                    setChapSubId(ch.subjectId);
                                    setChapName(ch.chapterName);
                                  }}
                                  onDelete={(e) => {
                                    e.stopPropagation();
                                    handleDelChapter(ch.id, ch.chapterName);
                                  }}
                                  onClick={() => {
                                    setFilterClass(ch.classId);
                                    setFilterSub(ch.subjectId);
                                    setFilterChap(ch.id);
                                    setActiveSubTab("materials");
                                  }}
                                />
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 4. MATERIALS SEARCH VAULT SUB-TAB */}
            {activeSubTab === "materials" && (
              <div className="space-y-6 animate-fadeIn font-sans">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div>
                    <h3 className="text-lg font-black text-white font-display uppercase tracking-tight">Active resources ledger</h3>
                    <p className="text-xs text-white/50 mt-0.5">Explore, search, filter, and inspect final PDF files and video endpoints linked globally.</p>
                  </div>
                </div>

                {/* Sub search dashboard card */}
                <div className="bg-white/5 p-5 border border-white/10 rounded-2xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-white/40">Search by Title</label>
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-white/30 absolute left-3 top-3" />
                      <input
                        type="text"
                        placeholder="Search query..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white focus:outline-none focus:border-primary placeholder-white/20"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-white/40">Filter by Class</label>
                    <select
                      value={filterClass}
                      onChange={(e) => {
                        setFilterClass(e.target.value);
                        setFilterSub("");
                        setFilterChap("");
                      }}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
                    >
                      <option value="">All Classes</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.className}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-white/40">Filter by Subject</label>
                    <select
                      value={filterSub}
                      onChange={(e) => {
                        setFilterSub(e.target.value);
                        setFilterChap("");
                      }}
                      disabled={!filterClass}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none disabled:opacity-45 cursor-pointer"
                    >
                      <option value="">All Subjects</option>
                      {subjects
                        .filter(s => s.classId === filterClass)
                        .map(s => <option key={s.id} value={s.id}>{s.subjectName}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-white/40">Filter by category</label>
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
                    >
                      <option value="">All Categories</option>
                      <option value="notes">Study Notes</option>
                      <option value="pyqs">Past Papers</option>
                      <option value="assignments">Theory Homework</option>
                      <option value="dpps">DPPs Practice</option>
                      <option value="video_lectures">Video lectures</option>
                      <option value="formula_sheets">Checksheets</option>
                      <option value="tests">Mock quizzes</option>
                    </select>
                  </div>
                </div>

                {/* Grid */}
                {materials.filter(m => {
                  if (filterClass && m.classId !== filterClass) return false;
                  if (filterSub && m.subjectId !== filterSub) return false;
                  if (filterChap && m.chapterId !== filterChap) return false;
                  if (filterCategory && m.materialType !== filterCategory) return false;
                  if (searchQuery && !m.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
                  return true;
                }).length === 0 ? (
                  <div className="text-center py-20 bg-white/5 border border-white/5 rounded-3xl opacity-40 text-xs text-white">
                    No studies materials matched selected filters. Try broadening search or upload new files!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {materials
                      .filter(m => {
                        if (filterClass && m.classId !== filterClass) return false;
                        if (filterSub && m.subjectId !== filterSub) return false;
                        if (filterChap && m.chapterId !== filterChap) return false;
                        if (filterCategory && m.materialType !== filterCategory) return false;
                        if (searchQuery && !m.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
                        return true;
                      })
                      .map((mat) => {
                        const isThemedLocked = mat.requiredPlan && mat.requiredPlan !== "free";
                        return (
                          <div key={mat.id} className="relative group">
                            <ContentCard
                              type="material"
                              title={mat.title}
                              description={mat.description}
                              materialType={mat.materialType as any}
                              isLocked={!!isThemedLocked}
                              downloadCount={mat.downloadCount || 0}
                              isHidden={mat.isHidden}
                              onEdit={() => {
                                setMaterialId(mat.id);
                                setMatClassId(mat.classId);
                                setMatSubId(mat.subjectId);
                                setMatChapId(mat.chapterId);
                                setMatTitle(mat.title);
                                setMatDesc(mat.description || "");
                                setMatUrl(mat.url);
                                setMatType((mat.type as any) || "note");
                                setMatCategory((mat.materialType as any) || "notes");
                                setMatThumb(mat.thumbnailUrl || "");
                                setMatHidden(!!mat.isHidden);
                                setMatGroup(mat.classGroup || "all");
                                setMatPlan(mat.requiredPlan || "free");
                                setActiveSubTab("upload");
                              }}
                              onDelete={() => {
                                handleDelMaterial(mat.id, mat.title);
                              }}
                            />
                            {mat.isHidden && (
                              <div className="absolute top-4 left-4 bg-yellow-500/15 border border-yellow-500/30 text-yellow-400 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider select-none z-10">
                                Draft Mode
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}

            {/* 5. UPLOAD CENTRE TAB */}
            {activeSubTab === "upload" && (
              <div className="space-y-6 animate-fadeIn font-sans">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div>
                    <h3 className="text-lg font-black text-white font-display uppercase tracking-tight">Resource publication ledger</h3>
                    <p className="text-xs text-white/50 mt-0.5">Upload, edit, and categorize study documents, DRM checklists, or Vimeo streaming parameters.</p>
                  </div>
                </div>

                <div className="theme-card-themed bg-white/5 border border-white/10 p-6 relative rounded-3xl">
                  <form onSubmit={handleMaterialSubmit} className="space-y-5 text-left">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
                      <div>
                        <label className="block text-[10px] uppercase font-black text-white/40 mb-1.5">Class Folder Mapping *</label>
                        <select
                          required
                          value={matClassId}
                          onChange={(e) => {
                            setMatClassId(e.target.value);
                            setMatSubId("");
                            setMatChapId("");
                          }}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-primary focus:outline-none font-bold"
                        >
                          <option value="">-- select standard --</option>
                          {classes.map(c => <option key={c.id} value={c.id}>{c.className}</option>)}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-black text-white/40 mb-1.5">Subject Tag Mapping *</label>
                        <select
                          required
                          value={matSubId}
                          onChange={(e) => {
                            setMatSubId(e.target.value);
                            setMatChapId("");
                          }}
                          disabled={!matClassId}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-primary focus:outline-none disabled:opacity-40 font-bold"
                        >
                          <option value="">-- select subject --</option>
                          {subjects
                            .filter(s => s.classId === matClassId)
                            .map(s => <option key={s.id} value={s.id}>{s.subjectName}</option>)}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-black text-white/40 mb-1.5 font-bold">Chapter Subfolder Mapping *</label>
                        <select
                          required
                          value={matChapId}
                          onChange={(e) => setMatChapId(e.target.value)}
                          disabled={!matSubId}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-primary focus:outline-none disabled:opacity-40 font-bold"
                        >
                          <option value="">-- select chapter --</option>
                          {chapters
                            .filter(ch => ch.subjectId === matSubId)
                            .map(ch => <option key={ch.id} value={ch.id}>{ch.chapterName}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] uppercase font-black text-white/40 mb-1.5 font-sans">Document title *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Unit 3 Test Solution Manual, Integration tricks"
                          value={matTitle}
                          onChange={(e) => setMatTitle(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary placeholder-white/20"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-black text-white/40 mb-1.5">
                          {matType === "lecture" || matCategory === "video_lectures" 
                            ? "Streaming Video URL Link (e.g. YouTube, Vimeo, MP4, Google Drive Video) *" 
                            : "Direct File or Video link *"}
                        </label>
                        <input
                          type="url"
                          required
                          placeholder={matType === "lecture" || matCategory === "video_lectures"
                            ? "e.g. https://www.youtube.com/watch?v=... or direct MP4/Drive video url"
                            : "https://drive.google.com/somelink.pdf"}
                          value={matUrl}
                          onChange={(e) => setMatUrl(e.target.value)}
                          className="w-full bg-zinc-950/60 border border-white/10 hover:border-white/20 focus:border-primary focus:ring-1 focus:ring-primary/30 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/25 outline-none transition-all duration-200 font-mono text-[11px] shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-black text-white/40 mb-1.5">Description overview</label>
                      <textarea
                        rows={2}
                        placeholder="Provide details mapped checklists, study limits, or instructions..."
                        value={matDesc}
                        onChange={(e) => setMatDesc(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary placeholder-white/20 leading-relaxed resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] uppercase font-black text-white/40 mb-1.5 font-sans">Format file structure *</label>
                        <select
                          value={matType}
                          onChange={(e) => setMatType(e.target.value as any)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
                        >
                          <option value="note">Study Paper (PDF Document)</option>
                          <option value="lecture">Streaming Lecture (Video URL)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-black text-white/40 mb-1.5">Directory Category *</label>
                        <select
                          value={matCategory}
                          onChange={(e) => setMatCategory(e.target.value as any)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
                        >
                          <option value="notes">Study Notes</option>
                          <option value="pyqs">PYQ Past Papers</option>
                          <option value="assignments">Theory Homework</option>
                          <option value="dpps">DPP Bulletins</option>
                          <option value="video_lectures">Video Lectures</option>
                          <option value="formula_sheets">Formula checksheets</option>
                          <option value="tests">Mock quizzes / Exams</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-black text-white/40 mb-1.5">Premium Lock Access Tier *</label>
                        <select
                          value={matPlan}
                          onChange={(e) => setMatPlan(e.target.value as any)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
                        >
                          <option value="free">Free Access (Unrestricted)</option>
                          <option value="notes">Notes Tier Unlock</option>
                          <option value="lectures">Lectures Tier Unlock</option>
                          <option value="premium">Premium Suite (Comprehensive)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] uppercase font-black text-white/40 mb-1.5">Cover thumbnail URL (Optional)</label>
                        <input
                          type="url"
                          placeholder="https://unsplash.com/pattern..."
                          value={matThumb}
                          onChange={(e) => setMatThumb(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary placeholder-white/20 font-mono text-[11px]"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-black text-white/40 mb-1.5">Grade Class Group filter</label>
                        <select
                          value={matGroup}
                          onChange={(e) => setMatGroup(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
                        >
                          <option value="all">Deliver to All Groups</option>
                          <option value="6">Only Class 6 Grade</option>
                          <option value="7">Only Class 7 Grade</option>
                          <option value="8">Only Class 8 Grade</option>
                          <option value="9">Only Class 9 Grade</option>
                          <option value="10">Only Class 10 Grade</option>
                          <option value="11">Only Class 11 Grade</option>
                          <option value="12">Only Class 12 Grade</option>
                          <option value="dropper">Only Droppers batch</option>
                        </select>
                      </div>
                    </div>

                    {/* Checkboxes */}
                    <div className="flex flex-col gap-2 pt-1">
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          id="matHidden"
                          checked={matHidden}
                          onChange={(e) => setMatHidden(e.target.checked)}
                          className="rounded border-white/20 bg-black/40 text-primary focus:ring-primary h-4.5 w-4.5 cursor-pointer"
                        />
                        <label htmlFor="matHidden" className="text-xs text-white/80 font-bold select-none cursor-pointer">
                          Set resource as DRAFT (Hidden from Student general explorer)
                        </label>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-3 pt-5 border-t border-white/5 font-sans">
                      <button
                        type="submit"
                        className="flex-1 bg-primary text-zinc-950 font-black uppercase text-xs py-3 rounded-xl hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 cursor-pointer"
                      >
                        {materialId ? "🛡️ Save Resource modifications" : "🚀 Publish resource block"}
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelMaterialEdit}
                        className="px-6 py-3 bg-white/10 hover:bg-white/15 text-white font-bold uppercase text-xs rounded-xl transition duration-150 cursor-pointer"
                      >
                        Cancel / Back
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
            
          </div>
        )}
      </div>
    </div>
  );
}
