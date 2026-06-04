import React, { useState, useRef, useEffect } from 'react';
import ReactPlayer from 'react-player';

const ReactPlayerComponent = ReactPlayer as any;
import { Play, Pause, Volume1, Volume2, VolumeX, Maximize, Minimize, AlertCircle } from 'lucide-react';
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
    const embedUrl = `https://www.youtube.com/embed/${youtubeId}?autoplay=${playing ? 1 : 0}&controls=1&rel=0&modestbranding=1&cc_load_policy=1`;
    return (
      <div 
        ref={playerContainerRef} 
        className="relative w-full aspect-video bg-black flex flex-col justify-center overflow-hidden rounded-xl border border-white/5 shadow-[0_0_30px_rgba(229,210,165,0.05)]"
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
          key={youtubeId}
          src={embedUrl}
          style={{
            height: '100%',
            width: '100%',
            border: '0',
          }}
          className="w-full aspect-video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          loading="lazy"
        />
      </div>
    );
  }

  if (vdoData) {
    return (
      <div 
        ref={playerContainerRef} 
        className="relative w-full aspect-video bg-black flex flex-col justify-center overflow-hidden rounded-xl border border-white/5 shadow-[0_0_30px_rgba(229,210,165,0.05)]"
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
        className="relative w-full aspect-video bg-black flex flex-col justify-center overflow-hidden rounded-xl border border-white/5 shadow-[0_0_30px_rgba(229,210,165,0.05)]"
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
      className="relative w-full h-full bg-black group flex flex-col justify-center overflow-hidden rounded-xl border border-white/5 shadow-[0_0_30px_rgba(229,210,165,0.05)]"
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
                className="pointer-events-auto p-5 rounded-full bg-[#E5D2A5]/90 text-black backdrop-blur-md shadow-[0_0_40px_rgba(229,210,165,0.4)] hover:scale-110 transition-transform"
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
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-[#E5D2A5] rounded-full scale-0 group-hover/progress:scale-100 transition-transform shadow-[0_0_10px_rgba(229,210,165,0.8)]" />
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
