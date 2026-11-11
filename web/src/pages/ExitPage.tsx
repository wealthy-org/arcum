import React from 'react';
import { Download } from 'lucide-react';
import { CONTRACT_ADDRESSES, CHAIN_CONFIG } from '../data/protocol';

export const ExitPage: React.FC = () => {
  const downloadStandaloneExitGuide = () => {
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Arcum Protocol — Standalone Independent Exit Guide</title>
  <style>
    body { font-family: ui-monospace, SFMono-Regular, monospace; background: #0d2a21; color: #e6dfc8; padding: 2rem; max-width: 840px; margin: 0 auto; line-height: 1.6; }
    h1 { color: #e6dfc8; font-size: 1.6rem; border-bottom: 1.5px solid #e6dfc8; padding-bottom: 0.5rem; }
    .box { background: rgba(230, 223, 200, 0.06); border: 1px solid rgba(230, 223, 200, 0.3); padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem; }
    code { background: rgba(0, 0, 0, 0.3); color: #e6dfc8; padding: 2px 6px; border-radius: 4px; }
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
    <div className="_4VSiGW_screen max-w-4xl mx-auto space-y-8 font-mono">
      <div className="space-y-3">
        <h1 className="_4VSiGW_title">Emergency Sovereignty</h1>
        <p className="_4VSiGW_sub">
          Non-custodial exit protocol. Even under total web hosting downtime, options and collateral remain 100% accessible via Robinhood Chain RPC.
        </p>
      </div>

      <div className="surplus-window p-6 sm:p-8 rounded-2xl space-y-6">
        <div>
          <h2 className="font-display font-medium text-xl text-[var(--surplus-line)]">
            Standalone Offline HTML Guide
          </h2>
          <p className="text-xs text-[var(--surplus-line-62)] mt-1">
            Zero external dependencies. Works 100% offline directly from your local disk.
          </p>
        </div>

        <button
          onClick={downloadStandaloneExitGuide}
          className="yYMW7q_stamp py-3.5 px-6 text-xs font-bold"
        >
          <Download className="w-4 h-4 mr-2" />
          <span>DOWNLOAD OFFLINE HTML</span>
        </button>

        <div className="border-t border-[var(--surplus-line-24)] pt-4 space-y-3 text-xs text-[var(--surplus-line-80)]">
          <div className="font-bold text-[var(--surplus-line)]">1. Direct On-Chain Option Settlement:</div>
          <div className="p-3 rounded-lg border border-[var(--surplus-line-24)] bg-[var(--surplus-line-08)]">
            <code>cast send {CONTRACT_ADDRESSES.engineProxy} "sell(bytes32,uint128,uint128,uint64,address)" ...</code>
          </div>

          <div className="font-bold text-[var(--surplus-line)] pt-2">2. Direct Writer Pool Withdrawal:</div>
          <div className="p-3 rounded-lg border border-[var(--surplus-line-24)] bg-[var(--surplus-line-08)]">
            <code>cast send {CONTRACT_ADDRESSES.writerPoolProxy} "requestWithdraw(uint256)" ...</code>
          </div>
        </div>
      </div>
    </div>
  );
};
