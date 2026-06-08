import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSettingsStore } from '../store/settingsStore';
import OrbitalLoader from './OrbitalLoader';

interface GlobalLoaderProps {
  onFullyLoaded?: () => void;
}

export default function GlobalLoader({ onFullyLoaded }: GlobalLoaderProps) {
  const { settings } = useSettingsStore();
  
  const stepsRaw = settings.loaderSteps || "Formulating learning equations...\nLearn to become smart\nLearn to become simple\nLearn to become super fun!\nReady to play & learn!";
  const steps = stepsRaw.split('\n').map((row) => row.trim()).filter(Boolean);

  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (steps.length === 0) return;
    const stepDuration = Math.max(400, Math.floor(2800 / steps.length));

    const timer = setInterval(() => {
      setStepIndex((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, stepDuration);

    const totalDuration = (stepDuration * (steps.length - 1)) + 600;

    const finishTimer = setTimeout(() => {
      if (onFullyLoaded) {
        onFullyLoaded();
      }
    }, Math.max(2200, totalDuration));

    return () => {
      clearInterval(timer);
      clearTimeout(finishTimer);
    };
  }, [onFullyLoaded, steps.length]);

  return (
    <motion.div
      initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
      animate={{ opacity: 1, backdropFilter: 'blur(16px)' }}
      exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
      transition={{ 
        opacity: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
        backdropFilter: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
      }}
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-center p-6 overflow-hidden select-none bg-background/85 pointer-events-auto"
    >
      <style dangerouslySetInnerHTML={{ __html: `
        .loader {
          width: 35px;
          aspect-ratio: 1;
          --_g: no-repeat radial-gradient(farthest-side,#000 94%,#0000);
          background:
            var(--_g) 0    0,
            var(--_g) 100% 0,
            var(--_g) 100% 100%,
            var(--_g) 0    100%;
          background-size: 40% 40%;
          animation: l38 .5s infinite; 
        }
        @keyframes l38 {
          100% {background-position: 100% 0,100% 100%,0 100%,0 0}
        }
      ` }} />

      <motion.div 
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.08 }}
        transition={{ 
          opacity: { duration: 0.6, ease: "easeOut" },
          scale: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
        }}
        className="relative z-10 flex flex-col items-center justify-center space-y-6"
      >
        <div className="loader" id="custom-app-loader"></div>
        {steps[stepIndex] && (
          <AnimatePresence mode="wait">
            <motion.p
              key={stepIndex}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="text-sm font-bold text-muted-foreground tracking-wide text-center"
            >
              {steps[stepIndex]}
            </motion.p>
          </AnimatePresence>
        )}
      </motion.div>
    </motion.div>
  );
}
