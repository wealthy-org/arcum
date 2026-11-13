import React, { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { SessionKind } from '../types';
import { SURPLUS_PLACES_MENU, applySurplusPalette } from '../data/surplusTheme';
import { ArcumLogo } from './ArcumLogo';
import {
  getSoundMode,
  toggleSoundMode,
  subscribeSoundMode,
  playCue,
  initAudio,
} from '../utils/audio';

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
  const [soundMode, setSoundState] = useState(getSoundMode());
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const { isConnected } = useAccount();

  React.useEffect(() => {
    return subscribeSoundMode(() => setSoundState(getSoundMode()));
  }, []);

  const handleToggleSound = () => {
    initAudio();
    toggleSoundMode();
    playCue('select');
  };

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
    initAudio();
    applySurplusPalette(tab || route);
    playCue('navigate');
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

        {/* Social Media X (@arcumpoolxyz) */}
        <a
          href="https://x.com/arcumpoolxyz"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:flex items-center gap-1.5 text-xs text-[var(--surplus-line-80)] hover:text-[var(--surplus-line)] transition-colors px-1 cursor-pointer"
          title="Follow @arcumpoolxyz on X"
          aria-label="Arcum on X (@arcumpoolxyz)"
        >
          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          <span className="hidden xl:inline text-[11px] font-medium">@arcumpoolxyz</span>
        </a>

        {/* Sound Toggle */}
        <button
          type="button"
          onClick={handleToggleSound}
          className="hidden sm:flex items-center gap-1.5 text-xs text-[var(--surplus-line-80)] hover:text-[var(--surplus-line)] transition-colors pl-1 cursor-pointer"
          aria-label={`Sound ${soundMode}. Click to toggle.`}
        >
          <svg width="18" height="12" viewBox="0 0 18 12" aria-hidden="true" className="stroke-current">
            <path d="M1 4 L1 8" strokeWidth="1" opacity={soundMode === 'off' ? 0.25 : 1} />
            <path d="M5 1.5 L5 10.5" strokeWidth="1" opacity={soundMode === 'off' ? 0.25 : soundMode === 'music-off' ? 0.5 : 1} />
            <path d="M9 3 L9 9" strokeWidth="1" opacity={soundMode === 'off' ? 0.25 : 1} />
            <path d="M13 1 L13 11" strokeWidth="1" opacity={soundMode === 'off' ? 0.25 : soundMode === 'music-off' ? 0.5 : 1} />
            <path d="M17 3.5 L17 8.5" strokeWidth="1" opacity={soundMode === 'off' ? 0.25 : 1} />
          </svg>
          <span className="text-[11px] whitespace-nowrap">
            {soundMode === 'on' ? 'Sound on' : soundMode === 'music-off' ? 'Music off' : 'Sound off'}
          </span>
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
          <a
            href="https://x.com/arcumpoolxyz"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between py-2 px-3 text-left rounded font-mono text-sm text-[var(--surplus-line)] hover:bg-[var(--surplus-line-08)] border-t border-[var(--surplus-line-14)] mt-1 pt-2"
          >
            <div className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span>Follow on X</span>
            </div>
            <span className="text-xs text-[var(--surplus-line-62)]">@arcumpoolxyz ↗</span>
          </a>
        </div>
      )}
    </header>
  );
};
