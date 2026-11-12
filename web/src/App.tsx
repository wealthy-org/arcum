import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { StockTickerBar } from './components/StockTickerBar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { PwaInstallBanner } from './components/PwaInstallBanner';
import { Footer } from './components/Footer';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProductsPage } from './pages/ProductsPage';
import { LearnPage } from './pages/LearnPage';
import { ContractsPage } from './pages/ContractsPage';
import { DocsPage } from './pages/DocsPage';
import { ExitPage } from './pages/ExitPage';
import { TestnetFaucetModal } from './components/TestnetFaucetModal';
import { RegistrarCursor } from './components/RegistrarCursor';
import { GuillocheCanvas } from './components/GuillocheCanvas';
import { applySurplusPalette, getPaletteForContext } from './data/surplusTheme';
import { INITIAL_STOCKS } from './data/protocol';
import { StockInfo, SessionKind } from './types';
import { useAccount } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';

const getInitialRoute = (): { route: string; tab: string } => {
  if (typeof window === 'undefined') return { route: 'home', tab: 'trade' };
  const path = window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
  if (path === 'docs') return { route: 'docs', tab: 'trade' };
  if (path === 'contracts') return { route: 'contracts', tab: 'trade' };
  if (path === 'exit') return { route: 'exit', tab: 'trade' };
  if (path === 'products' || path === 'markets') return { route: 'products', tab: 'trade' };
  if (path === 'learn') return { route: 'learn', tab: 'trade' };
  if (['trade', 'positions', 'shield', 'pool', 'agents', 'activity', 'settings'].includes(path)) {
    return { route: 'dashboard', tab: path };
  }
  if (path === 'dashboard') return { route: 'dashboard', tab: 'trade' };
  return { route: 'home', tab: 'trade' };
};

