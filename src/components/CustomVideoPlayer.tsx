import React, { useState, useRef, useEffect } from 'react';
import ReactPlayer from 'react-player';

const ReactPlayerComponent = ReactPlayer as any;
import { Play, Pause, Volume1, Volume2, VolumeX, Maximize, Minimize, AlertCircle, RotateCcw, RotateCw, Tv, Layout, Settings, ChevronDown, X } from 'lucide-react';
import screenfull from 'screenfull';
import { motion, AnimatePresence } from 'motion/react';
import { useSettingsStore } from '../store/settingsStore';
import { useAuthStore } from '../store/authStore';

interface CustomVideoPlayerProps {
  url: string;
  playing?: boolean;
}

const formatTime = (seconds: number) => {
  if (isNaN(seconds)) return '00:00';
  const date = new Date(seconds * 1000);
  const hh = date.getUTCHours();
  const mm = date.getUTCMinutes();
  const ss = date.getUTCSeconds().toString().padStart(2, '0');
  if (hh) {
    return `${hh}:${mm.toString().padStart(2, '0')}:${ss}`;
  }
  return `${mm}:${ss}`;
};

interface VdoCipherData {
  otp: string;
  playbackInfo: string;
}

export function parseVdoCipher(input: string): VdoCipherData | null {
  if (!input) return null;
  const clean = input.trim();

  // 1. Try to match script params pattern: ("OTP", "PLAYBACK_INFO")
  const scriptRegex = /\("([^"]+)"\s*,\s*"([^"]+)"\)/;
  const match = clean.match(scriptRegex);
  if (match) {
    return {
      otp: match[1],
      playbackInfo: match[2]
    };
  }

  // 2. Try match iframe src query params
  if (clean.includes('vdocipher.com')) {
    try {
      const urlObj = new URL(clean.startsWith('http') ? clean : 'https://' + clean);
      const otp = urlObj.searchParams.get('otp');
      const playbackInfo = urlObj.searchParams.get('playbackInfo');
      if (otp && playbackInfo) {
        return { otp, playbackInfo };
      }
    } catch (e) {}
  }

  // 3. Try match "OTP:VideoID" or "OTP:playbackInfo" or "OTP,VideoID"
  const delimiter = clean.includes(':') ? ':' : (clean.includes(',') ? ',' : null);
  if (delimiter) {
    const parts = clean.split(delimiter);
    if (parts.length === 2) {
      const part1 = parts[0].trim();
      const part2 = parts[1].trim();
      if (part2.startsWith('eyJ')) {
        return { otp: part1, playbackInfo: part2 };
      } else {
        try {
          const playbackInfo = btoa(JSON.stringify({ videoId: part2 }));
          return { otp: part1, playbackInfo };
        } catch (e) {}
      }
    }
  }

  // 4. Try matching pure 32-character hex video ID
  const isHex32 = /^[a-f0-9]{32}$/i.test(clean);
  if (isHex32) {
    const defaultOtp = "20160313versASE3232eH3WNzjJ53F4LtZu0PqHyIs0HUEjwSgUvWfiX1ZRcNeHJ";
    try {
      const playbackInfo = btoa(JSON.stringify({ videoId: clean }));
      return { otp: defaultOtp, playbackInfo };
    } catch (e) {}
  }

  // 5. Try parsing raw JSON (e.g., {"videoId": "..."})
  if (clean.startsWith('{') && clean.endsWith('}')) {
    try {
      const parsed = JSON.parse(clean);
      if (parsed.videoId) {
        const otp = parsed.otp || "20160313versASE3232eH3WNzjJ53F4LtZu0PqHyIs0HUEjwSgUvWfiX1ZRcNeHJ";
        const playbackInfo = btoa(JSON.stringify({ videoId: parsed.videoId }));
        return { otp, playbackInfo };
      }
    } catch (e) {}
  }

  return null;
}

export function parseDriveVideoUrl(url: string): string | null {
  if (!url) return null;
  const clean = url.trim();
  if (!clean.includes('drive.google.com')) return null;
  const driveRegExp = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/;
  const match = clean.match(driveRegExp);
  if (match && match[1]) {
    return `https://drive.google.com/file/d/${match[1]}/preview`;
  }
  return null;
}

export function parseYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  const clean = url.trim();

  // 1. YouTube Shorts Match (e.g. /shorts/VIDEO_ID)
  const shortsMatch = clean.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (shortsMatch && shortsMatch[1]) {
    return shortsMatch[1];
  }

  // 2. Standard regex for watch and embed patterns
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = clean.match(regExp);
  if (match && match[2] && match[2].length === 11) {
    return match[2];
  }

  // 3. Fallback URL query parameters & paths
  try {
    const parsed = new URL(clean.startsWith('http') ? clean : 'https://' + clean);
    const vParam = parsed.searchParams.get('v');
    if (vParam && vParam.length === 11) return vParam;
    
    const paths = parsed.pathname.split('/');
    for (const segment of paths) {
      if (segment.length === 11 && /^[a-zA-Z0-9_-]{11}$/.test(segment)) {
        if (segment !== 'watch' && segment !== 'embed' && segment !== 'shorts') {
          return segment;
        }
      }
    }
  } catch (e) {}

  return null;
}

// Helper to safely load the YouTube IFrame Player API
const loadYouTubeAPI = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    const win = window as any;
    if (win.YT && win.YT.Player) {
      resolve(win.YT);
      return;
    }

    // If script isn't in document, add it
    if (!document.getElementById('youtube-iframe-api')) {
      const tag = document.createElement('script');
      tag.id = 'youtube-iframe-api';
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      if (firstScriptTag && firstScriptTag.parentNode) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      } else {
        document.head.appendChild(tag);
      }
    }

    // Poll for the API to load
    const start = Date.now();
    const interval = setInterval(() => {
      if (win.YT && win.YT.Player) {
        clearInterval(interval);
        resolve(win.YT);
      } else if (Date.now() - start > 15000) { // 15s timeout
        clearInterval(interval);
        reject(new Error('YouTube API load timeout'));
      }
    }, 100);
  });
};

