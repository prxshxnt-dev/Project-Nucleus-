import { Link } from 'react-router-dom';
import { useSettingsStore } from '../store/settingsStore';

export default function Footer() {
  const { settings } = useSettingsStore();
  
  return (
    <footer className="border-t border-white/5 bg-[#070709] pt-16 pb-8 px-6 md:px-12 relative overflow-hidden">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-12 relative z-10">
        <div className="max-w-xs">
          <Link to="/" className="flex items-center gap-2 mb-4 group">
            {settings.logoImage ? (
              <img 
                src={settings.logoImage} 
                alt="Logo" 
                className="h-8 object-contain" 
                style={{ filter: "url(#logo-theme-tint)" }}
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-accent-primary flex items-center justify-center text-button-text font-display font-bold text-lg">
                {settings.logoText || 'N'}
              </div>
            )}
            <span className="font-display font-semibold tracking-tight text-xl text-white">{settings.websiteName}</span>
          </Link>
          <p className="text-sm text-white/50 leading-relaxed">
            {settings.footerDescription}
          </p>
        </div>
        
      </div>
      <div className="max-w-7xl mx-auto border-t border-white/5 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between z-10 relative">
        <p className="text-xs text-white/30">© {new Date().getFullYear()} {settings.websiteName}. All rights reserved.</p>
        <div className="flex items-center gap-4 mt-4 md:mt-0">
          <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
          <span className="text-xs text-white/30 font-mono uppercase tracking-widest">All systems operational</span>
        </div>
      </div>
      
      {/* Background glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-[800px] h-[400px] bg-[#E5D2A5]/5 blur-[120px] rounded-[100%] pointer-events-none"></div>
    </footer>
  );
}
