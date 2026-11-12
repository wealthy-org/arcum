import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

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
    <div className="md:hidden mx-4 mt-3 p-3.5 rounded-2xl bg-[var(--surplus-ground)]/95 border border-[var(--surplus-line-40)] text-[var(--surplus-line)] backdrop-blur-xl shadow-xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 font-mono text-xs">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-lg border border-[var(--surplus-line)] bg-[var(--surplus-ground)] flex items-center justify-center font-display font-bold text-sm shrink-0">
          A
        </div>
        <div className="min-w-0">
          <div className="font-display font-medium text-xs tracking-tight text-[var(--surplus-line)] truncate">
            Arcum Web App
          </div>
          <p className="text-[10px] text-[var(--surplus-line-62)] truncate">
            Install to home screen for native PWA trading
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleInstallClick}
          className="yYMW7q_stamp yYMW7q_stampSmall text-[11px] font-bold py-1 px-3"
        >
          <Download className="w-3 h-3 mr-1" />
          <span>INSTALL</span>
        </button>

        <button
          onClick={handleDismiss}
          className="p-1 rounded text-[var(--surplus-line-62)] hover:text-[var(--surplus-line)] transition-colors"
          aria-label="Dismiss install banner"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
