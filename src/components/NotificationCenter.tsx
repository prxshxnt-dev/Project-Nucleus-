import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { db } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc, 
  writeBatch,
  Timestamp
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, 
  BellRing, 
  Check, 
  CheckCheck, 
  Trash2, 
  X, 
  Search, 
  BookOpen, 
  Video, 
  FileText, 
  Calendar, 
  CreditCard, 
  Trophy, 
  Gift, 
  AlertCircle,
  Sparkles,
  Inbox
} from 'lucide-react';
import { CATEGORY_METADATA, NotificationService } from '../lib/notificationService';

interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  category: string;
  readStatus: boolean;
  createdAt: any;
  actionUrl?: string;
}

export default function NotificationCenter() {
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const [toast, setToast] = useState<{ message: string; isError?: boolean } | null>(null);
  const showToast = (message: string, isError = false) => {
    setToast({ message, isError });
    setTimeout(() => {
      setToast(null);
    }, 2500);
  };

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Listen to user notifications in real-time
  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(gdoc => {
        const data = gdoc.data();
        return {
          id: gdoc.id,
          ...data,
          // Handle Timestamp conversion safely
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
        } as NotificationItem;
      });

      // Sort locally by date descending
      items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setNotifications(items);
    }, (err) => {
      console.error('Error listening to notifications:', err);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const unreadCount = notifications.filter(n => !n.readStatus).length;

  const handleMarkAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), {
        readStatus: true
      });
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;
    try {
      const batch = writeBatch(db);
      notifications.forEach(n => {
        if (!n.readStatus) {
          batch.update(doc(db, 'notifications', n.id), { readStatus: true });
        }
      });
      await batch.commit();
      showToast('All notifications marked as read', false);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
      showToast('Failed to update notifications', true);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const handleClearAll = async () => {
    if (notifications.length === 0) return;
    try {
      const batch = writeBatch(db);
      notifications.forEach(n => {
        batch.delete(doc(db, 'notifications', n.id));
      });
      await batch.commit();
      showToast('Notification center cleared', false);
    } catch (err) {
      console.error('Failed to clear notifications:', err);
      showToast('Failed to clear notification history', true);
    }
  };

  // Get category icon
  const getCategoryIcon = (category: string) => {
    const meta = CATEGORY_METADATA[category];
    if (meta) return <span className="text-sm">{meta.icon}</span>;

    switch (category) {
      case 'videos': return <Video className="w-4 h-4 text-blue-500" />;
      case 'notes': return <FileText className="w-4 h-4 text-amber-500" />;
      case 'assignments': return <BookOpen className="w-4 h-4 text-indigo-500" />;
      case 'tests': return <Trophy className="w-4 h-4 text-red-500" />;
      case 'liveClasses': return <Calendar className="w-4 h-4 text-emerald-500" />;
      case 'payments': return <CreditCard className="w-4 h-4 text-teal-500" />;
      case 'offers': return <Gift className="w-4 h-4 text-pink-500" />;
      default: return <Bell className="w-4 h-4 text-purple-500" />;
    }
  };

  // Filter notifications
  const filteredNotifications = notifications.filter(n => {
    const matchesCategory = selectedCategory === 'all' || n.category === selectedCategory;
    const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          n.message.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="relative shrink-0" ref={dropdownRef} id="notification-center-root">
      {/* Trigger Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-xl text-text-secondary hover:text-text-primary hover:bg-secondary/60 active:scale-95 transition-all cursor-pointer"
        aria-label="Notifications Panel"
      >
        <AnimatePresence mode="wait">
          {unreadCount > 0 ? (
            <motion.div
              key="bell-ring"
              initial={{ rotate: -15 }}
              animate={{ rotate: [15, -15, 15, -15, 0] }}
              transition={{ repeat: Infinity, repeatDelay: 6, duration: 0.6 }}
            >
              <BellRing className="w-[19px] h-[19px] text-accent-primary" />
            </motion.div>
          ) : (
            <motion.div key="bell-normal">
              <Bell className="w-[19px] h-[19px]" />
            </motion.div>
          )}
        </AnimatePresence>

        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 rounded-full bg-red-500 text-white text-[9px] font-black font-mono flex items-center justify-center border-2 border-background animate-pulse shadow-sm">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="absolute right-0 mt-3 w-[340px] md:w-[420px] bg-card border border-border-color rounded-2.5xl shadow-2xl overflow-hidden z-50 text-left flex flex-col max-h-[600px]"
            style={{ borderRadius: 'var(--theme-card-radius, 20px)' }}
          >
            {/* Header */}
            <div className="p-4 border-b border-border-color bg-secondary/30 flex items-center justify-between">
              <div>
                <h3 className="font-display font-black text-sm tracking-tight text-text-primary uppercase flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-accent-primary animate-spin-slow" />
                  <span>Notification Center</span>
                </h3>
                <p className="text-[10px] font-mono text-text-muted mt-0.5 uppercase">
                  {unreadCount} UNREAD ALERTS
                </p>
              </div>

              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="p-1.5 rounded-lg hover:bg-secondary text-accent-primary hover:text-accent-primary/80 transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-bold uppercase font-mono"
                    title="Mark all as read"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Mark All Read</span>
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-text-muted hover:text-red-400 transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-bold uppercase font-mono"
                    title="Clear history"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Clear All</span>
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-text-muted hover:text-text-primary hover:bg-secondary rounded-lg transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Filters & Search */}
            <div className="p-3 border-b border-border-color bg-secondary/10 space-y-2.5">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search notification title or content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-bg-primary border border-border-color text-xs focus:outline-none focus:ring-1 focus:ring-accent-primary text-text-primary"
                />
              </div>

              {/* Scrollable Category Filter Badges */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-black uppercase tracking-wider shrink-0 transition-all ${
                    selectedCategory === 'all' 
                      ? 'bg-accent-primary text-button-text font-extrabold shadow-sm' 
                      : 'bg-bg-primary text-text-secondary border border-border-color hover:bg-secondary'
                  }`}
                >
                  ALL
                </button>
                {Object.keys(CATEGORY_METADATA).map(catKey => {
                  const meta = CATEGORY_METADATA[catKey];
                  const count = notifications.filter(n => n.category === catKey).length;
                  if (count === 0 && selectedCategory !== catKey) return null;
                  return (
                    <button
                      key={catKey}
                      onClick={() => setSelectedCategory(catKey)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-black uppercase tracking-wider shrink-0 transition-all flex items-center gap-1 ${
                        selectedCategory === catKey 
                          ? 'bg-accent-primary text-button-text font-extrabold shadow-sm' 
                          : 'bg-bg-primary text-text-secondary border border-border-color hover:bg-secondary'
                      }`}
                    >
                      <span>{meta.icon}</span>
                      <span>{meta.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notification Lists Container */}
            <div className="overflow-y-auto flex-1 max-h-[380px] divide-y divide-border-color/60 bg-card">
              <AnimatePresence initial={false}>
                {filteredNotifications.map((notif) => (
                  <motion.div
                    key={notif.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className={`p-4 flex gap-3 hover:bg-secondary/40 transition-colors relative group/item cursor-pointer ${
                      !notif.readStatus ? 'bg-accent-primary/[0.03]' : ''
                    }`}
                    onClick={() => handleMarkAsRead(notif.id)}
                  >
                    {/* Category Icon indicator */}
                    <div className="shrink-0">
                      <div className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center border border-border-color/80 shadow-sm">
                        {getCategoryIcon(notif.category)}
                      </div>
                    </div>

                    {/* Body */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-start justify-between gap-1.5">
                        <h4 className={`text-xs font-sans truncate pr-4 ${!notif.readStatus ? 'font-black text-text-primary' : 'font-medium text-text-secondary'}`}>
                          {notif.title}
                        </h4>
                        {!notif.readStatus && (
                          <span className="shrink-0 w-2 h-2 rounded-full bg-red-500 mt-1" />
                        )}
                      </div>
                      <p className="text-[11px] leading-relaxed text-text-secondary line-clamp-2">
                        {notif.message}
                      </p>
                      
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-[9px] font-mono text-text-muted">
                          {notif.createdAt.toLocaleDateString()} {notif.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        
                        {notif.actionUrl && (
                          <a 
                            href={notif.actionUrl}
                            className="text-[9px] font-bold font-mono text-accent-primary hover:underline uppercase"
                            onClick={(e) => e.stopPropagation()}
                          >
                            OPEN CONTENT →
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Actions on Hover */}
                    <div className="absolute right-3 top-4 flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                      {!notif.readStatus && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleMarkAsRead(notif.id); }}
                          className="p-1 rounded-md bg-secondary border border-border-color hover:bg-accent-primary/10 text-text-secondary hover:text-accent-primary transition-colors cursor-pointer"
                          title="Mark as read"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        onClick={(e) => handleDelete(notif.id, e)}
                        className="p-1 rounded-md bg-secondary border border-border-color hover:bg-red-500/10 text-text-secondary hover:text-red-400 transition-colors cursor-pointer"
                        title="Delete notification"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {filteredNotifications.length === 0 && (
                <div className="p-8 text-center flex flex-col items-center justify-center space-y-2.5">
                  <div className="w-12 h-12 rounded-full bg-secondary border border-border-color/60 flex items-center justify-center text-text-muted">
                    <Inbox className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-text-secondary font-sans">
                      All caught up!
                    </p>
                    <p className="text-[10px] text-text-muted font-mono uppercase">
                      NO NOTIFICATIONS FOUND IN THIS VIEW
                    </p>
                  </div>
                </div>
              )}

              {/* Inline self-dismissing Toast Overlay */}
              {toast && (
                <div className={`absolute bottom-4 left-4 right-4 p-3 rounded-xl border flex items-center gap-2 text-xs font-bold shadow-lg animate-fade-in z-50 ${toast.isError ? 'bg-red-500/15 border-red-500/30 text-red-400' : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'}`}>
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{toast.message}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
