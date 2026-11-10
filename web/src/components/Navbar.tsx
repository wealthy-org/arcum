import React, { useState } from 'react';
import { Shield, Wallet, ExternalLink, Menu, X, Sun, Moon } from 'lucide-react';
import { SessionKind } from '../types';

interface NavbarProps {
  currentRoute: string;
  activeTab?: string;
  onNavigate: (route: string, tab?: string) => void;
  walletConnected: boolean;
  onConnectWallet: () => void;
  session: SessionKind;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRoute,
  activeTab = 'trade',
  onNavigate,
  walletConnected,
  onConnectWallet,
  session,
  theme = 'light',
  onToggleTheme,
}) => {
  const [networkMode, setNetworkMode] = useState<'mainnet' | 'testnet'>('mainnet');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

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
          {/* Network Switcher: Testnet / Mainnet */}
          <div className="hidden sm:flex items-center p-0.5 rounded-lg bg-arcum-surface border border-white/[0.08] text-[11px] font-mono">
            <button
              onClick={() => setNetworkMode('testnet')}
              className={`px-2 py-1 rounded-md transition-all ${
                networkMode === 'testnet'
                  ? 'bg-white/10 text-white font-medium'
                  : 'text-arcum-muted hover:text-white'
              }`}
            >
              Testnet
            </button>
            <button
              onClick={() => setNetworkMode('mainnet')}
              className={`px-2 py-1 rounded-md transition-all ${
                networkMode === 'mainnet'
                  ? 'bg-arcum-cyan/20 text-arcum-cyan font-semibold border border-arcum-cyan/30'
                  : 'text-arcum-muted hover:text-white'
              }`}
            >
              Mainnet
            </button>
          </div>

          {/* Robinhood Chain Status */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-arcum-border bg-arcum-surface/80 text-[11px] font-mono text-arcum-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-arcum-cyan animate-pulse" />
            <span>Robinhood Chain</span>
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

          {/* Connect / Wallet Button */}
          <button
            onClick={onConnectWallet}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-arcum-cyan to-arcum-cobalt text-white font-bold text-xs hover:opacity-95 transition-all shadow-[0_2px_12px_rgba(2,132,199,0.3)] dark:shadow-[0_0_20px_rgba(25,230,255,0.3)] active:scale-95 drop-shadow-sm"
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>{walletConnected ? '0x71C8...a49B' : 'Connect'}</span>
          </button>

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
