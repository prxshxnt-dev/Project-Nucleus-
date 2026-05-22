import React, { useEffect, useState } from 'react';
import { motion, useDragControls } from 'motion/react';
import { useSettingsStore, THEME_PRESETS, ThemeConfig } from '../store/settingsStore';

// Define the shape for our floating stickers
interface StickerItem {
  id: number;
  emoji: string;
  label: string;
  color: string;
  size: number;
  left: string;
  top: string;
  delay: number;
  duration: number;
  rotate: number;
  mobileHidden?: boolean;
}

const STICKER_SETS: Record<string, { emoji: string; label: string; color: string; size: number }[]> = {
  stars_dots: [
    { emoji: '✨', label: 'glowing magic', color: 'from-amber-200 to-amber-400', size: 38 },
    { emoji: '⭐', label: 'star', color: 'from-yellow-300 to-amber-400', size: 32 },
    { emoji: '🌟', label: 'glowing star', color: 'from-yellow-200 to-orange-400', size: 44 },
    { emoji: '💫', label: 'shooting star', color: 'from-yellow-100 to-amber-300', size: 36 },
    { emoji: '🌸', label: 'pastel blossom', color: 'from-pink-200 to-rose-300', size: 30 },
    { emoji: '🎨', label: 'palette', color: 'from-blue-200 to-pink-300', size: 34 }
  ],
  cute_cartoons: [
    { emoji: '🦕', label: 'cute dino', color: 'from-emerald-300 to-teal-400', size: 48 },
    { emoji: '🦄', label: 'unicorn', color: 'from-pink-300 to-purple-400', size: 52 },
    { emoji: '🐻', label: 'teddy bear', color: 'from-amber-400 to-yellow-600', size: 44 },
    { emoji: '🐣', label: 'hatching chick', color: 'from-yellow-200 to-amber-400', size: 42 },
    { emoji: '🐱', label: 'smiling cat', color: 'from-orange-300 to-amber-400', size: 46 },
    { emoji: '🍓', label: 'sweet strawberry', color: 'from-red-300 to-rose-500', size: 40 },
    { emoji: '🥞', label: 'pancakes', color: 'from-yellow-300 to-amber-500', size: 44 }
  ],
  japanese_elements: [
    { emoji: '🏮', label: 'lantern', color: 'from-orange-500 to-red-600', size: 46 },
    { emoji: '🌸', label: 'cherry blossom', color: 'from-pink-200 to-rose-400', size: 40 },
    { emoji: '🗻', label: 'mount fuji', color: 'from-sky-300 to-indigo-500', size: 54 },
    { emoji: '🍙', label: 'onigiri', color: 'from-zinc-100 to-zinc-300', size: 36 },
    { emoji: '🍣', label: 'sushi', color: 'from-red-400 to-orange-500', size: 42 },
    { emoji: '🎏', label: 'koinobori', color: 'from-blue-400 to-teal-400', size: 50 }
  ],
  geometric: [
    { emoji: '🔮', label: 'crystal ball', color: 'from-purple-400 to-indigo-600', size: 48 },
    { emoji: '🌀', label: 'cyclone', color: 'from-sky-400 to-blue-600', size: 42 },
    { emoji: '💠', label: 'diamond shape', color: 'from-cyan-300 to-blue-400', size: 38 },
    { emoji: '🔶', label: 'orange gem', color: 'from-amber-400 to-orange-500', size: 32 },
    { emoji: '⚛️', label: 'atom', color: 'from-pink-400 to-indigo-500', size: 44 }
  ],
  planets_space: [
    { emoji: '🪐', label: 'saturn', color: 'from-amber-300 to-yellow-600', size: 56 },
    { emoji: '🚀', label: 'rocket', color: 'from-red-400 to-zinc-200', size: 50 },
    { emoji: '🌌', label: 'nebula', color: 'from-purple-600 to-pink-500', size: 44 },
    { emoji: '🌠', label: 'shooting path', color: 'from-white to-amber-200', size: 40 },
    { emoji: '👨‍🚀', label: 'astronaut', color: 'from-blue-200 to-indigo-400', size: 48 }
  ],
  doodles: [
    { emoji: '📝', label: 'notepad', color: 'from-amber-100 to-yellow-200', size: 42 },
    { emoji: '🎒', label: 'backpack', color: 'from-teal-400 to-emerald-500', size: 48 },
    { emoji: '🎓', label: 'grad cap', color: 'from-blue-500 to-indigo-600', size: 46 },
    { emoji: '📚', label: 'books', color: 'from-orange-400 to-rose-500', size: 44 },
    { emoji: '✏️', label: 'pencil', color: 'from-yellow-300 to-amber-500', size: 38 },
    { emoji: '🌻', label: 'sunflower', color: 'from-yellow-400 to-orange-500', size: 42 }
  ],
  cyber_particles: [
    { emoji: '⚡', label: 'lightning', color: 'from-amber-300 to-yellow-500', size: 40 },
    { emoji: '🤖', label: 'robot', color: 'from-teal-300 to-cyan-500', size: 48 },
    { emoji: '👾', label: 'alien creature', color: 'from-purple-400 to-pink-500', size: 44 },
    { emoji: '🎮', label: 'gamepad', color: 'from-indigo-400 to-blue-500', size: 46 },
    { emoji: '💻', label: 'laptop', color: 'from-sky-300 to-blue-500', size: 42 }
  ],
  organic_shapes: [
    { emoji: '🍀', label: 'clover', color: 'from-emerald-300 to-green-500', size: 38 },
    { emoji: '🍄', label: 'mushroom', color: 'from-red-400 to-orange-500', size: 42 },
    { emoji: '🦋', label: 'butterfly', color: 'from-sky-300 to-indigo-400', size: 44 },
    { emoji: '🍊', label: 'orange fruit', color: 'from-orange-400 to-yellow-500', size: 36 },
    { emoji: '🍂', label: 'autumn leaf', color: 'from-amber-500 to-red-600', size: 34 }
  ]
};