export const YouTubeCustomPlayer = ({
  youtubeId,
  user,
  settings,
  watermarkPos,
  watermarkText,
  course,
  playing: initialPlaying = false,
}: {
  youtubeId: string;
  user: any;
  settings: any;
  watermarkPos: { top: string; left: string };
  watermarkText: string;
  course?: any;
  playing?: boolean;
}) => {
  const [playing, setPlaying] = useState(initialPlaying);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [hasError, setHasError] = useState(false);

  const [played, setPlayed] = useState(0);
  const [loaded, setLoaded] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [quality, setQuality] = useState('auto');
  const [availableQualities, setAvailableQualities] = useState<string[]>(['auto', 'hd1080', 'hd720', 'medium', 'small']);

  const [isTheater, setIsTheater] = useState(false);
  const [isPip, setIsPip] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSpeedDropdown, setShowSpeedDropdown] = useState(false);
  const [showQualityDropdown, setShowQualityDropdown] = useState(false);

  const playerId = useRef(`yt-player-${Math.random().toString(36).substring(2, 11)}`);
  const playerInstanceRef = useRef<any>(null);
  const timePollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastClickTimeRef = useRef<number>(0);
  const singleTapTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartYRef = useRef<number>(0);
  const [doubleTapVisual, setDoubleTapVisual] = useState<{ show: boolean; side: 'left' | 'right' }>({ show: false, side: 'left' });

  // 1. Initialize Player Instance using YouTube IFrame Player API
  useEffect(() => {
    let active = true;
    let player: any = null;

    const initPlayer = async () => {
      try {
        const YT = await loadYouTubeAPI();
        if (!active) return;

        player = new YT.Player(playerId.current, {
          videoId: youtubeId,
          playerVars: {
            controls: 0,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
            fs: 0,
            disablekb: 1,
            iv_load_policy: 3,
            cc_load_policy: 0,
            autoplay: 0,
          },
          events: {
            onReady: (event: any) => {
              if (!active) return;
              playerInstanceRef.current = event.target;
              setIsPlayerReady(true);
              setDuration(event.target.getDuration() || 0);
              event.target.setVolume(volume * 100);
              
              if (muted) {
                event.target.mute();
              } else {
                event.target.unMute();
              }
              
              // Load available qualities if supported
              if (typeof event.target.getAvailableQualityLevels === 'function') {
                const levels = event.target.getAvailableQualityLevels();
                if (levels && levels.length > 0) {
                  setAvailableQualities(levels);
                }
              }
            },
            onStateChange: (event: any) => {
              if (!active) return;
              const playerState = event.data;

              if (playerState === 1) { // PLAYING
                setPlaying(true);
                setIsBuffering(false);
                setIsPlayerReady(true);
                startTimePolling(event.target);
              } else if (playerState === 2) { // PAUSED
                setPlaying(false);
                setIsBuffering(false);
                stopTimePolling();
              } else if (playerState === 3) { // BUFFERING
                setIsBuffering(true);
              } else if (playerState === 0) { // ENDED
                setPlaying(false);
                setIsBuffering(false);
                stopTimePolling();
                setPlayed(1);
              } else {
                setIsBuffering(false);
              }
            },
            onError: (err: any) => {
              console.error("YouTube Player Error:", err);
              setHasError(true);
            }
          }
        });
      } catch (err) {
        console.error("Failed to load YouTube custom player API:", err);
        setHasError(true);
      }
    };

    initPlayer();

    return () => {
      active = false;
      stopTimePolling();
      if (player && typeof player.destroy === 'function') {
        try {
          player.destroy();
        } catch (e) {
          console.error("Error destroying YT player:", e);
        }
      }
      playerInstanceRef.current = null;
    };
  }, [youtubeId]);

  // Sync external playing/pause state changes
  useEffect(() => {
    const player = playerInstanceRef.current;
    if (player && isPlayerReady && typeof player.getPlayerState === 'function') {
      const currentState = player.getPlayerState();
      if (playing && currentState !== 1) {
        player.playVideo();
      } else if (!playing && currentState === 1) {
        player.pauseVideo();
      }
    }
  }, [playing, isPlayerReady]);

  // Keep volume synced
  useEffect(() => {
    const player = playerInstanceRef.current;
    if (player && isPlayerReady && typeof player.setVolume === 'function') {
      player.setVolume(volume * 100);
      if (muted) {
        player.mute();
      } else {
        player.unMute();
      }
    }
  }, [volume, muted, isPlayerReady]);

  // Anti-Defocus suspension if enabled
  useEffect(() => {
    if (settings?.secAutoPauseSuspicious === false) return;

    const handleBlurPause = () => {
      setPlaying(false);
      const player = playerInstanceRef.current;
      if (player && typeof player.pauseVideo === 'function') {
        player.pauseVideo();
      }
    };

    window.addEventListener('blur', handleBlurPause);
    document.addEventListener('visibilitychange', handleBlurPause);

    return () => {
      window.removeEventListener('blur', handleBlurPause);
      document.removeEventListener('visibilitychange', handleBlurPause);
    };
  }, [settings?.secAutoPauseSuspicious]);

  // Developer mode restriction keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'C' || e.key === 'J')) ||
        (e.metaKey && e.altKey && e.key === 'i')
      ) {
        e.preventDefault();
        return false;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Time progress polling loop
  const startTimePolling = (player: any) => {
    stopTimePolling();
    timePollIntervalRef.current = setInterval(() => {
      if (player && typeof player.getCurrentTime === 'function') {
        const current = player.getCurrentTime();
        const dur = player.getDuration() || 0;
        setCurrentTime(current);
        setPlayed(dur > 0 ? current / dur : 0);

        if (typeof player.getVideoLoadedFraction === 'function') {
          setLoaded(player.getVideoLoadedFraction());
        }
      }
    }, 250);
  };

  const stopTimePolling = () => {
    if (timePollIntervalRef.current) {
      clearInterval(timePollIntervalRef.current);
      timePollIntervalRef.current = null;
    }
  };

  // Auto-hide controls handler
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);

    if (playing) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  useEffect(() => {
    if (!playing) {
      setShowControls(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    } else {
      handleMouseMove();
    }
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [playing]);

  // Handlers for controls
  const handlePlayPause = () => {
    const player = playerInstanceRef.current;
    if (!player) return;

    if (playing) {
      player.pauseVideo();
      setPlaying(false);
    } else {
      player.playVideo();
      setPlaying(true);
    }
  };

  const handleSeekRelative = (seconds: number) => {
    const player = playerInstanceRef.current;
    if (!player || typeof player.getCurrentTime !== 'function') return;
    const current = player.getCurrentTime();
    const dur = player.getDuration() || 0;
    player.seekTo(Math.max(0, Math.min(dur, current + seconds)), true);
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (settings?.secDisableSeeking) return;
    const val = parseFloat(e.target.value);
    setPlayed(val);
    const player = playerInstanceRef.current;
    if (player && typeof player.seekTo === 'function') {
      player.seekTo(val * duration, true);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setMuted(val === 0);
  };

  const handleToggleMuted = () => {
    setMuted(!muted);
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    const player = playerInstanceRef.current;
    if (player && typeof player.setPlaybackRate === 'function') {
      player.setPlaybackRate(speed);
    }
  };

  const handleQualityChange = (q: string) => {
    setQuality(q);
    const player = playerInstanceRef.current;
    if (player && typeof player.setPlaybackQuality === 'function') {
      player.setPlaybackQuality(q);
    }
  };

  // Secure tap/click overlay intercepting clicks so they can't touch YouTube directly
  const handleOverlayClickOrTap = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const isLeft = clickX < rect.width / 2;

    const now = Date.now();
    if (now - lastClickTimeRef.current < 300) {
      // Double tap/click detected!
      if (singleTapTimeoutRef.current) clearTimeout(singleTapTimeoutRef.current);

      if (isLeft) {
        handleSeekRelative(-10);
        setDoubleTapVisual({ show: true, side: 'left' });
        setTimeout(() => setDoubleTapVisual({ show: false, side: 'left' }), 500);
      } else {
        handleSeekRelative(10);
        setDoubleTapVisual({ show: true, side: 'right' });
        setTimeout(() => setDoubleTapVisual({ show: false, side: 'right' }), 500);
      }
      lastClickTimeRef.current = 0;
    } else {
      lastClickTimeRef.current = now;
      if (singleTapTimeoutRef.current) clearTimeout(singleTapTimeoutRef.current);
      singleTapTimeoutRef.current = setTimeout(() => {
        handlePlayPause();
      }, 250);
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      touchStartYRef.current = e.touches[0].clientY;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartYRef.current && isTheater) {
      const touchEndY = e.changedTouches[0].clientY;
      const deltaY = touchEndY - touchStartYRef.current;
      if (deltaY > 100) { // Swipe down at least 100px
        setIsTheater(false);
      }
    }
    touchStartYRef.current = 0;
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '00:00';
    const date = new Date(seconds * 1000);
    const hh = date.getUTCHours();
    const mm = date.getUTCMinutes();
    const ss = date.getUTCSeconds().toString().padStart(2, '0');
    if (hh) {
      return `${hh}:${mm.toString().padStart(2, '0')}:${ss}`;
    }
    return `${mm}:${ss}`;
  };

  // Determine adaptiveness of container sizes
  let containerClasses = "relative w-full aspect-video bg-black flex flex-col justify-between overflow-hidden select-none";

  if (isTheater) {
    containerClasses = "fixed inset-0 z-[9999] bg-zinc-950 flex flex-col justify-between overflow-hidden p-4 md:p-8 select-none";
  } else if (isPip) {
    containerClasses = "fixed bottom-6 right-6 w-80 h-[180px] md:w-[360px] md:h-[202px] z-[9990] bg-black shadow-2xl rounded-2xl border border-white/10 flex flex-col justify-between overflow-hidden select-none animate-fade-in";
  } else {
    containerClasses = "relative w-full aspect-video bg-black flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-200/80 dark:border-white/5 shadow-xl select-none";
  }

  if (hasError) {
    return (
      <div className="relative w-full aspect-video bg-zinc-950 flex flex-col items-center justify-center p-6 text-center border border-white/5 rounded-xl">
        <AlertCircle className="w-12 h-12 text-amber-500 mb-3" />
        <h3 className="text-white font-medium text-base mb-1">Unable to stream requested secure content.</h3>
        <p className="text-zinc-500 text-xs max-w-sm">Please refresh the browser or contact the academy support helpdesk.</p>
      </div>
    );
  }

  return (
    <div
      className={containerClasses}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => playing && setShowControls(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onContextMenu={(e) => e.preventDefault()}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        #${playerId.current} {
          width: 100% !important;
          height: 100% !important;
          border-radius: inherit;
        }
        .yt-iframe-container iframe {
          width: 100% !important;
          height: 100% !important;
          position: absolute;
          top: 0;
          left: 0;
          border-radius: inherit;
        }
      `}} />

      {/* 1. Underlying YouTube Iframe (Completely blocked from user clicks) */}
      <div className="yt-iframe-container absolute inset-0 w-full h-full z-0 pointer-events-none">
        <div id={playerId.current} />
      </div>

      {/* 2. Absolute Click/Touch Overlay Interceptor (Redirection & Context Menu Protection) */}
      <div
        className="absolute inset-0 z-10 cursor-pointer"
        onClick={handleOverlayClickOrTap}
        onDragStart={(e) => e.preventDefault()}
        style={{
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
        }}
      />

      {/* 3. Floating Security Watermark overlay */}
      {settings?.secVideoWatermarkEnabled !== false && user && (
        <motion.div
          animate={{
            top: watermarkPos.top,
            left: watermarkPos.left
          }}
          transition={{
            type: 'tween',
            duration: 1.8,
            ease: 'easeInOut'
          }}
          style={{
            position: 'absolute',
            fontSize: `${settings?.secWatermarkSize || 12}px`,
            opacity: settings?.secWatermarkOpacity !== undefined ? settings.secWatermarkOpacity : 0.35,
            color: 'rgba(255,255,255,0.85)',
            textShadow: '1px 1px 3px rgba(0,0,0,0.9), -1px -1px 3px rgba(0,0,0,0.9)',
            padding: '6px 12px',
            borderRadius: '6px',
            backgroundColor: 'rgba(0,0,0,0.2)',
            border: '1px solid rgba(255,255,255,0.08)',
            pointerEvents: 'none',
            zIndex: 20,
            fontFamily: 'monospace',
            whiteSpace: 'nowrap'
          }}
        >
          {watermarkText}
        </motion.div>
      )}

      {/* 4. Elegant Custom Spinner/Loading Indicator */}
      <AnimatePresence>
        {(!isPlayerReady || isBuffering) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md pointer-events-none"
          >
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-full border-4 border-[#E5D2A5] border-t-transparent border-r-transparent animate-spin" />
              <div className="absolute inset-1 rounded-full border-4 border-white/20 border-b-transparent border-l-transparent animate-spin [animation-direction:reverse]" />
            </div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-white/60 mt-4 animate-pulse">
              {isBuffering ? 'Buffering HD stream...' : 'Loading lecture media...'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. Custom Poster Cover overlay (Before starting playback) */}
      <AnimatePresence>
        {!hasStarted && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 z-40 bg-zinc-950 flex flex-col justify-end p-6 md:p-8 overflow-hidden"
          >
            <img
              src={`https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`}
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
              }}
              alt="Lecture Cover"
              className="absolute inset-0 w-full h-full object-cover opacity-40 select-none pointer-events-none filter blur-[1px]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent z-10 pointer-events-none" />

            {/* Large play overlay */}
            <div className="absolute inset-0 flex items-center justify-center z-20">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                  e.stopPropagation();
                  setHasStarted(true);
                  setPlaying(true);
                }}
                className="p-5 rounded-full bg-[#E5D2A5] text-zinc-900 shadow-2xl hover:bg-[#d8c393] transition-all flex items-center justify-center cursor-pointer border border-[#E5D2A5]/30"
              >
                <Play className="w-8 h-8 fill-current translate-x-0.5 text-zinc-900" />
              </motion.button>
            </div>

            {/* Title / Description */}
            <div className="relative z-20 max-w-xl space-y-2 text-left pointer-events-none select-none">
              <span className="text-[9px] font-mono uppercase bg-[#E5D2A5]/20 text-[#E5D2A5] border border-[#E5D2A5]/20 px-2 py-0.5 rounded-full tracking-wider font-black">
                {course?.materialType?.replace('_', ' ') || 'SECURE VIDEO LECTURE'}
              </span>
              <h2 className="text-lg md:text-2xl font-black text-white tracking-tight uppercase leading-tight">
                {course?.title || 'Interactive Course Video'}
              </h2>
              {course?.description && (
                <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                  {course.description}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6. Double-tap/click visual indicators */}
      <AnimatePresence>
        {doubleTapVisual.show && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className={`absolute top-1/2 -translate-y-1/2 z-30 p-4 rounded-full bg-black/75 border border-white/15 flex flex-col items-center justify-center pointer-events-none ${
              doubleTapVisual.side === 'left' ? 'left-1/4' : 'right-1/4'
            }`}
          >
            {doubleTapVisual.side === 'left' ? (
              <>
                <RotateCcw className="w-8 h-8 text-[#E5D2A5] mb-1" />
                <span className="text-[9px] font-mono text-white font-black uppercase">-10 SEC</span>
              </>
            ) : (
              <>
                <RotateCw className="w-8 h-8 text-[#E5D2A5] mb-1" />
                <span className="text-[9px] font-mono text-white font-black uppercase">+10 SEC</span>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 7. Beautiful distraction-free header overlay when in Theater mode */}
      {isTheater && (
        <div className="absolute top-4 left-4 right-4 z-30 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent p-4 rounded-xl pointer-events-none">
          <div className="flex flex-col text-left">
            <span className="text-[9px] font-mono uppercase text-[#E5D2A5] font-black tracking-widest">Academy Theater Arena</span>
            <h3 className="text-white font-black text-sm uppercase tracking-tight truncate max-w-sm md:max-w-md">{course?.title || 'Lecture Video'}</h3>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); setIsTheater(false); }}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center gap-1.5 text-[10px] font-mono font-black uppercase tracking-wider pointer-events-auto border border-white/5 shadow"
          >
            <X className="w-3.5 h-3.5" />
            <span>Close Arena</span>
          </button>
        </div>
      )}

      {/* 8. Pip custom Close button */}
      {isPip && (
        <div className="absolute top-2 right-2 z-30 flex gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); setIsPip(false); }}
            className="p-1 rounded-full bg-black/70 hover:bg-black/90 text-white border border-white/10 transition-colors pointer-events-auto"
            title="Exit Picture-in-Picture"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 9. Premium Custom Control Bar */}
      <AnimatePresence>
        {showControls && hasStarted && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            transition={{ duration: 0.25 }}
            className="absolute bottom-0 left-0 right-0 z-30 p-4 bg-gradient-to-t from-black/95 via-black/75 to-transparent flex flex-col gap-3 text-left pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Range Progress Bar Slider */}
            <div className={`relative w-full h-1 group/progress flex items-center ${settings?.secDisableSeeking ? 'cursor-not-allowed opacity-55' : 'cursor-pointer'}`}>
              {!settings?.secDisableSeeking ? (
                <input
                  type="range" min={0} max={0.999999} step="any"
                  value={played}
                  onChange={handleSeekChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
              ) : (
                <div className="absolute right-3 -top-7 bg-red-500/85 text-white font-mono text-[9px] px-2 py-0.5 rounded flex items-center gap-1 z-20 shadow">
                  <AlertCircle className="w-3 h-3" />
                  <span>Seeking Prohibited</span>
                </div>
              )}
              <div className="absolute left-0 h-full bg-white/10 rounded-full w-full pointer-events-none" />
              <div className="absolute left-0 h-full bg-white/20 rounded-full pointer-events-none" style={{ width: `${loaded * 100}%` }} />
              <div className="absolute left-0 h-full bg-[#E5D2A5] rounded-full group-hover/progress:h-1.5 transition-all pointer-events-none" style={{ width: `${played * 100}%` }}>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-[#E5D2A5] rounded-full scale-0 group-hover/progress:scale-100 transition-transform shadow-[0_0_8px_rgba(229,210,165,0.8)]" />
              </div>
            </div>

            {/* Buttons & Indicators Layer */}
            <div className="flex items-center justify-between gap-4">
              {/* Left Action Buttons */}
              <div className="flex items-center gap-4">
                {/* Play/Pause */}
                <button
                  onClick={handlePlayPause}
                  className="text-[#E5D2A5] hover:text-white transition-colors focus:outline-none"
                  title={playing ? "Pause" : "Play"}
                >
                  {playing ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                </button>

                {/* Back 10 Seconds */}
                <button
                  onClick={() => handleSeekRelative(-10)}
                  className="text-white hover:text-[#E5D2A5] transition-colors focus:outline-none"
                  title="Rewind 10s"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                {/* Forward 10 Seconds */}
                <button
                  onClick={() => handleSeekRelative(10)}
                  className="text-white hover:text-[#E5D2A5] transition-colors focus:outline-none"
                  title="Forward 10s"
                >
                  <RotateCw className="w-4 h-4" />
                </button>

                {/* Volume & Mute */}
                <div className="flex items-center gap-2 group/volume relative">
                  <button
                    onClick={handleToggleMuted}
                    className="text-white hover:text-[#E5D2A5] transition-colors focus:outline-none"
                    title={muted ? "Unmute" : "Mute"}
                  >
                    {muted || volume === 0 ? (
                      <VolumeX className="w-4 h-4 text-red-400" />
                    ) : volume < 0.4 ? (
                      <Volume1 className="w-4 h-4 text-zinc-300" />
                    ) : (
                      <Volume2 className="w-4 h-4 text-white" />
                    )}
                  </button>
                  <input
                    type="range" min={0} max={1} step={0.05}
                    value={muted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-16 h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-[#E5D2A5]"
                  />
                </div>

                {/* Timeline time text */}
                <div className="text-[10px] font-mono text-zinc-400">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>
              </div>

              {/* Right Menu Buttons */}
              <div className="flex items-center gap-3">
                {/* Quality Indicator (Custom Dropdown) */}
                <div className="relative">
                  <button
                    onClick={() => { setShowQualityDropdown(!showQualityDropdown); setShowSpeedDropdown(false); }}
                    className="text-[9px] font-mono font-black uppercase text-zinc-300 hover:text-[#E5D2A5] transition-colors flex items-center gap-1 bg-white/10 hover:bg-white/15 px-2 py-1 rounded-md border border-white/5"
                  >
                    <span>{quality === 'auto' ? 'Auto' : quality.replace('hd', '') + 'p'}</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>

                  <AnimatePresence>
                    {showQualityDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className="absolute bottom-9 right-0 bg-zinc-950/95 border border-white/10 rounded-xl p-1 shadow-2xl flex flex-col gap-0.5 min-w-[100px] backdrop-blur-md z-50"
                      >
                        {availableQualities.map((q) => {
                          let label = q;
                          if (q === 'hd1080') label = '1080p HD';
                          if (q === 'hd720') label = '720p HD';
                          if (q === 'medium') label = '480p SD';
                          if (q === 'small') label = '360p SD';
                          if (q === 'auto') label = 'Auto';

                          return (
                            <button
                              key={q}
                              onClick={() => { handleQualityChange(q); setShowQualityDropdown(false); }}
                              className={`text-[9px] font-mono text-left px-2 py-1 rounded-md hover:bg-white/10 transition-colors ${
                                quality === q ? 'text-[#E5D2A5] font-black' : 'text-zinc-400'
                              }`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Speed selector (Custom Dropdown) */}
                <div className="relative">
                  <button
                    onClick={() => { setShowSpeedDropdown(!showSpeedDropdown); setShowQualityDropdown(false); }}
                    className="text-[9px] font-mono font-black uppercase text-zinc-300 hover:text-[#E5D2A5] transition-colors flex items-center gap-1 bg-white/10 hover:bg-white/15 px-2 py-1 rounded-md border border-white/5"
                  >
                    <span>{playbackSpeed}x</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>

                  <AnimatePresence>
                    {showSpeedDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className="absolute bottom-9 right-0 bg-zinc-950/95 border border-white/10 rounded-xl p-1 shadow-2xl flex flex-col gap-0.5 min-w-[75px] backdrop-blur-md z-50"
                      >
                        {[0.5, 1, 1.25, 1.5, 2].map((s) => (
                          <button
                            key={s}
                            onClick={() => { handleSpeedChange(s); setShowSpeedDropdown(false); }}
                            className={`text-[9px] font-mono text-left px-2 py-1 rounded-md hover:bg-white/10 transition-colors ${
                              playbackSpeed === s ? 'text-[#E5D2A5] font-black' : 'text-zinc-400'
                            }`}
                          >
                            {s}x
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Pip toggle */}
                <button
                  onClick={() => { setIsPip(!isPip); setIsTheater(false); }}
                  className={`text-zinc-300 hover:text-[#E5D2A5] transition-colors focus:outline-none ${isPip ? 'text-[#E5D2A5]' : ''}`}
                  title={isPip ? "Disable PiP Mode" : "Enable PiP Mode"}
                >
                  <Tv className="w-4 h-4" />
                </button>

                {/* Theater mode toggle */}
                <button
                  onClick={() => { setIsTheater(!isTheater); setIsPip(false); }}
                  className={`text-zinc-300 hover:text-[#E5D2A5] transition-colors focus:outline-none ${isTheater ? 'text-[#E5D2A5]' : ''}`}
                  title={isTheater ? "Normal Mode" : "Theater Mode"}
                >
                  <Layout className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface CustomVideoPlayerPropsExtended extends CustomVideoPlayerProps {
  course?: any;
}

export const CustomVideoPlayer = ({ url, playing: forcePlaying = true, course }: CustomVideoPlayerPropsExtended) => {
  const { user } = useAuthStore();
  const { settings } = useSettingsStore();

  const [playing, setPlaying] = useState(forcePlaying);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [played, setPlayed] = useState(0);
  const [loaded, setLoaded] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [hasError, setHasError] = useState(false);
  
  const [watermarkPos, setWatermarkPos] = useState({ top: '30%', left: '20%' });

  // Reset error on URL changes
  useEffect(() => {
    setHasError(false);
  }, [url]);

  const playerRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  const getHTML5Video = () => {
    if (playerRef.current) {
      try {
        const player = playerRef.current as any;
        if (typeof player.pause === 'function') {
          return player as HTMLVideoElement;
        }
        if (typeof player.getInternalPlayer === 'function') {
          return player.getInternalPlayer() as HTMLVideoElement;
        }
      } catch (e) {}
    }
    return null;
  };

  // Watermark positioning and drift update
  useEffect(() => {
    if (settings.secVideoWatermarkEnabled === false) return;
    const speed = (settings.secWatermarkSpeed || 10) * 1000;
    
    const updatePosition = () => {
      const topVal = Math.floor(Math.random() * 65) + 10; // offset 10% - 75%
      const leftVal = Math.floor(Math.random() * 55) + 5;  // offset 5% - 60%
      setWatermarkPos({ top: `${topVal}%`, left: `${leftVal}%` });
    };

    updatePosition(); // Immediate positioning
    const timerVal = setInterval(updatePosition, speed);

    return () => clearInterval(timerVal);
  }, [settings.secVideoWatermarkEnabled, settings.secWatermarkSpeed]);

  // Autopause on defocus / Switch tab
  useEffect(() => {
    if (settings.secAutoPauseSuspicious === false) return;
    
    const handleBlurPause = () => {
      setPlaying(false);
      const video = getHTML5Video();
      if (video) {
        try {
          video.pause();
        } catch (err) {}
      }
    };

    window.addEventListener('blur', handleBlurPause);
    document.addEventListener('visibilitychange', handleBlurPause);
    
    return () => {
      window.removeEventListener('blur', handleBlurPause);
      document.removeEventListener('visibilitychange', handleBlurPause);
    };
  }, [settings.secAutoPauseSuspicious]);

  const getWatermarkText = () => {
    if (!user) return '';
    const fields = settings.secWatermarkFields || ['name', 'email', 'phone', 'timestamp'];
    const parts: string[] = [];
    
    if (settings.secWatermarkText) {
      parts.push(settings.secWatermarkText);
    }
    if (fields.includes('name') && user.displayName) {
      parts.push(user.displayName);
    }
    if (fields.includes('email') && user.email) {
      parts.push(user.email);
    }
    if (fields.includes('phone')) {
      parts.push("+91 95431 88723"); // Secure verified device token index
    }
    if (fields.includes('userId')) {
      parts.push(`UUID: ${user.uid.slice(0, 8)}`);
    }
    if (fields.includes('batchName') && user.classGroup) {
      parts.push(`Batch: Class ${user.classGroup}`);
    }
    if (fields.includes('timestamp')) {
      parts.push(new Date().toLocaleTimeString());
    }

    return parts.join(' | ');
  };

  useEffect(() => {
    setPlaying(forcePlaying);
    
    if (!forcePlaying) {
      const video = getHTML5Video();
      if (video) {
        try {
          video.pause();
        } catch (e) {}
      }
    }
  }, [forcePlaying]);

  useEffect(() => {
    return () => {
      const video = getHTML5Video();
      if (video) {
        try {
          video.pause();
        } catch (e) {}
      }
    };
  }, []);

  const isTogglingRef = useRef(false);

  const handlePlayPause = () => {
    if (isTogglingRef.current) return;
    isTogglingRef.current = true;
    setTimeout(() => { isTogglingRef.current = false; }, 300);

    const video = getHTML5Video();
    if (video) {
        if (video.paused) {
            setPlaying(true);
            try {
                const playPromise = video.play();
                if (playPromise !== undefined) {
                    playPromise.catch(() => {});
                }
            } catch (e) {}
        } else {
            setPlaying(false);
            try {
                video.pause();
            } catch (e) {}
        }
    } else {
        setPlaying(p => !p);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(e.target.value));
    setMuted(parseFloat(e.target.value) === 0);
  };

  const handleToggleMuted = () => {
    setMuted(!muted);
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (settings.secDisableSeeking) return;
    setPlayed(parseFloat(e.target.value));
  };

  const handleSeekMouseDown = () => {
    if (settings.secDisableSeeking) return;
    const video = getHTML5Video();
    if (video) {
      try {
        if (!video.paused) {
          video.pause();
        }
      } catch (e) {}
    }
    setPlaying(false);
  };

  const handleSeekMouseUp = (e: React.MouseEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement>) => {
    if (settings.secDisableSeeking) return;
    const val = parseFloat((e.target as HTMLInputElement).value);
    if (playerRef.current) {
      try {
        const player = playerRef.current as any;
        if (typeof player.seekTo === 'function') {
          player.seekTo(val);
        } else {
          const video = getHTML5Video();
          if (video) {
            video.currentTime = val * duration;
          }
        }
      } catch (e) {}
      
      setPlaying(true);
      const video = getHTML5Video();
      if (video) {
        try {
          const playPromise = video.play();
          if (playPromise !== undefined) {
            playPromise.catch(() => {});
          }
        } catch (e) {}
      }
    } else {
      setPlaying(true);
    }
  };

  const handleToggleFullscreen = () => {
    if (screenfull.isEnabled && playerContainerRef.current) {
      screenfull.toggle(playerContainerRef.current);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(screenfull.isFullscreen);
    };
    if (screenfull.isEnabled) {
      screenfull.on('change', handleFullscreenChange);
    }
    return () => {
      if (screenfull.isEnabled) {
        screenfull.off('change', handleFullscreenChange);
      }
    };
  }, []);

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (playing) {
        setShowControls(false);
      }
    }, 3000);
  };

  const handleMouseLeave = () => {
    if (playing) {
        setShowControls(false);
    }
  };

  const youtubeId = parseYouTubeVideoId(url);
  const vdoData = parseVdoCipher(url);
  const drivePreviewUrl = parseDriveVideoUrl(url);

  // Requirement 9: Debugging System logs
  console.log("Course Data:", course || null);
  console.log("Video URL:", url || "");
  console.log("Video ID:", youtubeId || null);
  console.log("Embed URL:", youtubeId ? `https://www.youtube.com/embed/${youtubeId}?controls=1&rel=0&modestbranding=1` : null);

  // Requirement 8: Fallback Unavailable Video UI
  if (hasError || !url || (!youtubeId && !vdoData && !drivePreviewUrl && !url.includes('.mp4'))) {
    console.warn("Attempted to render unparseable or broken video stream. Activating admin fallback screen. Input url:", url);
    return (
      <div className="relative w-full aspect-video bg-zinc-950 flex flex-col items-center justify-center p-6 text-center border border-white/5 rounded-xl shadow-[0_0_40px_rgba(239,68,68,0.05)]">
        <AlertCircle className="w-12 h-12 text-amber-500 mb-3" />
        <h3 className="text-white font-medium text-base mb-1">This video is currently unavailable.</h3>
        <p className="text-zinc-500 text-xs max-w-sm">Please contact the administrator.</p>
      </div>
    );
  }

  // Requirement 3 & 4: Proper YouTube Embedded Player
  if (youtubeId) {
    return (
      <YouTubeCustomPlayer
        youtubeId={youtubeId}
        user={user}
        settings={settings}
        watermarkPos={watermarkPos}
        watermarkText={getWatermarkText()}
        course={course}
        playing={playing}
      />
    );
  }

  if (vdoData) {
    return (
      <div 
        ref={playerContainerRef} 
        className="relative w-full aspect-video bg-black flex flex-col justify-center overflow-hidden rounded-xl border border-white/5 shadow-[0_0_30px_rgba(99, 102, 241,0.05)]"
        onContextMenu={(e) => { e.preventDefault(); }}
      >
        {/* Dynamic Moving Security Watermark */}
        {settings.secVideoWatermarkEnabled !== false && user && (
          <motion.div
            animate={{
              top: watermarkPos.top,
              left: watermarkPos.left
            }}
            transition={{
              type: 'tween',
              duration: 1.8,
              ease: 'easeInOut'
            }}
            style={{
              position: 'absolute',
              fontSize: `${settings.secWatermarkSize || 12}px`,
              opacity: settings.secWatermarkOpacity !== undefined ? settings.secWatermarkOpacity : 0.35,
              color: 'rgba(255,255,255,0.85)',
              textShadow: '1px 1px 3px rgba(0,0,0,0.9), -1px -1px 3px rgba(0,0,0,0.9)',
              padding: '6px 12px',
              borderRadius: '6px',
              backgroundColor: 'rgba(0,0,0,0.2)',
              border: '1px solid rgba(255,255,255,0.08)',
              pointerEvents: 'none',
              zIndex: 40,
              fontFamily: 'monospace',
              whiteSpace: 'nowrap'
            }}
          >
            {getWatermarkText()}
          </motion.div>
        )}

        <iframe
          key={`${vdoData.otp}-${vdoData.playbackInfo}`}
          src={`https://player.vdocipher.com/v2/?otp=${vdoData.otp}&playbackInfo=${vdoData.playbackInfo}`}
          style={{
            height: '100%',
            width: '100%',
            border: '0',
          }}
          className="w-full aspect-video"
          allow="encrypted-media"
          allowFullScreen
          loading="lazy"
        />
      </div>
    );
  }

  if (drivePreviewUrl) {
    return (
      <div 
        ref={playerContainerRef} 
        className="relative w-full aspect-video bg-black flex flex-col justify-center overflow-hidden rounded-xl border border-white/5 shadow-[0_0_30px_rgba(99, 102, 241,0.05)]"
        onContextMenu={(e) => { e.preventDefault(); }}
      >
        {/* Dynamic Moving Security Watermark */}
        {settings.secVideoWatermarkEnabled !== false && user && (
          <motion.div
            animate={{
              top: watermarkPos.top,
              left: watermarkPos.left
            }}
            transition={{
              type: 'tween',
              duration: 1.8,
              ease: 'easeInOut'
            }}
            style={{
              position: 'absolute',
              fontSize: `${settings.secWatermarkSize || 12}px`,
              opacity: settings.secWatermarkOpacity !== undefined ? settings.secWatermarkOpacity : 0.35,
              color: 'rgba(255,255,255,0.85)',
              textShadow: '1px 1px 3px rgba(0,0,0,0.9), -1px -1px 3px rgba(0,0,0,0.9)',
              padding: '6px 12px',
              borderRadius: '6px',
              backgroundColor: 'rgba(0,0,0,0.2)',
              border: '1px solid rgba(255,255,255,0.08)',
              pointerEvents: 'none',
              zIndex: 40,
              fontFamily: 'monospace',
              whiteSpace: 'nowrap'
            }}
          >
            {getWatermarkText()}
          </motion.div>
        )}

        <iframe
          key={drivePreviewUrl}
          src={drivePreviewUrl}
          style={{
            height: '100%',
            width: '100%',
            border: '0',
          }}
          className="w-full aspect-video"
          allow="autoplay; encrypted-media"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div 
      ref={playerContainerRef} 
      className="relative w-full h-full bg-black group flex flex-col justify-center overflow-hidden rounded-xl border border-white/5 shadow-[0_0_30px_rgba(99, 102, 241,0.05)]"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={() => setShowControls(true)}
      onContextMenu={(e) => { e.preventDefault(); }}
    >
      {/* Dynamic Moving Security Watermark */}
      {settings.secVideoWatermarkEnabled !== false && user && (
        <motion.div
          animate={{
            top: watermarkPos.top,
            left: watermarkPos.left
          }}
          transition={{
            type: 'tween',
            duration: 1.8,
            ease: 'easeInOut'
          }}
          style={{
            position: 'absolute',
            fontSize: `${settings.secWatermarkSize || 12}px`,
            opacity: settings.secWatermarkOpacity !== undefined ? settings.secWatermarkOpacity : 0.35,
            color: 'rgba(255,255,255,0.85)',
            textShadow: '1px 1px 3px rgba(0,0,0,0.9), -1px -1px 3px rgba(0,0,0,0.9)',
            padding: '6px 12px',
            borderRadius: '6px',
            backgroundColor: 'rgba(0,0,0,0.2)',
            border: '1px solid rgba(255,255,255,0.08)',
            pointerEvents: 'none',
            zIndex: 40,
            fontFamily: 'monospace',
            whiteSpace: 'nowrap'
          }}
        >
          {getWatermarkText()}
        </motion.div>
      )}

      {/* Invisible overlay to block youtube clicks */}
      <div className="absolute inset-0 z-10 pointer-events-none" onClick={(e) => { e.stopPropagation(); handlePlayPause(); }} style={{ pointerEvents: 'auto' }} />

      <div className="w-full h-full pointer-events-none" style={{ pointerEvents: 'none' }}>
          <ReactPlayerComponent 
            ref={playerRef as any}
            url={url}
            width="100%"
            height="100%"
            playing={playing}
            controls={false}
            volume={volume}
            muted={muted}
            playsInline
            onError={(err: any) => {
              console.error("ReactPlayerComponent has failed to load the given URL stream:", err);
              setHasError(true);
            }}
            onProgress={(state: any) => {
              setPlayed(state.played);
              setLoaded(state.loaded);
            }}
            onDuration={(dur: any) => setDuration(dur)}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
            config={{
              youtube: {
                playerVars: { 
                    modestbranding: 1, 
                    rel: 0, 
                    showinfo: 0,
                    controls: 0,
                    disablekb: 1,
                    fs: 0
                }
              } as any
            }}
            style={{ pointerEvents: 'none', width: '100%', height: '100%' }}
          />
      </div>

      {/* Floating Play/Pause Button in Center */}
      {!playing && (
          <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
              <motion.button 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                onClick={(e) => { e.stopPropagation(); handlePlayPause(); }}
                className="pointer-events-auto p-5 rounded-full bg-[#E5D2A5]/90 text-black backdrop-blur-md shadow-[0_0_40px_rgba(99, 102, 241,0.4)] hover:scale-110 transition-transform"
              >
                  <Play className="w-10 h-10 ml-1 fill-current" />
              </motion.button>
          </div>
      )}

      {/* Custom Controls */}
      <AnimatePresence>
        {showControls && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            className="absolute bottom-0 left-0 right-0 z-30 p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex flex-col gap-3 pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Progress Bar with seeking check */}
            <div className={`relative w-full h-1.5 group/progress flex items-center ${settings.secDisableSeeking ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
              {!settings.secDisableSeeking ? (
                <input 
                  type="range" min={0} max={0.999999} step="any"
                  value={played}
                  onMouseDown={handleSeekMouseDown}
                  onTouchStart={handleSeekMouseDown}
                  onChange={handleSeekChange}
                  onMouseUp={handleSeekMouseUp}
                  onTouchEnd={handleSeekMouseUp as any}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
              ) : (
                <div className="absolute right-3 -top-7 bg-red-500/80 text-white font-mono text-[9px] px-2 py-0.5 rounded flex items-center gap-1 z-20 shadow">
                  <AlertCircle className="w-3 h-3" />
                  <span>Seeking Prohibited by Academy</span>
                </div>
              )}
                <div className="absolute left-0 h-full bg-white/20 rounded-full w-full pointer-events-none" />
                <div className="absolute left-0 h-full bg-white/40 rounded-full pointer-events-none" style={{ width: `${loaded * 100}%` }} />
                <div className="absolute left-0 h-full bg-[#E5D2A5] rounded-full group-hover/progress:h-2.5 transition-all pointer-events-none" style={{ width: `${played * 100}%` }}>
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-[#E5D2A5] rounded-full scale-0 group-hover/progress:scale-100 transition-transform shadow-[0_0_10px_rgba(99, 102, 241,0.8)]" />
                </div>
            </div>

            {/* Controls Row */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={handlePlayPause} className="text-[#E5D2A5] hover:text-white transition-colors">
                        {playing ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current" />}
                    </button>
                    
                    <div className="flex items-center gap-2 group/volume">
                        <button onClick={handleToggleMuted} className="text-white hover:text-[#E5D2A5] transition-colors">
                            {muted || volume === 0 ? <VolumeX className="w-5 h-5" /> : volume < 0.5 ? <Volume1 className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                        </button>
                        <div className="w-0 overflow-hidden group-hover/volume:w-20 transition-all duration-300">
                            <input 
                                type="range" min={0} max={1} step="any"
                                value={muted ? 0 : volume}
                                onChange={handleVolumeChange}
                                className="w-20 h-1.5 accent-[#E5D2A5] bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-[#E5D2A5] [&::-webkit-slider-thumb]:rounded-full"
                            />
                        </div>
                    </div>

                    <div className="text-xs font-mono text-white/70 ml-2">
                        {formatTime(played * duration)} / {formatTime(duration)}
                    </div>
                </div>

                <div>
                    <button onClick={handleToggleFullscreen} className="text-white hover:text-[#E5D2A5] transition-colors">
                        {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                    </button>
                </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
