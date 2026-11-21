import React, { useEffect, useState } from 'react';
import { Download, ShieldCheck, Terminal, ExternalLink } from 'lucide-react';
import { CONTRACT_ADDRESSES, CHAIN_CONFIG, TESTNET_CONTRACT_ADDRESSES, TESTNET_CHAIN_CONFIG } from '../data/protocol';
import { applySurplusPalette } from '../data/surplusTheme';

export const ExitPage: React.FC = () => {
  const [activeNetwork, setActiveNetwork] = useState<'mainnet' | 'testnet'>('mainnet');

  useEffect(() => {
    applySurplusPalette('exit');
  }, []);

  const addresses = activeNetwork === 'mainnet' ? CONTRACT_ADDRESSES : TESTNET_CONTRACT_ADDRESSES;
  const chain = activeNetwork === 'mainnet' ? CHAIN_CONFIG : TESTNET_CHAIN_CONFIG;

  const downloadStandaloneExitGuide = () => {
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Arcum Protocol — Standalone Independent Exit Guide (${chain.chainName})</title>
  <style>
    body { font-family: ui-monospace, SFMono-Regular, monospace; background: #0d2a21; color: #e6dfc8; padding: 2rem; max-width: 840px; margin: 0 auto; line-height: 1.6; }
    h1 { color: #e6dfc8; font-size: 1.6rem; border-bottom: 1.5px solid #e6dfc8; padding-bottom: 0.5rem; }
    .box { background: rgba(230, 223, 200, 0.06); border: 1px solid rgba(230, 223, 200, 0.3); padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem; }
    code { background: rgba(0, 0, 0, 0.4); color: #86efac; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; word-break: break-all; }
    .label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; }
  </style>
</head>
<body>
  <h1>Arcum Protocol — Emergency Direct On-Chain Exit Guide</h1>
  <p>This document is self-contained. It enables you to interact directly with your funds and positions on <strong>${chain.chainName} (Chain ID: ${chain.chainId})</strong> even under catastrophic frontend hosting downtime.</p>
  
  <div class="box">
    <h3>1. Selling an Open Option Directly On-Chain</h3>
    <p class="label">Target Contract (ArcumEngine):</p>
    <p><code>${addresses.engine}</code></p>
    <p>Function: <code>sell(bytes32 id, uint128 tokens, uint128 minProceedsUsdg, uint64 deadline, address recipient)</code></p>
    <p><em>Note: Sells are NEVER blocked by administrative pauses. If the underlying market session is HALTED, the engine automatically queues the sell and issues an escrow claim ticket.</em></p>
  </div>

  <div class="box">
    <h3>2. Writer Pool Withdrawal Queue</h3>
    <p class="label">Target Contract (WriterPool Proxy):</p>
    <p><code>${addresses.writerPoolProxy}</code></p>
    <p>Step A (Request): <code>requestWithdraw(uint256 shares)</code> — opens an orderly notice withdrawal ticket.</p>
    <p>Step B (Claim): <code>claim(uint256 ticketId)</code> — burns shares and pays USDG at claim-time NAV within the claim window.</p>
  </div>

  <div class="box">
    <h3>3. Official Network RPC & Explorer</h3>
    <p>RPC Endpoint: <code>${chain.rpcUrl}</code></p>
    <p>Chain ID: <code>${chain.chainId}</code></p>
    <p>Blockscout Explorer: <code>${chain.blockExplorer}</code></p>
    <p>Settlement USDG: <code>${chain.usdgAddress}</code></p>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `arcum-exit-guide-${activeNetwork}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="_4VSiGW_screen max-w-4xl mx-auto space-y-8 font-mono">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <h1 className="_4VSiGW_title">Emergency Sovereignty</h1>
          <p className="_4VSiGW_sub">
            Non-custodial exit protocol. Even under total web hosting downtime, options and collateral remain 100% accessible via Robinhood Chain RPC.
          </p>
        </div>

        {/* Network Toggle Pill */}
        <div className="inline-flex items-center p-1 rounded-lg border border-[var(--surplus-line-24)] bg-[var(--surplus-line-08)] text-xs self-start sm:self-auto">
          <button
            onClick={() => setActiveNetwork('mainnet')}
            className={`px-3 py-1.5 rounded-md font-bold transition-all ${
              activeNetwork === 'mainnet'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                : 'text-[var(--surplus-line-62)] hover:text-[var(--surplus-line)]'
            }`}
          >
            Mainnet (4663)
          </button>
          <button
            onClick={() => setActiveNetwork('testnet')}
            className={`px-3 py-1.5 rounded-md font-bold transition-all ${
              activeNetwork === 'testnet'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-[var(--surplus-line-62)] hover:text-[var(--surplus-line)]'
            }`}
          >
            Testnet (46630)
          </button>
        </div>
      </div>

      <div className="surplus-window p-6 sm:p-8 rounded-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h2 className="font-display font-medium text-xl text-[var(--surplus-line)]">
                Standalone Offline HTML Guide
              </h2>
            </div>
            <p className="text-xs text-[var(--surplus-line-62)] mt-1">
              Zero external dependencies. Works 100% offline directly from your local disk for {chain.chainName}.
            </p>
          </div>

          <button
            onClick={downloadStandaloneExitGuide}
            className="yYMW7q_stamp py-3 px-5 text-xs font-bold inline-flex items-center self-start sm:self-auto"
          >
            <Download className="w-4 h-4 mr-2" />
            <span>DOWNLOAD {activeNetwork.toUpperCase()} GUIDE</span>
          </button>
        </div>

        <div className="border-t border-[var(--surplus-line-24)] pt-5 space-y-4 text-xs text-[var(--surplus-line-80)]">
          <div className="space-y-1.5">
            <div className="font-bold text-[var(--surplus-line)] flex items-center justify-between">
              <span>1. Direct On-Chain Option Settlement:</span>
              <a
                href={`${chain.blockExplorer}/address/${addresses.engine}`}
                target="_blank"
                rel="noreferrer"
                className="text-[var(--surplus-line-62)] hover:text-emerald-400 inline-flex items-center space-x-1"
              >
                <span>Explorer</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="p-3 rounded-lg border border-[var(--surplus-line-24)] bg-[var(--surplus-line-08)] font-mono overflow-x-auto text-emerald-400">
              <code>cast send {addresses.engine} "sell(bytes32,uint128,uint128,uint64,address)" &lt;SERIES_ID&gt; &lt;TOKENS_WAD&gt; &lt;MIN_USDG_WAD&gt; &lt;DEADLINE&gt; &lt;RECIPIENT&gt; --rpc-url {chain.rpcUrl}</code>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="font-bold text-[var(--surplus-line)] flex items-center justify-between">
              <span>2. Direct Writer Pool Withdrawal:</span>
              <a
                href={`${chain.blockExplorer}/address/${addresses.writerPoolProxy}`}
                target="_blank"
                rel="noreferrer"
                className="text-[var(--surplus-line-62)] hover:text-emerald-400 inline-flex items-center space-x-1"
              >
                <span>Explorer</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="p-3 rounded-lg border border-[var(--surplus-line-24)] bg-[var(--surplus-line-08)] font-mono overflow-x-auto text-emerald-400">
              <code>cast send {addresses.writerPoolProxy} "requestWithdraw(uint256)" &lt;SHARES_WAD&gt; --rpc-url {chain.rpcUrl}</code>
            </div>
          </div>

          <div className="space-y-1.5 pt-2">
            <div className="font-bold text-[var(--surplus-line)]">3. Settlement Token (USDG):</div>
            <div className="p-3 rounded-lg border border-[var(--surplus-line-24)] bg-[var(--surplus-line-08)] font-mono flex items-center justify-between">
              <span className="text-[var(--surplus-line-62)]">USDG Address:</span>
              <span className="text-emerald-400 font-bold">{chain.usdgAddress}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
