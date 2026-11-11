import React, { useState } from 'react';
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
  demoMode = false,
  onToggleDemoMode,
  onOpenFaucet,
}) => {
  const [soundOn, setSoundOn] = useState<boolean>(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const { isConnected } = useAccount();

  const places = [
    { label: 'Trade', route: 'dashboard', tab: 'trade' },
    { label: 'Positions', route: 'dashboard', tab: 'positions' },
    { label: 'Shield', route: 'dashboard', tab: 'shield' },
    { label: 'Pool', route: 'dashboard', tab: 'pool' },
    { label: 'Agents', route: 'dashboard', tab: 'agents' },
    { label: 'Docs', route: 'docs' },
    { label: 'Contracts', route: 'contracts' },
  ];

  const getBreadcrumb = () => {
    if (currentRoute === 'dashboard') {
      const match = places.find((p) => p.tab === activeTab);
      return match ? match.label : 'Trade';
    }
    if (currentRoute === 'docs') return 'Docs';
    if (currentRoute === 'contracts') return 'Contracts';
    if (currentRoute === 'products') return 'Markets';
    if (currentRoute === 'learn') return 'Learn';
    if (currentRoute === 'exit') return 'Emergency Exit';
    return '';
  };

  const isCurrentActive = (item: (typeof places)[0]) => {
    if (item.route === 'dashboard') {
      return currentRoute === 'dashboard' && activeTab === item.tab;
    }
    return currentRoute === item.route;
  };

  return (
    <header className="a1ciZa_chrome font-mono text-xs select-none">
      {/* Left: Brand & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2.5 hover:opacity-90 transition-opacity"
          aria-label="Arcum plate home"
        >
          {/* Flower / Asterisk Mark */}
          <svg
            width="24"
            height="24"
            viewBox="0 0 32 32"
            fill="currentColor"
            role="img"
            aria-label="Arcum Mark"
            className="text-[var(--surplus-line)]"
          >
            <path d="M16,15.85c-1.34,-1.32 -1.41,-3.9 0,-4.06c1.41,0.16 1.34,2.74 0,4.06zM16.5,16.54c2.16,0.08 4.23,2.22 3.16,3.45c-1.32,0.96 -3.28,-1.28 -3.16,-3.45zM14.67,15.88c-1.83,1.56 -5.11,1.35 -5.16,-0.45c0.36,-1.77 3.63,-1.4 5.16,0.45zM17.55,14.81c0.31,-2.57 3.08,-4.8 4.44,-3.4c1,1.67 -1.87,3.77 -4.44,3.4zM15.55,18.52c1.61,2.25 1.04,6 -1.03,5.87c-2,-0.59 -1.24,-4.3 1.03,-5.87zM14.3,13.32c-2.86,-0.6 -5.08,-3.92 -3.38,-5.31c1.97,-0.95 4.04,2.47 3.38,5.31zM19.65,16.98c2.64,-1.55 6.71,-0.56 6.37,1.71c-0.85,2.14 -4.87,0.95 -6.37,-1.71zM12.11,18.02c-0.94,3.05 -4.76,5.16 -6.1,3.17c-0.86,-2.24 3.07,-4.16 6.1,-3.17zM17.71,11.31c-1.51,-4.15 0.63,-10.41 3.57,-9.78c2.66,1.42 0.27,7.58 -3.57,9.78zM18.13,21.17c3.82,1.87 6.32,7.58 3.75,9.06c-2.88,0.77 -5.13,-5.04 -3.75,-9.06zM10.39,13.38c-3.88,1.23 -9.23,-1.13 -8.34,-3.91c1.56,-2.47 6.81,0.13 8.34,3.91zM22.47,13.97c1.86,-3.43 7.04,-5.19 8.22,-2.58c0.53,2.82 -4.73,4.33 -8.22,2.58zM12.3,22.38c0.99,3.59 -1.46,8.06 -4.02,6.94c-2.24,-1.67 0.42,-6.01 4.02,-6.94z" />
          </svg>
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

      {/* Center: Surplus Places Navigation (Clean Links) */}
      <nav className="hidden md:flex items-center gap-4 lg:gap-6 text-xs" aria-label="Places">
        {places.map((item) => {
          const active = isCurrentActive(item);
          return (
            <button
              key={item.label}
              onClick={() => onNavigate(item.route, item.tab)}
              className={`transition-colors py-1 relative ${
                active
                  ? 'text-[var(--surplus-line)] font-bold after:content-[""] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[1.5px] after:bg-[var(--surplus-line)]'
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
          onClick={() => onNavigate('home')}
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
                    className="yYMW7q_stamp yYMW7q_stampSmall text-[11px] font-bold text-amber-400 border-amber-400"
                  >
                    WRONG NETWORK
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
          <svg width="16" height="11" viewBox="0 0 18 12" aria-hidden="true" className="stroke-current">
            <path d="M1 4 L1 8" strokeWidth="1" opacity={soundOn ? 1 : 0.3} />
            <path d="M5 1.5 L5 10.5" strokeWidth="1" opacity={soundOn ? 1 : 0.3} />
            <path d="M9 3 L9 9" strokeWidth="1" opacity={soundOn ? 1 : 0.3} />
            <path d="M13 1 L13 11" strokeWidth="1" opacity={soundOn ? 1 : 0.3} />
            <path d="M17 3.5 L17 8.5" strokeWidth="1" opacity={soundOn ? 1 : 0.3} />
          </svg>
        </button>

        {/* Mobile Hamburger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden text-xs border border-[var(--surplus-line-40)] px-2.5 py-1 rounded text-[var(--surplus-line)]"
        >
          Places
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-[60px] bg-[var(--surplus-ground)] border-b border-[var(--surplus-line-40)] p-4 space-y-3 shadow-2xl z-50 animate-in slide-in-from-top-2">
          <div className="grid grid-cols-2 gap-2 text-xs">
            {places.map((item) => (
              <button
                key={item.label}
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigate(item.route, item.tab);
                }}
                className={`p-2.5 rounded-lg border text-left ${
                  isCurrentActive(item)
                    ? 'border-[var(--surplus-line)] bg-[var(--surplus-line)] text-[var(--surplus-ground)] font-bold'
                    : 'border-[var(--surplus-line-24)] text-[var(--surplus-line-80)]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
};
