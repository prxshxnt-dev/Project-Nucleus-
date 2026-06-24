import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import { 
  GraduationCap, 
  BookOpen, 
  Award, 
  ChevronRight, 
  Compass, 
  CheckCircle,
  Lightbulb,
  Clock,
  Briefcase
} from 'lucide-react';
import { toast, Toaster } from 'sonner';

interface StandardItem {
  name: string;
  code: string;
  enrollment: number;
  avgStudy: number;
  color: string;
  description: string;
  focus: string;
  highlights: string[];
}

const standardData: StandardItem[] = [
  { 
    name: '6th Grade', 
    code: '6', 
    enrollment: 1200, 
    avgStudy: 3.5, 
    color: '#3B82F6',
    description: 'Foundation Building & Scientific Curiosity development.',
    focus: 'Olympiad & Basic Aptitude Foundation',
    highlights: ['Interactive Science Labs', 'Mental Mathematics Drill']
  },
  { 
    name: '7th Grade', 
    code: '7', 
    enrollment: 1450, 
    avgStudy: 4.0, 
    color: '#10B981',
    description: 'Advanced Logical reasoning & quantitative skill induction.',
    focus: 'Pre-foundation Science & Math',
    highlights: ['Vedic Math Tricks', 'Logical Logic reasoning']
  },
  { 
    name: '8th Grade', 
    code: '8', 
    enrollment: 1800, 
    avgStudy: 4.5, 
    color: '#8B5CF6',
    description: 'Conceptual establishment for major board preparations.',
    focus: 'NTSE & National Talent Search Focus',
    highlights: ['Micro-problem solving', 'Basic Physics & Chemistry']
  },
  { 
    name: '9th Grade', 
    code: '9', 
    enrollment: 2400, 
    avgStudy: 5.5, 
    color: '#F59E0B',
    description: 'The critical cornerstone of Senior high-school competition mindset.',
    focus: 'NSEJS / Olympiad Tier-1 Prep',
    highlights: ['Rigorous Algebra structures', 'Biology & Mechanics Basics']
  },
  { 
    name: '10th Grade', 
    code: '10', 
    enrollment: 2900, 
    avgStudy: 6.0, 
    color: '#EF4444',
    description: 'Excel in Board examinations & establish senior selection fundamentals.',
    focus: 'Class 10th Boards & NTSE Stage-II',
    highlights: ['Full Mock Board Series', 'Conceptual Biology & Geometry']
  },
  { 
    name: '11th Grade', 
    code: '11', 
    enrollment: 4500, 
    avgStudy: 7.5, 
    color: '#EC4899',
    description: 'Beginning of IIT-JEE / NEET Advanced Competitive preparation loops.',
    focus: 'JEE Main/Adv & NEET Foundation',
    highlights: ['Mechanics & Calculus introduction', 'Organic Chemistry Basics']
  },
  { 
    name: '12th Grade', 
    code: '12', 
    enrollment: 4800, 
    avgStudy: 8.0, 
    color: '#06B6D4',
    description: 'Synergize 12th Board examinations with intensive premium JEE/NEET revisions.',
    focus: 'Competitive Entrance & Board Integration',
    highlights: ['Electrostatics & Modern Phys', 'Full Class Review Sessions']
  },
  { 
    name: 'Droppers', 
    code: 'dropper', 
    enrollment: 3100, 
    avgStudy: 9.0, 
    color: '#4F46E5',
    description: 'Dedicated focus on pure competitive output with customized micro-routines.',
    focus: 'Exclusively JEE Advanced & NEET Topper Prep',
    highlights: ['High-torque daily test chains', 'Instant personalized IITian mentorship']
  }
];

