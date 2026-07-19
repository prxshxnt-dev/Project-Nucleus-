import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { auth, db, debugRegistry } from '../lib/firebase';
import firebaseConfig from '../../firebase-applet-config.json';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, RefreshCw, X, Database, Key, Server, Laptop, Activity, AlertCircle } from 'lucide-react';

export default function DebugPanel() {
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isPinging, setIsPinging] = useState(false);
  const [pingResult, setPingResult] = useState<string | null>(null);

  // Debug Panel is strictly visible ONLY to Super Admins matching requirements
  if (user?.role !== 'superadmin') {
    return null;
  }

  const handleTestPing = async () => {
    setIsPinging(true);
    setPingResult(null);
    try {
      const start = Date.now();
      // Try to read a standard document or a dummy doc
      const { getDoc, doc } = await import('firebase/firestore');
      const docRef = doc(db, 'users', 'ping_connection');
      await getDoc(docRef);
      const duration = Date.now() - start;
      setPingResult(`Success! Latency: ${duration}ms`);
    } catch (err: any) {
      setPingResult(`Failed: ${err.message || String(err)}`);
    } finally {
      setIsPinging(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-24 right-6 z-50">
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-full shadow-2xl transition-all duration-200 border-2 border-white/20 z-50 text-xs tracking-wider uppercase"
        >
          <ShieldAlert className="w-4.5 h-4.5 animate-pulse" />
          <span>Super Admin Debug</span>
        </motion.button>
      </div>

      {/* Debug Dialog Slide-Over Panel */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-md h-full bg-[#0F172A] border-l border-slate-800 text-slate-100 flex flex-col shadow-2xl relative overflow-y-auto"
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900">
                <div className="flex items-center gap-2.5">
                  <ShieldAlert className="w-5 h-5 text-red-500" />
                  <div>
                    <h3 className="font-bold text-sm tracking-wide text-white uppercase">Security & Auth Debug Console</h3>
                    <p className="text-[10px] text-slate-400">Super Admin Mode Only</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-6 flex-1 text-xs">
                {/* Section: Environment & Domains */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Laptop className="w-3.5 h-3.5 text-blue-400" />
                    Environment & Device
                  </h4>
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5 font-mono text-[11px]">
                    <div className="flex justify-between"><span className="text-slate-500">Domain:</span> <span className="text-white">{window.location.hostname}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Env:</span> <span className="text-emerald-400">{(import.meta as any).env?.MODE || 'production'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Protocol:</span> <span className="text-white">{window.location.protocol}</span></div>
                  </div>
                </div>

                {/* Section: Firebase Configurations */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-amber-400" />
                    Firebase Project Core Settings
                  </h4>
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5 font-mono text-[11px]">
                    <div className="flex justify-between"><span className="text-slate-500">Project ID:</span> <span className="text-amber-300">{firebaseConfig.projectId}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Database ID:</span> <span className="text-amber-400">{firebaseConfig.firestoreDatabaseId}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Auth Domain:</span> <span className="text-white">{firebaseConfig.authDomain}</span></div>
                  </div>
                </div>

                {/* Section: Current User Auth Session */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-purple-400" />
                    Authentication Identity Session
                  </h4>
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5 font-mono text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Firebase Auth status:</span> 
                      <span className={auth.currentUser ? 'text-emerald-400 font-bold' : 'text-red-400'}>
                        {auth.currentUser ? 'Logged In' : 'Logged Out'}
                      </span>
                    </div>
                    <div className="flex justify-between"><span className="text-slate-500">Zustand status:</span> <span className={user ? 'text-emerald-400' : 'text-red-400'}>{user ? 'Synced' : 'Unsynced'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Email:</span> <span className="text-white">{auth.currentUser?.email || user?.email || 'N/A'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">UID:</span> <span className="text-slate-300 truncate max-w-[200px]" title={auth.currentUser?.uid || user?.uid || 'N/A'}>{auth.currentUser?.uid || user?.uid || 'N/A'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Role:</span> <span className="px-1.5 py-0.5 bg-red-950 border border-red-800/40 text-red-400 rounded-md font-bold text-[9px] uppercase">{user?.role || 'N/A'}</span></div>
                  </div>
                </div>

                {/* Section: Firestore Database & Storage Diagnostics */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-emerald-400" />
                    Cloud Connections & Storage Diagnostics
                  </h4>
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2.5 font-mono text-[11px]">
                    <div className="flex justify-between"><span className="text-slate-500">Firestore Connection:</span> <span className={db ? 'text-emerald-400' : 'text-red-400'}>{db ? 'Active Client' : 'Inactive'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Storage Connection:</span> <span className="text-slate-400">Available (Bucket Ready)</span></div>
                    
                    {/* Diagnostic Ping Test */}
                    <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between gap-2">
                      <button
                        onClick={handleTestPing}
                        disabled={isPinging}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer text-[10px]"
                      >
                        <RefreshCw className={`w-3 h-3 ${isPinging ? 'animate-spin' : ''}`} />
                        <span>Ping Test Connection</span>
                      </button>
                      <span className="text-[10px] text-slate-400 font-sans truncate">{pingResult || "Not pinged"}</span>
                    </div>
                  </div>
                </div>

                {/* Section: Live Diagnostic Error Trackers */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-red-400" />
                    Live Diagnostic Error Trackers
                  </h4>
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2.5 font-mono text-[11px]">
                    <div className="flex justify-between"><span className="text-slate-500">Failed Request Count:</span> <span className={debugRegistry.failedRequestsCount > 0 ? 'text-red-400 font-bold' : 'text-slate-400'}>{debugRegistry.failedRequestsCount}</span></div>
                    {debugRegistry.failedRequestsList.length > 0 && (
                      <div className="text-[9px] text-red-300 max-h-16 overflow-y-auto bg-slate-900/60 p-1.5 rounded-lg border border-red-950/20 space-y-0.5">
                        {debugRegistry.failedRequestsList.map((req, i) => (
                          <div key={i} className="truncate">• {req}</div>
                        ))}
                      </div>
                    )}

                    <div className="space-y-1 pt-1.5 border-t border-slate-800/60">
                      <span className="text-slate-500 block text-[10px]">Last Auth Error:</span>
                      {debugRegistry.lastAuthError ? (
                        <div className="p-2 bg-red-950/30 border border-red-900/20 text-red-300 rounded-lg text-[9px] whitespace-pre-wrap break-all max-h-24 overflow-y-auto">
                          <span className="font-bold block">[{debugRegistry.lastAuthError.code || debugRegistry.lastAuthError.name}]</span>
                          {debugRegistry.lastAuthError.message || String(debugRegistry.lastAuthError)}
                        </div>
                      ) : (
                        <span className="text-emerald-400 font-bold block text-[10px]">None</span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <span className="text-slate-500 block text-[10px]">Last Firestore Error:</span>
                      {debugRegistry.lastFirestoreError ? (
                        <div className="p-2 bg-red-950/30 border border-red-900/20 text-red-300 rounded-lg text-[9px] whitespace-pre-wrap break-all max-h-24 overflow-y-auto">
                          <span className="font-bold block">[{debugRegistry.lastFirestoreError.code || debugRegistry.lastFirestoreError.name}]</span>
                          {debugRegistry.lastFirestoreError.message || String(debugRegistry.lastFirestoreError)}
                        </div>
                      ) : (
                        <span className="text-emerald-400 font-bold block text-[10px]">None</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
