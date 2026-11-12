import React, { useState } from 'react';
import {
  TrendingUp,
  Layers,
  Shield,
  Lock,
  MoreHorizontal,
  Bot,
  BookOpen,
  FileCode2,
  AlertTriangle,
  X,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { ArcumLogo } from './ArcumLogo';
import {
  getSoundMode,
  toggleSoundMode,
  subscribeSoundMode,
  playCue,
  initAudio,
} from '../utils/audio';

interface MobileBottomNavProps {
  currentRoute: string;
  activeTab: string;
  onNavigate: (route: string, tab?: string) => void;
  positionsCount: number;
  walletConnected: boolean;
  onConnectWallet: () => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  userAddress?: string;
  demoMode?: boolean;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentRoute,
  activeTab,
  onNavigate,
  positionsCount,
  demoMode = false,
}) => {
  const [moreDrawerOpen, setMoreDrawerOpen] = useState<boolean>(false);
  const [soundMode, setSoundState] = useState(getSoundMode());

  React.useEffect(() => {
    return subscribeSoundMode(() => setSoundState(getSoundMode()));
  }, []);

  const handleToggleSound = () => {
    initAudio();
    toggleSoundMode();
    playCue('select');
  };

  const isTabActive = (route: string, tab?: string) => {
    if (route === 'dashboard') {
      return currentRoute === 'dashboard' && activeTab === tab;
    }
    return currentRoute === route;
  };

  const handleAction = (route: string, tab?: string) => {
    initAudio();
    playCue('select');
    setMoreDrawerOpen(false);
    onNavigate(route, tab);
  };

  return (
    <>
      {/* Mobile Floating Bottom Navigation Bar (Surplus PWA Architecture) */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--surplus-ground)]/95 backdrop-blur-xl border-t border-[var(--surplus-line-24)] px-3 py-2 pb-safe shadow-[0_-4px_24px_rgba(0,0,0,0.4)] transition-colors duration-500"
        aria-label="Mobile Navigation"
      >
        <div className="max-w-md mx-auto grid grid-cols-5 items-center gap-1">
          {/* 1. Trade */}
          <button
            onClick={() => handleAction('dashboard', 'trade')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all ${
              isTabActive('dashboard', 'trade')
                ? 'text-[var(--surplus-line)] font-bold'
                : 'text-[var(--surplus-line-62)] hover:text-[var(--surplus-line)]'
            }`}
          >
            <div className={`p-1 rounded-lg ${isTabActive('dashboard', 'trade') ? 'bg-[var(--surplus-line-14)]' : ''}`}>
              <TrendingUp className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-mono tracking-tight mt-0.5">Trade</span>
          </button>

          {/* 2. Positions */}
          <button
            onClick={() => handleAction('dashboard', 'positions')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl relative transition-all ${
              isTabActive('dashboard', 'positions')
                ? 'text-[var(--surplus-line)] font-bold'
                : 'text-[var(--surplus-line-62)] hover:text-[var(--surplus-line)]'
            }`}
          >
            <div className={`p-1 rounded-lg relative ${isTabActive('dashboard', 'positions') ? 'bg-[var(--surplus-line-14)]' : ''}`}>
              <Layers className="w-4 h-4" />
              {positionsCount > 0 && (
                <span className="absolute -top-1 -right-1.5 px-1 py-0.2 rounded-full text-[9px] font-mono font-bold bg-[#e0482c] text-white shadow-sm leading-none">
                  {positionsCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-mono tracking-tight mt-0.5">Positions</span>
          </button>

          {/* 3. Shield */}
          <button
            onClick={() => handleAction('dashboard', 'shield')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all ${
              isTabActive('dashboard', 'shield')
                ? 'text-[var(--surplus-line)] font-bold'
                : 'text-[var(--surplus-line-62)] hover:text-[var(--surplus-line)]'
            }`}
          >
            <div className={`p-1 rounded-lg ${isTabActive('dashboard', 'shield') ? 'bg-[var(--surplus-line-14)]' : ''}`}>
              <Shield className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-mono tracking-tight mt-0.5">Shield</span>
          </button>

          {/* 4. Pool */}
          <button
            onClick={() => handleAction('dashboard', 'pool')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all ${
              isTabActive('dashboard', 'pool')
                ? 'text-[var(--surplus-line)] font-bold'
                : 'text-[var(--surplus-line-62)] hover:text-[var(--surplus-line)]'
            }`}
          >
            <div className={`p-1 rounded-lg ${isTabActive('dashboard', 'pool') ? 'bg-[var(--surplus-line-14)]' : ''}`}>
              <Lock className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-mono tracking-tight mt-0.5">Pool</span>
          </button>

          {/* 5. More */}
          <button
            onClick={() => setMoreDrawerOpen(true)}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all ${
              moreDrawerOpen
                ? 'text-[var(--surplus-line)] font-bold'
                : 'text-[var(--surplus-line-62)] hover:text-[var(--surplus-line)]'
            }`}
          >
            <div className="p-1 rounded-lg">
              <MoreHorizontal className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-mono tracking-tight mt-0.5">More</span>
          </button>
        </div>
      </nav>

      {/* "More" Bottom Sheet Drawer */}
      {moreDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="fixed inset-0"
            onClick={() => setMoreDrawerOpen(false)}
            aria-hidden="true"
          />

          <div className="relative z-10 bg-[var(--surplus-ground)] border-t border-[var(--surplus-line-40)] rounded-t-3xl p-5 pb-8 space-y-5 shadow-2xl animate-in slide-in-from-bottom duration-300 font-mono text-xs text-[var(--surplus-line)] max-h-[85vh] overflow-y-auto">
            {/* Header / Close */}
            <div className="flex items-center justify-between border-b border-[var(--surplus-line-24)] pb-3">
              <div className="flex items-center gap-2">
                <ArcumLogo size={22} />
                <span className="font-display font-medium text-base">Arcum Navigation</span>
              </div>
              <button
                onClick={() => setMoreDrawerOpen(false)}
                className="p-1.5 rounded-lg text-[var(--surplus-line-62)] hover:text-[var(--surplus-line)]"
                aria-label="Close drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Links Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => handleAction('dashboard', 'agents')}
                className="p-3.5 rounded-xl border border-[var(--surplus-line-24)] bg-[var(--surplus-line-08)] hover:border-[var(--surplus-line)] text-left space-y-1 transition-all"
              >
                <div className="flex items-center gap-2 font-bold text-sm">
                  <Bot className="w-4 h-4 text-amber-400" />
                  <span>AI Agents</span>
                </div>
                <div className="text-[10px] text-[var(--surplus-line-62)]">Autonomous Hedgers</div>
              </button>

              <button
                onClick={() => handleAction('docs')}
                className="p-3.5 rounded-xl border border-[var(--surplus-line-24)] bg-[var(--surplus-line-08)] hover:border-[var(--surplus-line)] text-left space-y-1 transition-all"
              >
                <div className="flex items-center gap-2 font-bold text-sm">
                  <BookOpen className="w-4 h-4 text-emerald-400" />
                  <span>Prospectus</span>
                </div>
                <div className="text-[10px] text-[var(--surplus-line-62)]">ODE Closed Math</div>
              </button>

              <button
                onClick={() => handleAction('contracts')}
                className="p-3.5 rounded-xl border border-[var(--surplus-line-24)] bg-[var(--surplus-line-08)] hover:border-[var(--surplus-line)] text-left space-y-1 transition-all"
              >
                <div className="flex items-center gap-2 font-bold text-sm">
                  <FileCode2 className="w-4 h-4 text-cyan-400" />
                  <span>The Register</span>
                </div>
                <div className="text-[10px] text-[var(--surplus-line-62)]">Verified Contracts</div>
              </button>

              <button
                onClick={() => handleAction('exit')}
                className="p-3.5 rounded-xl border border-[var(--surplus-line-24)] bg-[var(--surplus-line-08)] hover:border-[var(--surplus-line)] text-left space-y-1 transition-all"
              >
                <div className="flex items-center gap-2 font-bold text-sm text-rose-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Direct Exit</span>
                </div>
                <div className="text-[10px] text-[var(--surplus-line-62)]">Offline HTML Guide</div>
              </button>
            </div>

            {/* Quick Status Info */}
            <div className="p-3.5 rounded-xl border border-[var(--surplus-line-24)] bg-[var(--surplus-line-08)] flex justify-between items-center text-xs">
              <div>
                <span className="text-[10px] text-[var(--surplus-line-62)] block">Active Network</span>
                <span className="font-bold text-[var(--surplus-line)]">Robinhood Chain 4663</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-emerald-500/40 text-emerald-400 text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>ONLINE</span>
              </div>
            </div>

            {/* Mode & Sound Toggles */}
            <div className="flex items-center justify-between pt-2 border-t border-[var(--surplus-line-24)]">
              <button
                type="button"
                onClick={handleToggleSound}
                className="flex items-center gap-2 text-xs text-[var(--surplus-line-80)] hover:text-[var(--surplus-line)] cursor-pointer"
              >
                {soundMode !== 'off' ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-rose-400" />}
                <span>Sound: {soundMode === 'on' ? 'On' : soundMode === 'music-off' ? 'Music Off' : 'Off'}</span>
              </button>

              <div className="text-[11px] text-[var(--surplus-line-62)]">
                {demoMode ? 'Demo Sandbox' : 'Live On-Chain'}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
