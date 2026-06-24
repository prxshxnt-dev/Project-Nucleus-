import { Link } from 'react-router-dom';
import { useSettingsStore } from '../store/settingsStore';
import { NucleusLogo } from './NucleusLogo';

export default function Footer() {
  const { settings } = useSettingsStore();
  
  return (
    <footer className="border-t border-white/5 bg-[#070709] pt-16 pb-8 px-6 md:px-12 relative overflow-hidden">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-12 relative z-10">
        <div className="max-w-xs">
          <Link to="/" className="flex items-center gap-2 mb-4 group">
            <NucleusLogo className="w-8 h-8 text-black bg-white rounded-full p-0.5" logoColor="black" />
            <span className="font-display font-semibold tracking-tight text-xl text-white">{settings.websiteName}</span>
          </Link>
          <p className="text-sm text-white/50 leading-relaxed">
            {settings.footerDescription}
          </p>
        </div>

        <div className="flex gap-16 md:gap-24 relative z-10">
          {settings.socialSectionShow !== false && (
            <div className="flex flex-col gap-4">
              <h4 className="font-display font-bold text-white text-[17px] tracking-tight mb-2">Social</h4>
              <div className="flex flex-col gap-3">
                {settings.socialInstagramShow !== false && settings.socialInstagramUrl && (
                  <a 
                    href={settings.socialInstagramUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-white/50 hover:text-white transition-all text-base font-medium tracking-wide"
                  >
                    Instagram
                  </a>
                )}
                {settings.socialYoutubeShow !== false && settings.socialYoutubeUrl && (
                  <a 
                    href={settings.socialYoutubeUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-white/50 hover:text-white transition-all text-base font-medium tracking-wide"
                  >
                    YouTube
                  </a>
                )}
                {settings.socialTwitterShow !== false && settings.socialTwitterUrl && (
                  <a 
                    href={settings.socialTwitterUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-white/50 hover:text-white transition-all text-base font-medium tracking-wide"
                  >
                    Twitter
                  </a>
                )}
                {settings.socialTelegramShow !== false && settings.socialTelegramUrl && (
                  <a 
                    href={settings.socialTelegramUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-white/50 hover:text-white transition-all text-base font-medium tracking-wide"
                  >
                    Telegram
                  </a>
                )}

                {settings.socialLinkedinShow !== false && settings.socialLinkedinUrl && (
                  <a 
                    href={settings.socialLinkedinUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-white/50 hover:text-white transition-all text-base font-medium tracking-wide"
                  >
                    LinkedIn
                  </a>
                )}
                {settings.socialFacebookShow !== false && settings.socialFacebookUrl && (
                  <a 
                    href={settings.socialFacebookUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-white/50 hover:text-white transition-all text-base font-medium tracking-wide"
                  >
                    Facebook
                  </a>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-4">
            <h4 className="font-display font-bold text-white text-[17px] tracking-tight mb-2">Company</h4>
            <div className="flex flex-col gap-3">
              <a 
                href="#/terms" 
                className="text-white/50 hover:text-white transition-all text-base font-medium tracking-wide whitespace-nowrap"
              >
                Terms & Conditions
              </a>
              <a 
                href="#/privacy" 
                className="text-white/50 hover:text-white transition-all text-base font-medium tracking-wide whitespace-nowrap"
              >
                Privacy Policy
              </a>
            </div>
          </div>
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
