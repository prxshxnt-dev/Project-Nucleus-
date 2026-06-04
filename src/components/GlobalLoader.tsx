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
      className="fixed inset-0 z-[99999] flex items-center justify-center p-6 overflow-hidden select-none bg-black/15 pointer-events-auto"
    >
      <style dangerouslySetInnerHTML={{ __html: `
        .pencil {
          display: block;
          width: 10em;
          height: 10em;
          color: var(--accent-primary, #4F46E5);
        }

        .pencil__body1,
        .pencil__body2,
        .pencil__body3,
        .pencil__eraser,
        .pencil__eraser-skew,
        .pencil__point,
        .pencil__rotate,
        .pencil__stroke {
          animation-duration: 3s;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }

        .pencil__body1,
        .pencil__body2,
        .pencil__body3 {
          transform: rotate(-90deg);
        }

        .pencil__body1 {
          animation-name: pencilBody1;
        }

        .pencil__body2 {
          animation-name: pencilBody2;
        }

        .pencil__body3 {
          animation-name: pencilBody3;
        }

        .pencil__eraser {
          animation-name: pencilEraser;
          transform: rotate(-90deg) translate(49px, 0);
        }

        .pencil__eraser-skew {
          animation-name: pencilEraserSkew;
          animation-timing-function: ease-in-out;
        }

        .pencil__point {
          animation-name: pencilPoint;
          transform: rotate(-90deg) translate(49px, -30px);
        }

        .pencil__rotate {
          animation-name: pencilRotate;
        }

        .pencil__stroke {
          animation-name: pencilStroke;
          transform: translate(100px, 100px) rotate(-113deg);
        }

        /* Animations */
        @keyframes pencilBody1 {
          from,
          to {
            stroke-dashoffset: 351.86;
            transform: rotate(-90deg);
          }

          50% {
            stroke-dashoffset: 150.8;
            transform: rotate(-225deg);
          }
        }

        @keyframes pencilBody2 {
          from,
          to {
            stroke-dashoffset: 406.84;
            transform: rotate(-90deg);
          }

          50% {
            stroke-dashoffset: 174.36;
            transform: rotate(-225deg);
          }
        }

        @keyframes pencilBody3 {
          from,
          to {
            stroke-dashoffset: 296.88;
            transform: rotate(-90deg);
          }

          50% {
            stroke-dashoffset: 127.23;
            transform: rotate(-225deg);
          }
        }

        @keyframes pencilEraser {
          from,
          to {
            transform: rotate(-45deg) translate(49px, 0);
          }

          50% {
            transform: rotate(0deg) translate(49px, 0);
          }
        }

        @keyframes pencilEraserSkew {
          from,
          32.5%,
          67.5%,
          to {
            transform: skewX(0);
          }

          35%,
          65% {
            transform: skewX(-4deg);
          }

          37.5%,
          62.5% {
            transform: skewX(8deg);
          }

          40%,
          45%,
          50%,
          55%,
          60% {
            transform: skewX(-15deg);
          }

          42.5%,
          47.5%,
          52.5%,
          57.5% {
            transform: skewX(15deg);
          }
        }

        @keyframes pencilPoint {
          from,
          to {
            transform: rotate(-90deg) translate(49px, -30px);
          }

          50% {
            transform: rotate(-225deg) translate(49px, -30px);
          }
        }

        @keyframes pencilRotate {
          from {
            transform: translate(100px, 100px) rotate(0);
          }

          to {
            transform: translate(100px, 100px) rotate(720deg);
          }
        }

        @keyframes pencilStroke {
          from {
            stroke-dashoffset: 439.82;
            transform: translate(100px, 100px) rotate(-113deg);
          }

          50% {
            stroke-dashoffset: 164.93;
            transform: translate(100px, 100px) rotate(-113deg);
          }

          75%,
          to {
            stroke-dashoffset: 439.82;
            transform: translate(100px, 100px) rotate(112deg);
          }
        }
      ` }} />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.05 }}
        transition={{ 
          opacity: { duration: 0.6, ease: "easeOut" },
          scale: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
        }}
        className="relative z-10 flex flex-col items-center justify-center"
      >
        <svg
          className="pencil"
          viewBox="0 0 200 200"
          width="200"
          height="200"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <clipPath id="pencil-eraser">
              <rect rx="5" ry="5" width="30" height="30" />
            </clipPath>
          </defs>
          <circle
            className="pencil__stroke"
            r="70"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="439.82 439.82"
            strokeDashoffset="439.82"
            strokeLinecap="round"
            transform="rotate(-113,100,100)"
          />
          <g className="pencil__rotate" transform="translate(100,100)">
            <g fill="none">
              <circle
                className="pencil__body1"
                r="64"
                stroke="hsl(30, 30%, 50%)"
                strokeWidth="30"
                strokeDasharray="402.12 402.12"
                strokeDashoffset="402"
                transform="rotate(-90)"
              />
              <circle
                className="pencil__body2"
                r="74"
                stroke="hsl(30, 30%, 60%)"
                strokeWidth="10"
                strokeDasharray="464.96 464.96"
                strokeDashoffset="465"
                transform="rotate(-90)"
              />
              <circle
                className="pencil__body3"
                r="54"
                stroke="hsl(30, 30%, 40%)"
                strokeWidth="10"
                strokeDasharray="339.29 339.29"
                strokeDashoffset="339"
                transform="rotate(-90)"
              />
            </g>
            <g className="pencil__eraser" transform="rotate(-90) translate(49,0)">
              <g className="pencil__eraser-skew">
                <rect
                  fill="hsl(30, 20%, 90%)"
                  rx="5"
                  ry="5"
                  width="30"
                  height="30"
                />
                <rect
                  fill="hsl(30, 20%, 85%)"
                  width="5"
                  height="30"
                  clipPath="url(#pencil-eraser)"
                />
                <rect fill="hsl(30, 20%, 80%)" width="30" height="20" />
                <rect fill="hsl(30, 20%, 75%)" width="15" height="20" />
                <rect fill="hsl(30, 20%, 85%)" width="5" height="20" />
                <rect fill="hsla(30, 20%, 75%, 0.2)" y="6" width="30" height="2" />
                <rect
                  fill="hsla(30, 20%, 75%, 0.2)"
                  y="13"
                  width="30"
                  height="2"
                />
              </g>
            </g>
            <g className="pencil__point" transform="rotate(-90) translate(49,-30)">
              <polygon fill="hsl(33,90%,70%)" points="15 0,30 30,0 30" />
              <polygon fill="hsl(33,90%,50%)" points="15 0,6 30,0 30" />
              <polygon fill="hsl(223,10%,10%)" points="15 0,20 10,10 10" />
            </g>
          </g>
        </svg>
      </motion.div>
    </motion.div>
  );
}
