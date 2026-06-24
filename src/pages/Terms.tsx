import React, { useEffect } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import Markdown from 'react-markdown';
import { BookOpen, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';

export default function Terms() {
  const { settings } = useSettingsStore();
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <div id="terms-portal-page" className="min-h-screen py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden bg-[var(--background-custom,#0d0c0e)] text-white">
      {/* Dynamic Blur Accents */}
      <div className="absolute top-1/4 left-1/12 w-[300px] h-[300px] bg-[var(--primary-custom,#4F46E5)]/5 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/12 w-[350px] h-[350px] bg-[var(--primary-custom,#4F46E5)]/5 blur-[140px] rounded-full pointer-events-none"></div>

      <div className="max-w-4xl mx-auto relative z-10">
        <motion.button
          id="terms-back-btn"
          onClick={() => navigate('/')}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2 mb-8 text-sm font-semibold text-white/60 hover:text-white transition-colors cursor-pointer group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </motion.button>

        <motion.div
          id="terms-content-card"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-3xl border border-white/10 p-6 sm:p-12 shadow-2xl bg-black/40 backdrop-blur-xl"
        >
          <div className="flex items-center gap-3 mb-8 border-b border-white/10 pb-6">
            <div className="p-3 bg-[var(--primary-custom,#4F46E5)]/10 rounded-2xl text-[var(--primary-custom,#4F46E5)] border border-[var(--primary-custom,#4F46E5)]/20">
              <BookOpen size={24} />
            </div>
            <div>
              <span className="text-xs uppercase tracking-widest font-mono text-[var(--primary-custom,#4F46E5)] font-bold">Nucleus Legal Charter</span>
              <h1 className="text-2xl font-bold font-display mt-0.5">Terms & Conditions</h1>
            </div>
          </div>

          <div id="terms-markdown-container" className="prose prose-invert max-w-none text-white/85 leading-relaxed selection:bg-[var(--primary-custom,#4F46E5)]/30">
            <div className="markdown-body space-y-4">
              <Markdown>{settings.termsContent}</Markdown>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
