import React, { useEffect, useState } from 'react';
import { useSettingsStore } from '../store/settingsStore';

interface Particle {
  id: number;
  left: number;
  delay: number;
  duration: number;
  size: number;
  opacity: number;
  character: string;
}

export function SeasonalOverlay() {
  const activeOverlay = useSettingsStore(state => {
    // If preview settings have seasonalOverlay, use that, else use published settings
    const activeSettings = state.previewSettings || state.settings;
    return activeSettings?.seasonalOverlay || 'none';
  });

  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (activeOverlay === 'none') {
      setParticles([]);
      return;
    }

    // Generate lightweight random falling items
    const chars = {
      winter_snow: ['❄', '❅', '❆', '•'],
      spring_blossoms: ['🌸', '💮', '🌸'],
      autumn_lanterns: ['🏮', '🍂', '🍁'],
      cyber_grids: ['0', '1', '[ ]', '{ }', '*']
    };

    const currentChars = chars[activeOverlay as keyof typeof chars] || ['•'];
    const count = activeOverlay === 'cyber_grids' ? 14 : 25; // Keep it lightweight
    
    const items = Array.from({ length: count }).map((_, i) => {
      const char = currentChars[Math.floor(Math.random() * currentChars.length)];
      return {
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * -15, // Negative delay so some start middle of page
        duration: 12 + Math.random() * 15,
        size: activeOverlay === 'cyber_grids' ? 10 + Math.random() * 6 : 14 + Math.random() * 14,
        opacity: 0.3 + Math.random() * 0.6,
        character: char
      };
    });

    setParticles(items);
  }, [activeOverlay]);

  if (activeOverlay === 'none') return null;

  const isUpward = activeOverlay === 'autumn_lanterns'; // Lanterns float up, leaves fall

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden select-none">
      {/* Absolute grid lines for Cyber Matrix Grid pattern */}
      {activeOverlay === 'cyber_grids' && (
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(34,197,94,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(34,197,94,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)]" />
      )}

      {particles.map(p => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.left}%`,
            top: isUpward ? '100%' : '-5%',
            opacity: p.opacity,
            fontSize: `${p.size}px`,
            fontFamily: activeOverlay === 'cyber_grids' ? 'monospace' : 'inherit',
            color: activeOverlay === 'spring_blossoms' 
              ? '#f472b6' 
              : activeOverlay === 'autumn_lanterns' 
              ? '#f97316' 
              : activeOverlay === 'cyber_grids'
              ? '#22c55e'
              : '#ffffff',
            animation: `seasonal-movement-${isUpward ? 'up' : 'down'} ${p.duration}s linear infinite`,
            animationDelay: `${p.delay}s`,
            textShadow: activeOverlay === 'cyber_grids' 
              ? '0 0 8px rgba(34,197,94,0.6)' 
              : activeOverlay === 'autumn_lanterns' 
              ? '0 0 10px rgba(249,115,22,0.5)' 
              : 'none'
          }}
        >
          {p.character}
        </div>
      ))}

      {/* Embedded performance safe visual animations */}
      <style>{`
        @keyframes seasonal-movement-down {
          0% {
            transform: translateY(-10vh) rotate(0deg) translateX(0);
          }
          50% {
            transform: translateY(50vh) rotate(180deg) translateX(25px);
          }
          100% {
            transform: translateY(110vh) rotate(360deg) translateX(-10px);
          }
        }
        @keyframes seasonal-movement-up {
          0% {
            transform: translateY(10vh) rotate(0deg) translateX(0);
          }
          50% {
            transform: translateY(-50vh) rotate(90deg) translateX(-20px);
          }
          100% {
            transform: translateY(-110vh) rotate(180deg) translateX(20px);
          }
        }
      `}</style>
    </div>
  );
}
