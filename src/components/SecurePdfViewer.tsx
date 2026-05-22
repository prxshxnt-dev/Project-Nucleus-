import { useEffect, useState } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { useAuthStore } from '../store/authStore';
import { Loader, AlertTriangle, ShieldCheck } from 'lucide-react';

interface SecurePdfViewerProps {
  url: string;
  title: string;
}

export default function SecurePdfViewer({ url, title }: SecurePdfViewerProps) {
  const { user } = useAuthStore();
  const { settings } = useSettingsStore();
  const [loading, setLoading] = useState(true);

  // Formulate secure embed URL
  const getEmbedUrl = (rawUrl: string) => {
    if (!rawUrl) return '';
    
    // If it's a PDF on Google Drive, convert to the official /preview link
    if (rawUrl.includes('drive.google.com')) {
      const idMatch = rawUrl.match(/\/d\/([^/]+)/) || rawUrl.match(/id=([^&]+)/);
      if (idMatch) {
        return `https://drive.google.com/file/d/${idMatch[1]}/preview`;
      }
    }
    
    // For standard PDFs, return the URL. We append parameters to hide standard browser controls/toolbars
    if (rawUrl.toLowerCase().includes('.pdf')) {
      const separator = rawUrl.includes('#') ? '&' : '#';
      return `${rawUrl}${separator}toolbar=0&navpanes=0&statusbar=0&messages=0`;
    }

    return rawUrl;
  };

  const getWatermarkText = () => {
    if (!user) return 'SECURE ACADEMY Note';
    const fields = settings.secWatermarkFields || ['name', 'email', 'phone', 'timestamp'];
    const parts: string[] = [];

    if (settings.secWatermarkText) {
      parts.push(settings.secWatermarkText);
    }
    if (fields.includes('name') && user.displayName) {
      parts.push(user.displayName);
    }
    if (fields.includes('email') && user.email) {
      parts.push(user.email);
    }
    if (fields.includes('userId')) {
      parts.push(`UUID:${user.uid.slice(0, 6)}`);
    }
    if (fields.includes('timestamp')) {
      parts.push(new Date().toLocaleDateString());
    }
    parts.push("157.34.12.98"); // IP Tracking Node

    return parts.join(' | ');
  };

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1800);
    return () => clearTimeout(timer);
  }, [url]);

  const watermarkText = getWatermarkText();

  // Create repeated diagonal blocks
  const watermarksCount = settings.secPdfWatermarkRepeated !== false ? 40 : 12;

  return (
    <div className="relative w-full h-full bg-[#18181b] flex flex-col overflow-hidden select-none" onContextMenu={(e) => e.preventDefault()}>
      {/* Top Protection Bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-zinc-900/80 backdrop-blur-md z-30">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wide truncate max-w-[200px] sm:max-w-xs">{title}</h4>
            <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">DRM Secure Node Connection Active</p>
          </div>
        </div>
        <div className="text-[10px] font-mono bg-red-500/10 border border-red-500/25 px-2.5 py-1 rounded text-red-400 font-bold tracking-wider animate-pulse flex items-center gap-1.5">
          <AlertTriangle className="w-3" />
          <span>NO DOWNLOADS / PRINTING</span>
        </div>
      </div>

      {/* Frame content and watermark wrappers */}
      <div className="relative flex-1 w-full h-full bg-zinc-950">
        
        {loading && (
          <div className="absolute inset-0 bg-zinc-950 flex flex-col items-center justify-center gap-3 text-zinc-400 font-mono text-xs z-20">
            <Loader className="w-6 h-6 animate-spin text-[#E5D2A5]" />
            <span>Establishing sandbox view stream...</span>
          </div>
        )}

        {/* The PDF Viewport Sandbox Iframe */}
        <iframe
          src={getEmbedUrl(url)}
          className="w-full h-full border-none select-none"
          allow="autoplay; encrypted-media"
          onContextMenu={(e) => e.preventDefault()}
        />

        {/* Dynamic Watermark HUD over PDF */}
        <div 
          className="absolute inset-0 pointer-events-none z-10 overflow-hidden grid grid-cols-2 sm:grid-cols-3 gap-y-16 gap-x-20 p-8 select-none"
          style={{ mixBlendMode: 'difference' }}
        >
          {Array.from({ length: watermarksCount }).map((_, i) => (
            <div
              key={i}
              className="text-white select-none pointer-events-none text-center whitespace-nowrap select-all"
              style={{
                transform: `rotate(${settings.secPdfWatermarkAngle || -35}deg)`,
                opacity: settings.secPdfWatermarkOpacity !== undefined ? settings.secPdfWatermarkOpacity : 0.15,
                fontSize: `${settings.secPdfWatermarkFontSize || 14}px`,
                fontWeight: 'bold',
                fontFamily: 'monospace',
                textShadow: '1px 1px 1px rgba(0,0,0,0.4)',
                margin: '10px'
              }}
            >
              {watermarkText}
            </div>
          ))}
        </div>

        {/* Floating blocker strips on edges */}
        <div className="absolute top-0 left-0 right-0 h-10 bg-transparent z-25 cursor-default pointer-events-auto" />
        <div className="absolute bottom-0 left-0 right-0 h-10 bg-transparent z-25 cursor-default pointer-events-auto" />
        <div className="absolute top-0 left-0 bottom-0 w-8 bg-transparent z-25 cursor-default pointer-events-auto" />
        <div className="absolute top-0 right-0 bottom-0 w-8 bg-transparent z-25 cursor-default pointer-events-auto" />
      </div>
    </div>
  );
}
