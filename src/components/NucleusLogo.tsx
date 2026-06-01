import React from 'react';

interface NucleusLogoProps {
  className?: string;
  logoColor?: string; // Default to 'black' or current theme color
}

export const NucleusLogo: React.FC<NucleusLogoProps> = ({ className = 'w-10 h-10', logoColor = 'black' }) => {
  return (
    <svg 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={`${className} transition-transform duration-300 group-hover:scale-110 shrink-0`}
    >
      {/* Outer physics orbits at dynamic angles with handdrawn styling */}
      {/* Orbit 1 */}
      <ellipse 
        cx="50" 
        cy="50" 
        rx="38" 
        ry="13" 
        transform="rotate(-30 50 50)" 
        stroke={logoColor} 
        strokeWidth="3" 
        strokeLinecap="round" 
        className="opacity-80"
        strokeDasharray="4 3"
      />
      {/* Orbit 2 */}
      <ellipse 
        cx="50" 
        cy="50" 
        rx="38" 
        ry="13" 
        transform="rotate(30 50 50)" 
        stroke={logoColor} 
        strokeWidth="3" 
        strokeLinecap="round" 
        className="opacity-90"
      />
      {/* Orbit 3 */}
      <ellipse 
        cx="50" 
        cy="50" 
        rx="38" 
        ry="13" 
        transform="rotate(90 50 50)" 
        stroke={logoColor} 
        strokeWidth="2.5" 
        strokeLinecap="round" 
        className="opacity-70"
      />

      {/* Orbiting Electrons */}
      <circle cx="18" cy="32" r="3.5" fill={logoColor} className="animate-ping" style={{ animationDuration: '2.5s' }} />
      <circle cx="18" cy="32" r="3.5" fill={logoColor} />
      <circle cx="82" cy="32" r="3.5" fill={logoColor} />
      <circle cx="50" cy="12" r="3.5" fill="var(--accent-primary, #FA8339)" />

      {/* Central Nucleus Cluster (overlapping Protons & Neutrons) */}
      <g className="nucleus-center">
        {/* Neutron 1 (Black) */}
        <circle cx="44" cy="46" r="8.5" fill={logoColor} stroke={logoColor} strokeWidth="1" />
        {/* Proton 1 (Theme Accent with solid Black outline) */}
        <circle cx="56" cy="46" r="8.5" fill="var(--accent-primary, #FA8339)" stroke={logoColor} strokeWidth="2" />
        {/* Neutron 2 (Black) */}
        <circle cx="50" cy="57" r="8.5" fill={logoColor} stroke={logoColor} strokeWidth="1" />
        {/* Proton 2 (Theme Accent) */}
        <circle cx="43" cy="53" r="8" fill="var(--accent-primary, #FA8339)" stroke={logoColor} strokeWidth="2" />
        {/* Neutron 3 (Black) */}
        <circle cx="54" cy="53" r="8" fill={logoColor} stroke={logoColor} strokeWidth="1" />
        {/* Center glowing atom node */}
        <circle cx="49" cy="48" r="5.5" fill="var(--accent-primary, #FA8339)" />
      </g>
    </svg>
  );
};

export default NucleusLogo;
