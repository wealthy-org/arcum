import React, { useState, useEffect } from 'react';
import { ExternalLink, Copy } from 'lucide-react';
import { CONTRACT_ADDRESSES, CHAIN_CONFIG } from '../data/protocol';
import { applySurplusPalette } from '../data/surplusTheme';

export const ContractsPage: React.FC = () => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    applySurplusPalette('contracts');
  }, []);

  const handleCopy = (key: string, addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const contracts = [
    {
      name: 'ArcumEngine (Proxy)',
      address: CONTRACT_ADDRESSES.engineProxy,
      role: 'Core Everlasting Options Engine: quotes, buy, sell, Shield, and funding accruals',
      verified: true,
    },
    {
      name: 'WriterPool (Proxy)',
      address: CONTRACT_ADDRESSES.writerPoolProxy,
      role: 'USDG Writer Pool: takes counterparty liability, spot hedges, 72h withdrawal queue',
      verified: true,
    },
    {
      name: 'AgentRouter',
      address: CONTRACT_ADDRESSES.agentRouter,
      role: 'Autonomous AI delegation router for MCP agent tools (strictly non-custodial)',
      verified: true,
    },
    {
      name: 'UniswapV3TwapReference',
      address: CONTRACT_ADDRESSES.twapReference,
      role: 'Time-weighted average price oracle preventing sandwich attacks and flash manipulation',
      verified: true,
    },
    {
      name: 'Reserve (First Loss Vault)',
      address: CONTRACT_ADDRESSES.reserve,
      role: 'Layer 1 first-loss solvency capital layer absorbing shortfall before LP NAV',
      verified: true,
    },
    {
      name: 'FeeRouter',
      address: CONTRACT_ADDRESSES.feeRouter,
      role: 'Protocol fee distribution waterfall (80% pool/workers, 10% treasury, 5% stakers, 5% burn)',
      verified: true,
    },
    {
      name: 'Timelock Controller',
      address: CONTRACT_ADDRESSES.timelock,
      role: '48-hour timelock enforcing delayed execution on admin upgrades and parameter changes',
      verified: true,
    },
    {
      name: 'USDG Token',
      address: CHAIN_CONFIG.usdgAddress,
      role: 'Canonical 6-decimal settlement stablecoin on Robinhood Chain',
      verified: true,
    },
  ];

  return (
    <div className="_4VSiGW_screen max-w-5xl mx-auto space-y-8 font-mono">
      <div className="space-y-3">
        <h1 className="_4VSiGW_title">The Register</h1>
        <p className="_4VSiGW_sub">
          Every verified contract in Arcum on Robinhood Chain Mainnet (4663) and its cryptographic execution address.
        </p>
      </div>

      <div className="border border-[var(--surplus-line-24)] rounded-2xl overflow-hidden font-mono text-xs">
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
                    href={`https://robinhoodchain.blockscout.com/address/${c.address}`}
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
