import React, { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { StockInfo } from '../types';
import { SURPLUS_PLACES_MENU, applySurplusPalette, SURPLUS_PALETTES } from '../data/surplusTheme';
import { ArcumLogo } from '../components/ArcumLogo';
import {
  getSoundMode,
  toggleSoundMode,
  subscribeSoundMode,
  playCue,
  initAudio,
} from '../utils/audio';

interface LandingPageProps {
  onNavigate: (route: string, tab?: string) => void;
  stocks: StockInfo[];
  onSelectStock: (stock: StockInfo) => void;
  onOpenFaucet?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onNavigate,
  stocks: _stocks,
  onSelectStock: _onSelectStock,
  onOpenFaucet,
}) => {
  const [soundMode, setSoundState] = useState(getSoundMode());
  const [hoveredPlace, setHoveredPlace] = useState<string | null>(null);

  React.useEffect(() => {
    return subscribeSoundMode(() => setSoundState(getSoundMode()));
  }, []);

  const handleToggleSound = () => {
    initAudio();
    toggleSoundMode();
    playCue('select');
  };

  const handlePlaceHover = (key: string, idx?: number) => {
    setHoveredPlace(key);
    applySurplusPalette(key);
    playCue('place', idx);
  };

  const handlePlaceLeave = () => {
    setHoveredPlace(null);
    applySurplusPalette('plate');
  };

  const handleSelectPlace = (route: string, tab?: string) => {
    initAudio();
    applySurplusPalette(tab || route);
    playCue('navigate');
    onNavigate(route, tab);
  };

  return (
    <div className="relative w-full min-h-screen text-[var(--surplus-line)] select-none font-mono transition-colors duration-700 ease-out">
      {/* 1. Top Header Chrome */}
      <header className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 sm:px-8 py-4 sm:py-6 bg-gradient-to-b from-[var(--surplus-ground)] via-[var(--surplus-ground)]/90 to-transparent pointer-events-auto">
        {/* Arcum Glass Brand Logo */}
        <button
          onClick={() => handleSelectPlace('home')}
          className="flex items-center gap-2.5 sm:gap-3 text-left group hover:opacity-90 transition-opacity"
          aria-label="Arcum home"
        >
          <ArcumLogo size={32} />
          <span className="font-display font-medium text-base sm:text-lg text-[var(--surplus-line)] tracking-tight">
            Arcum
          </span>
        </button>

        {/* Top Right Actions */}
        <div className="flex items-center gap-2 sm:gap-4">
          {onOpenFaucet && (
            <button
              onClick={onOpenFaucet}
              className="stamp-btn py-1 px-2.5 sm:px-3.5 text-[11px] sm:text-xs font-bold text-amber-300 border-amber-400/40"
              title="Claim 1,000 Test USDG"
            >
              Faucet
            </button>
          )}

          {/* RainbowKit Connect Button */}
          <ConnectButton.Custom>
            {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
              const connected = mounted && account && chain;
              return (
                <div>
                  {!connected ? (
                    <button
                      onClick={openConnectModal}
                      className="stamp-btn py-1 px-3 sm:px-4 text-[11px] sm:text-xs font-bold"
                    >
                      CONNECT
                    </button>
                  ) : chain.unsupported ? (
                    <button
                      onClick={openChainModal}
                      className="stamp-btn py-1 px-3 sm:px-4 text-[11px] sm:text-xs font-bold text-amber-400 border-amber-400"
                    >
                      WRONG NET
                    </button>
                  ) : (
                    <button
                      onClick={openAccountModal}
                      className="stamp-btn py-1 px-3 sm:px-4 text-[11px] sm:text-xs font-bold truncate max-w-[120px] sm:max-w-none"
                    >
                      {account.displayName}
                    </button>
                  )}
                </div>
              );
            }}
          </ConnectButton.Custom>

          {/* Social Media X (@arcumpool) */}
          <a
            href="https://x.com/arcumpool"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-[var(--surplus-line-80)] hover:text-[var(--surplus-line)] transition-colors px-1 cursor-pointer"
            title="Follow @arcumpool on X"
            aria-label="Arcum on X (@arcumpool)"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            <span className="hidden sm:inline text-[11px] font-medium">@arcumpool</span>
          </a>

          <button
            type="button"
            onClick={handleToggleSound}
            className="flex items-center gap-1.5 text-xs text-[var(--surplus-line-80)] hover:text-[var(--surplus-line)] transition-colors pl-1 cursor-pointer"
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
        </div>
      </header>

      {/* ========================================================
          MOBILE VIEWPORT (md:hidden) — NON-OVERLAPPING APP FLOW
          ======================================================== */}
      <div className="md:hidden relative z-20 min-h-screen px-4 pt-20 pb-24 space-y-6 pointer-events-auto">
        {/* Mobile Hero Header */}
        <div className="space-y-1.5 pt-2">
          <h1 className="font-display font-medium tracking-tight text-[var(--surplus-line)] text-5xl leading-none">
            Arcum
          </h1>
          <p className="text-xs text-[var(--surplus-line-80)] font-mono leading-relaxed">
            Everlasting Options Protocol on Robinhood Chain. Continuous norm funding · Zero Friday expiry.
          </p>
        </div>

        {/* Primary Trade Action Button */}
        <button
          onClick={() => handleSelectPlace('dashboard', 'trade')}
          className="yYMW7q_stamp w-full text-xs font-bold py-3.5 shadow-md flex items-center justify-center gap-2"
        >
          <span>TRADE EVERLASTING OPTIONS</span>
          <span>↗</span>
        </button>

        {/* Mobile Places Quick Navigation Grid */}
        <div className="space-y-2">
          <div className="text-[11px] text-[var(--surplus-line-62)] uppercase tracking-wider font-bold">
            Places
          </div>
          <div className="grid grid-cols-2 gap-2">
            {SURPLUS_PLACES_MENU.map((item) => (
              <button
                key={item.key}
                onClick={() => handleSelectPlace(item.route, item.tab)}
                className="p-3 text-left rounded-xl border border-[var(--surplus-line-24)] bg-[var(--surplus-line-08)] hover:border-[var(--surplus-line)] transition-all active:scale-[0.98] flex flex-col justify-between min-h-[72px]"
              >
                <div className="font-display font-medium text-sm text-[var(--surplus-line)]">
                  {item.label}
                </div>
                <div className="text-[10px] text-[var(--surplus-line-62)] line-clamp-2 mt-1 leading-snug">
                  {SURPLUS_PALETTES[item.key]?.does}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Mobile Protocol Metrics Widget */}
        <div className="p-4 rounded-xl border border-[var(--surplus-line-24)] bg-[var(--surplus-line-08)] space-y-3">
          <div className="text-[11px] text-[var(--surplus-line-62)] uppercase tracking-wider font-bold">
            Protocol Baseline
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-[10px] text-[var(--surplus-line-62)]">Network</div>
              <div className="font-bold text-[var(--surplus-line)]">Robinhood 4663</div>
            </div>
            <div>
              <div className="text-[10px] text-[var(--surplus-line-62)]">Equities</div>
              <div className="font-bold text-[var(--surplus-line)]">5 Tokenized</div>
            </div>
            <div>
              <div className="text-[10px] text-[var(--surplus-line-62)]">Settlement</div>
              <div className="font-bold text-[var(--surplus-line)]">USDG (6 dp)</div>
            </div>
            <div>
              <div className="text-[10px] text-[var(--surplus-line-62)]">Pricing</div>
              <div className="font-bold text-[var(--surplus-line)]">Euler ODE</div>
            </div>
          </div>
        </div>

        {/* Mobile Market Session Status Widget */}
        <div className="p-4 rounded-xl border border-[var(--surplus-line-24)] bg-[var(--surplus-line-08)] flex justify-between items-center">
          <div>
            <div className="text-[10px] text-[var(--surplus-line-62)] uppercase">Market Session</div>
            <div className="font-display font-bold text-xl text-[var(--surplus-line)]">16:00 ET</div>
            <div className="text-[10px] text-[var(--surplus-line-62)]">Continuous norm funding</div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-emerald-500/40 text-emerald-400 text-[10px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>ACTIVE</span>
          </div>
        </div>
      </div>

      {/* ========================================================
          DESKTOP VIEWPORT (hidden md:block) — 100% SURPLUS PLATE
          ======================================================== */}
      <div className="hidden md:block">
        {/* Right Floating Places Navigation */}
        <nav
          className="oe3DtG_menu absolute top-16 sm:top-20 right-6 sm:right-10 z-20 text-right pointer-events-auto flex flex-col items-end"
          aria-label="Places"
          onMouseLeave={handlePlaceLeave}
          onPointerLeave={handlePlaceLeave}
        >
          <ul className="space-y-0 flex flex-col items-end">
            {SURPLUS_PLACES_MENU.map((item, idx) => {
              const isChosen = hoveredPlace === item.key;
              return (
                <li key={item.key} className="relative">
                  <button
                    type="button"
                    data-chosen={isChosen ? 'true' : undefined}
                    onMouseEnter={() => handlePlaceHover(item.key, idx)}
                    onPointerEnter={() => handlePlaceHover(item.key, idx)}
                    onFocus={() => handlePlaceHover(item.key, idx)}
                    onClick={() => handleSelectPlace(item.route, item.tab)}
                    className="oe3DtG_item text-xl sm:text-2xl lg:text-3xl font-display font-medium text-[var(--surplus-line-80)] hover:text-[var(--surplus-line)] block py-0.5 text-right relative transition-all duration-150 leading-tight"
                  >
                    {item.label}
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Dynamic Descriptive Tooltip / Preview Line */}
          <p
            className="oe3DtG_preview font-mono text-[11px] sm:text-xs text-right max-w-[26ch] text-[var(--surplus-line-80)] min-h-[2.8em] pt-2 transition-opacity duration-200 select-none leading-snug"
            aria-live="polite"
          >
            {hoveredPlace && SURPLUS_PALETTES[hoveredPlace]
              ? SURPLUS_PALETTES[hoveredPlace].does
              : ''}
          </p>
        </nav>

        {/* Bottom Left: Giant Wordmark & Core Protocol Figures */}
        <section className="absolute bottom-6 sm:bottom-10 left-6 sm:left-10 z-20 max-w-2xl pointer-events-auto space-y-3">
          <div className="font-display font-medium tracking-tight text-[var(--surplus-line)] text-6xl sm:text-8xl lg:text-9xl leading-none">
            Arcum
          </div>

          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 text-xs text-[var(--surplus-line-80)] pt-1">
            <div>
              <dt className="text-[11px] text-[var(--surplus-line-62)] uppercase tracking-wider">Robinhood</dt>
              <dd className="text-sm font-bold text-[var(--surplus-line)]">Chain 4663</dd>
            </div>
            <div>
              <dt className="text-[11px] text-[var(--surplus-line-62)] uppercase tracking-wider">Equities</dt>
              <dd className="text-sm font-bold text-[var(--surplus-line)]">5 Tokenized</dd>
            </div>
            <div>
              <dt className="text-[11px] text-[var(--surplus-line-62)] uppercase tracking-wider">Settlement</dt>
              <dd className="text-sm font-bold text-[var(--surplus-line)]">USDG (6 dp)</dd>
            </div>
            <div>
              <dt className="text-[11px] text-[var(--surplus-line-62)] uppercase tracking-wider">Pricing Math</dt>
              <dd className="text-sm font-bold text-[var(--surplus-line)]">Euler ODE</dd>
            </div>
          </dl>
        </section>

        {/* Bottom Right: Session Clock & Primary Action Stamp */}
        <section className="absolute bottom-5 sm:bottom-8 right-6 sm:right-10 z-20 text-right pointer-events-auto space-y-2">
          <div className="space-y-0.5">
            <div className="text-[11px] text-[var(--surplus-line-62)] uppercase tracking-wider">Market Session</div>
            <div className="font-display font-bold text-2xl sm:text-3xl text-[var(--surplus-line)] tracking-tight">
              16:00 ET
            </div>
            <div className="text-[11px] text-[var(--surplus-line-62)]">
              Continuous norm funding · Zero Friday expiry
            </div>
          </div>

          <button
            onClick={() => handleSelectPlace('dashboard', 'trade')}
            className="yYMW7q_stamp mt-1 text-xs font-bold"
          >
            TRADE OPTIONS
          </button>
        </section>
      </div>
    </div>
  );
};
