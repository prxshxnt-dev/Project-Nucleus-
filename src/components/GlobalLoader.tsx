import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSettingsStore } from '../store/settingsStore';

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
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-6 overflow-hidden select-none bg-[#0c0d0e]"
    >
      {/* Morphing Liquid Background Curtain */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 fill-[#0c0d0e]" viewBox="0 0 100 100" preserveAspectRatio="none">
        <motion.path
          initial={{ d: "M 0 100 C 30 100, 70 100, 100 100 L 100 100 C 70 100, 30 100, 0 100 Z" }}
          animate={{ d: "M 0 0 C 30 0, 70 0, 100 0 L 100 100 C 70 100, 30 100, 0 100 Z" }}
          exit={{ d: [
            "M 0 0 C 30 0, 70 0, 100 0 L 100 100 C 70 100, 30 100, 0 100 Z",
            "M 0 0 C 30 0, 70 0, 100 0 L 100 60 C 70 115, 30 115, 0 60 Z",
            "M 0 0 C 30 0, 70 0, 100 0 L 100 0 C 70 0, 30 0, 0 0 Z"
          ]}}
          transition={{ 
            duration: 0.9, 
            ease: [0.76, 0, 0.24, 1] 
          }}
        />
      </svg>

      {/* Dynamic Grid Background mirroring whiteboard/coordinate paper */}
      <div className="absolute inset-0 bg-[radial-gradient(#FA8339_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none z-[2]" />

      {/* Radial ambient background splash glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] sm:w-[500px] sm:h-[500px] rounded-full bg-gradient-to-tr from-[#FE9E5C]/15 to-[#FA8339]/5 blur-[80px] pointer-events-none z-[2]" />
      <div className="absolute top-1/3 left-1/4 w-[250px] h-[250px] rounded-full bg-purple-500/10 blur-[80px] pointer-events-none animate-pulse z-[2]" />

      <div className="relative flex flex-col items-center max-w-sm text-center z-10">
        
        {/* Playful Interactive Morphing Scalloped Container wrapper */}
        <div className="relative w-32 h-32 sm:w-40 sm:h-40 flex items-center justify-center mb-8">
          
          {/* Animated Chalk Hand-drawn Outer Swirling Arrows / Circles */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" viewBox="0 0 100 100">
            <motion.path
              d="M 15 50 C 15 30.6, 30.6 15, 50 15 C 69.4 15, 85 30.6, 85 50 C 85 69.4, 69.4 85, 50 85"
              fill="none"
              stroke="#FA8339"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray="6 6"
              animate={{ rotate: 360 }}
              transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
              className="origin-center opacity-85"
            />
            {/* Playful hand-drawn chalk dot annotations */}
            <circle cx="85" cy="50" r="3.5" fill="#FA8339" className="opacity-90 animate-bounce" style={{ animationDelay: '0.2s' }} />
            <circle cx="15" cy="50" r="2.5" fill="#a78bfa" className="opacity-90 animate-bounce" />
            <circle cx="50" cy="15" r="3" fill="#fbbf24" className="opacity-90 animate-bounce" style={{ animationDelay: '0.4s' }} />
          </svg>

          {/* Morphing Scalloped shape mimicking our gorgeous Home avatar badge */}
          <svg className="absolute w-[85%] h-[85%]" viewBox="0 0 100 100">
            <motion.path
              d="M 50 5 Q 58 11 65 5 Q 73 11 79 7 Q 85 15 91 13 Q 93 22 98 22 Q 98 31 100 35 Q 98 44 98 50 Q 98 56 100 65 Q 98 69 98 78 Q 93 78 91 87 Q 85 85 79 93 Q 73 89 65 95 Q 58 89 50 95 Q 42 89 35 95 Q 27 89 21 93 Q 15 85 9 87 Q 7 78 2 78 Q 2 69 0 65 Q 2 56 2 50 Q 2 44 0 35 Q 2 31 2 22 Q 7 22 9 13 Q 15 15 21 7 Q 27 11 35 5 Q 42 11 50 5 Z"
              fill="#FA8339"
              animate={{
                scale: [1, 1.05, 0.98, 1.03, 1],
                rotate: [0, 6, -4, 3, 0],
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </svg>

          {/* Centered Glowing Play Icon symbolizing playable learning */}
          <div className="absolute z-20 flex flex-col items-center justify-center text-white scale-110 drop-shadow-[0_4px_12px_rgba(0,0,0,0.25)]">
            <motion.span 
              className="text-4xl text-white select-none block"
              animate={{ scale: [0.95, 1.15, 0.95] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            >
              🎓
            </motion.span>
          </div>

          {/* Sparkles */}
          <div className="absolute top-0 right-0 w-4 h-4 bg-yellow-400 rounded-full animate-ping z-30" />
        </div>

        {/* Dynamic educational statement title */}
        <h3 className="text-xl font-display font-black text-white tracking-tight mb-2 leading-tight uppercase font-mono">
          Learning Sandbox Active
        </h3>

        {/* Dynamic steps text */}
        <div className="h-6 overflow-hidden w-full relative">
          <AnimatePresence mode="wait">
            <motion.p
              key={stepIndex}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="text-sm font-semibold text-[#FE9E5C] font-mono tracking-wide whitespace-nowrap"
            >
              {steps[stepIndex]}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Bottom loading progress lines */}
        <div className="w-48 h-1.5 bg-white/5 border border-white/10 rounded-full mt-6 overflow-hidden relative">
          <motion.div
            initial={{ width: "4%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 2.2, ease: "easeInOut" }}
            className="h-full bg-gradient-to-r from-[#FA8339] to-yellow-400 rounded-full"
          />
        </div>

        {/* Playful Chalk arrows & decals background detail */}
        <div className="absolute top-1/4 -left-12 opacity-50 text-slate-500 font-mono text-[9px] -rotate-12 select-none pointer-events-none">
          ∫ dx = x + C ✏️
        </div>
        <div className="absolute bottom-1/4 -right-12 opacity-50 text-slate-500 font-mono text-[9px] rotate-12 select-none pointer-events-none">
          E = mc² 💥
        </div>
      </div>
    </motion.div>
  );
}
