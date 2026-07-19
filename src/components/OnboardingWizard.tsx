import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import {
  Smartphone,
  User as UserIcon,
  GraduationCap,
  Award,
  FileText,
  ChevronRight,
  ChevronLeft,
  Check,
  X,
  ExternalLink,
  Shield
} from 'lucide-react';
import { toast } from 'sonner';

interface OnboardingWizardProps {
  onComplete: () => void;
}

const steps = [
  { id: 'phone', name: 'Mobile Number' },
  { id: 'fullname', name: 'Full Name' },
  { id: 'class', name: 'Target Class' },
  { id: 'exam', name: 'Target Exam' },
  { id: 'terms', name: 'Consent & Terms' },
];

const classOptions = [
  { code: '6', name: '6th Class', desc: 'Olympiad Foundation' },
  { code: '7', name: '7th Class', desc: 'Pre-foundation Science' },
  { code: '8', name: '8th Class', desc: 'NTSE Talent Search' },
  { code: '9', name: '9th Class', desc: 'NSEJS Olympiad' },
  { code: '10', name: '10th Class', desc: 'Boards & NTSE Prep' },
  { code: '11', name: '11th Class', desc: 'JEE & NEET Prime' },
  { code: '12', name: '12th Class', desc: 'JEE & NEET Target' },
  { code: 'dropper', name: 'Dropper', desc: 'Exclusively Rankers' }
];

const examOptions = [
  { code: 'jee', name: 'JEE Mains & Advanced', desc: 'Engineering Entrance' },
  { code: 'neet', name: 'NEET UG', desc: 'Medical Entrance' },
  { code: 'olympiad', name: 'NTSE & Olympiads', desc: 'National Level Talent' },
  { code: 'boards', name: 'Board Exams (CBSE/ICSE)', desc: 'Academic Excellence' },
  { code: 'foundation', name: 'Foundation Courses', desc: 'Junior Core Development' }
];