// Predetermined coordinates to keep sticker placement aesthetic, balanced and out of active UI paths
const COORDINATES = [
  { left: '4%', top: '15%', rotate: -15, mobileHidden: true },
  { left: '88%', top: '12%', rotate: 12, mobileHidden: true },
  { left: '92%', top: '55%', rotate: -18, mobileHidden: true },
  { left: '3%', top: '65%', rotate: 20, mobileHidden: true },
  { left: '85%', top: '82%', rotate: -8, mobileHidden: true },
  { left: '12%', top: '42%', rotate: 25, mobileHidden: true },
  { left: '81%', top: '35%', rotate: -12, mobileHidden: true }
];

export function FloatingStickers() {
  const { settings, previewSettings } = useSettingsStore();
  const currentSettings = previewSettings || settings;
  const activeTheme = currentSettings.activeTheme || 'default';
  
  // Choose config based on settings
  let config: ThemeConfig = THEME_PRESETS.default;
  if (activeTheme === 'custom') {
    config = currentSettings.themeCustomizations || THEME_PRESETS.default;
  } else if (THEME_PRESETS[activeTheme]) {
    config = { ...THEME_PRESETS[activeTheme], ...(currentSettings.themeCustomizations || {}) };
  } else {
    config = currentSettings.themeCustomizations || THEME_PRESETS.default;
  }

  const [stickers, setStickers] = useState<StickerItem[]>([]);
  const pack = config.stickerPack || 'none';

  useEffect(() => {
    if (pack === 'none') {
      setStickers([]);
      return;
    }

    const availableItems = STICKER_SETS[pack] || STICKER_SETS.stars_dots;
    
    // Build a static list using coordinated placement to look highly deliberate
    const generated = COORDINATES.map((coord, i) => {
      const template = availableItems[i % availableItems.length];
      return {
        id: i,
        emoji: template.emoji,
        label: template.label,
        color: template.color,
        size: template.size,
        left: coord.left,
        top: coord.top,
        rotate: coord.rotate,
        delay: i * 0.4,
        duration: 4 + (i % 3) * 1.5,
        mobileHidden: coord.mobileHidden
      };
    });

    setStickers(generated);
  }, [pack]);

  if (pack === 'none' || stickers.length === 0) return null;

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none z-30 overflow-hidden select-none">
      {stickers.map((st) => (
        <motion.div
          key={st.id}
          drag
          dragConstraints={{ left: -10, right: 10, top: -10, bottom: 10 }}
          dragElastic={0.4}
          whileDrag={{ scale: 1.15 }}
          className={`absolute pointer-events-auto cursor-grab active:cursor-grabbing select-none ${
            st.mobileHidden ? 'hidden lg:block' : 'block'
          }`}
          style={{
            left: st.left,
            top: st.top,
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: 0.85,
            scale: 1,
            y: [0, -12, 0],
            rotate: [st.rotate, st.rotate + 4, st.rotate - 2, st.rotate]
          }}
          transition={{
            opacity: { duration: 0.6 },
            scale: { type: 'spring', stiffness: 200, damping: 15 },
            y: {
              repeat: Infinity,
              duration: st.duration,
              ease: 'easeInOut',
              delay: st.delay
            },
            rotate: {
              repeat: Infinity,
              duration: st.duration * 1.2,
              ease: 'easeInOut',
              delay: st.delay
            }
          }}
          whileHover={{
            scale: 1.12,
            opacity: 1,
            rotate: st.rotate > 0 ? st.rotate + 15 : st.rotate - 15,
            transition: { type: 'spring', stiffness: 400, damping: 10 }
          }}
        >
          {/* Circular soft shadow plate matching Dribbble cute design style */}
          <div 
            className={`relative flex items-center justify-center p-3 sm:p-4 rounded-full bg-gradient-to-br ${st.color} shadow-lg border border-white/20 aspect-square select-none`}
            style={{
              width: `${st.size + 14}px`,
              height: `${st.size + 14}px`,
              boxShadow: '0 8px 30px rgba(0,0,0,0.12), inset 0 2px 4px rgba(255,255,255,0.4)',
              transform: 'translateZ(0)'
            }}
          >
            <span 
              role="img" 
              aria-label={st.label} 
              style={{ fontSize: `${st.size}px`, lineHeight: 1 }}
              className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)] select-none"
            >
              {st.emoji}
            </span>
            {/* Subtle light highlighting overlay for glassy premium feel */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/10 to-white/25 pointer-events-none" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}
