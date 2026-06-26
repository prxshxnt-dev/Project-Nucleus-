import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, updateDoc, collection, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import {
  GraduationCap,
  Shield,
  Key,
  FileText,
  Lock,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Check,
  Award,
  AlertCircle,
  Users,
  Copy,
  X
} from 'lucide-react';

interface OnboardingWizardProps {
  onComplete: () => void;
}

const steps = [
  { id: 'welcome', name: 'Welcome' },
  { id: 'standard', name: 'Standard (Optional)' },
  { id: 'guidelines', name: 'Guidelines' },
  { id: 'agreements', name: 'Agreements' },
];

const standards = [
  { name: '6th Grade', code: '6', focus: 'Olympiad Foundation' },
  { name: '7th Grade', code: '7', focus: 'Pre-foundation Science' },
  { name: '8th Grade', code: '8', focus: 'NTSE Talent Search' },
  { name: '9th Grade', code: '9', focus: 'NSEJS Olympiad' },
  { name: '10th Grade', code: '10', focus: 'Boards & NTSE II' },
  { name: '11th Grade', code: '11', focus: 'JEE & NEET Prep' },
  { name: '12th Grade', code: '12', focus: 'JEE & NEET Boards' },
  { name: 'Droppers', code: 'dropper', focus: 'Exclusively Rankers' }
];

