import React, { useState } from 'react';
import {
  TrendingUp,
  BarChart2,
  Layers,
  Shield,
  MoreHorizontal,
  BookOpen,
  Code2,
  Lock,
  Sparkles,
  ExternalLink,
  X,
  Wallet,
  Activity,
  Settings,
  Sun,
  Moon,
} from 'lucide-react';
import { CHAIN_CONFIG } from '../data/protocol';

interface MobileBottomNavProps {
  currentRoute: string;
  activeTab: string;
  onNavigate: (route: string, tab?: string) => void;
  positionsCount: number;
  walletConnected: boolean;
  onConnectWallet: () => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentRoute,
  activeTab,
  onNavigate,
  positionsCount,
  walletConnected,
  onConnectWallet,
  theme = 'light',
  onToggleTheme,
}) => {
  const [moreDrawerOpen, setMoreDrawerOpen] = useState<boolean>(false);

  const isTabActive = (route: string, tab?: string) => {
    if (route === 'dashboard') {
      return currentRoute === 'dashboard' && activeTab === tab;
    }
    return currentRoute === route;
  };

  const handleAction = (route: string, tab?: string) => {
    setMoreDrawerOpen(false);
    onNavigate(route, tab);
  };

  return (
    <>
      {/* Mobile Floating Bottom Navigation Bar (PWA Style) */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-arcum-bg/95 backdrop-blur-xl border-t border-white/[0.08] px-2 py-1.5 pb-safe shadow-[0_-8px_32px_rgba(0,0,0,0.6)]"
        aria-label="Mobile Navigation"
      >
        <div className="max-w-md mx-auto grid grid-cols-5 items-center gap-1">
          {/* 1. Trade Tab */}
          <button
            onClick={() => handleAction('dashboard', 'trade')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all ${
              isTabActive('dashboard', 'trade')
                ? 'text-arcum-cyan font-semibold'
                : 'text-arcum-muted hover:text-white'
            }`}
          >
            <div className={`p-1 rounded-lg ${isTabActive('dashboard', 'trade') ? 'bg-arcum-cyan/15' : ''}`}>
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-[10px] tracking-tight mt-0.5">Trade</span>
          </button>

          {/* 2. Markets Tab */}
          <button
            onClick={() => handleAction('products')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all ${
              isTabActive('products')
                ? 'text-arcum-cyan font-semibold'
                : 'text-arcum-muted hover:text-white'
            }`}
          >
            <div className={`p-1 rounded-lg ${isTabActive('products') ? 'bg-arcum-cyan/15' : ''}`}>
              <BarChart2 className="w-5 h-5" />
            </div>
            <span className="text-[10px] tracking-tight mt-0.5">Markets</span>
          </button>

          {/* 3. Positions Tab with live badge */}
          <button
            onClick={() => handleAction('dashboard', 'positions')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl relative transition-all ${
              isTabActive('dashboard', 'positions')
                ? 'text-arcum-cyan font-semibold'
                : 'text-arcum-muted hover:text-white'
            }`}
          >
            <div className={`p-1 rounded-lg relative ${isTabActive('dashboard', 'positions') ? 'bg-arcum-cyan/15' : ''}`}>
              <Layers className="w-5 h-5" />
              {positionsCount > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-arcum-cyan text-white shadow-sm leading-none">
                  {positionsCount}
                </span>
              )}
            </div>
            <span className="text-[10px] tracking-tight mt-0.5">Positions</span>
          </button>

          {/* 4. 1-Click Shield Tab */}
          <button
            onClick={() => handleAction('dashboard', 'shield')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all ${
              isTabActive('dashboard', 'shield')
                ? 'text-arcum-cyan font-semibold'
                : 'text-arcum-muted hover:text-white'
            }`}
          >
            <div className={`p-1 rounded-lg ${isTabActive('dashboard', 'shield') ? 'bg-arcum-cyan/15' : ''}`}>
              <Shield className="w-5 h-5" />
            </div>
            <span className="text-[10px] tracking-tight mt-0.5">Shield</span>
          </button>

          {/* 5. More / Drawer Trigger */}
          <button
            onClick={() => setMoreDrawerOpen(true)}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all ${
              moreDrawerOpen
                ? 'text-arcum-cyan font-semibold'
                : 'text-arcum-muted hover:text-white'
            }`}
          >
            <div className="p-1 rounded-lg">
              <MoreHorizontal className="w-5 h-5" />
            </div>
            <span className="text-[10px] tracking-tight mt-0.5">More</span>
          </button>
        </div>
      </nav>

      {/* Slide-Up Bottom Drawer for "More" Menu */}
      {moreDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full bg-arcum-bgElevated border-t border-white/10 rounded-t-2xl p-5 space-y-5 shadow-2xl max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-250"
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-arcum-cyan/20 border border-arcum-cyan/40 flex items-center justify-center text-arcum-cyan font-bold text-xs">
                  A
                </div>
                <span className="font-display font-bold text-white text-sm">Protocol Menu</span>
                <span className="text-[10px] font-mono text-arcum-cyan px-1.5 py-0.5 rounded bg-arcum-cyan/10 border border-arcum-cyan/30">
                  4663
                </span>
              </div>
              <button
                onClick={() => setMoreDrawerOpen(false)}
                className="p-1.5 rounded-lg text-arcum-muted hover:text-white hover:bg-white/5 transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Wallet & Network Card */}
            <div className="p-3.5 rounded-xl bg-arcum-surface/80 border border-arcum-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-arcum-cyan" />
                <div>
                  <div className="text-xs font-mono font-bold text-arcum-text">
                    {walletConnected ? '0x71C8...a49B' : 'Wallet Disconnected'}
                  </div>
                  <div className="text-[10px] font-mono text-arcum-muted flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-arcum-cyan animate-pulse" />
                    Robinhood Chain (4663)
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {onToggleTheme && (
                  <button
                    onClick={onToggleTheme}
                    className="p-1.5 rounded-lg border border-arcum-border bg-arcum-card text-arcum-text hover:bg-arcum-surface transition-all"
                    title="Toggle Theme"
                  >
                    {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-arcum-cyan" />}
                  </button>
                )}
                <button
                  onClick={onConnectWallet}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-arcum-cyan/20 text-arcum-cyan border border-arcum-cyan/40 active:scale-95 transition-all"
                >
                  {walletConnected ? 'Switch' : 'Connect'}
                </button>
              </div>
            </div>

            {/* Grid of Protocol Destinations */}
            <div className="grid grid-cols-2 gap-2.5 font-mono text-xs">
              <button
                onClick={() => handleAction('dashboard', 'pool')}
                className="p-3 rounded-xl bg-arcum-surface hover:bg-white/5 border border-white/[0.06] text-left space-y-1 transition-all"
              >
                <div className="flex items-center gap-2 text-white font-bold">
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span>Writer Pool</span>
                </div>
                <p className="text-[10px] text-arcum-muted font-sans leading-tight">
                  LP liquidity, 72h queue, and yield
                </p>
              </button>

              <button
                onClick={() => handleAction('dashboard', 'agents')}
                className="p-3 rounded-xl bg-arcum-surface hover:bg-white/5 border border-white/[0.06] text-left space-y-1 transition-all"
              >
                <div className="flex items-center gap-2 text-white font-bold">
                  <Sparkles className="w-4 h-4 text-arcum-cyan" />
                  <span>AI Agents</span>
                </div>
                <p className="text-[10px] text-arcum-muted font-sans leading-tight">
                  MCP tool policy & ERC-4337
                </p>
              </button>

              <button
                onClick={() => handleAction('docs')}
                className="p-3 rounded-xl bg-arcum-surface hover:bg-white/5 border border-white/[0.06] text-left space-y-1 transition-all"
              >
                <div className="flex items-center gap-2 text-white font-bold">
                  <BookOpen className="w-4 h-4 text-sky-400" />
                  <span>Docs Portal</span>
                </div>
                <p className="text-[10px] text-arcum-muted font-sans leading-tight">
                  Architecture & Euler-Cauchy ODE
                </p>
              </button>

              <button
                onClick={() => handleAction('contracts')}
                className="p-3 rounded-xl bg-arcum-surface hover:bg-white/5 border border-white/[0.06] text-left space-y-1 transition-all"
              >
                <div className="flex items-center gap-2 text-white font-bold">
                  <Code2 className="w-4 h-4 text-emerald-400" />
                  <span>Contracts</span>
                </div>
                <p className="text-[10px] text-arcum-muted font-sans leading-tight">
                  Verified Robinhood Chain addresses
                </p>
              </button>

              <button
                onClick={() => handleAction('learn')}
                className="p-3 rounded-xl bg-arcum-surface hover:bg-white/5 border border-white/[0.06] text-left space-y-1 transition-all"
              >
                <div className="flex items-center gap-2 text-white font-bold">
                  <Activity className="w-4 h-4 text-violet-400" />
                  <span>Learn Math</span>
                </div>
                <p className="text-[10px] text-arcum-muted font-sans leading-tight">
                  Interactive pricing simulator
                </p>
              </button>

              <button
                onClick={() => handleAction('dashboard', 'settings')}
                className="p-3 rounded-xl bg-arcum-surface hover:bg-white/5 border border-white/[0.06] text-left space-y-1 transition-all"
              >
                <div className="flex items-center gap-2 text-white font-bold">
                  <Settings className="w-4 h-4 text-arcum-muted" />
                  <span>Settings</span>
                </div>
                <p className="text-[10px] text-arcum-muted font-sans leading-tight">
                  Slippage & RPC configuration
                </p>
              </button>
            </div>

            {/* Emergency Exit Link */}
            <div className="pt-2 border-t border-white/[0.08]">
              <button
                onClick={() => handleAction('exit')}
                className="w-full py-2.5 px-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-xs font-mono flex items-center justify-between hover:bg-red-500/15 transition-all"
              >
                <span>Offline Emergency Exit HTML Tool</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
