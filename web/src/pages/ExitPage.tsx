import React from 'react';
import { Download, ShieldCheck, Terminal, ExternalLink } from 'lucide-react';
import { CONTRACT_ADDRESSES, CHAIN_CONFIG } from '../data/protocol';

export const ExitPage: React.FC = () => {
  const downloadStandaloneExitGuide = () => {
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Arcum Protocol — Standalone Independent Exit Guide</title>
  <style>
    body { font-family: ui-monospace, SFMono-Regular, monospace; background: #070A14; color: #F8FAFC; padding: 2rem; max-width: 840px; margin: 0 auto; line-height: 1.6; }
    h1 { color: #19E6FF; font-size: 1.5rem; }
    .box { background: #0B1020; border: 1px solid rgba(255,255,255,0.1); padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem; }
    code { background: #0E1428; color: #19E6FF; padding: 2px 6px; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>Arcum Protocol — Emergency Direct On-Chain Exit Guide</h1>
  <p>This document is self-contained. It enables you to interact directly with your funds and positions on <strong>Robinhood Chain (Chain ID: 4663)</strong> even if the Arcum web interface or API servers experience total downtime.</p>
  
  <div class="box">
    <h3>1. Selling an Open Option Directly On-Chain</h3>
    <p>Target Contract (Engine): <code>${CONTRACT_ADDRESSES.engineProxy}</code></p>
    <p>Function: <code>sell(bytes32 id, uint128 tokens, uint128 minProceedsUsdg, uint64 deadline, address recipient)</code></p>
    <p><em>Note: Sells are NEVER blocked by administrative pauses. If the market is in a HALTED session, the sell will queue and issue an escrow ticket.</em></p>
  </div>

  <div class="box">
    <h3>2. Writer Pool Withdrawal Queue</h3>
    <p>Target Contract (WriterPool): <code>${CONTRACT_ADDRESSES.writerPoolProxy}</code></p>
    <p>Step A (Request): <code>requestWithdraw(uint256 shares)</code> — opens 72-hour notice ticket.</p>
    <p>Step B (Claim): <code>claim(uint256 ticketId)</code> — burns shares and pays USDG at claim-time valuation within 7-day window.</p>
  </div>

  <div class="box">
    <h3>3. Official Network RPC & Explorer</h3>
    <p>RPC Endpoint: <code>${CHAIN_CONFIG.rpcUrl}</code></p>
    <p>Chain ID: <code>${CHAIN_CONFIG.chainId}</code></p>
    <p>Blockscout Explorer: <code>${CHAIN_CONFIG.blockExplorer}</code></p>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'arcum-independent-exit-guide.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 lg:py-16 space-y-10">
      <div className="space-y-4 max-w-3xl">
        <span className="font-mono text-xs uppercase tracking-widest text-arcum-cyan font-bold">
          Emergency Sovereignty
        </span>
        <h1 className="text-3xl sm:text-5xl font-display font-bold text-white tracking-tight">
          Independent Direct Exit Guide
        </h1>
        <p className="text-base text-arcum-muted leading-relaxed">
          Arcum is committed to true DeFi non-custodial sovereignty. 
          Even in the hypothetical event of complete web hosting or cloud downtime, your options and collateral remain 100% accessible directly via Robinhood Chain RPC.
        </p>
      </div>

      <div className="rounded-xl bg-arcum-bgElevated border border-white/10 p-4 sm:p-6 lg:p-8 space-y-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
          <div className="space-y-1">
            <div className="text-lg font-display font-bold text-white">
              Download Standalone Offline HTML Guide
            </div>
            <p className="text-xs text-arcum-muted">
              Zero external dependencies. Works 100% offline from your local disk.
            </p>
          </div>

          <button
            onClick={downloadStandaloneExitGuide}
            className="w-full sm:w-auto px-6 py-3 rounded-lg bg-gradient-to-r from-arcum-cyan to-arcum-cobalt text-white font-display font-bold text-xs tracking-wider uppercase hover:opacity-95 transition-all shadow-[0_4px_16px_rgba(2,132,199,0.3)] dark:shadow-[0_0_20px_rgba(25,230,255,0.35)] flex items-center justify-center gap-2 drop-shadow-sm active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Download Offline HTML</span>
          </button>
        </div>

        {/* Method 1: Direct Sell */}
        <div className="p-6 rounded-lg bg-arcum-surface space-y-3 font-mono text-xs">
          <div className="text-sm font-bold text-white font-sans flex items-center gap-2">
            <Terminal className="w-4 h-4 text-arcum-cyan" />
            1. Direct On-Chain Position Settlement
          </div>
          <p className="text-arcum-muted leading-relaxed">
            Call <code className="text-arcum-cyan">sell()</code> on the ArcumEngine contract. 
            Sells can never be administratively frozen. If markets are halted, positions queue into an escrow ticket without token loss.
          </p>
          <div className="p-3 rounded bg-arcum-dark text-arcum-cyan text-xs break-all">
            Target: {CONTRACT_ADDRESSES.engineProxy}
          </div>
        </div>

        {/* Method 2: Writer Pool Queue */}
        <div className="p-6 rounded-lg bg-arcum-surface space-y-3 font-mono text-xs">
          <div className="text-sm font-bold text-white font-sans flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            2. Writer Pool Liquidity Exit
          </div>
          <p className="text-arcum-muted leading-relaxed">
            LPs call <code className="text-emerald-400">requestWithdraw(uint256 shares)</code>, wait the 72-hour notice window, 
            and execute <code className="text-emerald-400">claim(uint256 ticket)</code> to withdraw USDG directly to their wallet.
          </p>
          <div className="p-3 rounded bg-arcum-dark text-emerald-400 text-xs break-all">
            Target: {CONTRACT_ADDRESSES.writerPoolProxy}
          </div>
        </div>
      </div>
    </div>
  );
};
