import React, { useState, useEffect } from 'react';
import { ExternalLink, Copy } from 'lucide-react';
import {
  CONTRACT_ADDRESSES,
  CHAIN_CONFIG,
  TESTNET_CHAIN_CONFIG,
  TESTNET_CONTRACT_ADDRESSES,
} from '../data/protocol';
import { applySurplusPalette } from '../data/surplusTheme';

export const ContractsPage: React.FC = () => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<'testnet' | 'mainnet'>('testnet');

  useEffect(() => {
    applySurplusPalette('contracts');
  }, []);

  const handleCopy = (key: string, addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const addrs = selectedNetwork === 'testnet' ? TESTNET_CONTRACT_ADDRESSES : CONTRACT_ADDRESSES;
  const cfg = selectedNetwork === 'testnet' ? TESTNET_CHAIN_CONFIG : CHAIN_CONFIG;

  const contracts = [
    {
      name: 'ArcumEngine (Proxy)',
      address: addrs.engineProxy,
      role: 'Core Everlasting Options Engine: quotes, buy, sell, Shield, and funding accruals',
      verified: true,
    },
    {
      name: 'WriterPool (Proxy)',
      address: addrs.writerPoolProxy,
      role: 'USDG Writer Pool: takes counterparty liability, spot hedges, 72h withdrawal queue (AWP)',
      verified: true,
    },
    {
      name: 'AgentRouter',
      address: addrs.agentRouter,
      role: 'Autonomous AI delegation router for MCP agent tools (strictly non-custodial)',
      verified: true,
    },
    {
      name: 'UniswapV3TwapReference',
      address: addrs.twapReference,
      role: 'Time-weighted average price oracle preventing sandwich attacks and flash manipulation',
      verified: true,
    },
    {
      name: 'Reserve (First Loss Vault)',
      address: addrs.reserve,
      role: 'Layer 1 first-loss solvency capital layer absorbing shortfall before LP NAV',
      verified: true,
    },
    {
      name: 'FeeRouter',
      address: addrs.feeRouter,
      role: 'Protocol fee distribution waterfall (80% pool/workers, 10% treasury, 5% stakers, 5% burn)',
      verified: true,
    },
    {
      name: 'Timelock Controller',
      address: addrs.timelock,
      role: '48-hour timelock enforcing delayed execution on admin upgrades and parameter changes',
      verified: true,
    },
    {
      name: 'USDG Token',
      address: cfg.usdgAddress,
      role: 'Canonical 6-decimal settlement stablecoin on Robinhood Chain',
      verified: true,
    },
  ];

  return (
    <div className="_4VSiGW_screen max-w-5xl mx-auto space-y-8 font-mono">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <h1 className="_4VSiGW_title">The Register</h1>
          <p className="_4VSiGW_sub">
            Verified smart contracts in Arcum on {selectedNetwork === 'testnet' ? 'Robinhood Testnet (46630)' : 'Robinhood Mainnet (4663)'}.
          </p>
        </div>

        {/* Network Switcher Tabs */}
        <div className="flex border border-[var(--surplus-line-40)] rounded-xl overflow-hidden self-start sm:self-auto font-mono text-xs">
          <button
            onClick={() => setSelectedNetwork('testnet')}
            className={`px-3.5 py-1.5 font-bold transition-all ${
              selectedNetwork === 'testnet'
                ? 'bg-[var(--surplus-line)] text-[var(--surplus-ground)]'
                : 'text-[var(--surplus-line-80)] hover:bg-[var(--surplus-line-08)]'
            }`}
          >
            Testnet (46630)
          </button>
          <button
            onClick={() => setSelectedNetwork('mainnet')}
            className={`px-3.5 py-1.5 font-bold transition-all border-l border-[var(--surplus-line-40)] ${
              selectedNetwork === 'mainnet'
                ? 'bg-[var(--surplus-line)] text-[var(--surplus-ground)]'
                : 'text-[var(--surplus-line-80)] hover:bg-[var(--surplus-line-08)]'
            }`}
          >
            Mainnet (4663)
          </button>
        </div>
      </div>

      {selectedNetwork === 'mainnet' && (
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs leading-relaxed">
          <strong>Mainnet Genesis Notice:</strong> Arcum contracts are actively staged on Testnet (46630). Mainnet contracts will be broadcasted by Arcum Multi-Sig Treasury at launch. Addresses shown here represent the verified reference architecture.
        </div>
      )}

      {/* Mobile Cards (< md) */}
      <div className="md:hidden space-y-3 font-mono text-xs">
        {contracts.map((c) => (
          <div
            key={c.name}
            className="p-4 rounded-xl border border-[var(--surplus-line-24)] bg-[var(--surplus-line-08)] space-y-2.5"
          >
            <div className="flex justify-between items-baseline">
              <span className="font-bold text-sm text-[var(--surplus-line)]">{c.name}</span>
              <span className="text-[10px] px-2 py-0.5 rounded border border-emerald-500/40 text-emerald-400 font-bold">
                VERIFIED
              </span>
            </div>
            <p className="text-xs text-[var(--surplus-line-80)]">{c.role}</p>
            <div className="text-[11px] font-mono text-[var(--surplus-line-62)] truncate">
              {c.address}
            </div>
            <div className="flex gap-2 pt-2 border-t border-[var(--surplus-line-14)]">
              <button
                onClick={() => handleCopy(c.name, c.address)}
                className="flex-1 py-1.5 rounded border border-[var(--surplus-line-40)] text-xs hover:bg-[var(--surplus-line)] hover:text-[var(--surplus-ground)] font-bold transition-all text-center"
              >
                {copiedKey === c.name ? 'Copied' : 'Copy Address'}
              </button>
              <a
                href={`${cfg.blockExplorer}/address/${c.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-1.5 rounded border border-[var(--surplus-line-40)] text-xs hover:bg-[var(--surplus-line)] hover:text-[var(--surplus-ground)] font-bold transition-all text-center inline-flex items-center justify-center gap-1"
              >
                <span>Explorer</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Ledger Table (>= md) */}
      <div className="hidden md:block border border-[var(--surplus-line-24)] rounded-2xl overflow-hidden font-mono text-xs">
        <table className="_4VSiGW_ledger">
          <thead>
            <tr>
              <th>Contract</th>
              <th>Role & Security Boundary</th>
              <th>Address</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {contracts.map((c) => (
              <tr key={c.name} className="hover:bg-[var(--surplus-line-08)] transition-colors">
                <td className="font-bold text-[var(--surplus-line)]">{c.name}</td>
                <td className="text-[var(--surplus-line-80)]">{c.role}</td>
                <td className="font-mono text-[var(--surplus-line-62)]">
                  {c.address.slice(0, 10)}...{c.address.slice(-8)}
                </td>
                <td className="text-right space-x-2">
                  <button
                    onClick={() => handleCopy(c.name, c.address)}
                    className="px-2.5 py-1 rounded border border-[var(--surplus-line-40)] text-[11px] hover:bg-[var(--surplus-line)] hover:text-[var(--surplus-ground)] font-bold transition-all"
                  >
                    {copiedKey === c.name ? 'Copied' : 'Copy'}
                  </button>
                  <a
                    href={`${cfg.blockExplorer}/address/${c.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded border border-[var(--surplus-line-40)] text-[11px] hover:bg-[var(--surplus-line)] hover:text-[var(--surplus-ground)] font-bold transition-all inline-flex items-center gap-1"
                  >
                    <span>Explorer</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