export function App() {
  const initial = getInitialRoute();
  const [currentRoute, setCurrentRoute] = useState<string>(initial.route);
  const [activeTab, setActiveTab] = useState<string>(initial.tab);
  const [stocks, setStocks] = useState<StockInfo[]>(INITIAL_STOCKS);
  const [selectedStock, setSelectedStock] = useState<StockInfo>(INITIAL_STOCKS[0]);
  const [session, setSession] = useState<SessionKind>('REGULAR');
  const [demoMode, setDemoMode] = useState<boolean>(false);
  const [faucetModalOpen, setFaucetModalOpen] = useState<boolean>(false);

  const { isConnected, address } = useAccount();
  const { openConnectModal } = useConnectModal();

  const effectiveWalletConnected = isConnected || demoMode;
  const effectiveAddress = isConnected ? address : (demoMode ? '0x71C8...Demo' : undefined);

  // Light / Dark Theme State with LocalStorage Persistence (Defaults to Light Mode)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('arcum-theme');
      if (saved === 'dark' || saved === 'light') return saved;
    }
    return 'light'; // Clean, crisp, high-end Light Theme by default
  });

  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      localStorage.setItem('arcum-theme', theme);
    }
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Fetch live market data from backend telemetry (supports relative URL on Vercel or localhost:3002)
  useEffect(() => {
    const fetchLiveStocks = async () => {
      try {
        const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';
        const endpoints = isLocalhost
          ? ['http://localhost:3002/v1/stocks', '/v1/stocks']
          : ['/v1/stocks', 'http://localhost:3002/v1/stocks'];

        for (const ep of endpoints) {
          try {
            const res = await fetch(ep);
            if (res.ok) {
              const data = await res.json();
              if (Array.isArray(data) && data.length > 0) {
                setStocks(data);
                break;
              }
            }
          } catch {
            // try next endpoint
          }
        }
      } catch {
        // Fallback to INITIAL_STOCKS seamlessly if offline
      }
    };

    fetchLiveStocks();
    const interval = setInterval(fetchLiveStocks, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleNavigate = (route: string, tab?: string) => {
    let targetRoute = route;
    let targetTab = tab || 'trade';

    if (route === 'markets') {
      targetTab = 'trade';
      targetRoute = 'dashboard';
    } else if (route === 'writers') {
      targetTab = 'pool';
      targetRoute = 'dashboard';
    } else if (route === 'protocol') {
      targetTab = 'activity';
      targetRoute = 'dashboard';
    } else if (tab) {
      targetTab = tab;
      targetRoute = 'dashboard';
    }

    setCurrentRoute(targetRoute);
    if (tab) setActiveTab(tab);

    // Update browser URL history
    if (typeof window !== 'undefined') {
      let urlPath = `/${targetRoute}`;
      if (targetRoute === 'dashboard') {
        urlPath = `/${targetTab}`;
      } else if (targetRoute === 'home') {
        urlPath = '/';
      }
      if (window.location.pathname !== urlPath) {
        window.history.pushState({}, '', urlPath);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Browser Back/Forward navigation listener
  useEffect(() => {
    const handlePopState = () => {
      const init = getInitialRoute();
      setCurrentRoute(init.route);
      setActiveTab(init.tab);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleSelectStock = (stock: StockInfo) => {
    setSelectedStock(stock);
  };

  const handleConnectWallet = () => {
    if (openConnectModal) {
      openConnectModal();
    } else {
      setDemoMode((prev) => !prev);
    }
  };

  const handleToggleDemoMode = () => {
    setDemoMode((prev) => !prev);
  };

  // Synchronize dynamic Surplus theme palette across all routes and tabs
  useEffect(() => {
    const palette = getPaletteForContext(currentRoute, activeTab);
    applySurplusPalette(palette.id);
  }, [currentRoute, activeTab]);

  return (
    <div className="min-h-screen bg-[var(--surplus-ground)] text-[var(--surplus-line)] flex flex-col font-mono transition-colors duration-700 ease-out relative selection:bg-[var(--surplus-line)] selection:text-[var(--surplus-ground)]">
      {/* Global Harmonic Guilloche Canvas Background */}
      <GuillocheCanvas className="fixed inset-0 w-full h-full pointer-events-none z-0" />

      {/* Surplus Interactive Custom Cursor */}
      <RegistrarCursor />

      {/* Top Navbar & Ticker (Hidden on Home Plate for 100% Immersive Surplus Canvas Experience) */}
      {currentRoute !== 'home' && (
        <>
          <Navbar
            currentRoute={currentRoute}
            activeTab={activeTab}
            onNavigate={handleNavigate}
            walletConnected={effectiveWalletConnected}
            onConnectWallet={handleConnectWallet}
            session={session}
            theme={theme}
            onToggleTheme={handleToggleTheme}
            demoMode={demoMode}
            onToggleDemoMode={handleToggleDemoMode}
            onOpenFaucet={() => setFaucetModalOpen(true)}
          />
        </>
      )}

      {/* PWA Mobile Install Prompt Banner */}
      {currentRoute !== 'home' && <PwaInstallBanner />}

      {/* Main Page Router */}
      <main className="flex-1 pb-20 lg:pb-0 relative z-10">
        <div key={`${currentRoute}-${activeTab}`} className="surplus-page-enter">
          {currentRoute === 'home' && (
            <LandingPage
              onNavigate={handleNavigate}
              stocks={stocks}
              onSelectStock={handleSelectStock}
              onOpenFaucet={() => setFaucetModalOpen(true)}
            />
          )}

          {currentRoute === 'dashboard' && (
            <DashboardPage
              stocks={stocks}
              selectedStock={selectedStock}
              onSelectStock={handleSelectStock}
              walletConnected={effectiveWalletConnected}
              onConnectWallet={handleConnectWallet}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onNavigate={handleNavigate}
              userAddress={effectiveAddress}
              isDemoMode={demoMode}
            />
          )}

          {currentRoute === 'products' && (
            <ProductsPage onNavigate={handleNavigate} />
          )}

          {currentRoute === 'learn' && <LearnPage />}

          {currentRoute === 'docs' && <DocsPage />}

          {currentRoute === 'contracts' && <ContractsPage />}

          {currentRoute === 'exit' && <ExitPage />}

          {/* Fallbacks for legacy/footer routes so <main> is never blank */}
          {currentRoute === 'markets' && (
            <DashboardPage
              stocks={stocks}
              selectedStock={selectedStock}
              onSelectStock={handleSelectStock}
              walletConnected={effectiveWalletConnected}
              onConnectWallet={handleConnectWallet}
              activeTab="trade"
              onTabChange={setActiveTab}
              onNavigate={handleNavigate}
              userAddress={effectiveAddress}
              isDemoMode={demoMode}
            />
          )}
          {currentRoute === 'writers' && (
            <DashboardPage
              stocks={stocks}
              selectedStock={selectedStock}
              onSelectStock={handleSelectStock}
              walletConnected={effectiveWalletConnected}
              onConnectWallet={handleConnectWallet}
              activeTab="pool"
              onTabChange={setActiveTab}
              onNavigate={handleNavigate}
              userAddress={effectiveAddress}
              isDemoMode={demoMode}
            />
          )}
          {currentRoute === 'protocol' && (
            <DashboardPage
              stocks={stocks}
              selectedStock={selectedStock}
              onSelectStock={handleSelectStock}
              walletConnected={effectiveWalletConnected}
              onConnectWallet={handleConnectWallet}
              activeTab="activity"
              onTabChange={setActiveTab}
              onNavigate={handleNavigate}
              userAddress={effectiveAddress}
              isDemoMode={demoMode}
            />
          )}
        </div>
      </main>

      {/* Global Footer (Hidden on Home Plate) */}
      {currentRoute !== 'home' && <Footer onNavigate={handleNavigate} />}

      {/* Testnet USDG Faucet Modal */}
      <TestnetFaucetModal
        isOpen={faucetModalOpen}
        onClose={() => setFaucetModalOpen(false)}
      />

      {/* Mobile Floating Bottom Navigation (PWA Native Feel, Hidden on Home Plate) */}
      {currentRoute !== 'home' && (
        <MobileBottomNav
          currentRoute={currentRoute}
          activeTab={activeTab}
          onNavigate={handleNavigate}
          positionsCount={2}
          walletConnected={effectiveWalletConnected}
          onConnectWallet={handleConnectWallet}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          userAddress={effectiveAddress}
          demoMode={demoMode}
        />
      )}
    </div>
  );
}

export default App;