export default function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { user, setUser } = useAuthStore();
  const { settings } = useSettingsStore();

  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [selectedStandard, setSelectedStandard] = useState<string | null>(user?.classGroup || null);
  const [isSaving, setIsSaving] = useState(false);

  // Checkboxes for final agreements
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [termsChecked, setTermsChecked] = useState(false);

  // Modal display states for Privacy and Terms contents
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const nextStep = () => {
    if (currentStepIdx < steps.length - 1) {
      setCurrentStepIdx(currentStepIdx + 1);
    }
  };

  const prevStep = () => {
    if (currentStepIdx > 0) {
      setCurrentStepIdx(currentStepIdx - 1);
    }
  };

  const handleFinishSetup = async () => {
    if (!user) return;
    if (!privacyChecked || !termsChecked) return;

    setIsSaving(true);
    const acceptedAtTimestamp = new Date().toISOString();

    try {
      const userRef = doc(db, 'users', user.uid);
      const updatedFields: any = {
        onboardingCompleted: true,
        privacyAccepted: true,
        termsAccepted: true,
        acceptedAt: acceptedAtTimestamp,
        updatedAt: acceptedAtTimestamp,
      };

      if (selectedStandard) {
        updatedFields.classGroup = selectedStandard;
      }

      // Update User Profile document
      await updateDoc(userRef, updatedFields);

      // Create history log ID compliant with isValidId check (alphanumeric and dashes/underscores)
      const historyId = `consent-${user.uid}-${Date.now()}`;
      const historyRef = doc(db, 'agreement_history', historyId);

      await setDoc(historyRef, {
        userId: user.uid,
        email: user.email,
        displayName: user.displayName || 'No Name',
        termsAccepted: true,
        privacyAccepted: true,
        acceptedAt: acceptedAtTimestamp,
        version: settings?.requiredTermsVersion || '1.0',
      });

      // Update Auth Store
      setUser({
        ...user,
        onboardingCompleted: true,
        privacyAccepted: true,
        termsAccepted: true,
        acceptedAt: acceptedAtTimestamp,
        classGroup: selectedStandard || user.classGroup,
      });

      onComplete();
    } catch (err) {
      console.error('Onboarding execution failure:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const renderWelcome = () => (
    <motion.div
      key="welcome-step"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6 text-center max-w-xl mx-auto"
    >
      <div className="w-20 h-20 mx-auto rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-4xl shadow-inner shadow-primary/5">
        👋
      </div>
      <div className="space-y-3">
        <h1 className="text-3xl md:text-5xl font-display font-extrabold tracking-tight text-foreground bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground/90 to-primary">
          Welcome to Nucleus Coaching Classes
        </h1>
        <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
          We're excited to have you here. Let's quickly set up your account for the best experience.
        </p>
      </div>

      <div className="pt-6">
        <button
          onClick={nextStep}
          className="px-8 py-4 bg-primary hover:bg-primary/95 text-primary-foreground font-bold rounded-2xl flex items-center justify-center gap-2 mx-auto shadow-lg hover:shadow-primary/20 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
        >
          <span>Continue</span>
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </motion.div>
  );

  const renderStandard = () => (
    <motion.div
      key="standard-step"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6 max-w-3xl mx-auto"
    >
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary font-mono uppercase tracking-wider">
          <GraduationCap className="w-3.5 h-3.5" />
          <span>Academic Stage</span>
        </div>
        <h2 className="text-2xl md:text-4xl font-display font-extrabold text-foreground">
          What is your target standard?
        </h2>
        <p className="text-muted-foreground text-xs md:text-sm">
          Select your class to help us tailor your educational study feeds. You can skip this step and set it later.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4">
        {standards.map((st) => {
          const isSelected = selectedStandard === st.code;
          return (
            <button
              key={st.code}
              onClick={() => setSelectedStandard(st.code)}
              className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between h-28 relative overflow-hidden group ${
                isSelected
                  ? 'bg-primary border-primary text-primary-foreground shadow-md shadow-primary/20'
                  : 'bg-card hover:bg-card/80 border-border text-foreground hover:border-primary/40'
              }`}
            >
              <div className="space-y-1 z-10">
                <span className={`text-xs font-mono tracking-wider font-semibold opacity-75 ${isSelected ? 'text-primary-foreground' : 'text-primary'}`}>
                  {st.focus}
                </span>
                <span className="text-sm font-extrabold block">{st.name}</span>
              </div>
              <div className="z-10 flex justify-end">
                {isSelected ? (
                  <div className="w-5 h-5 rounded-full bg-primary-foreground text-primary flex items-center justify-center text-xs font-bold shadow-sm animate-scaleIn">
                    <Check className="w-3 h-3" strokeWidth={3} />
                  </div>
                ) : (
                  <GraduationCap className="w-5 h-5 opacity-20 group-hover:opacity-45 transition-opacity" />
                )}
              </div>
              {isSelected && (
                <div className="absolute -right-2 -bottom-2 w-12 h-12 bg-white/5 rounded-full blur-xl pointer-events-none" />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex justify-between items-center pt-8 border-t border-border">
        <button
          onClick={prevStep}
          className="px-5 py-3 hover:bg-muted text-foreground font-semibold rounded-xl flex items-center gap-2 border border-border cursor-pointer transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <button
          onClick={nextStep}
          className="px-6 py-3 bg-primary hover:bg-primary/95 text-primary-foreground font-bold rounded-xl flex items-center gap-2 cursor-pointer transition-all shadow-md"
        >
          <span>{selectedStandard ? 'Continue' : 'Skip Optional'}</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );

  const renderGuidelines = () => (
    <motion.div
      key="guidelines-step"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6 max-w-3xl mx-auto"
    >
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-500 font-mono uppercase tracking-wider">
          <Shield className="w-3.5 h-3.5" />
          <span>Nucleus Shield</span>
        </div>
        <h2 className="text-2xl md:text-4xl font-display font-extrabold text-foreground">
          Important Charter & Guidelines
        </h2>
        <p className="text-muted-foreground text-xs md:text-sm">
          Please review the foundational pillars of our secure academic ecosystem before entering.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 pt-4">
        {/* Community Guidelines */}
        <div className="p-4 rounded-2xl bg-card border border-border space-y-2 relative overflow-hidden md:col-span-2">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm">Community Guidelines</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Foster dynamic learning by engaging constructively and respectfully with peers and educators. Zero tolerance for harassment.
          </p>
        </div>

        {/* Privacy Protection */}
        <div className="p-4 rounded-2xl bg-card border border-border space-y-2 relative overflow-hidden md:col-span-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <Shield className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm">Privacy Protection</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Your telemetry and enrollment information are fully sealed with modern encryption. We never sell your personal metrics.
          </p>
        </div>

        {/* Account Security */}
        <div className="p-4 rounded-2xl bg-card border border-border space-y-2 relative overflow-hidden md:col-span-3">
          <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm">Account Security</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Strict single concurrent device policy is enforced. Unauthorized session sharing will trigger automatic profile freezes.
          </p>
        </div>

        {/* Fair Usage Policy */}
        <div className="p-4 rounded-2xl bg-card border border-border space-y-2 relative overflow-hidden md:col-span-2">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <AlertCircle className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm">Fair Usage Policy</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Reasonable materials extraction rules apply. High-frequency scripted crawling is blocked.
          </p>
        </div>

        {/* Copyright Notice */}
        <div className="p-4 rounded-2xl bg-card border border-border space-y-2 relative overflow-hidden md:col-span-5">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
            <Copy className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm">Copyright & DRM Notice</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            All coaching notes, materials, test sets, and lectures are proprietary digital assets of Nucleus Coaching Classes. Reproducing, distributing, or recording class feeds without authorization violates intellectual property laws.
          </p>
        </div>
      </div>

      <div className="flex justify-between items-center pt-8 border-t border-border">
        <button
          onClick={prevStep}
          className="px-5 py-3 hover:bg-muted text-foreground font-semibold rounded-xl flex items-center gap-2 border border-border cursor-pointer transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <button
          onClick={nextStep}
          className="px-6 py-3 bg-primary hover:bg-primary/95 text-primary-foreground font-bold rounded-xl flex items-center gap-2 cursor-pointer transition-all shadow-md"
        >
          <span>Accept & Continue</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );

  const renderAgreements = () => {
    const isNextDisabled = !privacyChecked || !termsChecked || isSaving;

    return (
      <motion.div
        key="agreements-step"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="space-y-6 max-w-xl mx-auto"
      >
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-xs font-bold text-rose-500 font-mono uppercase tracking-wider">
            <FileText className="w-3.5 h-3.5" />
            <span>Consent Charter</span>
          </div>
          <h2 className="text-2xl md:text-4xl font-display font-extrabold text-foreground">
            Sign Consent & Agreements
          </h2>
          <p className="text-muted-foreground text-xs md:text-sm">
            To proceed, you must read and acknowledge both legal agreements.
          </p>
        </div>

        <div className="space-y-4 pt-4">
          {/* Privacy Box */}
          <div
            className={`p-5 rounded-2xl border transition-all duration-200 bg-card ${
              privacyChecked ? 'border-primary/50 bg-primary/5' : 'border-border'
            }`}
          >
            <div className="flex items-start gap-4">
              <button
                type="button"
                onClick={() => setPrivacyChecked(!privacyChecked)}
                className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                  privacyChecked ? 'bg-primary border-primary text-primary-foreground' : 'border-border hover:border-primary'
                }`}
              >
                {privacyChecked && <Check className="w-4 h-4" strokeWidth={3} />}
              </button>
              <div className="space-y-1 leading-tight">
                <label className="text-sm font-bold text-foreground cursor-pointer select-none" onClick={() => setPrivacyChecked(!privacyChecked)}>
                  I have read and agree to the Privacy Policy.
                </label>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setShowPrivacyModal(true)}
                    className="text-xs text-primary font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>View Privacy Policy</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                  <span className="text-muted-foreground text-xs">•</span>
                  <a
                    href="#/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-foreground font-semibold flex items-center gap-0.5"
                  >
                    <span>Open in new tab</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Terms Box */}
          <div
            className={`p-5 rounded-2xl border transition-all duration-200 bg-card ${
              termsChecked ? 'border-primary/50 bg-primary/5' : 'border-border'
            }`}
          >
            <div className="flex items-start gap-4">
              <button
                type="button"
                onClick={() => setTermsChecked(!termsChecked)}
                className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                  termsChecked ? 'bg-primary border-primary text-primary-foreground' : 'border-border hover:border-primary'
                }`}
              >
                {termsChecked && <Check className="w-4 h-4" strokeWidth={3} />}
              </button>
              <div className="space-y-1 leading-tight">
                <label className="text-sm font-bold text-foreground cursor-pointer select-none" onClick={() => setTermsChecked(!termsChecked)}>
                  I have read and agree to the Terms & Conditions.
                </label>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setShowTermsModal(true)}
                    className="text-xs text-primary font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>View Terms & Conditions</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                  <span className="text-muted-foreground text-xs">•</span>
                  <a
                    href="#/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-foreground font-semibold flex items-center gap-0.5"
                  >
                    <span>Open in new tab</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center pt-8 border-t border-border">
          <button
            onClick={prevStep}
            className="px-5 py-3 hover:bg-muted text-foreground font-semibold rounded-xl flex items-center gap-2 border border-border cursor-pointer transition-all"
            disabled={isSaving}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <button
            onClick={handleFinishSetup}
            disabled={isNextDisabled}
            className={`px-8 py-4 bg-primary text-primary-foreground font-bold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer ${
              isNextDisabled
                ? 'opacity-50 cursor-not-allowed shadow-none'
                : 'hover:bg-primary/95 hover:shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]'
            }`}
          >
            <span>{isSaving ? 'Finalizing Setup...' : 'Finish Setup'}</span>
            {!isSaving && <Check className="w-5 h-5" strokeWidth={3} />}
          </button>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col justify-center items-center bg-background/95 backdrop-blur-md p-4 select-none">
      {/* Dynamic Background Glowing Accents */}
      <div className="absolute top-1/4 left-1/4 w-[350px] h-[350px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-primary/5 blur-[140px] rounded-full pointer-events-none" />

      <div className="w-full max-w-4xl bg-card border border-border rounded-3xl p-6 md:p-10 shadow-2xl relative z-10 flex flex-col justify-between min-h-[480px]">
        {/* Step Indicator Progress Bar */}
        <div className="space-y-4 mb-8">
          <div className="flex justify-between items-center text-xs font-semibold text-muted-foreground uppercase tracking-widest font-mono">
            <span>Nucleus Onboarding Wizard</span>
            <span>Step {currentStepIdx + 1} of {steps.length}</span>
          </div>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden flex gap-1 p-0.5">
            {steps.map((st, idx) => {
              const isPast = idx < currentStepIdx;
              const isCurrent = idx === currentStepIdx;
              return (
                <div
                  key={st.id}
                  className={`h-full rounded-full transition-all duration-300 ${
                    isPast ? 'bg-primary/60 w-full' : isCurrent ? 'bg-primary w-full' : 'bg-muted w-full'
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* Dynamic Content Frame with AnimatePresence */}
        <div className="flex-grow flex items-center justify-center py-4">
          <AnimatePresence mode="wait">
            {currentStepIdx === 0 && renderWelcome()}
            {currentStepIdx === 1 && renderStandard()}
            {currentStepIdx === 2 && renderGuidelines()}
            {currentStepIdx === 3 && renderAgreements()}
          </AnimatePresence>
        </div>
      </div>

      {/* POLICY VIEWING MODAL COMPONENT */}
      <AnimatePresence>
        {showPrivacyModal && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border w-full max-w-2xl h-[80vh] rounded-3xl flex flex-col shadow-2xl overflow-hidden"
            >
              <div className="p-5 border-b border-border flex justify-between items-center bg-muted/30">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  Privacy Policy
                </h3>
                <button
                  onClick={() => setShowPrivacyModal(false)}
                  className="p-1.5 hover:bg-muted rounded-xl transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-grow overflow-y-auto p-6 space-y-4 font-sans text-sm text-foreground/80 leading-relaxed scrollbar-thin">
                {settings?.privacyContent ? (
                  <div className="prose dark:prose-invert max-w-none">
                    <p className="whitespace-pre-wrap">{settings.privacyContent}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="font-semibold text-foreground">Last Updated: June 2026</p>
                    <p>At Nucleus Coaching Classes, we prioritize the protection and confidentiality of student records, telemetry parameters, and coaching profile logs.</p>
                    <h4 className="font-bold text-foreground">1. Data we Collect</h4>
                    <p>We log your authentic identity, such as verified emails, standard selected segments, exam targets, and single concurrent session tracking telemetry to ensure complete exam-readiness logs.</p>
                    <h4 className="font-bold text-foreground">2. Security Auditing</h4>
                    <p>To enforce digital rights management (DRM), we evaluate shortcut bindings for unauthorized copy-paste operations, screenshots, and active parallel browser configurations.</p>
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-border bg-muted/10 flex justify-end">
                <button
                  onClick={() => {
                    setPrivacyChecked(true);
                    setShowPrivacyModal(false);
                  }}
                  className="px-5 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl text-xs hover:bg-primary/95 cursor-pointer"
                >
                  Accept & Close
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showTermsModal && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border w-full max-w-2xl h-[80vh] rounded-3xl flex flex-col shadow-2xl overflow-hidden"
            >
              <div className="p-5 border-b border-border flex justify-between items-center bg-muted/30">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Terms & Conditions
                </h3>
                <button
                  onClick={() => setShowTermsModal(false)}
                  className="p-1.5 hover:bg-muted rounded-xl transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-grow overflow-y-auto p-6 space-y-4 font-sans text-sm text-foreground/80 leading-relaxed scrollbar-thin">
                {settings?.termsContent ? (
                  <div className="prose dark:prose-invert max-w-none">
                    <p className="whitespace-pre-wrap">{settings.termsContent}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="font-semibold text-foreground">Last Updated: June 2026</p>
                    <p>By registering on the Nucleus coaching platform, you explicitly bind your study profiles to these platform regulations.</p>
                    <h4 className="font-bold text-foreground">1. User Account Rules</h4>
                    <p>Only one active login credential is permitted per subscription. Users must configure and update their academic target standard during first-time configuration.</p>
                    <h4 className="font-bold text-foreground">2. Content Licensing</h4>
                    <p>Coaching notes, sample files, pyqs, videos, and study guides are exclusively licensed for the registered student. Any reproduction, distribution, resale, or publishing of proprietary coaching materials is strictly forbidden.</p>
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-border bg-muted/10 flex justify-end">
                <button
                  onClick={() => {
                    setTermsChecked(true);
                    setShowTermsModal(false);
                  }}
                  className="px-5 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl text-xs hover:bg-primary/95 cursor-pointer"
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
