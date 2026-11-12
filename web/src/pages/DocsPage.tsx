import React, { useState, useEffect } from 'react';
import { ExternalLink, Copy, Check } from 'lucide-react';
import {
  CONTRACT_ADDRESSES,
  CHAIN_CONFIG,
  TESTNET_CHAIN_CONFIG,
  TESTNET_CONTRACT_ADDRESSES,
} from '../data/protocol';
import { applySurplusPalette } from '../data/surplusTheme';

export const DocsPage: React.FC = () => {
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [activeChapter, setActiveChapter] = useState<string | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<'testnet' | 'mainnet'>('testnet');

  useEffect(() => {
    applySurplusPalette('docs');
  }, []);

  const handleCopy = (key: string, address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(key);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  const chapters = [
    {
      n: '01',
      id: 'equities',
      title: 'Tokenized Equity Basket',
      summary: 'Five synthetic equities on Robinhood Chain: NVDA, TSLA, SPY, QQQ, AAPL, paired with 6-decimal USDG settlement.',
      content: `Arcum references tokenized equity synthetics on Robinhood Chain (ID: 4663). Rather than trading fragmented expiry dates that expire every Friday, Arcum creates continuous, non-expiring everlasting option series for every supported stock. Settlement occurs exclusively in USDG, ensuring immediate cash-settled liquidity without physical share delivery friction.`,
    },
    {
      n: '02',
      id: 'ode-math',
      title: 'Closed-Form Everlasting Math & ODE',
      summary: 'Euler-Cauchy ordinary differential equation solving perpetual option pricing with exact cross-language parity.',
      content: `Perpetual options resolve via the Euler-Cauchy ODE boundary value problem. Characteristic roots alpha = (sigma^2 / 2 - r) / sigma^2 determine the power-law curvature of mark prices. The funding rate is deducted continuously in-kind through the series normalization factor (Norm_t = Norm_0 * exp(-t / tau)), completely eliminating the liquidation friction of traditional margin.`,
      formula: `V(S) = (K / (alpha + 1)) * (S / K)^(-alpha)  [for S <= K Put]`,
    },
    {
      n: '03',
      id: 'shield',
      title: '1-Click Automated Shield Protection',
      summary: 'Portfolio-wide downside floor insurance that automatically selects optimal weekly puts to hedge adverse market crashes.',
      content: `Traders holding synthetic stock tokens in their Robinhood Chain wallets can activate Shield protection with 1 click. ArcumEngine inspects the wallet's token balance, locates the nearest registered Out-of-the-Money weekly put option, and establishes a 95% capital floor against gap-down earnings reports or market contagion.`,
    },
    {
      n: '04',
      id: 'writer-pool',
      title: 'USDG Writer Pool & 3-Layer Solvency',
      summary: 'Decentralized liquidity underwriting pool with 24-hour deposit lock and 72-hour asynchronous withdrawal notice queue.',
      content: `Liquidity providers deposit USDG into the Writer Pool, minting virtual AWP shares. The pool underwrites option liability and captures 48% of all trading fees plus a 10 bps anti-dilution entry fee. Solvency is protected by a 3-layer waterfall: Layer 1 First-Loss Reserve, Layer 2 Writer Pool NAV, and Layer 3 Protocol Fee Buffer.`,
    },
    {
      n: '05',
      id: 'twap-reference',
      title: 'Uniswap V3 TWAP Anti-Sandwich Protection',
      summary: 'Time-weighted average price bounds preventing MEV front-running and flash-loan oracle manipulation.',
      content: `Before any option purchase or settlement executes, ArcumEngine validates the spot price against UniswapV3TwapReference. If instantaneous spot deviates beyond the 100 bps tolerance band from the 30-minute geometric TWAP, the transaction reverts, ensuring MEV bots cannot manipulate option premiums.`,
    },
    {
      n: '06',
      id: 'ai-agents',
      title: 'Autonomous AI Agents (MCP & ERC-4337)',
      summary: 'Model Context Protocol tool server allowing AI agents to quote, trade, and hedge under bounded on-chain policies.',
      content: `Arcum exposes 6 standard MCP tools via stdio and HTTP. AI agents can autonomously execute delta hedging, arbitrage, and portfolio insurance. Safety is guaranteed by AgentRouter.sol: daily gas budgets, maximum trade sizes, and a mandatory rule that all minted tokens and sales proceeds flow strictly back to the human owner.`,
    },
    {
      n: '07',
      id: 'contracts',
      title: 'Verified Smart Contracts & Timelock',
      summary: 'Open-source Cancun EVM smart contracts governed by a 48-hour Timelock Controller on Robinhood Chain.',
      content: `All core contracts (ArcumEngine, WriterPool, Reserve, FeeRouter, SeriesRegistry, AgentRouter) operate behind ERC-1967 upgradeable proxies. Upgrades and parameter modifications require a 48-hour delay through TimelockController, allowing users to exit via the independent Emergency Exit guide before any rule change takes effect.`,
    },
  ];

  return (
    <div className="i2iP7q_index font-mono">
      {/* Title & Subtitle (Surplus Prospectus Style) */}
      <div className="space-y-3">
        <h1 className="_4VSiGW_title">The Prospectus</h1>
        <p className="_4VSiGW_sub">
          How Arcum works: the tokenized equity basket, closed-form Euler-Cauchy ODE everlasting options, 1-click automated Shield, USDG writer pool solvency, and verified Robinhood Chain contracts.
        </p>
      </div>

      {/* Chapter Contents List */}
      <ol className="i2iP7q_contents">
        {chapters.map((ch) => {
          const isOpen = activeChapter === ch.id;
          return (
            <li key={ch.n}>
              <div
                onClick={() => setActiveChapter(isOpen ? null : ch.id)}
                className="i2iP7q_entry cursor-pointer"
              >
                <span className="i2iP7q_n">{ch.n}</span>
                <div>
                  <span className="i2iP7q_entryTitle hover:underline">{ch.title}</span>
                  {isOpen && (
                    <div className="mt-4 pt-4 border-t border-[var(--surplus-line-14)] space-y-3 font-mono text-xs text-[var(--surplus-line)] leading-relaxed">
                      <p>{ch.content}</p>
                      {ch.formula && (
                        <div className="p-3.5 rounded-lg border border-[var(--surplus-line-40)] bg-[var(--surplus-line-08)] font-bold text-amber-300">
                          <code>{ch.formula}</code>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <span className="i2iP7q_entrySum">{ch.summary}</span>
              </div>
            </li>
          );
        })}
      </ol>

      {/* Contract Addresses Ledger Table */}
      <div className="mt-16 pt-8 border-t-2 border-[var(--surplus-line)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display font-medium text-2xl text-[var(--surplus-line)]">
              Smart Contracts Directory ({selectedNetwork === 'testnet' ? 'Chain 46630' : 'Chain 4663'})
            </h2>
            <p className="text-xs text-[var(--surplus-line-62)] mt-1">
              {selectedNetwork === 'testnet'
                ? 'Robinhood Chain Testnet addresses for Arcum protocol sandbox staging.'
                : 'Robinhood Chain Mainnet addresses (Genesis deploy scheduled for Phase 2 GTM).'}
            </p>
          </div>

          {/* Network Selector Tabs */}
          <div className="flex border border-[var(--surplus-line-40)] rounded-xl overflow-hidden self-start sm:self-auto font-mono text-xs">
            <button
              onClick={() => setSelectedNetwork('testnet')}
              className={`px-3 py-1.5 font-bold transition-all ${
                selectedNetwork === 'testnet'
                  ? 'bg-[var(--surplus-line)] text-[var(--surplus-ground)]'
                  : 'text-[var(--surplus-line-80)] hover:bg-[var(--surplus-line-08)]'
              }`}
            >
              Testnet (46630)
            </button>
            <button
              onClick={() => setSelectedNetwork('mainnet')}
              className={`px-3 py-1.5 font-bold transition-all border-l border-[var(--surplus-line-40)] ${
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
          <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs font-mono">
            <strong>Mainnet Deployment Notice:</strong> Arcum contracts are currently in active staging on Testnet (46630). Mainnet (4663) contracts will be broadcasted directly by Arcum Multi-Sig Governance at launch. The addresses below represent the verified Cancun EVM architecture.
          </div>
        )}

        <div className="border border-[var(--surplus-line-24)] rounded-xl overflow-hidden font-mono text-xs">
          <table className="_4VSiGW_ledger">
            <thead>
              <tr>
                <th>Contract Name</th>
                <th>Role & Capability</th>
                <th>On-Chain Address</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const addrs = selectedNetwork === 'testnet' ? TESTNET_CONTRACT_ADDRESSES : CONTRACT_ADDRESSES;
                const cfg = selectedNetwork === 'testnet' ? TESTNET_CHAIN_CONFIG : CHAIN_CONFIG;
                return [
                  { name: 'ArcumEngine', role: 'Core Everlasting Pricing Engine', addr: addrs.engineProxy },
                  { name: 'WriterPool', role: 'USDG Liquidity & Queue Vault (AWP)', addr: addrs.writerPoolProxy },
                  { name: 'AgentRouter', role: 'Autonomous AI Delegation Policy', addr: addrs.agentRouter },
                  { name: 'UniswapV3Twap', role: 'Anti-Sandwich Q128.128 TWAP Oracle', addr: addrs.twapReference },
                  { name: 'Reserve', role: 'Layer 1 First-Loss Solvency', addr: addrs.reserve },
                  { name: 'FeeRouter', role: '80/10/5/5 Protocol Fee Waterfall', addr: addrs.feeRouter },
                  { name: 'Timelock', role: '48-Hour Governance Delay', addr: addrs.timelock },
                  { name: 'USDG', role: 'Settlement Stablecoin (6 dp)', addr: cfg.usdgAddress },
                ].map((c) => (
                  <tr key={c.name}>
                    <td className="font-bold text-[var(--surplus-line)]">{c.name}</td>
                    <td className="text-[var(--surplus-line-80)]">{c.role}</td>
                    <td className="font-mono text-[var(--surplus-line-62)]">
                      {c.addr.slice(0, 10)}...{c.addr.slice(-8)}
                    </td>
                    <td className="text-right space-x-2">
                      <button
                        onClick={() => handleCopy(c.name, c.addr)}
                        className="px-2.5 py-1 rounded border border-[var(--surplus-line-40)] text-[11px] hover:bg-[var(--surplus-line)] hover:text-[var(--surplus-ground)] transition-all font-bold"
                      >
                        {copiedAddress === c.name ? 'Copied' : 'Copy'}
                      </button>
                      <a
                        href={`${cfg.blockExplorer}/address/${c.addr}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded border border-[var(--surplus-line-40)] text-[11px] hover:bg-[var(--surplus-line)] hover:text-[var(--surplus-ground)] transition-all font-bold inline-flex items-center gap-1"
                      >
                        <span>Explorer</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
