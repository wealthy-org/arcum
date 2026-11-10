import React, { useState, useEffect } from 'react';
import { Download, X, Sparkles, Check } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PwaInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);

  useEffect(() => {
    // Check if already in standalone PWA mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Check localStorage dismissal
    const dismissed = localStorage.getItem('arcum_pwa_dismissed');
    if (dismissed && Date.now() - parseInt(dismissed) < 86400000 * 7) {
      setIsDismissed(true);
    }

    // Capture beforeinstallprompt event
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      // Fallback instructions for iOS Safari users
      alert('To install Arcum on iOS: Tap the Share button in Safari, then select "Add to Home Screen".');
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('arcum_pwa_dismissed', Date.now().toString());
  };

  if (isInstalled || isDismissed) {
    return null;
  }

  return (
    <div className="lg:hidden mx-4 mt-3 p-3 rounded-2xl bg-gradient-to-r from-arcum-card/90 via-arcum-surface/90 to-arcum-card/90 border border-arcum-cyan/30 backdrop-blur-md shadow-lg flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-arcum-cyan to-arcum-cobalt p-[1px] shrink-0 shadow-[0_0_12px_rgba(25,230,255,0.3)]">
          <div className="w-full h-full bg-arcum-bg rounded-[11px] flex items-center justify-center font-display font-black text-arcum-cyan text-sm">
            A
          </div>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-display font-bold text-white text-xs tracking-tight">Arcum Web App</span>
            <span className="text-[9px] font-mono text-arcum-cyan px-1.5 py-0.2 rounded bg-arcum-cyan/15 font-semibold">PWA</span>
          </div>
          <p className="text-[10px] text-arcum-muted truncate font-sans">
            Add to Home Screen for fast mobile trading
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleInstallClick}
          className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-arcum-cyan to-arcum-cobalt text-white font-bold text-xs tracking-wide shadow-sm flex items-center gap-1 active:scale-95 transition-all drop-shadow-sm"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install</span>
        </button>
        <button
          onClick={handleDismiss}
          className="p-1 rounded-md text-arcum-muted hover:text-white transition-colors"
          aria-label="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
