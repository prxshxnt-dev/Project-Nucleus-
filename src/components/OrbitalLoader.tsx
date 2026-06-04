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
          .pencil-fs {
            display: block;
            width: 10em;
            height: 10em;
            color: var(--accent-primary, #4F46E5);
          }

          .pencil-fs__body1,
          .pencil-fs__body2,
          .pencil-fs__body3,
          .pencil-fs__eraser,
          .pencil-fs__eraser-skew,
          .pencil-fs__point,
          .pencil-fs__rotate,
          .pencil-fs__stroke {
            animation-duration: 3s;
            animation-timing-function: linear;
            animation-iteration-count: infinite;
          }

          .pencil-fs__body1,
          .pencil-fs__body2,
          .pencil-fs__body3 {
            transform: rotate(-90deg);
          }

          .pencil-fs__body1 {
            animation-name: pencilFsBody1;
          }

          .pencil-fs__body2 {
            animation-name: pencilFsBody2;
          }

          .pencil-fs__body3 {
            animation-name: pencilFsBody3;
          }

          .pencil-fs__eraser {
            animation-name: pencilFsEraser;
            transform: rotate(-90deg) translate(49px, 0);
          }

          .pencil-fs__eraser-skew {
            animation-name: pencilFsEraserSkew;
            animation-timing-function: ease-in-out;
          }

          .pencil-fs__point {
            animation-name: pencilFsPoint;
            transform: rotate(-90deg) translate(49px, -30px);
          }

          .pencil-fs__rotate {
            animation-name: pencilFsRotate;
          }

          .pencil-fs__stroke {
            animation-name: pencilFsStroke;
            transform: translate(100px, 100px) rotate(-113deg);
          }

          /* Animations */
          @keyframes pencilFsBody1 {
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

          @keyframes pencilFsBody2 {
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

          @keyframes pencilFsBody3 {
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

          @keyframes pencilFsEraser {
            from,
            to {
              transform: rotate(-45deg) translate(49px, 0);
            }

            50% {
              transform: rotate(0deg) translate(49px, 0);
            }
          }

          @keyframes pencilFsEraserSkew {
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

          @keyframes pencilFsPoint {
            from,
            to {
              transform: rotate(-90deg) translate(49px, -30px);
            }

            50% {
              transform: rotate(-225deg) translate(49px, -30px);
            }
          }

          @keyframes pencilFsRotate {
            from {
              transform: translate(100px, 100px) rotate(0);
            }

            to {
              transform: translate(100px, 100px) rotate(720deg);
            }
          }

          @keyframes pencilFsStroke {
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

        <div className="relative z-10 flex flex-col items-center justify-center">
          <svg
            className="pencil-fs"
            viewBox="0 0 200 200"
            width="200"
            height="200"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <clipPath id="pencil-eraser-fs">
                <rect rx="5" ry="5" width="30" height="30" />
              </clipPath>
            </defs>
            <circle
              className="pencil-fs__stroke"
              r="70"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="439.82 439.82"
              strokeDashoffset="439.82"
              strokeLinecap="round"
              transform="rotate(-113,100,100)"
            />
            <g className="pencil-fs__rotate" transform="translate(100,100)">
              <g fill="none">
                <circle
                  className="pencil-fs__body1"
                  r="64"
                  stroke="hsl(30, 30%, 50%)"
                  strokeWidth="30"
                  strokeDasharray="402.12 402.12"
                  strokeDashoffset="402"
                  transform="rotate(-90)"
                />
                <circle
                  className="pencil-fs__body2"
                  r="74"
                  stroke="hsl(30, 30%, 60%)"
                  strokeWidth="10"
                  strokeDasharray="464.96 464.96"
                  strokeDashoffset="465"
                  transform="rotate(-90)"
                />
                <circle
                  className="pencil-fs__body3"
                  r="54"
                  stroke="hsl(30, 30%, 40%)"
                  strokeWidth="10"
                  strokeDasharray="339.29 339.29"
                  strokeDashoffset="339"
                  transform="rotate(-90)"
                />
              </g>
              <g className="pencil-fs__eraser" transform="rotate(-90) translate(49,0)">
                <g className="pencil-fs__eraser-skew">
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
                    clipPath="url(#pencil-eraser-fs)"
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
              <g className="pencil-fs__point" transform="rotate(-90) translate(49,-30)">
                <polygon fill="hsl(33,90%,70%)" points="15 0,30 30,0 30" />
                <polygon fill="hsl(33,90%,50%)" points="15 0,6 30,0 30" />
                <polygon fill="hsl(223,10%,10%)" points="15 0,20 10,10 10" />
              </g>
            </g>
          </svg>
        </div>
      </div>
    );
  }

  // Inline / Card Version - perfectly styled with optional glass overlay or organic clean fit
  return (
    <div className={`inline-flex flex-col items-center justify-center p-6 rounded-[var(--theme-card-radius,16px)] border border-[var(--theme-card-border,rgba(0,0,0,0.06))] bg-[var(--glass-bg)] backdrop-blur-sm shadow-sm ${className}`}>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      
      <div className={`orbit-perspective relative ${sizeClasses[size]}`}>
        <div className="orbit-inner one" />
        <div className="orbit-inner two" />
        <div className="orbit-inner three" />
        <div className="absolute inset-x-0 inset-y-0 m-auto w-2 h-2 bg-[var(--accent-primary)] rounded-full shadow-[0_0_8px_var(--accent-primary)]" />
      </div>

      {text && (
        <span className="text-xs font-semibold text-[var(--text-secondary)] mt-4 font-mono animate-pulse">
          {text}
        </span>
      )}
    </div>
  );
}
