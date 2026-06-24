import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  X, 
  Plus, 
  Loader, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle,
  History,
  CornerDownRight,
  Sparkles
} from 'lucide-react';
import { collection, query, where, getDocs, addDoc, deleteDoc, updateDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { toast } from 'sonner';

interface QuickNote {
  id: string;
  userId: string;
  email: string;
  materialId: string;
  materialTitle: string;
  text: string;
  createdAt?: any;
  updatedAt?: any;
}

interface QuickNoteButtonProps {
  materialId: string;
  materialTitle: string;
  userId: string;
  userEmail: string;
}

export default function QuickNoteButton({ materialId, materialTitle, userId, userEmail }: QuickNoteButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState<QuickNote[]>([]);
  const [currentText, setCurrentText] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Fetch exclusive material notes
  const fetchNotes = async () => {
    if (!userId || !materialId) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'notes'),
        where('userId', '==', userId),
        where('materialId', '==', materialId)
      );
      const snap = await getDocs(q);
      const fetched = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as QuickNote[];
      
      // Clientside sort by date fallback
      fetched.sort((a, b) => {
        const tA = a.createdAt?.seconds || 0;
        const tB = b.createdAt?.seconds || 0;
        return tB - tA; // descending order
      });

      setNotes(fetched);
    } catch (err: any) {
      console.error("Notes query loading error:", err);
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotes();
    }
  }, [isOpen, materialId, userId]);

  // Click outside handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Save Note
  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanText = currentText.trim();
    if (!cleanText) {
      toast.error('Note text cannot be empty.');
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        // Update existing note
        const noteDocRef = doc(db, 'notes', editingId);
        await updateDoc(noteDocRef, {
          text: cleanText,
          updatedAt: serverTimestamp()
        });
        toast.success('Quick Note updated successfully!');
        setEditingId(null);
      } else {
        // Create new note
        const notePayload = {
          userId,
          email: userEmail,
          materialId,
          materialTitle,
          text: cleanText,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        await addDoc(collection(db, 'notes'), notePayload);
        toast.success('Quick Note saved securely!');
      }
      setCurrentText('');
      await fetchNotes();
    } catch (err: any) {
      let op = editingId ? OperationType.UPDATE : OperationType.CREATE;
      handleFirestoreError(err, op, `notes/${editingId || 'new'}`);
    } finally {
      setSaving(false);
    }
  };

  // Delete Note
  const handleDeleteNote = async (noteId: string) => {
    if (!window.confirm('Are you sure you want to delete this study note?')) return;
    try {
      await deleteDoc(doc(db, 'notes', noteId));
      toast.success('Study Note purged permanent.');
      setNotes(prev => prev.filter(n => n.id !== noteId));
      if (editingId === noteId) {
        setEditingId(null);
        setCurrentText('');
      }
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, `notes/${noteId}`);
    }
  };

  const startEditing = (note: QuickNote) => {
    setEditingId(note.id);
    setCurrentText(note.text);
  };

  return (
    <>
      {/* Floating launcher trigger */}
      <div className="fixed bottom-6 right-6 z-50">
        <motion.button
          onClick={() => setIsOpen(true)}
          whileHover={{ scale: 1.1, translateY: -2 }}
          whileTap={{ scale: 0.9 }}
          title="Open dynamic Quick Notes panel"
          className="bg-primary hover:bg-[#3730A3] text-white p-4 rounded-full shadow-2xl flex items-center justify-center border border-white/20 select-none group transition-all duration-300"
        >
          <FileText className="w-6 h-6 transition-transform duration-300 group-hover:rotate-12" />
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 ease-in-out font-display text-xs font-black uppercase tracking-wider pl-0 group-hover:pl-2 whitespace-nowrap">
            Quick Notes
          </span>
          <span className="absolute -top-1.5 -right-1.5 bg-[#1F1F1F] text-[#F8FAFC] text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border border-primary">
            {loading ? '..' : notes.length}
          </span>
        </motion.button>
      </div>

      {/* Floating sliding note sidebar panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex justify-end"
          >
            <motion.div
              ref={panelRef}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-md h-full bg-[#FFFDF9] border-l border-black/15 shadow-2xl flex flex-col text-[#1F1F1F]"
            >
              {/* Sidebar Header */}
              <div className="p-6 border-b border-black/10 flex items-center justify-between bg-[#F8FAFC]">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-primary/10 text-primary rounded-xl">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-extrabold text-[#1F1F1F] text-base">Quick Mind Notes</h3>
                    <p className="text-[10px] font-black text-[#7A7A7A] uppercase tracking-wider mt-0.5 truncate max-w-[200px]" title={materialTitle}>
                      {materialTitle}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-black/5 rounded-full text-[#7A7A7A] hover:text-[#1F1F1F] transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Sidebar View Container */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Note inputs */}
                <form onSubmit={handleSaveNote} className="space-y-3.5">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{editingId ? 'Modify Study Note' : 'Jot Down Thought'}</span>
                      </label>
                      {editingId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(null);
                            setCurrentText('');
                          }}
                          className="text-[10px] hover:underline uppercase font-bold text-[#7A7A7A]"
                        >
                          Cancel Editing
                        </button>
                      )}
                    </div>
                    <textarea
                      value={currentText}
                      onChange={(e) => setCurrentText(e.target.value)}
                      placeholder="e.g. Remember to revise formula on page 4, highly expected IIT problem..."
                      rows={4}
                      maxLength={1000}
                      required
                      className="w-full p-4 bg-[#F8FAFC] border border-black/10 rounded-2xl text-sm font-semibold text-[#1F1F1F] placeholder-[#7A7A7A]/75 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all duration-300 resize-none shadow-inner"
                    />
                    <div className="text-right text-[10px] text-[#7A7A7A] font-semibold">
                      {currentText.length}/1000 characters
                    </div>
                  </div>

                  <motion.button
                    type="submit"
                    disabled={saving}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="w-full py-3.5 bg-primary text-[#F8FAFC] rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#3730A3] transition-colors"
                  >
                    {saving ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>{editingId ? 'Save Custom Edits' : 'Commit Mind Note'}</span>
                      </>
                    )}
                  </motion.button>
                </form>

                {/* History list separator */}
                <div className="relative flex items-center mt-5">
                  <div className="flex-grow border-t border-black/10"></div>
                  <span className="flex-shrink mx-4 text-[#7A7A7A] text-[9px] uppercase font-black tracking-widest flex items-center gap-1">
                    <History className="w-3 h-3" />
                    <span>My Material Notes</span>
                  </span>
                  <div className="flex-grow border-t border-black/10"></div>
                </div>

                {/* Note list display */}
                {loading ? (
                  <div className="py-8 text-center text-xs text-[#7A7A7A] font-bold flex flex-col items-center justify-center gap-2">
                    <Loader className="w-5 h-5 animate-spin text-primary" />
                    <span>Loading saved material notes...</span>
                  </div>
                ) : notes.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[#7A7A7A] font-semibold flex flex-col items-center justify-center gap-3">
                    <div className="p-3 bg-primary/5 rounded-full text-[#7A7A7A]">
                      <FileText className="w-6 h-6 opacity-40" />
                    </div>
                    <p className="max-w-[200px] leading-relaxed">
                      No custom thoughts saved for this material yet. Start typing above to build your study card.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notes.map((note) => (
                      <motion.div
                        key={note.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-4 rounded-2xl border transition-all duration-200 ${
                          editingId === note.id 
                            ? 'bg-primary/5 border-primary shadow-sm' 
                            : 'bg-white border-black/5 hover:border-black/10 hover:shadow-xs'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <p className="text-sm font-semibold text-[#1F1F1F] leading-relaxed break-words whitespace-pre-wrap flex-1">
                            {note.text}
                          </p>
                          <div className="flex items-center gap-1 select-none shrink-0">
                            <button
                              onClick={() => startEditing(note)}
                              className="p-1 px-2 text-[10px] uppercase font-black tracking-wider text-primary hover:bg-primary/10 rounded-lg transition-colors"
                              title="Edit text"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteNote(note.id)}
                              className="p-1.5 text-[#7A7A7A] hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                              title="Delete note"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div className="mt-2 text-[9px] text-[#7A7A7A] font-mono select-none flex items-center gap-1 font-bold">
                          <CornerDownRight className="w-2.5 h-2.5 text-primary" />
                          <span>
                            {note.createdAt?.seconds 
                              ? new Date(note.createdAt.seconds * 1000).toLocaleString()
                              : 'Just now'
                            }
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
