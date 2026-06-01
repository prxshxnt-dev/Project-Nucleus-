import React from 'react';

// Help helper to render simple bullet points, bold markers and custom headers safely
export function renderBoldText(text: string) {
  const parts = text.split('**');
  return parts.map((part, index) => {
    if (index % 2 === 1) {
      return (
        <strong key={index} className="font-extrabold text-black">
          {part}
        </strong>
      );
    }
    return part;
  });
}

interface SyllabusRendererProps {
  text: string;
}

export function SyllabusRenderer({ text }: SyllabusRendererProps) {
  if (!text) {
    return (
      <p className="text-xs text-text-muted italic">
        No custom syllabus outline provided for this class yet. Standard materials will guide instruction.
      </p>
    );
  }

  const lines = text.split('\n');
  return (
    <div className="space-y-2.5 text-left text-xs text-black">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        
        // Headers parsing
        if (trimmed.startsWith('### ')) {
          return (
            <h5 
              key={idx} 
              className="text-xs font-black uppercase tracking-wider text-accent-primary mt-4 mb-2 first:mt-0 font-mono flex items-center gap-1.5"
            >
              <span className="text-[8px] opacity-60">■</span> {trimmed.replace('### ', '')}
            </h5>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h4 
              key={idx} 
              className="text-sm font-black text-accent-primary mt-5 mb-2 first:mt-0 leading-tight border-b border-border-color/30 pb-1"
            >
              {trimmed.replace('## ', '')}
            </h4>
          );
        }
        if (trimmed.startsWith('# ')) {
          return (
            <h3 
              key={idx} 
              className="text-base font-black text-black mt-6 mb-3 first:mt-0 tracking-tight"
            >
              {trimmed.replace('# ', '')}
            </h3>
          );
        }
        
        // Unordered list items parsing
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const content = trimmed.substring(2);
          return (
            <div 
              key={idx} 
              className="flex items-start gap-2 pl-2 text-black leading-relaxed py-0.5"
            >
              <span className="text-accent-primary shrink-0 select-none text-[8.5px] mt-1">✦</span>
              <span className="text-xs text-black">{renderBoldText(content)}</span>
            </div>
          );
        }
        
        // Blank lines or general paragraphs
        if (!trimmed) {
          return <div key={idx} className="h-2" />;
        }
        
        return (
          <p key={idx} className="text-xs text-black leading-relaxed my-1">
            {renderBoldText(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

export const getDefaultSyllabus = (cls: string): string => {
  const defaults: Record<string, string> = {
    '6': '### Class 6 General Science & Mathematics\n- **Mathematics**: Integers, Fractions, Decimals, Algebra, Mensuration, Ratio and Proportion.\n- **Science**: Food: Where Does It Come From?, Components of Food, Fibre to Fabric, Sorting Materials into Groups.',
    '7': '### Class 7 Science & Mathematics Foundation\n- **Mathematics**: Integers, Fractions and Decimals, Data Handling, Simple Equations, Lines & Angles, Triangles.\n- **Science**: Nutrition in Plants, Nutrition in Animals, Fibre to Fabric, Heat, Acids, Bases & Salts.',
    '8': '### Class 8 Foundation & Olympiad\n- **Mathematics**: Rational Numbers, Linear Equations in One Variable, Understanding Quadrilaterals, Practical Geometry.\n- **Science**: Crop Production and Management, Microorganisms: Friend and Foe, Synthetic Fibres & Plastics.',
    '9': '### Class 9 Advanced Foundation (IIT-JEE/NEET)\n\n## Physics Topics\n- **Motion**: Uniform & non-uniform motion, graphical analysis, equations of state.\n- **Force & Laws**: Newton\'s laws, inertia, linear momentum preservation drills.\n- **Gravitation & Torque**: Universal law, acceleration due to gravity, free fall math.\n\n## Chemistry Topics\n- **Anatomy of Matter**: Matter in our surroundings, physical nature, state revisions.\n- **Purity analysis**: Is matter around us pure?, mixtures separation, true solutions.\n- **Atoms & Elements**: Molecular compositions, chemical formulas, sub-atomic fundamentals.',
    '10': '### Class 10 Foundation & Boards\n\n## Mathematics Curricula\n- **Algebra Exercises**: Real numbers, polynomials, linear equations variables.\n- **Calculative Progress**: Arithmetic progressions, quadratic equations formulas.\n- **Trigonometric Ratios**: Applications of heights and distances, proving identities.\n\n## Physics & Science Studies\n- **Optical Currents**: Refraction and reflection laws, high-contrast spectrum diagrams.\n- **Eye Foundations**: Atmospheric color shifts, lens correction and focus depths.\n- **Magnetic Circuits**: Electromagnetic force vectors, solenoid fields, heating laws.',
    '11': '### Class 11 JEE & NEET Premium Batch\n\n## Advanced Mathematics\n- **Complex Grids**: Sets, composite relations, trigonometric identities and function curves.\n- **Inductive Equations**: Quadratic functions graphing, linear inequalities boundaries.\n- **Conic Coordinate Systems**: Parabolas, ellipses, hyperbola curves, circles.\n\n## Classical Mechanics (Physics)\n- **Kinematics Vectors**: Relative velocity, projectile vectors, uniform circular vectors.\n- **Laws of Torque**: Friction coefficients, rotational equilibrium mechanics, work and kinetics.\n- **Molecular Waves**: Thermodynamic systems, gas laws, oscillations and wave structures.',
    '12': '### Class 12 JEE/NEET Ultimate Course\n\n## Advanced Calculus & Algebra\n- **Linear Operators**: Vector algebra matrix formulas, determinant identities, 3D coordinate vectors.\n- **Calculus Integration**: Limits fundamentals, complex continuity details, standard derivative integration theorems.\n\n## Electrodynamics studies (Physics)\n- **Charges and Gauss**: Electrostat potential energy, capacitor formulas, Gauss law proofs.\n- **AC and Induction**: Magnetic fields, electromagnetic induction curves, alternating current vectors.\n- **Optics and Atoms**: Dual wave-particle physics, Bohr model analysis, semiconductors diodes.',
    'dropper': '### JEE/NEET Dropper Repeater Batch\n\n## Highly Intensive Revision Guidelines\n- **Full Mechanics Overhaul**: Rotational kinetics, mechanical properties of solids, gravitation and orbits.\n- **Electromagnetism Drill**: Direct current mesh analysis, AC resonance curves, displacement vectors.\n- **Universal Calculus**: Advanced limits, integration rules, differential equations modeling.\n- **Heavy Organic Synthesis**: Custom reaction pathways, organic acids synthesis, carbon polymer drills.'
  };
  return defaults[cls] || '';
};
