import React, { useState } from 'react';
import { Shield, Wallet, ExternalLink, Menu, X, Sun, Moon, Sparkles, AlertTriangle, Coins } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { SessionKind } from '../types';

interface NavbarProps {
  currentRoute: string;
  activeTab?: string;
  onNavigate: (route: string, tab?: string) => void;
  walletConnected?: boolean;
  onConnectWallet?: () => void;
  session: SessionKind;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  demoMode?: boolean;
  onToggleDemoMode?: () => void;
  onOpenFaucet?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRoute,
  activeTab = 'trade',
  onNavigate,
  session,
  theme = 'light',
  onToggleTheme,
  demoMode = false,
  onToggleDemoMode,
  onOpenFaucet,
}) => {
  const [networkMode, setNetworkMode] = useState<'mainnet' | 'testnet'>('mainnet');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const { isConnected } = useAccount();

  const navLinks = [
    { id: 'trade', label: 'Trade', route: 'dashboard', tab: 'trade' },
    { id: 'markets', label: 'Markets', route: 'products' },
    { id: 'docs', label: 'Docs', route: 'docs' },
    { id: 'contracts', label: 'Contracts', route: 'contracts' },
    { id: 'learn', label: 'Learn', route: 'learn' },
  ];

  const handleLinkClick = (route: string, tab?: string) => {
    setMobileMenuOpen(false);
    onNavigate(route, tab);
  };

  const isLinkActive = (link: typeof navLinks[0]) => {
    if (link.route === 'dashboard') {
      return currentRoute === 'dashboard';
    }
    return currentRoute === link.route;
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.08] bg-arcum-bg/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Brand Group */}
        <div className="flex items-center gap-7">
          <button
            onClick={() => handleLinkClick('home')}
            className="group flex items-center gap-2.5 text-left transition-opacity hover:opacity-90"
            aria-label="Arcum home"
          >
            {/* Asterra-style Rotating Mark */}
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-arcum-cyan via-arcum-cobalt to-arcum-violet p-[1.5px] transition-transform duration-500 ease-out group-hover:rotate-90 shadow-[0_0_16px_rgba(25,230,255,0.4)]">
              <div className="w-full h-full bg-arcum-bg rounded-[6px] flex items-center justify-center font-display font-black text-arcum-cyan text-xs">
                A
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-display font-semibold text-white tracking-tight text-sm">
                Arcum
              </span>
              <span className="text-[10px] font-mono text-arcum-cyan px-1.5 py-0.5 rounded bg-arcum-cyan/10 border border-arcum-cyan/30">
                4663
              </span>
            </div>
          </button>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1.5">
            {navLinks.map((link) => {
              const active = isLinkActive(link);
              return (
                <button
                  key={link.id}
                  onClick={() => handleLinkClick(link.route, link.tab)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    active
                      ? 'text-white bg-white/[0.08] border border-white/10 shadow-sm font-semibold'
                      : 'text-arcum-muted hover:text-white hover:bg-white/[0.04] border border-transparent'
                  }`}
                >
                  {link.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right Status & Actions */}
        <div className="flex items-center gap-3">
          {/* Demo Mode Toggle Badge */}
          {onToggleDemoMode && (
            <button
              onClick={onToggleDemoMode}
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium border transition-all ${
                demoMode
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                  : 'bg-arcum-surface border-arcum-border text-arcum-muted hover:text-arcum-text'
              }`}
              title="Toggle between Live Web3 Wallet and Demo Simulation Mode"
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>{demoMode ? 'Demo Mode ($25k)' : 'Live Mode'}</span>
            </button>
          )}

          {/* Testnet Faucet Button */}
          {onOpenFaucet && (
            <button
              onClick={onOpenFaucet}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium border border-arcum-border bg-arcum-surface hover:bg-arcum-card text-emerald-400 hover:border-emerald-500/40 transition-all shadow-sm active:scale-95"
              title="Claim 1,000 Test USDG"
            >
              <Coins className="w-3 h-3 text-amber-400" />
              <span>Faucet</span>
            </button>
          )}

          {/* Robinhood Chain Status */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-arcum-border bg-arcum-surface/80 text-[11px] font-mono text-arcum-muted shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Robinhood Chain</span>
            <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">4663</span>
          </div>

          {/* Theme Toggle Button (Light / Dark) */}
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className="p-1.5 sm:p-2 rounded-lg border border-arcum-border bg-arcum-surface hover:bg-arcum-card text-arcum-muted hover:text-arcum-text transition-all active:scale-95 shadow-sm"
              title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              aria-label="Toggle theme mode"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400 hover:rotate-45 transition-transform duration-300" />
              ) : (
                <Moon className="w-4 h-4 text-arcum-cyan hover:-rotate-12 transition-transform duration-300" />
              )}
            </button>
          )}

          {/* RainbowKit Real Web3 Connect Button */}
          <ConnectButton.Custom>
            {({
              account,
              chain,
              openAccountModal,
              openChainModal,
              openConnectModal,
              authenticationStatus,
              mounted,
            }) => {
              const ready = mounted && authenticationStatus !== 'loading';
              const connected =
                ready &&
                account &&
                chain &&
                (!authenticationStatus || authenticationStatus === 'authenticated');

              return (
                <div
                  {...(!ready && {
                    'aria-hidden': true,
                    style: {
                      opacity: 0,
                      pointerEvents: 'none',
                      userSelect: 'none',
                    },
                  })}
                >
                  {(() => {
                    if (!connected) {
                      return (
                        <button
                          onClick={openConnectModal}
                          type="button"
                          className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-arcum-cyan to-arcum-cobalt text-white font-bold text-xs hover:opacity-95 transition-all shadow-[0_2px_12px_rgba(2,132,199,0.3)] dark:shadow-[0_0_20px_rgba(25,230,255,0.3)] active:scale-95 drop-shadow-sm"
                        >
                          <Wallet className="w-3.5 h-3.5" />
                          <span>Connect Wallet</span>
                        </button>
                      );
                    }

                    if (chain.unsupported) {
                      return (
                        <button
                          onClick={openChainModal}
                          type="button"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold hover:bg-amber-500/30 transition-all active:scale-95"
                          title="Click to switch to Robinhood Chain (4663)"
                        >
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                          <span>Switch Network</span>
                        </button>
                      );
                    }

                    return (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={openChainModal}
                          type="button"
                          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-arcum-border bg-arcum-surface hover:bg-arcum-card text-xs font-mono text-arcum-text transition-all"
                        >
                          {chain.hasIcon && (
                            <div className="w-3.5 h-3.5 overflow-hidden rounded-full">
                              {chain.iconUrl && (
                                <img
                                  alt={chain.name ?? 'Chain icon'}
                                  src={chain.iconUrl}
                                  className="w-3.5 h-3.5"
                                />
                              )}
                            </div>
                          )}
                          <span>{chain.name}</span>
                        </button>

                        <button
                          onClick={openAccountModal}
                          type="button"
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-semibold hover:bg-emerald-500/20 transition-all active:scale-95 shadow-sm"
                        >
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          <span>{account.displayName}</span>
                          {account.displayBalance ? (
                            <span className="hidden md:inline text-arcum-muted border-l border-emerald-500/30 pl-2">
                              {account.displayBalance}
                            </span>
                          ) : null}
                        </button>
                      </div>
                    );
                  })()}
                </div>
              );
            }}
          </ConnectButton.Custom>

          {/* Mobile Menu Hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg text-arcum-muted hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-arcum-border bg-arcum-bgElevated px-4 py-4 space-y-2 font-mono text-xs shadow-2xl animate-in slide-in-from-top-2">
          {/* Mobile Demo Toggle */}
          {onToggleDemoMode && (
            <div className="flex items-center justify-between p-2 rounded-lg bg-arcum-surface border border-arcum-border mb-2">
              <span className="text-arcum-muted">Trading Environment:</span>
              <div className="flex items-center gap-1.5">
                {onOpenFaucet && (
                  <button
                    onClick={onOpenFaucet}
                    className="flex items-center gap-1 px-2 py-1 rounded-md bg-arcum-card border border-arcum-border text-emerald-400 text-xs font-bold"
                  >
                    <Coins className="w-3 h-3 text-amber-400" />
                    <span>Faucet</span>
                  </button>
                )}
                <button
                  onClick={onToggleDemoMode}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-bold ${
                    demoMode
                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                      : 'bg-arcum-card border-arcum-border text-arcum-text'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>{demoMode ? 'Demo ($25k)' : 'Live Web3'}</span>
                </button>
              </div>
            </div>
          )}

          {onToggleTheme && (
            <div className="flex items-center justify-between p-2 rounded-lg bg-arcum-surface border border-arcum-border mb-3">
              <span className="text-arcum-muted">Appearance Mode:</span>
              <button
                onClick={onToggleTheme}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-arcum-card border border-arcum-border text-arcum-text font-bold"
              >
                {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-arcum-cyan" />}
                <span className="capitalize">{theme}</span>
              </button>
            </div>
          )}
          {navLinks.map((link) => {
            const active = isLinkActive(link);
            return (
              <button
                key={link.id}
                onClick={() => handleLinkClick(link.route, link.tab)}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-center justify-between ${
                  active
                    ? 'bg-arcum-cyan/15 text-arcum-cyan font-bold border border-arcum-cyan/30'
                    : 'text-arcum-muted hover:text-white hover:bg-white/5'
                }`}
              >
                <span>{link.label}</span>
                <span className="text-[10px] text-arcum-muted">{link.route}</span>
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
