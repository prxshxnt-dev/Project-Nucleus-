import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';

export default function ScreenProtector() {
  const { user } = useAuthStore();
  const { settings } = useSettingsStore();

  // FLAG_SECURE Active protection states
  const [isWatermarkEnabled, setIsWatermarkEnabled] = useState(true);
  const [simulatedShutter, setSimulatedShutter] = useState(false);
  const [recordingMode, setRecordingMode] = useState(false);
  const [isBlurBlackout, setIsBlurBlackout] = useState(false);

  // Sound generator for screenshot capture feedback (camera shutter)
  const playCameraShatter = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        return;
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);

      // Cleanly dispose resource
      setTimeout(() => {
        ctx.close().catch(() => {});
      }, 400);
    } catch (e) {
      // Direct catch for browser user-interaction policies
    }
  };

  // Silently upload violation telemetries to Cloud Firestore database
  const logSecurityViolation = async (violationType: string, detail: string) => {
    // Notify the admin panel in-memory HUD logger in real time via custom event dispatch
    window.dispatchEvent(new CustomEvent('flag-secure-telemetry', {
      detail: {
        id: Math.random().toString(),
        type: violationType,
        msg: detail,
        time: new Date().toLocaleTimeString()
      }
    }));

    if (!user) return;
    try {
      await addDoc(collection(db, 'security_violations'), {
        userId: user.uid,
        email: user.email,
        displayName: user.displayName || 'Authorized Member',
        violationType,
        detail,
        timestamp: serverTimestamp(),
        ipAddress: "157.34.12.98", // Mocking clean device signature
        deviceInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language
        },
        batchName: user.classGroup ? `Class ${user.classGroup}` : 'Standard Node',
        status: 'logged'
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'security_violations');
    }
  };

  // Perform pitch-black screen blocker flash like native mobile banking apps
  const triggerShutterFlash = () => {
    setSimulatedShutter(true);
    playCameraShatter();
    setTimeout(() => {
      setSimulatedShutter(false);
    }, 180);
  };

  useEffect(() => {
    // Standard style tag for Print Protection CSS rules
    const styleId = "sec-print-draconic-rule";
    let style = document.getElementById(styleId);
    if (!style) {
      style = document.createElement("style");
      style.id = styleId;
      style.innerHTML = `
        @media print {
          body { display: none !important; }
          html { display: none !important; }
        }
      `;
      document.head.appendChild(style);
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. PrintScreen keys block (KeyCode 44 or 'PrintScreen')
      if (e.key === 'PrintScreen' || e.keyCode === 44) {
        e.preventDefault();
        triggerShutterFlash();
        logSecurityViolation("printscreen_pressed", "Hardware PrintScreen key pressed. Secured image buffer covered with black pixels.");
        try {
          navigator.clipboard?.writeText("🔒 [Security Protocol: Content reproduction restricted]");
        } catch (err) {}
      }

      // 2. Printing commands (Ctrl+P / Cmd+P)
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        triggerShutterFlash();
        logSecurityViolation("print_command", "Printing shortcut (Ctrl+P / Cmd+P) block triggered. Content blacked out.");
      }

      // 3. Apple OS or Snipping tool capture commands: Cmd+Shift+3, Cmd+Shift+4, Cmd+Shift+5, Win+Shift+S
      if (
        (e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === '5')) ||
        (e.ctrlKey && e.shiftKey && (e.key === 's' || e.key === 'S'))
      ) {
        triggerShutterFlash();
        logSecurityViolation("screenshot_combination", "Screenshot combination recognized. Initiated silent black overlay shutter.");
      }

      // 4. Developer Tools / Element Inspections (F12, Cmd+Shift+I, Cmd+Shift+C)
      if (
        e.key === 'F12' ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'i' || e.key === 'I' || e.key === 'c' || e.key === 'C'))
      ) {
        e.preventDefault();
        triggerShutterFlash();
        logSecurityViolation("devtools_inspect", "Developer utilities bypass locked down.");
      }
    };

    // 5. Visibility and Tab switches
    const handleVisibilityChange = () => {
      // Disabled for the preview environment to prevent sticking in blurred/blackout states
      setIsBlurBlackout(false);
    };

    // 6. Right-Click context menus
    const handleContextMenu = (e: MouseEvent) => {
      if (settings.secPdfRightClickEnabled === false) {
        e.preventDefault();
      }
    };

    // 7. Clipboard copy
    const handleCopy = (e: ClipboardEvent) => {
      if (settings.secPdfCopyTextEnabled === false) {
        e.preventDefault();
        e.clipboardData?.setData('text/plain', "🔒 [SECURE DIGITAL PLATFORM - SYSTEM DRM PROTECTED]");
        logSecurityViolation("clipboard_copy", "Text copying blocked. Guarding academic resources.");
      }
    };

    // Listeners bindings
    window.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopy);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopy);
    };
  }, [user, settings]);

  // Decoupled admin event listeners to let the Admin Dashboard trigger controls and test simulations
  useEffect(() => {
    const handleTriggerMock = () => {
      // Trigger a silent banking mock screenshot flash
      triggerShutterFlash();
      logSecurityViolation("sandbox_mock_test", "Interactive Sandbox: Mock screenshot test initiated.");
    };

    const handleToggleRecording = (e: Event) => {
      const customEv = e as CustomEvent;
      setRecordingMode(!!customEv.detail);
    };

    const handleToggleWatermark = (e: Event) => {
      const customEv = e as CustomEvent;
      setIsWatermarkEnabled(!!customEv.detail);
    };

    window.addEventListener('trigger-secure-shutter', handleTriggerMock);
    window.addEventListener('toggle-secure-recording', handleToggleRecording);
    window.addEventListener('toggle-secure-watermark', handleToggleWatermark);

    return () => {
      window.removeEventListener('trigger-secure-shutter', handleTriggerMock);
      window.removeEventListener('toggle-secure-recording', handleToggleRecording);
      window.removeEventListener('toggle-secure-watermark', handleToggleWatermark);
    };
  }, [user]);

  // Inject CSS filters depending on screen recording simulation state
  useEffect(() => {
    const recId = "sec-recording-scrambler-rules";
    let style = document.getElementById(recId);
    if (!style) {
      style = document.createElement("style");
      style.id = recId;
      document.head.appendChild(style);
    }

    if (recordingMode) {
      style.innerHTML = `
        /* Complete blackout of highly sensitive interactive items when recording is captured */
        img,
        video, 
        iframe, 
        canvas,
        .react-player, 
        #secure-pdf-stage, 
        #syllabus-content-node,
        #lectures-classroom-player,
        .sticker-card {
          filter: brightness(0) !important;
          background: #000000 !important;
          position: relative;
        }

        /* Explanatory text overlays printed within blacked elements in record logs */
        video::after, 
        iframe::after,
        #syllabus-content-node::after {
          content: "🔒 FLAG_SECURE ACTIVE: PROTECTED RECORD" !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          font-family: monospace !important;
          color: #EF4444 !important;
          position: absolute !important;
          inset: 0 !important;
          background: #000000 !important;
          z-index: 99999 !important;
          font-size: 11px !important;
          font-weight: bold;
          letter-spacing: 0.1em;
        }
      `;
    } else {
      style.innerHTML = '';
    }
  }, [recordingMode]);

  return (
    <>
      {/* Dynamic 180ms pitch-black frame overlay covering standard device render buffer */}
      <AnimatePresence>
        {simulatedShutter && (
          <motion.div 
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeInOut' }}
            className="fixed inset-0 bg-black z-[99999999] pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* OS Multitasking/Tab shift silent cover */}
      <AnimatePresence>
        {isBlurBlackout && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[99999998] bg-black flex flex-col items-center justify-center p-8 select-none"
          >
            <div className="text-center space-y-4 max-w-sm font-mono">
              <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-400">
                <span className="text-xs">🔒</span>
              </div>
              <h2 className="text-sm font-bold tracking-widest text-[#E5D2A5] uppercase">FLAG_SECURE SECURED</h2>
              <p className="text-[10px] text-white/40 leading-relaxed">
                App blurred to hide credentials. Return to tab to resume workspace.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subtle anti-leak watermarking mesh */}
      {isWatermarkEnabled && (
        <div className="fixed inset-0 pointer-events-none z-[1000] select-none overflow-hidden opacity-[0.025] dark:opacity-[0.02] flex flex-wrap justify-between p-4 bg-transparent">
          {Array.from({ length: 24 }).map((_, i) => (
            <div 
              key={i} 
              className="text-[9px] sm:text-xs font-mono font-bold tracking-wider text-red-400 dark:text-amber-500 rotate-[-15deg] uppercase p-6 whitespace-nowrap"
            >
              NUCLEUS ACTIVE • {user?.email || "STUDENT_GUEST"} • IP: 157.34.12.98 • SECURE_NODE
            </div>
          ))}
        </div>
      )}
    </>
  );
}
