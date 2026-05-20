import React, { useState, useRef, useEffect, useCallback } from 'react';
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

const PLAYER_CONFIG = {
  youtube: {
    playerVars: {
      autoplay: 1,
      mute: 1,
      modestbranding: 1,
      rel: 0,
      controls: 0,
      disablekb: 1,
      fs: 0,
      playsinline: 1,
      enablejsapi: 1,
      origin: window.location.origin
    }
  }
};

export const CustomVideoPlayer = ({
  url,
  playing: forcePlaying = true
}: CustomVideoPlayerProps) => {
  const [playing, setPlaying] = useState(forcePlaying);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(true);
  const [played, setPlayed] = useState(0);
  const [loaded, setLoaded] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const playerRef = useRef<any>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);

  const controlsTimeoutRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setPlaying(forcePlaying);
  }, [forcePlaying]);

  const handlePlayPause = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    setPlaying((prev) => !prev);
  }, []);

  const safePlay = async () => {
    try {
      setPlaying(true);

      const internalPlayer: any =
        playerRef.current?.getInternalPlayer?.();

      // HTML5 video
      if (internalPlayer?.play) {
        const playPromise = internalPlayer.play();

        if (playPromise instanceof Promise) {
          await playPromise.catch(() => {});
        }
      }

      // YouTube iframe
      if (internalPlayer?.playVideo) {
        internalPlayer.playVideo();
      }
    } catch (err) {
      console.log('safePlay failed', err);
    }
  };

  const handleVolumeChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const val = parseFloat(e.target.value);

    setVolume(val);

    if (val === 0) {
      setMuted(true);
    } else {
      if (muted) {
        setMuted(false);
        safePlay();
      }
    }
  };

  const handleToggleMuted = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (muted) {
      setMuted(false);

      if (volume === 0) {
        setVolume(0.8);
      }

      safePlay();
    } else {
      setMuted(true);
      safePlay();
    }
  };

  const handleSeekChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setPlayed(parseFloat(e.target.value));
  };

  const handleSeekMouseDown = () => {
    setPlaying(false);
  };

  const handleSeekMouseUp = (
    e:
      | React.MouseEvent<HTMLInputElement>
      | React.TouchEvent<HTMLInputElement>
  ) => {
    const internalPlayer: any =
      playerRef.current?.getInternalPlayer?.();

    const seekValue = parseFloat(
      (e.target as HTMLInputElement).value
    );

    if (playerRef.current?.seekTo) {
      playerRef.current.seekTo(seekValue, 'fraction');
    } else if (internalPlayer?.seekTo) {
      internalPlayer.seekTo(seekValue);
    }

    setPlaying(true);
    safePlay();
  };

  const handleToggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (screenfull.isEnabled && playerContainerRef.current) {
      void screenfull.toggle(playerContainerRef.current);
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

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current !== null) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  const handleMouseMove = () => {
    setShowControls(true);

    if (controlsTimeoutRef.current !== null) {
      clearTimeout(controlsTimeoutRef.current);
    }

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
      className="relative w-full h-full bg-[#1A1A1A] group flex flex-col justify-center overflow-hidden rounded-xl border border-white/5 shadow-[0_0_30px_rgba(229,210,165,0.05)]"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={() => setShowControls(true)}
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 z-10"
        onClick={handlePlayPause}
      />

      <div className="w-full h-full">
        <ReactPlayer
          ref={playerRef}
          url={url}
          width="100%"
          height="100%"
          playing={playing}
          controls={false}
          volume={volume}
          muted={muted}
          playsinline
          config={PLAYER_CONFIG}
          style={{
            width: '100%',
            height: '100%'
          }}
          onProgress={({ played, loaded }) => {
            setPlayed(played);
            setLoaded(loaded);
          }}
          onDuration={(duration) => {
            setDuration(duration);
          }}
          onPlay={() => {
            setPlaying(true);
          }}
          onPause={() => {
            setTimeout(() => {
              const internalPlayer: any =
                playerRef.current?.getInternalPlayer?.();

              if (playing) {
                if (internalPlayer?.playVideo) {
                  internalPlayer.playVideo();
                }

                if (internalPlayer?.play) {
                  internalPlayer.play().catch(() => {});
                }
              }
            }, 100);
          }}
          onEnded={() => {
            setPlaying(false);
          }}
        />
      </div>

      {/* Center Play Button */}
      {!playing && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <motion.button
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={handlePlayPause}
            className="pointer-events-auto p-5 rounded-full bg-[#E5D2A5]/90 text-[#1A1A1A] backdrop-blur-md shadow-[0_0_40px_rgba(229,210,165,0.4)] hover:scale-110 transition-transform"
          >
            <Play className="w-10 h-10 ml-1 fill-current" />
          </motion.button>
        </div>
      )}

      {/* Controls */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            className="absolute bottom-0 left-0 right-0 z-30 p-6 bg-gradient-to-t from-black via-black/60 to-transparent flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Progress */}
            <div className="relative w-full h-1.5 group/progress cursor-pointer flex items-center mb-2">
              <input
                type="range"
                min={0}
                max={0.999999}
                step="any"
                value={played}
                onMouseDown={handleSeekMouseDown}
                onTouchStart={handleSeekMouseDown}
                onChange={handleSeekChange}
                onMouseUp={handleSeekMouseUp}
                onTouchEnd={handleSeekMouseUp as any}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />

              <div className="absolute left-0 h-full bg-white/20 rounded-full w-full" />

              <div
                className="absolute left-0 h-full bg-white/40 rounded-full"
                style={{
                  width: `${loaded * 100}%`
                }}
              />

              <div
                className="absolute left-0 h-full bg-[#E5D2A5] rounded-full group-hover/progress:h-2.5 transition-all"
                style={{
                  width: `${played * 100}%`
                }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-[#E5D2A5] rounded-full scale-0 group-hover/progress:scale-100 transition-transform shadow-[0_0_10px_rgba(229,210,165,0.8)]" />
              </div>
            </div>

            {/* Bottom Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <button
                  onClick={handlePlayPause}
                  className="text-[#E5D2A5] hover:text-white transition-colors focus:outline-none"
                >
                  {playing ? (
                    <Pause className="w-7 h-7 fill-current" />
                  ) : (
                    <Play className="w-7 h-7 fill-current" />
                  )}
                </button>

                <div className="flex items-center gap-3 group/volume">
                  <button
                    onClick={handleToggleMuted}
                    className="text-white hover:text-[#E5D2A5] transition-colors focus:outline-none"
                  >
                    {muted || volume === 0 ? (
                      <VolumeX className="w-6 h-6" />
                    ) : volume < 0.5 ? (
                      <Volume1 className="w-6 h-6" />
                    ) : (
                      <Volume2 className="w-6 h-6" />
                    )}
                  </button>

                  <div className="w-0 overflow-hidden group-hover/volume:w-24 transition-all duration-300 ease-in-out">
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step="any"
                      value={muted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="w-24 h-1.5 accent-[#E5D2A5] bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-[#E5D2A5] [&::-webkit-slider-thumb]:rounded-full focus:outline-none"
                    />
                  </div>
                </div>

                <div className="text-sm font-mono text-white/80 select-none hidden sm:block">
                  {formatTime(played * duration)} /{' '}
                  {formatTime(duration)}
                </div>
              </div>

              <button
                onClick={handleToggleFullscreen}
                className="text-white hover:text-[#E5D2A5] transition-colors focus:outline-none"
              >
                {isFullscreen ? (
                  <Minimize className="w-6 h-6" />
                ) : (
                  <Maximize className="w-6 h-6" />
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
