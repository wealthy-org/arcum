import React, { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { StockInfo } from '../types';
import { SURPLUS_PLACES_MENU, applySurplusPalette, SURPLUS_PALETTES } from '../data/surplusTheme';

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
  const [soundOn, setSoundOn] = useState<boolean>(true);
  const [hoveredPlace, setHoveredPlace] = useState<string | null>(null);

  const handlePlaceHover = (key: string) => {
    setHoveredPlace(key);
    applySurplusPalette(key);
  };

  const handlePlaceLeave = () => {
    setHoveredPlace(null);
    applySurplusPalette('plate');
  };

  const handleSelectPlace = (route: string, tab?: string) => {
    applySurplusPalette(tab || route);
    onNavigate(route, tab);
  };

  return (
    <div className="fixed inset-0 w-screen h-screen bg-transparent text-[var(--surplus-line)] overflow-hidden select-none font-mono transition-colors duration-700 ease-out z-10 pointer-events-none">
      {/* 2. Top Header Chrome */}
      <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 sm:px-10 py-6 pointer-events-auto">
        {/* Flower / Asterisk Brand Mark */}
        <button
          onClick={() => handleSelectPlace('home')}
          className="flex items-center gap-3 text-left group hover:opacity-90 transition-opacity"
          aria-label="Arcum home"
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 32 32"
            fill="currentColor"
            role="img"
            aria-label="Arcum Mark"
            className="text-[var(--surplus-line)] transition-transform duration-500 ease-out group-hover:rotate-45"
          >
            <path d="M16,15.85c-1.34,-1.32 -1.41,-3.9 0,-4.06c1.41,0.16 1.34,2.74 0,4.06zM16.5,16.54c2.16,0.08 4.23,2.22 3.16,3.45c-1.32,0.96 -3.28,-1.28 -3.16,-3.45zM14.67,15.88c-1.83,1.56 -5.11,1.35 -5.16,-0.45c0.36,-1.77 3.63,-1.4 5.16,0.45zM17.55,14.81c0.31,-2.57 3.08,-4.8 4.44,-3.4c1,1.67 -1.87,3.77 -4.44,3.4zM15.55,18.52c1.61,2.25 1.04,6 -1.03,5.87c-2,-0.59 -1.24,-4.3 1.03,-5.87zM14.3,13.32c-2.86,-0.6 -5.08,-3.92 -3.38,-5.31c1.97,-0.95 4.04,2.47 3.38,5.31zM19.65,16.98c2.64,-1.55 6.71,-0.56 6.37,1.71c-0.85,2.14 -4.87,0.95 -6.37,-1.71zM12.11,18.02c-0.94,3.05 -4.76,5.16 -6.1,3.17c-0.86,-2.24 3.07,-4.16 6.1,-3.17zM17.71,11.31c-1.51,-4.15 0.63,-10.41 3.57,-9.78c2.66,1.42 0.27,7.58 -3.57,9.78zM18.13,21.17c3.82,1.87 6.32,7.58 3.75,9.06c-2.88,0.77 -5.13,-5.04 -3.75,-9.06zM10.39,13.38c-3.88,1.23 -9.23,-1.13 -8.34,-3.91c1.56,-2.47 6.81,0.13 8.34,3.91zM22.47,13.97c1.86,-3.43 7.04,-5.19 8.22,-2.58c0.53,2.82 -4.73,4.33 -8.22,2.58zM12.3,22.38c0.99,3.59 -1.46,8.06 -4.02,6.94c-2.24,-1.67 0.42,-6.01 4.02,-6.94z" />
          </svg>
          <span className="font-display font-medium text-lg text-[var(--surplus-line)] tracking-tight">
            Arcum
          </span>
        </button>

        {/* Top Right Actions */}
        <div className="flex items-center gap-3 sm:gap-4">
          {onOpenFaucet && (
            <button
              onClick={onOpenFaucet}
              className="stamp-btn py-1.5 px-3.5 text-xs font-bold text-amber-300 border-amber-400/40"
              title="Claim 1,000 Test USDG"
            >
              Faucet
            </button>
          )}

          {/* RainbowKit Connect Button in Surplus Stamp Style */}
          <ConnectButton.Custom>
            {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
              const connected = mounted && account && chain;
              return (
                <div>
                  {!connected ? (
                    <button
                      onClick={openConnectModal}
                      className="stamp-btn py-1.5 px-4 text-xs font-bold"
                    >
                      CONNECT
                    </button>
                  ) : chain.unsupported ? (
                    <button
                      onClick={openChainModal}
                      className="stamp-btn py-1.5 px-4 text-xs font-bold text-amber-400 border-amber-400"
                    >
                      WRONG NETWORK
                    </button>
                  ) : (
                    <button
                      onClick={openAccountModal}
                      className="stamp-btn py-1.5 px-4 text-xs font-bold"
                    >
                      {account.displayName}
                    </button>
                  )}
                </div>
              );
            }}
          </ConnectButton.Custom>

          <button
            type="button"
            onClick={() => setSoundOn(!soundOn)}
            className="hidden sm:flex items-center gap-2 text-xs text-[var(--surplus-line-80)] hover:text-[var(--surplus-line)] transition-colors pl-2"
            aria-label="Toggle sound"
          >
            <svg width="18" height="12" viewBox="0 0 18 12" aria-hidden="true" className="stroke-current">
              <path d="M1 4 L1 8" strokeWidth="1" opacity={soundOn ? 1 : 0.3} />
              <path d="M5 1.5 L5 10.5" strokeWidth="1" opacity={soundOn ? 1 : 0.3} />
              <path d="M9 3 L9 9" strokeWidth="1" opacity={soundOn ? 1 : 0.3} />
              <path d="M13 1 L13 11" strokeWidth="1" opacity={soundOn ? 1 : 0.3} />
              <path d="M17 3.5 L17 8.5" strokeWidth="1" opacity={soundOn ? 1 : 0.3} />
            </svg>
            <span>{soundOn ? 'Sound on' : 'Sound off'}</span>
          </button>
        </div>
      </header>

      {/* 3. Right Floating Places Navigation (Surplus Architecture with Real-Time Hover Palette & Wavy Underscore) */}
      <nav
        className="oe3DtG_menu absolute top-20 sm:top-24 right-6 sm:right-10 z-20 text-right pointer-events-auto flex flex-col items-end"
        aria-label="Places"
        onPointerLeave={handlePlaceLeave}
      >
        <ul className="space-y-0.5 flex flex-col items-end">
          {SURPLUS_PLACES_MENU.map((item) => {
            const isChosen = hoveredPlace === item.key;
            return (
              <li key={item.key} className="relative">
                <button
                  type="button"
                  data-chosen={isChosen ? 'true' : undefined}
                  onPointerEnter={() => handlePlaceHover(item.key)}
                  onFocus={() => handlePlaceHover(item.key)}
                  onClick={() => handleSelectPlace(item.route, item.tab)}
                  className="oe3DtG_item text-2xl sm:text-3xl lg:text-4xl font-display font-medium text-[var(--surplus-line-80)] hover:text-[var(--surplus-line)] block py-0.5 text-right relative transition-all duration-150"
                >
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>

        {/* Dynamic Descriptive Tooltip / Preview Line */}
        <p
          className="oe3DtG_preview font-mono text-xs text-right max-w-[28ch] text-[var(--surplus-line-80)] min-h-[3.2em] pt-3 transition-opacity duration-200 select-none"
          aria-live="polite"
        >
          {hoveredPlace && SURPLUS_PALETTES[hoveredPlace]
            ? SURPLUS_PALETTES[hoveredPlace].does
            : SURPLUS_PALETTES.plate.does}
        </p>
      </nav>

      {/* 4. Bottom Left: Giant Wordmark & Core Protocol Figures */}
      <section className="absolute bottom-6 sm:bottom-10 left-6 sm:left-10 z-20 max-w-2xl pointer-events-auto space-y-3">
        {/* Giant Arcum Wordmark */}
        <div className="font-display font-medium tracking-tight text-[var(--surplus-line)] text-6xl sm:text-8xl lg:text-9xl leading-none">
          Arcum
        </div>

        {/* Figures Grid (Surplus Style) */}
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

      {/* 5. Bottom Right: Session Clock & Primary Action Stamp */}
      <section className="absolute bottom-6 sm:bottom-10 right-6 sm:right-10 z-20 text-right pointer-events-auto space-y-3">
        <div className="space-y-0.5">
          <div className="text-[11px] text-[var(--surplus-line-62)] uppercase tracking-wider">Market Session</div>
          <div className="font-display font-bold text-3xl sm:text-4xl text-[var(--surplus-line)] tracking-tight">
            16:00 ET
          </div>
          <div className="text-xs text-[var(--surplus-line-62)]">
            Continuous norm funding · Zero Friday expiry
          </div>
        </div>

        <button
          onClick={() => handleSelectPlace('dashboard', 'trade')}
          className="yYMW7q_stamp mt-2 text-xs font-bold"
        >
          TRADE OPTIONS
        </button>
      </section>
    </div>
  );
};
