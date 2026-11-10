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
import { INITIAL_STOCKS } from './data/protocol';
import { StockInfo, SessionKind } from './types';

export function App() {
  const [currentRoute, setCurrentRoute] = useState<string>('home');
  const [activeTab, setActiveTab] = useState<string>('trade');
  const [stocks, setStocks] = useState<StockInfo[]>(INITIAL_STOCKS);
  const [selectedStock, setSelectedStock] = useState<StockInfo>(INITIAL_STOCKS[0]);
  const [walletConnected, setWalletConnected] = useState<boolean>(true);
  const [session, setSession] = useState<SessionKind>('REGULAR');

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
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (tab) {
      setActiveTab(tab);
      setCurrentRoute('dashboard');
    } else if (route === 'dashboard') {
      if (!tab) setActiveTab('trade');
      setCurrentRoute('dashboard');
    } else {
      setCurrentRoute(route);
    }
  };

  const handleSelectStock = (stock: StockInfo) => {
    setSelectedStock(stock);
  };

  const handleConnectWallet = () => {
    setWalletConnected(!walletConnected);
  };

  return (
    <div className="min-h-screen bg-arcum-bg text-arcum-text flex flex-col font-sans selection:bg-arcum-cyan/20 selection:text-arcum-cyan">
      {/* Top Navbar */}
      <Navbar
        currentRoute={currentRoute}
        activeTab={activeTab}
        onNavigate={handleNavigate}
        walletConnected={walletConnected}
        onConnectWallet={handleConnectWallet}
        session={session}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Live Underlying Stock Ticker Bar */}
      <StockTickerBar
        stocks={stocks}
        selectedStock={selectedStock}
        onSelectStock={handleSelectStock}
        onNavigate={handleNavigate}
      />

      {/* PWA Mobile Install Prompt Banner */}
      <PwaInstallBanner />

      {/* Main Page Router */}
      <main className="flex-1 pb-20 lg:pb-0">
        {currentRoute === 'home' && (
          <LandingPage
            onNavigate={handleNavigate}
            stocks={stocks}
            onSelectStock={handleSelectStock}
          />
        )}

        {currentRoute === 'dashboard' && (
          <DashboardPage
            stocks={stocks}
            selectedStock={selectedStock}
            onSelectStock={handleSelectStock}
            walletConnected={walletConnected}
            onConnectWallet={handleConnectWallet}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onNavigate={handleNavigate}
          />
        )}

        {currentRoute === 'products' && (
          <ProductsPage onNavigate={handleNavigate} />
        )}

        {currentRoute === 'learn' && <LearnPage />}

        {currentRoute === 'docs' && <DocsPage />}

        {currentRoute === 'contracts' && <ContractsPage />}

        {currentRoute === 'exit' && <ExitPage />}
      </main>

      {/* Global Footer */}
      <Footer onNavigate={handleNavigate} />

      {/* Mobile Floating Bottom Navigation (PWA Native Feel) */}
      <MobileBottomNav
        currentRoute={currentRoute}
        activeTab={activeTab}
        onNavigate={handleNavigate}
        positionsCount={2}
        walletConnected={walletConnected}
        onConnectWallet={handleConnectWallet}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />
    </div>
  );
}

export default App;
