import React, { useState } from 'react';
import { ExternalLink, Check, Copy, ShieldCheck } from 'lucide-react';
import { CONTRACT_ADDRESSES, CHAIN_CONFIG } from '../data/protocol';

export const ContractsPage: React.FC = () => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (key: string, addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const contracts = [
    {
      name: 'ArcumEngine (Proxy)',
      address: CONTRACT_ADDRESSES.engineProxy,
      role: 'Core options trading engine: quotes, buy, sell, Shield, accruals, and NYSE queued sells',
      verified: true,
    },
    {
      name: 'WriterPool (Proxy)',
      address: CONTRACT_ADDRESSES.writerPoolProxy,
      role: 'USDG Writer Pool taking counterparty risk, spot hedges, and liability bounds (ERC-4626)',
      verified: true,
    },
    {
      name: 'AgentRouter',
      address: CONTRACT_ADDRESSES.agentRouter,
      role: 'Owner-controlled policy delegation router for AI agents and MCP tools (non-custodial)',
      verified: true,
    },
    {
      name: 'UniswapV3TwapReference',
      address: CONTRACT_ADDRESSES.twapReference,
      role: 'Time-weighted average price oracle using Q128.128 binary exponentiation to prevent sandwich attacks',
      verified: true,
    },
    {
      name: 'Reserve (First Loss Vault)',
      address: CONTRACT_ADDRESSES.reserve,
      role: 'First-loss capital layer absorbing pool shortfalls before touching core LP NAV',
      verified: true,
    },
    {
      name: 'FeeRouter',
      address: CONTRACT_ADDRESSES.feeRouter,
      role: 'Protocol fee distribution waterfall (80% workers, 10% treasury, 5% stakers, 5% burn)',
      verified: true,
    },
    {
      name: 'Timelock Controller',
      address: CONTRACT_ADDRESSES.timelock,
      role: '48-hour timelock enforcing delayed execution on admin upgrades and parameter changes',
      verified: true,
    },
    {
      name: 'USDG Settlement Token',
      address: CHAIN_CONFIG.usdgAddress,
      role: 'Canonical 6-decimal settlement stablecoin on Robinhood Chain',
      verified: true,
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 lg:py-16 space-y-10">
      <div className="space-y-4 max-w-3xl">
        <span className="font-mono text-xs uppercase tracking-widest text-arcum-cyan font-bold">
          Transparent On-Chain Infrastructure
        </span>
        <h1 className="text-3xl sm:text-5xl font-display font-bold text-white tracking-tight">
          Verified Smart Contracts
        </h1>
        <p className="text-base text-arcum-muted leading-relaxed">
          All contracts are deployed on <strong className="text-white">Robinhood Chain Mainnet (Chain ID: 4663)</strong>, 
          compiled under Solidity 0.8.28 with Cancun EVM settings (EIP-1153 transient storage), and verified on Sourcify.
        </p>
      </div>

      <div className="rounded-xl bg-arcum-bgElevated border border-white/10 overflow-hidden shadow-2xl">
        <div className="divide-y divide-white/[0.08]">
          {contracts.map((c) => (
            <div
              key={c.name}
              className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors"
            >
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="font-display font-bold text-white text-sm">{c.name}</span>
                  {c.verified && (
                    <span className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                      <ShieldCheck className="w-3.5 h-3.5" /> Sourcify Exact Match
                    </span>
                  )}
                </div>
                <div className="text-xs font-mono text-arcum-cyan break-all">
                  {c.address}
                </div>
                <p className="text-xs text-arcum-muted">
                  {c.role}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleCopy(c.name, c.address)}
                  className="px-3 py-1.5 rounded-lg bg-arcum-surface hover:bg-white/10 border border-white/10 text-xs font-mono text-arcum-muted hover:text-white transition-all flex items-center gap-1.5"
                >
                  {copiedKey === c.name ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>

                <a
                  href={`${CHAIN_CONFIG.blockExplorer}/address/${c.address}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-lg bg-arcum-surface hover:bg-white/10 border border-white/10 text-arcum-muted hover:text-white transition-all"
                  title="View on Explorer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
