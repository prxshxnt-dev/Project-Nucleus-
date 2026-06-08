import { motion } from 'motion/react';

interface OrbitalLoaderProps {
  size?: 'sm' | 'md' | 'lg' | 'fullscreen';
  text?: string;
  className?: string;
}

export default function OrbitalLoader({ 
  size = 'md', 
  text, 
  className = '' 
}: OrbitalLoaderProps) {
  
  // Choose sizes
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
    fullscreen: 'w-20 h-20'
  };

  const isFullscreen = size === 'fullscreen';

  // Define dynamic orbital rotating ring keyframes that leverage root CSS variables
  const styles = `
    .orbit-perspective {
      perspective: 800px;
    }
    .orbit-inner {
      position: absolute;
      box-sizing: border-box;
      width: 100%;
      height: 100%;
      border-radius: 50%;  
    }
    .orbit-inner.one {
      left: 0%;
      top: 0%;
      animation: orbit-rotate-one 1.2s linear infinite;
      border-bottom: 3.5px solid var(--accent-primary, #4F46E5);
      filter: drop-shadow(0 0 4px var(--accent-primary, #4F46E5));
    }
    .orbit-inner.two {
      right: 0%;
      top: 0%;
      animation: orbit-rotate-two 1.2s linear infinite;
      border-right: 3.5px solid var(--primary-custom, #4F46E5);
      filter: drop-shadow(0 0 4px var(--primary-custom, #4F46E5));
    }
    .orbit-inner.three {
      right: 0%;
      bottom: 0%;
      animation: orbit-rotate-three 1.2s linear infinite;
      border-top: 3.5px solid var(--theme-accent-glow, #FBBF24);
      filter: drop-shadow(0 0 4px var(--theme-accent-glow, #FBBF24));
    }

    @keyframes orbit-rotate-one {
      0% {
        transform: rotateX(35deg) rotateY(-45deg) rotateZ(0deg);
      }
      100% {
        transform: rotateX(35deg) rotateY(-45deg) rotateZ(360deg);
      }
    }

    @keyframes orbit-rotate-two {
      0% {
        transform: rotateX(50deg) rotateY(10deg) rotateZ(0deg);
      }
      100% {
        transform: rotateX(50deg) rotateY(10deg) rotateZ(360deg);
      }
    }

    @keyframes orbit-rotate-three {
      0% {
        transform: rotateX(35deg) rotateY(55deg) rotateZ(0deg);
      }
      100% {
        transform: rotateX(35deg) rotateY(55deg) rotateZ(360deg);
      }
    }
  `;

  if (isFullscreen) {
    return (
      <div className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center p-6 select-none bg-black/10 backdrop-blur-md transition-all duration-300 ${className}`}>
        <style dangerouslySetInnerHTML={{ __html: `
          .loader-fs {
            width: 50px;
            aspect-ratio: 1;
            --_g: no-repeat radial-gradient(farthest-side, var(--primary, #4F46E5) 94%, #0000);
            background:
              var(--_g) 0    0,
              var(--_g) 100% 0,
              var(--_g) 100% 100%,
              var(--_g) 0    100%;
            background-size: 40% 40%;
            animation: l38 .6s infinite; 
          }
          @keyframes l38 {
            100% {background-position: 100% 0, 100% 100%, 0 100%, 0 0}
          }
        ` }} />

        <div className="relative z-10 flex flex-col items-center justify-center">
          <div className="loader-fs" id="orbital-loader-fs"></div>
          {text && (
            <span className="text-xs font-semibold text-[var(--text-secondary)] mt-4 font-mono animate-pulse">
              {text}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Inline / Card Version - perfectly styled with optional glass overlay or organic clean fit
  const numericSize = size === 'sm' ? '30px' : size === 'lg' ? '55px' : '40px';
  return (
    <div className={`inline-flex flex-col items-center justify-center p-6 rounded-[var(--theme-card-radius,16px)] border border-[var(--theme-card-border,rgba(0,0,0,0.06))] bg-[var(--glass-bg)] backdrop-blur-sm shadow-sm ${className}`}>
      <style dangerouslySetInnerHTML={{ __html: `
        .loader-card-${size} {
          width: ${numericSize};
          aspect-ratio: 1;
          --_g: no-repeat radial-gradient(farthest-side, var(--primary, #4F46E5) 94%, #0000);
          background:
            var(--_g) 0    0,
            var(--_g) 100% 0,
            var(--_g) 100% 100%,
            var(--_g) 0    100%;
          background-size: 40% 40%;
          animation: l38 .6s infinite; 
        }
        @keyframes l38 {
          100% {background-position: 100% 0, 100% 100%, 0 100%, 0 0}
        }
      ` }} />
      
      <div className={`loader-card-${size}`} id={`orbital-loader-card-${size}`}></div>

      {text && (
        <span className="text-xs font-semibold text-[var(--text-secondary)] mt-4 font-mono animate-pulse">
          {text}
        </span>
      )}
    </div>
  );
}
