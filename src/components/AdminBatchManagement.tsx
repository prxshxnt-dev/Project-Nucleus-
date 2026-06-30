import React, { useState, useEffect } from "react";
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  serverTimestamp 
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { 
  Trash2, 
  Edit2, 
  Plus, 
  AlertTriangle, 
  CheckCircle, 
  CreditCard, 
  Tag, 
  Sparkles, 
  Clock, 
  User,
  Image as ImageIcon,
  FileText
} from "lucide-react";

interface BatchItem {
  id: string;
  className: string;
  order?: number;
  price?: number;
  discountPrice?: number;
  upiId?: string;
  thumbnailUrl?: string;
  description?: string;
  teacherName?: string;
  validity?: string;
  status?: "published" | "hidden" | "draft";
  badge?: "New" | "Popular" | "Limited" | "Premium" | "";
  createdAt?: any;
}

export function AdminBatchManagement() {
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; isError?: boolean } | null>(null);

  // Form States
  const [batchId, setBatchId] = useState<string | null>(null);
  const [className, setClassName] = useState("");
  const [price, setPrice] = useState<number | "">("");
  const [discountPrice, setDiscountPrice] = useState<number | "">("");
  const [upiId, setUpiId] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [description, setDescription] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [validity, setValidity] = useState("Lifetime");
  const [order, setOrder] = useState<number | "">("");
  const [status, setStatus] = useState<"published" | "hidden" | "draft">("published");
  const [badge, setBadge] = useState<"New" | "Popular" | "Limited" | "Premium" | "">("");

  // Delete modal state
  const [deleteConfirmBatch, setDeleteConfirmBatch] = useState<BatchItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync batches collection
  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(
      collection(db, "batches"),
      (snap) => {
        const list = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as BatchItem);
        list.sort((a, b) => {
          const orderA = a.order !== undefined ? a.order : 0;
          const orderB = b.order !== undefined ? b.order : 0;
          if (orderA !== orderB) return orderA - orderB;
          return a.className.localeCompare(b.className);
        });
        setBatches(list);
        setLoading(false);
      },
      (err) => {
        console.error("Error loading batches:", err);
        showToast("Failed to load batches from Firestore", true);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const showToast = (message: string, isError = false) => {
    setToast({ message, isError });
    setTimeout(() => setToast(null), 3000);
  };

  const resetForm = () => {
    setBatchId(null);
    setClassName("");
    setPrice("");
    setDiscountPrice("");
    setUpiId("");
    setThumbnailUrl("");
    setDescription("");
    setTeacherName("");
    setValidity("Lifetime");
    setOrder("");
    setStatus("published");
    setBadge("");
  };

  const handleEditClick = (batch: BatchItem) => {
    setBatchId(batch.id);
    setClassName(batch.className || "");
    setPrice(batch.price !== undefined ? batch.price : "");
    setDiscountPrice(batch.discountPrice !== undefined ? batch.discountPrice : "");
    setUpiId(batch.upiId || "");
    setThumbnailUrl(batch.thumbnailUrl || "");
    setDescription(batch.description || "");
    setTeacherName(batch.teacherName || "");
    setValidity(batch.validity || "Lifetime");
    setOrder(batch.order !== undefined ? batch.order : "");
    setStatus(batch.status || "published");
    setBadge(batch.badge || "");
    
    // Smooth scroll to form on edit
    const formElement = document.getElementById("batch-form-card");
    if (formElement) {
      formElement.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!className.trim()) return showToast("Batch Name is required", true);
    if (price === "" || Number(price) < 0) return showToast("Please input a valid price", true);
    if (!upiId.trim()) return showToast("UPI ID is required for payment routing", true);

    const batchData = {
      className: className.trim(),
      order: order === "" ? 0 : Number(order),
      price: Number(price),
      discountPrice: discountPrice !== "" ? Number(discountPrice) : 0,
      upiId: upiId.trim(),
      thumbnailUrl: thumbnailUrl.trim() || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60",
      description: description.trim() || "Premium learning batch with interactive lectures, complete note folders, and test-series.",
      teacherName: teacherName.trim() || "Senior Faculty",
      validity: validity.trim() || "Lifetime",
      status,
      badge,
      updatedAt: serverTimestamp()
    };

    try {
      let targetId = batchId;
      if (!targetId) {
        // Create new document with synchronized ID
        const newDocRef = doc(collection(db, "batches"));
        targetId = newDocRef.id;
        
        const fullData = {
          ...batchData,
          id: targetId,
          createdAt: serverTimestamp()
        };

        // Write to both 'batches' and 'classes' collection in Firestore
        await setDoc(doc(db, "batches", targetId), fullData);
        await setDoc(doc(db, "classes", targetId), {
          id: targetId,
          className: fullData.className,
          order: fullData.order,
          price: fullData.price,
          discountPrice: fullData.discountPrice,
          upiId: fullData.upiId,
          thumbnailUrl: fullData.thumbnailUrl,
          description: fullData.description,
          teacherName: fullData.teacherName,
          validity: fullData.validity,
          status: fullData.status,
          badge: fullData.badge,
          createdAt: serverTimestamp()
        });
        showToast("New batch created and synchronized successfully!");
      } else {
        // Update both collections in Firestore
        await setDoc(doc(db, "batches", targetId), batchData, { merge: true });
        await setDoc(doc(db, "classes", targetId), {
          className: batchData.className,
          order: batchData.order,
          price: batchData.price,
          discountPrice: batchData.discountPrice,
          upiId: batchData.upiId,
          thumbnailUrl: batchData.thumbnailUrl,
          description: batchData.description,
          teacherName: batchData.teacherName,
          validity: batchData.validity,
          status: batchData.status,
          badge: batchData.badge,
        }, { merge: true });
        showToast("Batch properties updated successfully!");
      }
      resetForm();
    } catch (err: any) {
      console.error("Error saving batch:", err);
      showToast("Operation failed. Try again.", true);
    }
  };

  const handleCascadeDelete = async () => {
    if (!deleteConfirmBatch) return;
    setIsDeleting(true);
    try {
      const batchIdToDelete = deleteConfirmBatch.id;
      // Delete from both collections
      await deleteDoc(doc(db, "batches", batchIdToDelete));
      await deleteDoc(doc(db, "classes", batchIdToDelete));
      
      showToast(`Batch "${deleteConfirmBatch.className}" permanently removed.`);
      setDeleteConfirmBatch(null);
    } catch (err) {
      console.error("Error deleting batch:", err);
      showToast("Failed to delete course batch.", true);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="w-full bg-zinc-950 text-white min-h-[600px]">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/5 pb-6 mb-8 text-left">
        <div>
          <h2 className="text-2xl font-black font-display text-white flex items-center gap-2">
            <span className="text-primary">🎓</span> Superadmin Batch Engine
          </h2>
          <p className="text-sm text-white/50 mt-1">
            Input, manage, and configure regular prices, discounts, and UPI merchant IDs for payment routing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-full bg-primary/15 text-primary text-xs font-mono font-bold">
            Batches Configured: {batches.length}
          </span>
        </div>
      </div>

      {/* Main Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Create / Edit Form */}
        <div id="batch-form-card" className="bg-zinc-900/40 border border-white/10 rounded-3xl p-6 h-fit text-left backdrop-blur-md">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-black uppercase text-primary tracking-wider flex items-center gap-1.5">
              {batchId ? <Edit2 className="w-4 h-4 text-primary" /> : <Plus className="w-4 h-4 text-primary" />}
              {batchId ? "Modify Existing Batch" : "Create New Course Batch"}
            </h3>
            {batchId && (
              <button 
                onClick={resetForm}
                className="text-xs text-white/40 hover:text-white transition-all cursor-pointer font-bold"
              >
                Clear / New
              </button>
            )}
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            {/* Batch Name */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-white/50 mb-1.5">Batch Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. JEE Champions Batch 2026"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-primary transition-all font-sans"
              />
            </div>

            {/* Price & Discount Price */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-white/50 mb-1.5">Regular Price (₹) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-white/30 font-mono">₹</span>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="2999"
                    value={price}
                    onChange={(e) => setPrice(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-7 pr-3 py-2.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-primary transition-all font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-white/50 mb-1.5">Discount Price (₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-white/30 font-mono">₹</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="1999"
                    value={discountPrice}
                    onChange={(e) => setDiscountPrice(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-7 pr-3 py-2.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-primary transition-all font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Merchant UPI ID */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-white/50 mb-1.5 flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5 text-primary" />
                Merchant UPI ID *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. paytm-coaching@paytm"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-primary transition-all font-mono"
              />
              <p className="text-[9px] text-white/40 mt-1">This UPI ID is used to generate dynamic payment QR codes for student checkout.</p>
            </div>

            {/* Thumbnail Image URL */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-white/50 mb-1.5 flex items-center gap-1">
                <ImageIcon className="w-3.5 h-3.5 text-white/40" />
                Thumbnail Image URL
              </label>
              <input
                type="url"
                placeholder="https://images.unsplash.com/photo-..."
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-primary transition-all text-xs"
              />
            </div>

            {/* Teacher & Validity */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-white/50 mb-1.5 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-white/40" />
                  Faculty Instructor
                </label>
                <input
                  type="text"
                  placeholder="e.g. H. C. Verma"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-primary transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-white/50 mb-1.5 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-white/40" />
                  Batch Validity
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1 Year, Lifetime"
                  value={validity}
                  onChange={(e) => setValidity(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-primary transition-all"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-white/50 mb-1.5 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-white/40" />
                Batch Description
              </label>
              <textarea
                rows={3}
                placeholder="Describe batch highlights, live timings, level, targets..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-white/20 focus:outline-none focus:border-primary transition-all resize-none leading-relaxed"
              />
            </div>

            {/* Sequence Order */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-white/50 mb-1.5">Sorting Priority Index</label>
              <input
                type="number"
                placeholder="e.g. 0, 1, 2"
                value={order}
                onChange={(e) => setOrder(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-primary transition-all font-mono"
              />
            </div>

            {/* Status & Badge tags */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-white/50 mb-1.5">Visibility Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full bg-black/80 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-primary font-sans appearance-none cursor-pointer"
                >
                  <option value="published">🟢 Published</option>
                  <option value="hidden">🟡 Hidden / Private</option>
                  <option value="draft">🔴 Draft Mode</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-white/50 mb-1.5">Visual Badge Label</label>
                <select
                  value={badge}
                  onChange={(e) => setBadge(e.target.value as any)}
                  className="w-full bg-black/80 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-primary font-sans appearance-none cursor-pointer"
                >
                  <option value="">None</option>
                  <option value="New">⚡ New</option>
                  <option value="Popular">🔥 Popular</option>
                  <option value="Limited">💎 Limited Offer</option>
                  <option value="Premium">🏆 Premium</option>
                </select>
              </div>
            </div>

            {/* Form Submit buttons */}
            <div className="flex gap-2 pt-3">
              <button
                type="submit"
                className="flex-1 bg-primary text-zinc-950 font-black uppercase text-[10px] py-3 rounded-xl hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer shadow-md shadow-primary/10 tracking-wider flex items-center justify-center gap-1.5"
              >
                {batchId ? <CheckCircle className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                {batchId ? "Save Batch Properties" : "Publish Active Batch"}
              </button>
            </div>
          </form>
        </div>

        {/* Right Side: Batch Grid Cards */}
        <div className="lg:col-span-2 space-y-6 text-left">
          <div className="border border-white/5 bg-white/[0.02] p-4 rounded-2xl flex items-center justify-between">
            <span className="text-xs text-white/60">
              Active student enrollments will route transaction records to the listed UPI merchants.
            </span>
            <button 
              onClick={resetForm}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-[10px] font-bold uppercase rounded-lg border border-white/10 cursor-pointer flex items-center gap-1 transition-all"
            >
              <Plus className="w-3 h-3 text-primary" /> Create New
            </button>
          </div>

          {loading ? (
            <div className="p-20 text-center flex flex-col items-center justify-center gap-3">
              <span className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <p className="text-xs text-white/40 font-mono">Syncing batch catalog from Firestore...</p>
            </div>
          ) : batches.length === 0 ? (
            <div className="p-20 text-center bg-zinc-900/10 border border-dashed border-white/10 rounded-3xl">
              <AlertTriangle className="w-8 h-8 text-white/20 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-white">No Batches Configured</h4>
              <p className="text-xs text-white/40 mt-1">Setup the form on the left to deploy your first student batch.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {batches.map((batch) => {
                const isDiscounted = batch.discountPrice && batch.discountPrice > 0;
                
                return (
                  <div 
                    key={batch.id} 
                    className="bg-zinc-900/35 border border-white/10 hover:border-white/20 rounded-3xl overflow-hidden flex flex-col justify-between transition-all group relative hover:shadow-lg hover:shadow-black/30"
                  >
                    {/* Badge Pill overlay */}
                    {batch.badge && (
                      <span className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-full bg-primary text-zinc-950 text-[9px] font-black uppercase tracking-wider shadow-md">
                        {batch.badge}
                      </span>
                    )}

                    {/* Status indicator overlay */}
                    <span className={`absolute top-3 right-3 z-10 px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase tracking-wider backdrop-blur-md border ${
                      batch.status === "published" 
                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" 
                        : batch.status === "hidden"
                        ? "bg-amber-500/15 text-amber-400 border-amber-500/20"
                        : "bg-red-500/15 text-red-400 border-red-500/20"
                    }`}>
                      {batch.status || "published"}
                    </span>

                    {/* Thumbnail banner section */}
                    <div className="aspect-video w-full overflow-hidden bg-black/40 border-b border-white/5 relative">
                      <img 
                        src={batch.thumbnailUrl || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60"} 
                        alt={batch.className}
                        className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent" />
                      
                      <div className="absolute bottom-3 left-3 right-3">
                        <span className="text-[9px] uppercase tracking-wider text-primary font-mono font-bold block mb-0.5">
                          Order index: {batch.order !== undefined ? batch.order : 0}
                        </span>
                        <h4 className="text-sm font-black text-white line-clamp-1">
                          {batch.className}
                        </h4>
                      </div>
                    </div>

                    {/* Meta properties list */}
                    <div className="p-4 space-y-3.5 flex-1">
                      {batch.description && (
                        <p className="text-xs text-white/50 line-clamp-2 leading-relaxed">
                          {batch.description}
                        </p>
                      )}

                      <div className="grid grid-cols-2 gap-2 text-[10px] text-white/60 bg-black/20 p-2.5 rounded-2xl border border-white/5">
                        <div className="flex items-center gap-1.5 truncate">
                          <User className="w-3 h-3 text-primary/75 shrink-0" />
                          <span className="truncate">{batch.teacherName || "Faculty"}</span>
                        </div>
                        <div className="flex items-center gap-1.5 truncate">
                          <Clock className="w-3 h-3 text-primary/75 shrink-0" />
                          <span className="truncate">{batch.validity || "Lifetime"}</span>
                        </div>
                      </div>

                      {/* UPI ID block */}
                      <div className="bg-primary/5 border border-primary/10 rounded-2xl p-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 truncate">
                          <CreditCard className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span className="text-[10px] font-mono font-bold text-primary truncate select-all">
                            {batch.upiId || "No Merchant Registered"}
                          </span>
                        </div>
                        <span className="text-[8px] font-black uppercase tracking-wider text-primary bg-primary/15 px-1.5 py-0.5 rounded-full">
                          UPI ID
                        </span>
                      </div>
                    </div>

                    {/* Card Actions Bottom drawer */}
                    <div className="px-4 pb-4 pt-2 border-t border-white/5 bg-black/20 flex items-center justify-between gap-3">
                      <div className="flex flex-col items-start">
                        <span className="text-[8px] uppercase tracking-widest text-white/40 font-bold font-sans">
                          Batch Price
                        </span>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                          {isDiscounted ? (
                            <>
                              <span className="text-xs text-white/40 line-through font-mono">
                                ₹{batch.price}
                              </span>
                              <span className="text-sm font-black text-primary font-mono">
                                ₹{batch.discountPrice}
                              </span>
                            </>
                          ) : (
                            <span className="text-sm font-black text-white font-mono">
                              ₹{batch.price || 0}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleEditClick(batch)}
                          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 hover:text-primary transition-all cursor-pointer border border-white/5"
                          title="Edit Batch properties"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmBatch(batch)}
                          className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-black transition-all cursor-pointer border border-red-500/10"
                          title="Delete Batch permanently"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* CUSTOM DELETE CONFIRMATION MODAL */}
      {deleteConfirmBatch && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="bg-zinc-900 border border-white/10 rounded-3xl p-6 w-full max-w-md text-left shadow-2xl relative">
            <div className="flex items-center gap-3 text-red-500 mb-4">
              <div className="p-2 rounded-full bg-red-500/10">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black font-display text-white">
                Delete Course Batch?
              </h3>
            </div>

            <div className="space-y-3.5 text-xs text-white/70 leading-relaxed mb-6">
              <p>
                Are you sure you want to permanently delete <strong className="text-white">{deleteConfirmBatch.className}</strong>?
              </p>
              <p className="p-3 bg-red-500/5 border border-red-500/15 rounded-2xl text-[11px] text-red-400">
                ⚠️ <strong>WARNING:</strong> This action cannot be undone. This batch will be deleted from both the <strong>'batches'</strong> and <strong>'classes'</strong> collections in Firestore, removing structural folders from student dashboards.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteConfirmBatch(null)}
                className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer disabled:opacity-50 text-center"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleCascadeDelete}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-black font-black uppercase text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isDeleting && <span className="w-3 h-3 rounded-full border border-black border-t-transparent animate-spin" />}
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION BANNER */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[120] px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 backdrop-blur-md animate-fade-in text-xs font-bold border transition-all ${
          toast.isError 
            ? 'bg-red-500/10 text-red-500 border-red-500/20' 
            : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
        }`}>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
