import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import NucleusLogo from './NucleusLogo';

interface LoadingScreenProps {
  text?: string;
  onComplete?: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  onComplete 
}) => {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<'loading' | 'relaxing'>('loading');
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Increment progress smoothly over time
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setPhase('relaxing');
          return 100;
        }
        const remaining = 100 - prev;
        // Faster increase initially, slower as it reaches 100%
        const increment = Math.max(1, Math.floor(Math.random() * Math.min(25, remaining / 3)));
        const next = prev + increment;
        return next > 100 ? 100 : next;
      });
    }, 180);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (phase === 'relaxing') {
      const timer = setTimeout(() => {
        setIsFadingOut(true);
        if (onComplete) {
          setTimeout(onComplete, 600); // Wait for fade-out to finish
        }
      }, 2600); // Soothing 2.6 seconds relax animation
      return () => clearTimeout(timer);
    }
  }, [phase, onComplete]);

  const loadingStyles = `
    @keyframes subtle-pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.02); opacity: 0.95; }
    }
    @keyframes orbit-spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    @keyframes fade-in-up {
      0% { opacity: 0; transform: translateY(10px); }
      100% { opacity: 1; transform: translateY(0); }
    }
    .animate-subtle-pulse {
      animation: subtle-pulse 4s ease-in-out infinite;
    }
    .animate-orbit-spin {
      animation: orbit-spin 20s linear infinite;
    }
    .animate-fade-in-up {
      animation: fade-in-up 0.5s ease-out forwards;
    }

    /* Custom metaball gooey loader from user specifications */
    .loader {
      width: 100px;
      aspect-ratio: 1;
      padding: 10px;
      box-sizing: border-box;
      display: grid;
      background: #fff;
      filter: blur(5px) contrast(10);
      mix-blend-mode: darken;
    }
    .loader:before,
    .loader:after{
      content: "";
      grid-area: 1/1;
      background:
        linear-gradient(#000 0 0) left,
        linear-gradient(#000 0 0) right;
      background-size: 20px 40px;
      background-origin: content-box;
      background-repeat: no-repeat;
    }
    .loader:after {
      height: 20px;
      width:  20px;
      margin: auto 0;
      border-radius: 50%;
      background: #000;
      animation: l10 1s infinite;
    }
    @keyframes l10{
      90%,100% {transform: translate(300%)}
    }

    /* Calming Relax Animation Pulse and Ripple Waves */
    @keyframes relax-pulse {
      0%, 100% {
        transform: scale(0.85);
        opacity: 0.4;
        filter: drop-shadow(0 0 15px rgba(229, 210, 165, 0.25));
      }
      50% {
        transform: scale(1.15);
        opacity: 0.8;
        filter: drop-shadow(0 0 35px rgba(229, 210, 165, 0.6));
      }
    }
    @keyframes relax-ring-expand {
      0% {
        transform: scale(0.7);
        opacity: 0.7;
      }
      100% {
        transform: scale(2.8);
        opacity: 0;
      }
    }
    .animate-relax-pulse {
      animation: relax-pulse 2.6s ease-in-out infinite;
    }
    .animate-relax-ring-1 {
      animation: relax-ring-expand 2.6s cubic-bezier(0.25, 1, 0.5, 1) infinite;
    }
    .animate-relax-ring-2 {
      animation: relax-ring-expand 2.6s cubic-bezier(0.25, 1, 0.5, 1) infinite;
      animation-delay: 0.85s;
    }
    .animate-relax-ring-3 {
      animation: relax-ring-expand 2.6s cubic-bezier(0.25, 1, 0.5, 1) infinite;
      animation-delay: 1.7s;
    }
  `;

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background text-foreground select-none transition-all duration-700 ease-in-out ${
        isFadingOut ? 'opacity-0 scale-[0.98] blur-md pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      <style dangerouslySetInnerHTML={{ __html: loadingStyles }} />
      
      {/* Absolute Decorative Background Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(var(--border-color,rgba(0,0,0,0.08))_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none opacity-40" />
      
      {/* Dynamic Glowing Radial background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-accent-primary/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center max-w-sm px-6 w-full text-center">
        <AnimatePresence mode="wait">
          {phase === 'loading' ? (
            <motion.div
              key="loader-element"
              initial={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85, filter: 'blur(8px)' }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
              className="relative flex items-center justify-center p-6 bg-white border border-zinc-200/60 rounded-[32px] shadow-lg"
            >
              {/* External decorative loading orbit */}
              <div className="absolute inset-0 rounded-[32px] border border-dashed border-[#E5D2A5]/40" />
              <div className="loader" />
            </motion.div>
          ) : (
            <motion.div
              key="relax-element"
              initial={{ opacity: 0, scale: 0.8, filter: 'blur(8px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 1.1, filter: 'blur(12px)' }}
              transition={{ duration: 0.6, ease: [0.25, 1, 0.5, 1] }}
              className="relative flex items-center justify-center w-48 h-48"
            >
              {/* Central soft golden breathing sphere */}
              <div className="absolute w-14 h-14 rounded-full bg-[#E5D2A5] animate-relax-pulse shadow-[0_0_30px_rgba(229,210,165,0.45)]" />
              
              {/* Smooth concentric expanding ripple waves */}
              <div className="absolute w-20 h-20 rounded-full border border-[#E5D2A5]/45 animate-relax-ring-1" />
              <div className="absolute w-20 h-20 rounded-full border border-[#E5D2A5]/25 animate-relax-ring-2" />
              <div className="absolute w-20 h-20 rounded-full border border-[#E5D2A5]/10 animate-relax-ring-3" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
};

export default LoadingScreen;
