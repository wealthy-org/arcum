import React, { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { SessionKind } from '../types';
import { SURPLUS_PLACES_MENU, applySurplusPalette } from '../data/surplusTheme';
import { ArcumLogo } from './ArcumLogo';

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
  demoMode = false,
  onToggleDemoMode,
  onOpenFaucet,
}) => {
  const [soundOn, setSoundOn] = useState<boolean>(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const { isConnected } = useAccount();

  const getBreadcrumb = () => {
    if (currentRoute === 'dashboard') {
      const match = SURPLUS_PLACES_MENU.find((p) => p.tab === activeTab);
      return match ? match.label : 'Trade';
    }
    if (currentRoute === 'docs') return 'Docs';
    if (currentRoute === 'contracts') return 'Contracts';
    if (currentRoute === 'exit') return 'Emergency Exit';
    return '';
  };

  const isCurrentActive = (item: (typeof SURPLUS_PLACES_MENU)[0]) => {
    if (item.route === 'dashboard') {
      return currentRoute === 'dashboard' && activeTab === item.tab;
    }
    return currentRoute === item.route;
  };

  const handleNavigatePlace = (route: string, tab?: string) => {
    applySurplusPalette(tab || route);
    onNavigate(route, tab);
    setMobileMenuOpen(false);
  };

  return (
    <header className="a1ciZa_chrome font-mono text-xs select-none sticky top-0 z-50 transition-colors duration-700 ease-out">
      {/* Left: Brand & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => handleNavigatePlace('home')}
          className="flex items-center gap-2.5 hover:opacity-90 transition-opacity"
          aria-label="Arcum plate home"
        >
          <ArcumLogo size={26} />
          <span className="font-display font-bold text-sm text-[var(--surplus-line)] tracking-tight">
            Arcum
          </span>
        </button>

        {getBreadcrumb() && (
          <div className="flex items-center gap-1.5 text-xs text-[var(--surplus-line-62)]">
            <span>/</span>
            <span className="text-[var(--surplus-line)] font-medium">{getBreadcrumb()}</span>
          </div>
        )}
      </div>

      {/* Center: Surplus Places Navigation with Wavy Underscore */}
      <nav className="a1ciZa_places hidden md:flex items-center gap-4 lg:gap-6 text-xs" aria-label="Places">
        {SURPLUS_PLACES_MENU.map((item) => {
          const active = isCurrentActive(item);
          return (
            <button
              key={item.label}
              onClick={() => handleNavigatePlace(item.route, item.tab)}
              aria-current={active ? 'page' : undefined}
              className={`a1ciZa_link transition-colors py-1 relative ${
                active
                  ? 'text-[var(--surplus-line)] font-bold'
                  : 'text-[var(--surplus-line-80)] hover:text-[var(--surplus-line)]'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* Up / Back to Home Plate */}
        <button
          onClick={() => handleNavigatePlace('home')}
          className="hidden sm:inline text-xs text-[var(--surplus-line-80)] hover:text-[var(--surplus-line)] border-b border-[var(--surplus-line-40)] pb-0.5 transition-colors"
          title="Return to home plate"
        >
          Up
        </button>

        {/* Demo Toggle */}
        {onToggleDemoMode && (
          <button
            onClick={onToggleDemoMode}
            className="hidden sm:inline text-[11px] text-[var(--surplus-line-62)] hover:text-[var(--surplus-line)] border-b border-[var(--surplus-line-40)] pb-0.5"
            title="Toggle between Live Web3 and Demo Mode"
          >
            {demoMode ? 'Demo Mode ($25k)' : 'Live Mode'}
          </button>
        )}

        {/* Faucet Stamp */}
        {onOpenFaucet && (
          <button
            onClick={onOpenFaucet}
            className="yYMW7q_stamp yYMW7q_stampSmall text-[11px] font-bold"
            title="Claim 1,000 Test USDG"
          >
            FAUCET
          </button>
        )}

        {/* Connect Stamp Button (RainbowKit) */}
        <ConnectButton.Custom>
          {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
            const connected = mounted && account && chain;
            return (
              <div>
                {!connected ? (
                  <button
                    onClick={openConnectModal}
                    className="yYMW7q_stamp yYMW7q_stampSmall text-[11px] font-bold"
                  >
                    CONNECT
                  </button>
                ) : chain.unsupported ? (
                  <button
                    onClick={openChainModal}
                    className="yYMW7q_stamp yYMW7q_stampSmall text-[11px] font-bold text-amber-400"
                  >
                    WRONG CHAIN
                  </button>
                ) : (
                  <button
                    onClick={openAccountModal}
                    className="yYMW7q_stamp yYMW7q_stampSmall text-[11px] font-bold"
                  >
                    {account.displayName}
                  </button>
                )}
              </div>
            );
          }}
        </ConnectButton.Custom>

        {/* Sound Toggle */}
        <button
          type="button"
          onClick={() => setSoundOn(!soundOn)}
          className="hidden sm:flex items-center gap-1.5 text-xs text-[var(--surplus-line-80)] hover:text-[var(--surplus-line)] transition-colors pl-1"
          aria-label="Toggle sound"
        >
          <svg width="18" height="12" viewBox="0 0 18 12" aria-hidden="true" className="stroke-current">
            <path d="M1 4 L1 8" strokeWidth="1" opacity={soundOn ? 1 : 0.3} />
            <path d="M5 1.5 L5 10.5" strokeWidth="1" opacity={soundOn ? 1 : 0.3} />
            <path d="M9 3 L9 9" strokeWidth="1" opacity={soundOn ? 1 : 0.3} />
            <path d="M13 1 L13 11" strokeWidth="1" opacity={soundOn ? 1 : 0.3} />
            <path d="M17 3.5 L17 8.5" strokeWidth="1" opacity={soundOn ? 1 : 0.3} />
          </svg>
          <span className="text-[11px]">{soundOn ? 'on' : 'off'}</span>
        </button>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-[var(--surplus-line)] hover:bg-[var(--surplus-line-08)] rounded"
          aria-label="Toggle Menu"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {mobileMenuOpen ? (
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            ) : (
              <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-[var(--surplus-ground)] border-b border-[var(--surplus-line-24)] p-4 flex flex-col gap-2 z-50">
          {SURPLUS_PLACES_MENU.map((item) => {
            const active = isCurrentActive(item);
            return (
              <button
                key={item.label}
                onClick={() => handleNavigatePlace(item.route, item.tab)}
                className={`py-2 px-3 text-left rounded font-mono text-sm ${
                  active
                    ? 'bg-[var(--surplus-line)] text-[var(--surplus-ground)] font-bold'
                    : 'text-[var(--surplus-line)] hover:bg-[var(--surplus-line-08)]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
