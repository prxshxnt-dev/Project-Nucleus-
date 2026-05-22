import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function ScreenProtector() {
  const { user } = useAuthStore();
  const { settings } = useSettingsStore();
  const [isTriggered, setIsTriggered] = useState(false);
  const [reason, setReason] = useState("Security Exclusion Alert");

  // Log violation to Firestore
  const logViolation = async (violationType: string, detail: string) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'security_violations'), {
        userId: user.uid,
        email: user.email,
        displayName: user.displayName || 'Anonymous Student',
        violationType,
        detail,
        timestamp: serverTimestamp(),
        ipAddress: "157.34.12.98", // Simulated student IP
        deviceInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language
        },
        batchName: user.classGroup ? `Class ${user.classGroup}` : 'All Batches',
        status: 'logged'
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'security_violations');
    }
  };

  useEffect(() => {
    if (!user) return; // Only apply protection to logged-in students and guests

    // Let absolute superadmins and admins capture highlights for study guides safely
    const isAdmin = user.role === 'admin' || user.role === 'superadmin';
    if (isAdmin) return;

    const triggerProtection = (type: string, msg: string) => {
      setIsTriggered(true);
      setReason(msg);
      logViolation(type, msg);
    };

    // 1. Keyboard Shortcuts Capture
    const handleKeyDown = (e: KeyboardEvent) => {
      // Print Screen Key
      if ((e.key === 'PrintScreen' || e.keyCode === 44) && settings.secVideoScreenshotProtection !== false) {
        e.preventDefault();
        triggerProtection("screenshot_or_printscreen", "Screenshots are strictly prohibited on this educational node!");
        try {
          navigator.clipboard?.writeText("don't leak our data man");
        } catch (err) {}
      }

      // Ctrl+P / Cmd+P
      if ((e.ctrlKey || e.metaKey) && e.key === 'p' && settings.secPdfPrintEnabled === false) {
        e.preventDefault();
        triggerProtection("print_attempt", "Printing and PDF exports are locked under security protocol!");
      }

      // Cmd+Shift+3, Cmd+Shift+4, Cmd+Shift+5 (macOS captures) or Ctrl+Shift+S
      if (settings.secVideoScreenshotProtection !== false) {
        if (
          (e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === '5')) ||
          (e.ctrlKey && e.shiftKey && (e.key === 's' || e.key === 'S'))
        ) {
          triggerProtection("screenshot_shortcut", "Snipping and capturing tools are blackballed by our DRM layer.");
        }
      }

      // Dev tools shortcuts: F12, Ctrl+Shift+I, Ctrl+Shift+C
      if (
        e.key === 'F12' ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'i' || e.key === 'I' || e.key === 'c' || e.key === 'C'))
      ) {
        e.preventDefault();
        triggerProtection("devtools_inspection", "Developer diagnostics tools are fully locked to avoid content extraction.");
      }
    };

    // 2. Window Blur / Tab Switching Detection
    const handleBlur = () => {
      if (settings.secBlurOnTabSwitch !== false) {
        triggerProtection("tab_switch_or_blur", "Unauthorized window focus divergence or screenshot software activity detected!");
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && settings.secBlurOnTabSwitch !== false) {
        triggerProtection("tab_hidden", "Lecture paused: Context switching or secondary background layout triggered!");
      }
    };

    // 3. Right-Click Prevention (Context Menu)
    const handleContextMenu = (e: MouseEvent) => {
      if (settings.secPdfRightClickEnabled === false) {
        e.preventDefault();
        // Don't show critical block layout on passive right clicks, just block it gracefully
      }
    };

    // 4. Content Copying Block
    const handleCopy = (e: ClipboardEvent) => {
      if (settings.secPdfCopyTextEnabled === false) {
        e.preventDefault();
        e.clipboardData?.setData('text/plain', "[SECURE ACADEMY CONTENT - REPRODUCTION PROHIBITED]");
        triggerProtection("text_copy_attempt", "Copying and clipboard hoarding is disallowed for lecture notes.");
      }
    };

    // 5. Drag-Drop protection
    const handleDragStart = (e: Event) => {
      e.preventDefault();
    };

    // Set up listeners
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('dragstart', handleDragStart);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('dragstart', handleDragStart);
    };
  }, [user, settings]);

  // If protective screen gets activated, provide an unlock button so they can restore.
  if (!isTriggered) return null;

  return (
    <div 
      className="fixed inset-0 z-[999999] bg-[#000000] flex flex-col items-center justify-center p-6 text-center select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="max-w-md w-full space-y-6 theme-card-themed bg-neutral-900/40 p-10 border-red-500/20 shadow-[-1px_1px_40px_rgba(239,68,68,0.08)] rounded-3xl">
        <div className="w-20 h-20 rounded-full border-2 border-red-500 bg-red-500/10 flex items-center justify-center mx-auto text-red-500 animate-pulse">
          <span className="text-3xl font-extrabold">⚠️</span>
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-display font-black tracking-tight text-white uppercase">
            SECURITY EXCLUSION
          </h2>
          <p className="text-red-400 font-mono text-sm font-black uppercase tracking-widest py-1 animate-pulse">
            {reason}
          </p>
        </div>

        <p className="text-zinc-400 text-xs leading-relaxed font-sans">
          To protect proprietary lectures, notes, handwritten boards, and student information, screen capture, snips, prints, or file hoarding are strictly restricted.
        </p>

        <button
          onClick={() => setIsTriggered(false)}
          className="w-full py-3.5 px-6 rounded-xl font-mono text-xs font-bold tracking-widest text-[#070709] bg-[#E5D2A5] hover:bg-[#FFF3D4] uppercase active:scale-[0.98] transition-all cursor-pointer shadow-[0_4px_20px_rgba(229,210,165,0.25)]"
        >
          CONFIRM & RESTORE VIEW
        </button>
      </div>
    </div>
  );
}
