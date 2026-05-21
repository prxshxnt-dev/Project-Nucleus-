import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { db } from '../lib/firebase';
import { collection, query, getDocs, doc, updateDoc, addDoc, deleteDoc, serverTimestamp, getDoc, setDoc } from 'firebase/firestore';
import { motion } from 'motion/react';
import { ArrowLeft, LockOpen, Check, Flame } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);
  const [activeTab, setActiveTab] = useState<'materials' | 'users' | 'mentors' | 'settings'>('materials');
  const [users, setUsers] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [mentors, setMentors] = useState<any[]>([]);
  
  // Settings Form
  const [upiId, setUpiId] = useState('');
  const [priceNotes, setPriceNotes] = useState(99);
  const [priceLectures, setPriceLectures] = useState(499);
  const [pricePremium, setPricePremium] = useState(999);
  
  const [classPrices, setClassPrices] = useState<any>({});
  
  const [websiteName, setWebsiteName] = useState('Nucleus.cc');
  const [documentTitle, setDocumentTitle] = useState('Nucleus - Academic Excellence');
  const [logoText, setLogoText] = useState('N');
  const [logoImage, setLogoImage] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');
  const [heroTitle, setHeroTitle] = useState('Redefining Academic Excellence.');
  const [heroSubtitle, setHeroSubtitle] = useState('Experience the highest echelon of coaching.');
  const [heroBadgeText, setHeroBadgeText] = useState('Premium Access Now Open');
  const [heroCta1Text, setHeroCta1Text] = useState('Join the Elite');
  const [heroCta1Link, setHeroCta1Link] = useState('');
  const [heroCta2Text, setHeroCta2Text] = useState('Watch Preview');
  const [heroCta2Link, setHeroCta2Link] = useState('');
  
  // Footer Form
  const [footerDescription, setFooterDescription] = useState('The world\'s most premium learning ecosystem designed for peak academic performance.');
  const [footerLink1Text, setFooterLink1Text] = useState('Architecture');
  const [footerLink1Url, setFooterLink1Url] = useState('#');
  const [footerLink2Text, setFooterLink2Text] = useState('Mentors');
  const [footerLink2Url, setFooterLink2Url] = useState('#');
  const [footerLink3Text, setFooterLink3Text] = useState('Pricing');
  const [footerLink3Url, setFooterLink3Url] = useState('#');
  const [footerLegal1Text, setFooterLegal1Text] = useState('Privacy Policy');
  const [footerLegal1Url, setFooterLegal1Url] = useState('#');
  const [footerLegal2Text, setFooterLegal2Text] = useState('Terms of Service');
  const [footerLegal2Url, setFooterLegal2Url] = useState('#');
  
  const [reviewFormUrl, setReviewFormUrl] = useState('');

  // Material Form
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [type, setType] = useState('note');
  const [url, setUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [plan, setPlan] = useState('free');
  const [classGroup, setClassGroup] = useState('all');
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);

  // Mentor Form
  const [mentorName, setMentorName] = useState('');
  const [mentorRole, setMentorRole] = useState('');
  const [mentorImage, setMentorImage] = useState('');
  const [mentorExperience, setMentorExperience] = useState('');
  const [mentorDescription, setMentorDescription] = useState('');
  
  const fetchData = async () => {
    try {
      const uSnap = await getDocs(query(collection(db, 'users')));
      setUsers(uSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      
      const mSnap = await getDocs(query(collection(db, 'materials')));
      setMaterials(mSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      
      const mentorSnap = await getDocs(query(collection(db, 'mentors')));
      setMentors(mentorSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const settingsSnap = await getDoc(doc(db, 'settings', 'global'));
      if (settingsSnap.exists()) {
        const d = settingsSnap.data();
        setUpiId(d.upiId || '');
        setPriceNotes(d.priceNotes || 99);
        setPriceLectures(d.priceLectures || 499);
        setPricePremium(d.pricePremium || 999);
        setClassPrices(d.classPrices || {});
        if (d.websiteName !== undefined) setWebsiteName(d.websiteName);
        if (d.documentTitle !== undefined) setDocumentTitle(d.documentTitle);
        if (d.logoText !== undefined) setLogoText(d.logoText);
        if (d.logoImage !== undefined) setLogoImage(d.logoImage);
        if (d.faviconUrl !== undefined) setFaviconUrl(d.faviconUrl);
        if (d.heroTitle !== undefined) setHeroTitle(d.heroTitle);
        if (d.heroSubtitle !== undefined) setHeroSubtitle(d.heroSubtitle);
        if (d.heroBadgeText !== undefined) setHeroBadgeText(d.heroBadgeText);
        if (d.heroCta1Text !== undefined) setHeroCta1Text(d.heroCta1Text);
        if (d.heroCta1Link !== undefined) setHeroCta1Link(d.heroCta1Link);
        if (d.heroCta2Text !== undefined) setHeroCta2Text(d.heroCta2Text);
        if (d.heroCta2Link !== undefined) setHeroCta2Link(d.heroCta2Link);
        
        if (d.footerDescription !== undefined) setFooterDescription(d.footerDescription);
        if (d.footerLink1Text !== undefined) setFooterLink1Text(d.footerLink1Text);
        if (d.footerLink1Url !== undefined) setFooterLink1Url(d.footerLink1Url);
        if (d.footerLink2Text !== undefined) setFooterLink2Text(d.footerLink2Text);
        if (d.footerLink2Url !== undefined) setFooterLink2Url(d.footerLink2Url);
        if (d.footerLink3Text !== undefined) setFooterLink3Text(d.footerLink3Text);
        if (d.footerLink3Url !== undefined) setFooterLink3Url(d.footerLink3Url);
        if (d.footerLegal1Text !== undefined) setFooterLegal1Text(d.footerLegal1Text);
        if (d.footerLegal1Url !== undefined) setFooterLegal1Url(d.footerLegal1Url);
        if (d.footerLegal2Text !== undefined) setFooterLegal2Text(d.footerLegal2Text);
        if (d.footerLegal2Url !== undefined) setFooterLegal2Url(d.footerLegal2Url);
        if (d.reviewFormUrl !== undefined) setReviewFormUrl(d.reviewFormUrl);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'superadmin') {
      fetchData();
    }
  }, [user]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user?.role !== 'superadmin') return alert('Only Super Admin can update settings.');
    try {
      await setDoc(doc(db, 'settings', 'global'), { 
        upiId,
        priceNotes: Number(priceNotes),
        priceLectures: Number(priceLectures),
        pricePremium: Number(pricePremium),
        classPrices,
        websiteName, documentTitle, logoText, logoImage, faviconUrl,
        heroTitle, heroSubtitle, heroBadgeText, heroCta1Text, heroCta1Link, heroCta2Text, heroCta2Link,
        footerDescription, footerLink1Text, footerLink1Url, footerLink2Text, footerLink2Url, footerLink3Text, footerLink3Url,
        footerLegal1Text, footerLegal1Url, footerLegal2Text, footerLegal2Url, reviewFormUrl
      }, { merge: true });
      alert('Settings saved successfully!');
    } catch (e) {
      console.error(e);
      alert('Failed to save settings.');
    }
  };

  const handleCreateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      if (editingMaterialId) {
        await updateDoc(doc(db, 'materials', editingMaterialId), {
          title,
          description: desc,
          type,
          thumbnailUrl,
          requiredPlan: plan,
          classGroup,
          updatedAt: serverTimestamp(),
        });
        await setDoc(doc(db, 'materials_secure', editingMaterialId), { url });
        setEditingMaterialId(null);
      } else {
        const docRef = await addDoc(collection(db, 'materials'), {
          title,
          description: desc,
          type,
          thumbnailUrl,
          requiredPlan: plan,
          classGroup,
          authorId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        await setDoc(doc(db, 'materials_secure', docRef.id), { url });
      }
      
      setTitle(''); setDesc(''); setUrl(''); setThumbnailUrl('');
      setPlan('free'); setClassGroup('all'); setType('note');
      fetchData();
    } catch (error) {
      console.error("Error creating/updating material", error);
    }
  };

  const handleEditMaterialStart = async (mat: any) => {
    setEditingMaterialId(mat.id);
    setTitle(mat.title);
    setDesc(mat.description);
    setThumbnailUrl(mat.thumbnailUrl || '');
    setType(mat.type);
    setPlan(mat.requiredPlan);
    setClassGroup(mat.classGroup || 'all');
    try {
      const docSnap = await getDoc(doc(db, 'materials_secure', mat.id));
      if (docSnap.exists()) {
        setUrl(docSnap.data().url);
      } else {
        setUrl(mat.url || '');
      }
    } catch {
      setUrl(mat.url || '');
    }
    // Scroll to top of the form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEditMaterial = () => {
    setEditingMaterialId(null);
    setTitle(''); setDesc(''); setUrl(''); setThumbnailUrl('');
    setPlan('free'); setClassGroup('all'); setType('note');
  };

  const handleCreateMentor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await addDoc(collection(db, 'mentors'), {
        name: mentorName,
        role: mentorRole,
        image: mentorImage,
        experience: mentorExperience || 'Distinguished educator with vast experience.',
        description: mentorDescription || 'Dedicated to nurturing students and delivering stellar top-tier results in competitive exams.',
        createdAt: serverTimestamp(),
      });
      setMentorName(''); setMentorRole(''); setMentorImage('');
      setMentorExperience(''); setMentorDescription('');
      fetchData();
    } catch (error) {
      console.error("Error creating mentor", error);
    }
  };

  const handleDeleteMentor = async (mentorId: string) => {
    try {
      await deleteDoc(doc(db, 'mentors', mentorId));
      fetchData();
    } catch (error) {
      console.error("Error deleting mentor", error);
    }
  };

  const handleDeleteMaterial = async (materialId: string) => {
    try {
      await deleteDoc(doc(db, 'materials_secure', materialId));
      await deleteDoc(doc(db, 'materials', materialId));
      fetchData();
    } catch (error) {
      console.error("Error deleting material", error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await deleteDoc(doc(db, 'users', userId));
      fetchData();
    } catch (error) {
      console.error("Error deleting user", error);
    }
  };

  const [managingUser, setManagingUser] = useState<any | null>(null);

  const handleUpdateUser = async (userId: string, field: string, value: any) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        [field]: value,
        updatedAt: serverTimestamp()
      });
      fetchData();
    } catch (error) {
      console.error("Error updating user", error);
    }
  };

  const toggleMaterialAccess = async (userId: string, materialId: string, currentUnlocked: string[]) => {
    const list = currentUnlocked || [];
    const newList = list.includes(materialId) ? list.filter(id => id !== materialId) : [...list, materialId];
    await handleUpdateUser(userId, 'unlockedMaterials', newList);
    
    // Update local state for immediate UI reflection if the modal is open
    setManagingUser((prev: any) => ({ ...prev, unlockedMaterials: newList }));
  };

  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    return <div className="min-h-screen pt-32 text-center">Unauthorized</div>;
  }

  return (
    <motion.div 
      initial={{ opacity: 0, filter: 'blur(5px)' }}
      animate={{ opacity: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, filter: 'blur(5px)' }}
      transition={{ duration: 0.5 }}
      className="min-h-screen pt-24 pb-32 px-6 md:px-12 max-w-7xl mx-auto"
    >
       <button 
         onClick={() => navigate('/dashboard')}
         className="mb-8 flex items-center gap-2 text-white/50 hover:text-white transition-colors"
       >
         <ArrowLeft className="w-5 h-5" />
         <span>Back to Dashboard</span>
       </button>
       
       <h1 className="text-4xl font-display font-medium mb-8">Admin Control</h1>
       
       <div className="flex gap-4 border-b border-white/5 mb-8">
         <button 
           onClick={() => setActiveTab('materials')}
           className={`pb-4 px-2 font-medium transition-colors border-b-2 ${activeTab === 'materials' ? 'border-[#E5D2A5] text-[#E5D2A5]' : 'border-transparent text-white/50 hover:text-white'}`}
         >
           Content Engine
         </button>
         <button 
           onClick={() => setActiveTab('users')}
           className={`pb-4 px-2 font-medium transition-colors border-b-2 ${activeTab === 'users' ? 'border-[#E5D2A5] text-[#E5D2A5]' : 'border-transparent text-white/50 hover:text-white'}`}
         >
           Student Roster
         </button>
         <button 
           onClick={() => setActiveTab('mentors')}
           className={`pb-4 px-2 font-medium transition-colors border-b-2 ${activeTab === 'mentors' ? 'border-[#E5D2A5] text-[#E5D2A5]' : 'border-transparent text-white/50 hover:text-white'}`}
         >
           Faculty / Mentors
         </button>
         {user?.role === 'superadmin' && (
           <button 
             onClick={() => setActiveTab('settings')}
             className={`pb-4 px-2 font-medium transition-colors border-b-2 ${activeTab === 'settings' ? 'border-[#E5D2A5] text-[#E5D2A5]' : 'border-transparent text-white/50 hover:text-white'}`}
           >
             Settings
           </button>
         )}
       </div>

       {activeTab === 'settings' && user?.role === 'superadmin' && (
         <div className="max-w-4xl border border-white/10 p-6 rounded-2xl bg-white/5">
           <h3 className="text-xl font-medium mb-6">Global Settings</h3>
           <form onSubmit={handleSaveSettings} className="space-y-6">
             {/* Prices Section */}
             <div>
               <div className="flex items-center justify-between mb-4">
                 <h4 className="text-sm font-medium text-[#E5D2A5] uppercase tracking-wide">Pricing Configuration (Default)</h4>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                 <div>
                   <label className="block text-sm text-white/60 mb-2">Notes Plan Price (₹)</label>
                   <input type="number" value={priceNotes} onChange={e => setPriceNotes(Number(e.target.value))} className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5]" />
                 </div>
                 <div>
                   <label className="block text-sm text-white/60 mb-2">Lectures Plan Price (₹)</label>
                   <input type="number" value={priceLectures} onChange={e => setPriceLectures(Number(e.target.value))} className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5]" />
                 </div>
                 <div>
                   <label className="block text-sm text-white/60 mb-2">Premium Plan Price (₹)</label>
                   <input type="number" value={pricePremium} onChange={e => setPricePremium(Number(e.target.value))} className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5]" />
                 </div>
                 <div className="md:col-span-3">
                   <label className="block text-sm text-white/60 mb-2">UPI ID (For Payments)</label>
                   <input type="text" placeholder="e.g. john@upi" value={upiId} onChange={e => setUpiId(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-[#E5D2A5]" />
                 </div>
               </div>
               
               {['6', '7', '8', '9', '10', '11', '12', 'dropper'].map(cls => (
                 <div key={cls} className="mb-6 p-4 rounded-xl border border-white/10 bg-black/20">
                   <h5 className="text-sm font-medium text-white mb-4 capitalize">Class {cls} Custom Prices (Leave empty to use default)</h5>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <div>
                       <label className="block text-xs text-white/60 mb-2">Notes (₹)</label>
                       <input type="number" placeholder="Default" value={classPrices[cls]?.notes || ''} onChange={e => setClassPrices((p: any) => ({ ...p, [cls]: { ...p[cls], notes: e.target.value ? Number(e.target.value) : undefined } }))} className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5]" />
                     </div>
                     <div>
                       <label className="block text-xs text-white/60 mb-2">Lectures (₹)</label>
                       <input type="number" placeholder="Default" value={classPrices[cls]?.lectures || ''} onChange={e => setClassPrices((p: any) => ({ ...p, [cls]: { ...p[cls], lectures: e.target.value ? Number(e.target.value) : undefined } }))} className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5]" />
                     </div>
                     <div>
                       <label className="block text-xs text-white/60 mb-2">Premium (₹)</label>
                       <input type="number" placeholder="Default" value={classPrices[cls]?.premium || ''} onChange={e => setClassPrices((p: any) => ({ ...p, [cls]: { ...p[cls], premium: e.target.value ? Number(e.target.value) : undefined } }))} className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5]" />
                     </div>
                   </div>
                 </div>
               ))}
             </div>
             
             {/* Branding Section */}
             <div>
               <h4 className="text-sm font-medium text-[#E5D2A5] mb-4 uppercase tracking-wide">Brand & Identity</h4>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm text-white/60 mb-2">Website Name</label>
                   <input type="text" value={websiteName} onChange={e => setWebsiteName(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5]" />
                 </div>
                 <div>
                   <label className="block text-sm text-white/60 mb-2">Document Title</label>
                   <input type="text" value={documentTitle} onChange={e => setDocumentTitle(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5]" />
                 </div>
                 <div>
                   <label className="block text-sm text-white/60 mb-2">Logo Text (e.g., 'N')</label>
                   <input type="text" value={logoText} onChange={e => setLogoText(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5]" />
                 </div>
                 <div>
                   <label className="block text-sm text-white/60 mb-2">Logo Image URL (Overrides Text)</label>
                   <input type="text" value={logoImage} onChange={e => setLogoImage(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-[#E5D2A5]" />
                 </div>
                 <div className="md:col-span-2">
                   <label className="block text-sm text-white/60 mb-2">Favicon URL (Must be a .ico, .png URL)</label>
                   <input type="text" value={faviconUrl} onChange={e => setFaviconUrl(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-[#E5D2A5]" />
                 </div>
               </div>
             </div>

             {/* Hero Section settings */}
             <div>
               <h4 className="text-sm font-medium text-[#E5D2A5] mb-4 uppercase tracking-wide">Hero Section (Home)</h4>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="md:col-span-2">
                   <label className="block text-sm text-white/60 mb-2">Main Headline</label>
                   <input type="text" value={heroTitle} onChange={e => setHeroTitle(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5]" />
                 </div>
                 <div className="md:col-span-2">
                   <label className="block text-sm text-white/60 mb-2">Subtitle / Description</label>
                   <textarea value={heroSubtitle} onChange={e => setHeroSubtitle(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5] h-20 resize-none" />
                 </div>
                 <div>
                   <label className="block text-sm text-white/60 mb-2">Top Badge Text</label>
                   <input type="text" value={heroBadgeText} onChange={e => setHeroBadgeText(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5]" />
                 </div>
                 <div>
                   <label className="block text-sm text-white/60 mb-2">Primary CTA Text</label>
                   <input type="text" value={heroCta1Text} onChange={e => setHeroCta1Text(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5]" />
                 </div>
                 <div>
                   <label className="block text-sm text-white/60 mb-2">Primary CTA Link</label>
                   <input type="text" placeholder="/dashboard or https://..." value={heroCta1Link} onChange={e => setHeroCta1Link(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5]" />
                 </div>
                 <div>
                   <label className="block text-sm text-white/60 mb-2">Secondary CTA Text</label>
                   <input type="text" value={heroCta2Text} onChange={e => setHeroCta2Text(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5]" />
                 </div>
                 <div>
                   <label className="block text-sm text-white/60 mb-2">Secondary CTA Link</label>
                   <input type="text" placeholder="https://youtube.com/..." value={heroCta2Link} onChange={e => setHeroCta2Link(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5]" />
                 </div>
               </div>
             </div>

             {/* Footer Section */}
             <div>
               <h4 className="text-sm font-medium text-[#E5D2A5] mb-4 uppercase tracking-wide">Footer Configuration</h4>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                 <div className="md:col-span-2">
                   <label className="block text-sm text-white/60 mb-2">Footer Description</label>
                   <textarea value={footerDescription} onChange={e => setFooterDescription(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5] h-20 resize-none" />
                 </div>
               </div>
               
             </div>

             {/* Review & Contact Form Section */}
             <div className="mb-6">
               <h4 className="text-sm font-medium text-[#E5D2A5] mb-4 uppercase tracking-wide">Contact / Review Form Config</h4>
               <div className="grid grid-cols-1 gap-4">
                 <div>
                   <label className="block text-sm text-white/60 mb-2">Form Action URL (e.g., Formspree POST url)</label>
                   <input type="text" placeholder="https://formspree.io/f/..." value={reviewFormUrl} onChange={e => setReviewFormUrl(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-[#E5D2A5]" />
                   <p className="text-xs text-white/40 mt-2">If provided, a contact form will be displayed at the bottom of the home page.</p>
                 </div>
               </div>
             </div>

             <button type="submit" className="px-8 py-3 rounded-full bg-[#E5D2A5] text-[#070709] font-medium hover:bg-[#f4ecd8] transition-colors w-full sm:w-auto">
               Publish Settings
             </button>
           </form>
         </div>
       )}

       {activeTab === 'materials' && (
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 border border-white/10 p-6 rounded-2xl bg-white/5 h-fit">
              <h3 className="text-xl font-medium mb-6">{editingMaterialId ? 'Edit Content' : 'Create Content'}</h3>
              <form onSubmit={handleCreateMaterial} className="space-y-4">
                <input required placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-[#E5D2A5]" />
                <textarea required placeholder="Description" value={desc} onChange={e => setDesc(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-[#E5D2A5] h-24 resize-none" />
                <div className="flex flex-col sm:flex-row gap-4">
                  <select value={type} onChange={e => setType(e.target.value)} className="w-full sm:w-1/2 px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5]">
                    <option value="note">Notes / PDF</option>
                    <option value="lecture">Lecture / Video</option>
                  </select>
                  <select value={classGroup} onChange={e => setClassGroup(e.target.value)} className="w-full sm:w-1/2 px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-[#E5D2A5]">
                    <option value="all">Any Class</option>
                    <option value="6">Class 6</option>
                    <option value="7">Class 7</option>
                    <option value="8">Class 8</option>
                    <option value="9">Class 9</option>
                    <option value="10">Class 10</option>
                    <option value="11">Class 11</option>
                    <option value="12">Class 12</option>
                    <option value="dropper">Dropper</option>
                  </select>
                </div>
                <input placeholder="Optional Thumbnail URL (Image link)" value={thumbnailUrl} onChange={e => setThumbnailUrl(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-[#E5D2A5]" />
                <input required placeholder="Content URL (YouTube/PDF link)" value={url} onChange={e => setUrl(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-[#E5D2A5]" />
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 py-3 rounded-xl bg-[#E5D2A5] text-[#070709] font-medium hover:bg-[#f4ecd8] transition-colors">
                    {editingMaterialId ? 'Update Content' : 'Publish Content'}
                  </button>
                  {editingMaterialId && (
                    <button type="button" onClick={handleCancelEditMaterial} className="flex-1 py-3 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition-colors">
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
            
            <div className="lg:col-span-2 space-y-4">
               {materials.map(mat => (
                 <div key={mat.id} className="p-4 rounded-xl border border-white/10 bg-white/5 flex items-center justify-between">
                   <div>
                     <h4 className="font-medium text-white">{mat.title}</h4>
                     <p className="text-xs text-white/50">{mat.type} • Class: {mat.classGroup === 'all' || !mat.classGroup ? 'Any Class' : `Class ${mat.classGroup}`}</p>
                   </div>
                   <div className="flex items-center gap-2">
                     <button onClick={() => handleEditMaterialStart(mat)} className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 text-xs font-medium transition-colors">
                       Edit
                     </button>
                     <button onClick={() => handleDeleteMaterial(mat.id)} className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-medium transition-colors">
                       Delete
                     </button>
                   </div>
                 </div>
               ))}
            </div>
         </div>
       )}

       {activeTab === 'users' && (
         <div className="overflow-x-auto">
           <table className="w-full text-left bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
             <thead className="border-b border-white/10 bg-white/5">
               <tr>
                 <th className="p-4 font-medium text-white/60">Name</th>
                 <th className="p-4 font-medium text-white/60">Email</th>
                 <th className="p-4 font-medium text-white/60">Streak</th>
                 <th className="p-4 font-medium text-white/60">Role</th>
                 <th className="p-4 font-medium text-white/60">Class / Batch</th>
                 <th className="p-4 font-medium text-white/60">Access</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-white/10">
               {users.map(u => (
                 <tr key={u.id} className="hover:bg-white/5 transition-colors">
                   <td className="p-4">{u.displayName}</td>
                   <td className="p-4 text-white/60">{u.email}</td>
                   <td className="p-4">
                     <div className="flex items-center gap-1.5 text-orange-400">
                       <Flame className="w-4 h-4" />
                       <span className="font-medium text-sm">{u.streak || 0}</span>
                     </div>
                   </td>
                   <td className="p-4">
                     <select 
                       disabled={user.role !== 'superadmin' || u.id === user.uid}
                       className="bg-black/50 border border-white/10 rounded-lg px-2 py-1 text-sm text-white disabled:opacity-50"
                       value={u.role}
                       onChange={e => handleUpdateUser(u.id, 'role', e.target.value)}
                     >
                       <option value="student">Student</option>
                       <option value="admin">Admin</option>
                       {user.role === 'superadmin' && <option value="superadmin">Superadmin</option>}
                     </select>
                   </td>
                   <td className="p-4">
                     <select 
                       className="bg-black/50 border border-white/10 rounded-lg px-2 py-1 text-sm text-white"
                       value={u.classGroup || 'all'}
                       onChange={e => handleUpdateUser(u.id, 'classGroup', e.target.value)}
                     >
                       <option value="all">Any/All Classes</option>
                        <option value="6">Class 6</option>
                        <option value="7">Class 7</option>
                        <option value="8">Class 8</option>
                        <option value="9">Class 9</option>
                        <option value="10">Class 10</option>
                        <option value="11">Class 11</option>
                        <option value="12">Class 12</option>
                        <option value="dropper">Dropper</option>
                       
                       
                       
                     </select>
                   </td>
                   <td className="p-4 flex items-center gap-2">
                     <button
                       onClick={() => setManagingUser(u)}
                       className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-medium transition-colors"
                     >
                       Manage Specifics
                     </button>
                     <button
                       onClick={() => handleDeleteUser(u.id)}
                       className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-medium transition-colors"
                     >
                       Delete
                     </button>
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
         </div>
       )}
       {activeTab === 'mentors' && (
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 border border-white/10 p-6 rounded-2xl bg-white/5 h-fit">
              <h3 className="text-xl font-medium mb-6">Add Faculty</h3>
              <form onSubmit={handleCreateMentor} className="space-y-4">
                <input required placeholder="Name (e.g. Dr. Aryan Sharma)" value={mentorName} onChange={e => setMentorName(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-[#E5D2A5]" />
                <input required placeholder="Role (e.g. AIIMS Topper)" value={mentorRole} onChange={e => setMentorRole(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-[#E5D2A5]" />
                <input placeholder="Experience (e.g. 10+ Years Exp, Ex-IITian) [Optional]" value={mentorExperience} onChange={e => setMentorExperience(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-[#E5D2A5]" />
                <textarea placeholder="Bio/Description [Optional]" value={mentorDescription} onChange={e => setMentorDescription(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-[#E5D2A5] h-20 resize-none" />
                <input required placeholder="Image URL (Unsplash link)" value={mentorImage} onChange={e => setMentorImage(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-[#E5D2A5]" />
                <button type="submit" className="w-full py-3 rounded-xl bg-[#E5D2A5] text-[#070709] font-medium hover:bg-[#f4ecd8] transition-colors">Add Faculty</button>
              </form>
            </div>
            
            <div className="lg:col-span-2 space-y-4">
               {mentors.map(m => (
                 <div key={m.id} className="p-4 rounded-xl border border-white/10 bg-white/5 gap-4 flex items-center justify-between">
                   <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-full overflow-hidden shrink-0">
                       <img src={m.image} alt={m.name} className="w-full h-full object-cover" />
                     </div>
                     <div>
                       <h4 className="font-medium text-white">{m.name}</h4>
                       <p className="text-xs text-white/50">{m.role}</p>
                     </div>
                   </div>
                   <button onClick={() => handleDeleteMentor(m.id)} className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-medium transition-colors">
                     Delete
                   </button>
                 </div>
               ))}
            </div>
         </div>
       )}
       {managingUser && (
         <Dialog open={!!managingUser} onOpenChange={(open) => !open && setManagingUser(null)}>
           <DialogContent className="sm:max-w-[600px] bg-[#070709] border border-white/10 text-white rounded-2xl">
             <DialogHeader>
               <DialogTitle className="text-xl font-display font-medium text-white">Specific Content Access</DialogTitle>
               <DialogDescription className="text-white/50">
                 Grant {managingUser.displayName} access to specific locked materials.
               </DialogDescription>
             </DialogHeader>

             <div className="mt-4 space-y-2 max-h-[60vh] overflow-y-auto pr-2">
               {materials.map(mat => {
                 const unlocked = managingUser.unlockedMaterials?.includes(mat.id);
                 return (
                   <div key={mat.id} className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/5">
                     <div>
                       <h4 className="font-medium text-white">{mat.title}</h4>
                       <p className="text-xs text-white/50">{mat.type} • Class: {mat.classGroup === 'all' || !mat.classGroup ? 'Any Class' : `Class ${mat.classGroup}`}</p>
                     </div>
                     <button
                       onClick={() => toggleMaterialAccess(managingUser.id, mat.id, managingUser.unlockedMaterials)}
                       className={`p-2 rounded-lg transition-colors ${unlocked ? 'bg-[#E5D2A5] text-[#070709]' : 'bg-black/50 text-white/40 hover:text-white/80'}`}
                     >
                       {unlocked ? <Check className="w-5 h-5" /> : <LockOpen className="w-5 h-5" />}
                     </button>
                   </div>
                 );
               })}
             </div>
           </DialogContent>
         </Dialog>
       )}
    </motion.div>
  );
}