export default function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { user, setUser } = useAuthStore();
  const { settings } = useSettingsStore();

  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [fullName, setFullName] = useState(user?.displayName || '');
  const [selectedClass, setSelectedClass] = useState('');
  const [targetExam, setTargetExam] = useState('');
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [termsChecked, setTermsChecked] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Policy modal states
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const validateCurrentStep = (): boolean => {
    if (currentStepIdx === 0) {
      // Indian phone number validation
      const cleanPhone = phoneNumber.replace(/\s+/g, '').replace(/^\+91/, '');
      const phoneRegex = /^[6-9]\d{9}$/;
      if (!phoneRegex.test(cleanPhone)) {
        toast.error('Please enter a valid 10-digit Indian mobile number.');
        return false;
      }
      return true;
    }
    if (currentStepIdx === 1) {
      if (!fullName.trim()) {
        toast.error('Please provide your full name.');
        return false;
      }
      return true;
    }
    if (currentStepIdx === 2) {
      if (!selectedClass) {
        toast.error('Please select your target class.');
        return false;
      }
      return true;
    }
    if (currentStepIdx === 3) {
      if (!targetExam) {
        toast.error('Please select your target exam.');
        return false;
      }
      return true;
    }
    if (currentStepIdx === 4) {
      if (!privacyChecked || !termsChecked) {
        toast.error('You must accept both policies to complete onboarding.');
        return false;
      }
      return true;
    }
    return true;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      if (currentStepIdx < steps.length - 1) {
        setCurrentStepIdx(currentStepIdx + 1);
      } else {
        handleFinishSetup();
      }
    }
  };

  const handlePrev = () => {
    if (currentStepIdx > 0) {
      setCurrentStepIdx(currentStepIdx - 1);
    }
  };

  const handleFinishSetup = async () => {
    if (!user) return;
    if (!validateCurrentStep()) return;

    setIsSaving(true);
    const acceptedAtTimestamp = new Date().toISOString();
    const formattedPhone = phoneNumber.startsWith('+91') 
      ? phoneNumber.replace(/\s+/g, '') 
      : `+91${phoneNumber.replace(/\s+/g, '')}`;

    try {
      const userRef = doc(db, 'users', user.uid);
      
      const userDataToSave: any = {
        uid: user.uid,
        email: user.email,
        displayName: fullName.trim(),
        fullName: fullName.trim(),
        photoURL: user.photoURL || null,
        phoneNumber: formattedPhone,
        mobile: formattedPhone, // legacy/compatibility
        phone: formattedPhone, // legacy/compatibility
        class: selectedClass,
        classGroup: selectedClass, // compatibility
        selectedClass: selectedClass, // compatibility
        targetExam: targetExam,
        role: "student",
        createdAt: acceptedAtTimestamp,
        lastLogin: acceptedAtTimestamp,
        onboardingCompleted: true,
        privacyAccepted: true,
        termsAccepted: true,
        acceptedAt: acceptedAtTimestamp,
        updatedAt: acceptedAtTimestamp,
        planId: user.planId || 'free',
        unlockedMaterials: user.unlockedMaterials || [],
        streak: user.streak || 0,
      };

      // Set user record in Firestore
      await setDoc(userRef, userDataToSave, { merge: true });

      // Save record in the consent history too
      const consentId = `consent-${user.uid}-${Date.now()}`;
      const consentRef = doc(db, 'agreement_history', consentId);
      await setDoc(consentRef, {
        userId: user.uid,
        email: user.email,
        displayName: fullName.trim(),
        termsAccepted: true,
        privacyAccepted: true,
        acceptedAt: acceptedAtTimestamp,
        version: settings?.requiredTermsVersion || '1.0',
      });

      // Update local state store
      setUser({
        ...user,
        displayName: fullName.trim(),
        phoneNumber: formattedPhone,
        class: selectedClass,
        classGroup: selectedClass,
        targetExam: targetExam,
        onboardingCompleted: true,
        privacyAccepted: true,
        termsAccepted: true,
        acceptedAt: acceptedAtTimestamp,
      });

      toast.success('Onboarding completed successfully! Welcome aboard.');
      onComplete();
    } catch (err: any) {
      console.error('Setup Wizard save error:', err);
      toast.error(err.message || 'Failed to complete registration setup. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderPhoneStep = () => (
    <motion.div
      key="phone-step"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="space-y-6 max-w-md mx-auto w-full text-left"
    >
      <div className="space-y-2 text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm">
          <Smartphone className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-display font-extrabold text-foreground">Mobile Verification</h2>
        <p className="text-muted-foreground text-sm">Please provide your active 10-digit Indian mobile number.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-bold text-foreground block mb-2 uppercase tracking-wide">
            Phone Number <span className="text-red-500">*</span>
          </label>
          <div className="relative flex rounded-xl border border-border bg-card shadow-sm focus-within:border-primary/50 transition-colors">
            <span className="flex items-center px-4 border-r border-border text-sm font-bold bg-muted/40 text-foreground select-none">
              🇮🇳 +91
            </span>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="98765 43210"
              className="flex-1 px-4 py-3 bg-transparent text-sm text-foreground placeholder-muted-foreground outline-none font-mono"
              required
              autoFocus
            />
          </div>
          <p className="text-[11px] text-muted-foreground mt-1.5">Standard 10-digit mobile number validation is required.</p>
        </div>
      </div>
    </motion.div>
  );

  const renderFullNameStep = () => (
    <motion.div
      key="fullname-step"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="space-y-6 max-w-md mx-auto w-full text-left"
    >
      <div className="space-y-2 text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm">
          <UserIcon className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-display font-extrabold text-foreground">Tell Us Your Name</h2>
        <p className="text-muted-foreground text-sm">Please provide your official full name for academic record logging.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-bold text-foreground block mb-2 uppercase tracking-wide">
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g. Aryan Sharma"
            className="w-full px-4 py-3 rounded-xl border border-border bg-card text-sm text-foreground placeholder-muted-foreground outline-none focus:border-primary/50 transition-colors shadow-sm"
            required
            autoFocus
          />
        </div>
      </div>
    </motion.div>
  );

  const renderClassStep = () => (
    <motion.div
      key="class-step"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="space-y-6 w-full text-left"
    >
      <div className="space-y-2 text-center max-w-md mx-auto">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm">
          <GraduationCap className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-display font-extrabold text-foreground">Select Target Class</h2>
        <p className="text-muted-foreground text-sm">Choose your current academic standard to customize your study board.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto pt-2">
        {classOptions.map((item) => {
          const isSelected = selectedClass === item.code;
          return (
            <button
              key={item.code}
              type="button"
              onClick={() => setSelectedClass(item.code)}
              className={`p-4 rounded-xl border text-left flex flex-col justify-between h-24 transition-all duration-200 cursor-pointer ${
                isSelected
                  ? 'bg-primary border-primary text-primary-foreground shadow-md'
                  : 'bg-card border-border text-foreground hover:border-primary/40'
              }`}
            >
              <div>
                <span className={`text-[9px] font-bold block uppercase tracking-wider ${isSelected ? 'text-primary-foreground/80' : 'text-primary'}`}>
                  {item.desc}
                </span>
                <span className="text-sm font-extrabold block mt-1">{item.name}</span>
              </div>
              <div className="flex justify-end mt-2">
                {isSelected ? (
                  <div className="w-4 h-4 rounded-full bg-primary-foreground text-primary flex items-center justify-center">
                    <Check className="w-2.5 h-2.5" strokeWidth={3} />
                  </div>
                ) : (
                  <GraduationCap className="w-4 h-4 opacity-30" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </motion.div>
  );

  const renderExamStep = () => (
    <motion.div
      key="exam-step"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="space-y-6 w-full text-left"
    >
      <div className="space-y-2 text-center max-w-md mx-auto">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm">
          <Award className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-display font-extrabold text-foreground">Primary Target Exam</h2>
        <p className="text-muted-foreground text-sm">We'll filter the live lecture schedules and notes for this exam target.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl mx-auto pt-2">
        {examOptions.map((item) => {
          const isSelected = targetExam === item.code;
          return (
            <button
              key={item.code}
              type="button"
              onClick={() => setTargetExam(item.code)}
              className={`p-5 rounded-2xl border text-left flex flex-col justify-between h-28 transition-all duration-200 cursor-pointer ${
                isSelected
                  ? 'bg-primary border-primary text-primary-foreground shadow-md'
                  : 'bg-card border-border text-foreground hover:border-primary/40'
              }`}
            >
              <div>
                <span className={`text-[10px] font-bold block uppercase tracking-wider ${isSelected ? 'text-primary-foreground/80' : 'text-primary'}`}>
                  {item.desc}
                </span>
                <span className="text-sm font-extrabold block mt-1">{item.name}</span>
              </div>
              <div className="flex justify-end mt-2">
                {isSelected ? (
                  <div className="w-5 h-5 rounded-full bg-primary-foreground text-primary flex items-center justify-center">
                    <Check className="w-3 h-3" strokeWidth={3} />
                  </div>
                ) : (
                  <Award className="w-5 h-5 opacity-30" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </motion.div>
  );

  const renderTermsStep = () => (
    <motion.div
      key="terms-step"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="space-y-6 max-w-md mx-auto w-full text-left"
    >
      <div className="space-y-2 text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shadow-sm">
          <FileText className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-display font-extrabold text-foreground">Charter Agreement</h2>
        <p className="text-muted-foreground text-sm">Please review and consent to the legal framework policies.</p>
      </div>

      <div className="space-y-4">
        {/* Privacy Box */}
        <div className={`p-4 rounded-xl border transition-colors ${privacyChecked ? 'border-primary/30 bg-primary/5' : 'border-border'}`}>
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => setPrivacyChecked(!privacyChecked)}
              className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                privacyChecked ? 'bg-primary border-primary text-primary-foreground' : 'border-border hover:border-primary'
              }`}
            >
              {privacyChecked && <Check className="w-3 h-3" strokeWidth={3} />}
            </button>
            <div className="space-y-1.5 leading-tight">
              <label className="text-xs font-bold text-foreground cursor-pointer select-none" onClick={() => setPrivacyChecked(!privacyChecked)}>
                I agree to the academic Privacy Policy.
              </label>
              <div className="flex items-center gap-1.5 text-[10px]">
                <button type="button" onClick={() => setShowPrivacyModal(true)} className="text-primary font-bold hover:underline">
                  Read Policy
                </button>
                <span className="text-muted-foreground">•</span>
                <a href="#/privacy" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground font-semibold">
                  Open tab
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Terms Box */}
        <div className={`p-4 rounded-xl border transition-colors ${termsChecked ? 'border-primary/30 bg-primary/5' : 'border-border'}`}>
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => setTermsChecked(!termsChecked)}
              className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                termsChecked ? 'bg-primary border-primary text-primary-foreground' : 'border-border hover:border-primary'
              }`}
            >
              {termsChecked && <Check className="w-3 h-3" strokeWidth={3} />}
            </button>
            <div className="space-y-1.5 leading-tight">
              <label className="text-xs font-bold text-foreground cursor-pointer select-none" onClick={() => setTermsChecked(!termsChecked)}>
                I accept the platform Terms & Conditions.
              </label>
              <div className="flex items-center gap-1.5 text-[10px]">
                <button type="button" onClick={() => setShowTermsModal(true)} className="text-primary font-bold hover:underline">
                  Read Terms
                </button>
                <span className="text-muted-foreground">•</span>
                <a href="#/terms" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground font-semibold">
                  Open tab
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-background/95 backdrop-blur-md p-4 sm:p-6 md:p-8 flex flex-col justify-center items-center select-none">
      <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-primary/5 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-4xl bg-card border border-border rounded-3xl p-5 sm:p-8 md:p-10 shadow-2xl relative z-10 flex flex-col justify-between min-h-[460px] md:min-h-[500px]">
        {/* Progress header */}
        <div className="space-y-4 mb-4">
          <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest font-mono">
            <span>Student Registration Setup</span>
            <span>Step {currentStepIdx + 1} of {steps.length}</span>
          </div>
          <div className="h-1 w-full bg-muted rounded-full overflow-hidden flex gap-1">
            {steps.map((st, idx) => (
              <div
                key={st.id}
                className={`h-full rounded-full transition-all duration-300 w-full ${
                  idx < currentStepIdx 
                    ? 'bg-primary/55' 
                    : idx === currentStepIdx 
                      ? 'bg-primary shadow-sm shadow-primary/20' 
                      : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Dynamic Content */}
        <div className="flex-grow flex items-center justify-center py-4">
          <AnimatePresence mode="wait">
            {currentStepIdx === 0 && renderPhoneStep()}
            {currentStepIdx === 1 && renderFullNameStep()}
            {currentStepIdx === 2 && renderClassStep()}
            {currentStepIdx === 3 && renderExamStep()}
            {currentStepIdx === 4 && renderTermsStep()}
          </AnimatePresence>
        </div>

        {/* Action buttons */}
        <div className="flex justify-between items-center pt-6 border-t border-border mt-4">
          <button
            type="button"
            onClick={handlePrev}
            className={`px-4 py-2 hover:bg-muted text-foreground font-semibold rounded-xl flex items-center gap-1.5 border border-border cursor-pointer transition-colors ${
              currentStepIdx === 0 ? 'opacity-0 pointer-events-none' : ''
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <button
            type="button"
            onClick={handleNext}
            disabled={isSaving}
            className="px-6 py-2.5 bg-primary hover:bg-primary/95 text-primary-foreground text-sm font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-transform active:scale-95 shadow-md"
          >
            <span>{currentStepIdx === steps.length - 1 ? (isSaving ? 'Registering...' : 'Finish') : 'Continue'}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Policies Modals */}
      <AnimatePresence>
        {showPrivacyModal && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/65 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border w-full max-w-xl h-[70vh] rounded-2xl flex flex-col shadow-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-border flex justify-between items-center bg-muted/20">
                <h3 className="font-bold text-base flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  Privacy Policy
                </h3>
                <button
                  type="button"
                  onClick={() => setShowPrivacyModal(false)}
                  className="p-1 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-grow overflow-y-auto p-5 space-y-4 text-xs text-foreground/80 leading-relaxed">
                {settings?.privacyContent ? (
                  <p className="whitespace-pre-wrap">{settings.privacyContent}</p>
                ) : (
                  <div className="space-y-4">
                    <p className="font-bold text-foreground">Last Updated: June 2026</p>
                    <p>At Nucleus Coaching Classes, we prioritize the protection and confidentiality of student records, telemetry parameters, and coaching profile logs.</p>
                    <p>We log your authentic identity, such as verified email, class segments, exam targets, and single concurrent session tracking telemetry to ensure complete exam-readiness logs.</p>
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-border bg-muted/10 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setPrivacyChecked(true);
                    setShowPrivacyModal(false);
                  }}
                  className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg text-xs hover:bg-primary/95 cursor-pointer"
                >
                  Accept & Close
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showTermsModal && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/65 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border w-full max-w-xl h-[70vh] rounded-2xl flex flex-col shadow-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-border flex justify-between items-center bg-muted/20">
                <h3 className="font-bold text-base flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Terms & Conditions
                </h3>
                <button
                  type="button"
                  onClick={() => setShowTermsModal(false)}
                  className="p-1 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-grow overflow-y-auto p-5 space-y-4 text-xs text-foreground/80 leading-relaxed">
                {settings?.termsContent ? (
                  <p className="whitespace-pre-wrap">{settings.termsContent}</p>
                ) : (
                  <div className="space-y-4">
                    <p className="font-bold text-foreground">Last Updated: June 2026</p>
                    <p>By registering on the Nucleus coaching platform, you explicitly bind your study profiles to these platform regulations.</p>
                    <p>Only one active login credential is permitted per subscription. Users must configure and update their academic target standard during first-time configuration.</p>
                    <p>Coaching notes, sample files, pyqs, videos, and study guides are exclusively licensed for the registered student. Any reproduction or distribution is strictly forbidden.</p>
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-border bg-muted/10 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setTermsChecked(true);
                    setShowTermsModal(false);
                  }}
                  className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg text-xs hover:bg-primary/95 cursor-pointer"
                >
                  Accept & Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
