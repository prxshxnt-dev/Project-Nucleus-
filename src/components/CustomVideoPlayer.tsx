import React, { useState, useRef, useEffect } from 'react';
import ReactPlayer from 'react-player';
import { Play, Pause, Volume1, Volume2, VolumeX, Maximize, Minimize } from 'lucide-react';
import screenfull from 'screenfull';
import { motion, AnimatePresence } from 'motion/react';

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

export const CustomVideoPlayer = ({ url, playing: forcePlaying = true }: CustomVideoPlayerProps) => {
  const [playing, setPlaying] = useState(forcePlaying);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [played, setPlayed] = useState(0);
  const [loaded, setLoaded] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  
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
    setPlayed(parseFloat(e.target.value));
  };

  const handleSeekMouseDown = () => {
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

  return (
    <div 
      ref={playerContainerRef} 
      className="relative w-full h-full bg-black group flex flex-col justify-center overflow-hidden rounded-xl border border-white/5 shadow-[0_0_30px_rgba(229,210,165,0.05)]"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={() => setShowControls(true)}
    >
      {/* Invisible overlay to block youtube clicks */}
      <div className="absolute inset-0 z-10 pointer-events-none" onClick={(e) => { e.stopPropagation(); handlePlayPause(); }} style={{ pointerEvents: 'auto' }} />

      <div className="w-full h-full pointer-events-none" style={{ pointerEvents: 'none' }}>
          <ReactPlayer 
            ref={playerRef as any}
            src={url}
            width="100%"
            height="100%"
            playing={playing}
            controls={false}
            volume={volume}
            muted={muted}
            playsInline
            onTimeUpdate={(e: React.SyntheticEvent<HTMLVideoElement>) => {
              if (duration > 0) {
                 setPlayed(e.currentTarget.currentTime / duration);
              }
              if (e.currentTarget.buffered && e.currentTarget.buffered.length > 0) {
                 setLoaded(e.currentTarget.buffered.end(e.currentTarget.buffered.length - 1) / duration);
              }
            }}
            onDurationChange={(e: React.SyntheticEvent<HTMLVideoElement>) => setDuration(e.currentTarget.duration)}
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
            {/* Progress Bar */}
            <div className="relative w-full h-1.5 group/progress cursor-pointer flex items-center">
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