export default function SelectStandard() {
  const { user, setUser } = useAuthStore();
  const navigate = useNavigate();
  const [selectedIdx, setSelectedIdx] = useState<number>(5); // Default is 11th Grade representation
  const [isSaving, setIsSaving] = useState(false);

  // Auto-redirect if user not logged in at all
  useEffect(() => {
    // If we have an active session in local storage but user is null inside store, we wait a moment
    const customUserStr = localStorage.getItem('currentUser');
    if (!user && !customUserStr) {
      navigate('/login');
    }
  }, [user, navigate]);

  const selectedStandard = standardData[selectedIdx];

  const handleBarClick = (data: any, index: number) => {
    setSelectedIdx(index);
  };

  const handleConfirm = async () => {
    if (!user && !localStorage.getItem('currentUser')) {
      toast.error('Identity context is missing. Please log in again.');
      return;
    }

    setIsSaving(true);
    const userId = user?.uid || JSON.parse(localStorage.getItem('currentUser') || '{}').uid;

    if (!userId) {
      toast.error('User UID is not configured.');
      setIsSaving(false);
      return;
    }

    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        classGroup: selectedStandard.code,
        updatedAt: new Date().toISOString()
      });

      // Update local storage context
      const localUserData = localStorage.getItem('currentUser');
      if (localUserData) {
        try {
          const parsed = JSON.parse(localUserData);
          parsed.classGroup = selectedStandard.code;
          localStorage.setItem('currentUser', JSON.stringify(parsed));
        } catch (e) {
          console.warn('Silent local storage patch failed:', e);
        }
      }

      // Update state
      if (user) {
        setUser({
          ...user,
          classGroup: selectedStandard.code
        });
      }

      toast.success(`Standard updated successfully to ${selectedStandard.name}! Ready to elevate your prep.`);
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 1000);

    } catch (err: any) {
      console.error('Save standard error:', err);
      toast.error('Error establishing your standard segment. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen pt-28 pb-20 px-4 md:px-8 bg-[#F8FAFC] select-none text-[#1F1F1F]">
      <Toaster richColors position="bottom-right" />
      
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Academic Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#4F46E5]/10 rounded-full text-[#4F46E5] text-xs font-bold uppercase tracking-wider">
            <GraduationCap className="w-4 h-4" />
            <span>Academic Milestone Setup</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-display font-extrabold tracking-tight">
            Configure Your Target Standard
          </h1>
          <p className="text-[#7A7A7A] max-w-xl mx-auto text-sm md:text-base leading-relaxed">
            Welcome to Nucleus! Select your standard by clicking on the interactive daily study engagement chart below.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Interactive Enrollment / Load Chart Card (Left 7 Columns) */}
          <div className="lg:col-span-7 bg-[#FFFDF9] border border-black/10 rounded-3xl p-6 md:p-8 shadow-md">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mb-6">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Compass className="w-5 h-5 text-[#4F46E5]" />
                  Interactive Curricula Chart
                </h3>
                <p className="text-xs text-[#7A7A7A]">
                  Y-Axis: Recommended daily hours. Tap any bar inside the chart to select standard.
                </p>
              </div>
              <div className="flex items-center gap-2 bg-[#F8FAFC] px-3 py-1.5 rounded-xl border border-black/5 text-xs text-[#7A7A7A] font-mono">
                <Clock className="w-3.5 h-3.5 text-[#4F46E5]" />
                <span>Peak load: 9.0 Hours</span>
              </div>
            </div>

            {/* Recharts Graphical Distribution Container */}
            <div className="h-[320px] md:h-[380px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={standardData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  onClick={(props) => {
                    if (props && typeof props.activeTooltipIndex === 'number') {
                      setSelectedIdx(props.activeTooltipIndex);
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EBEBEB" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: '#7A7A7A', fontSize: 10, fontWeight: 'medium' }}
                    axisLine={{ stroke: '#DFDFDF' }}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fill: '#7A7A7A', fontSize: 10 }}
                    axisLine={{ stroke: '#DFDFDF' }}
                    tickLine={false}
                    domain={[0, 10]}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(79, 70, 229, 0.04)' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload as StandardItem;
                        return (
                          <div className="bg-[#FFFDF9] border border-[#4F46E5]/20 p-3 rounded-2xl shadow-xl space-y-1">
                            <p className="font-extrabold text-xs text-text-primary">{data.name}</p>
                            <p className="text-[10px] text-[#7A7A7A] flex items-center gap-1">
                              <span>Recommended study:</span>
                              <span className="font-bold text-[#4F46E5]">{data.avgStudy} hrs/day</span>
                            </p>
                            <p className="text-[10px] text-[#7A7A7A]">
                              Active Peers: <span className="font-semibold text-black">{data.enrollment} Enrolled</span>
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="avgStudy" 
                    radius={[8, 8, 0, 0]}
                    maxBarSize={48}
                  >
                    {standardData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={selectedIdx === index ? '#4F46E5' : 'rgba(79, 70, 229, 0.25)'}
                        stroke={selectedIdx === index ? '#4F46E5' : 'rgba(79, 70, 229, 0.1)'}
                        strokeWidth={selectedIdx === index ? 2 : 1}
                        className="transition-colors duration-200 cursor-pointer"
                        style={{ cursor: 'pointer' }}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Standards Tab Bento Grid Selectors */}
            <div className="mt-6 pt-6 border-t border-black/5">
              <p className="text-xs font-bold uppercase tracking-wider text-[#7A7A7A] mb-3 ml-1">Alternative Select Grid</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {standardData.map((item, idx) => {
                  const isSelected = selectedIdx === idx;
                  return (
                    <button
                      key={item.code}
                      onClick={() => setSelectedIdx(idx)}
                      type="button"
                      className={`py-3.5 px-3 rounded-2xl border text-center transition-all duration-200 cursor-pointer ${
                        isSelected 
                          ? 'bg-[#4F46E5] border-[#4F46E5] text-white shadow-md' 
                          : 'bg-[#F8FAFC]/40 hover:bg-[#F8FAFC]/80 border-black/10 text-text-primary'
                      }`}
                    >
                      <GraduationCap className={`w-5 h-5 mx-auto mb-1 ${isSelected ? 'text-white' : 'text-[#4F46E5]'}`} />
                      <span className="text-xs font-bold block truncate">{item.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Standard Pathway Detail & Target Confirmation (Right 5 Columns) */}
          <div className="lg:col-span-5 space-y-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedIdx}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="bg-[#FFFDF9] border border-black/10 rounded-3xl p-6 md:p-8 shadow-md space-y-6"
              >
                {/* Visual Icon Badge */}
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#4F46E5]/10 border border-[#4F46E5]/20 flex items-center justify-center text-[#4F46E5] shrink-0">
                    <Award className="w-7 h-7" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black font-display tracking-tight text-[#1F1F1F]">
                      {selectedStandard.name}
                    </h2>
                    <p className="text-[#4F46E5] text-xs font-mono uppercase tracking-widest font-black">
                      Segment: {selectedStandard.focus}
                    </p>
                  </div>
                </div>

                {/* Pathway Info */}
                <div className="space-y-4 pt-4 border-t border-black/5">
                  <p className="text-sm text-[#555555] leading-relaxed">
                    {selectedStandard.description}
                  </p>

                  <div className="space-y-2.5">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#7A7A7A]">Program Curriculum Highlights</h4>
                    <div className="space-y-2">
                      {selectedStandard.highlights.map((h, i) => (
                        <div key={i} className="flex items-center gap-2.5 text-xs text-[#1F1F1F]">
                          <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span className="font-semibold">{h}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Platform Analytics Widget */}
                  <div className="grid grid-cols-2 gap-3 bg-[#F8FAFC] p-4 rounded-2xl border border-black/5 mt-4">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-mono text-[#7A7A7A] uppercase tracking-wider block">Avg study required</span>
                      <strong className="text-base font-extrabold font-display">{selectedStandard.avgStudy} Hours/Day</strong>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-mono text-[#7A7A7A] uppercase tracking-wider block">Peer Enrollment</span>
                      <strong className="text-base font-extrabold font-display">{selectedStandard.enrollment} Students</strong>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-indigo-50 border border-indigo-100/60 rounded-2xl flex gap-2 text-xs text-indigo-950/80 leading-relaxed">
                  <Lightbulb className="w-5 h-5 text-indigo-500 shrink-0" />
                  <p>You can freely modify your standard at any time later in your dashboard academic progress panel.</p>
                </div>

                {/* Confirmation trigger */}
                <motion.button
                  onClick={handleConfirm}
                  disabled={isSaving}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  type="button"
                  className={`w-full py-4 bg-[#4F46E5] hover:bg-primary-dark text-white rounded-2xl font-bold font-sans flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  <span>{isSaving ? 'Configuring Access...' : `Enroll in ${selectedStandard.name}`}</span>
                  {!isSaving && <ChevronRight className="w-5 h-5" />}
                </motion.button>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
