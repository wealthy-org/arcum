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
  const [selectedNetwork, setSelectedNetwork] = useState<'testnet' | 'mainnet'>('mainnet');

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
      title: 'Shield Put Protection',
      summary: 'Downside protection purchasing listed weekly put options sized to your Stock Token holdings.',
      content: `Traders holding synthetic stock tokens in their Robinhood Chain wallets can purchase Shield protection. ArcumEngine inspects the wallet's token balance, locates the closest listed Out-of-the-Money weekly put option from SeriesRegistry, and executes downside protection. Note that Shield buys a decaying weekly option; it is not a permanent portfolio floor and does not renew automatically.`,
    },
    {
      n: '04',
      id: 'writer-pool',
      title: 'USDG Writer Pool & Solvency Layer',
      summary: 'Decentralized liquidity underwriting pool with deposit lock (30 min on testnet) and asynchronous withdrawal notice queue with a 7-day claim window.',
      content: `Liquidity providers deposit USDG into the Writer Pool, minting virtual AWP shares. The pool underwrites option liability and captures 48% of trading fees plus a 10 bps anti-dilution entry fee. Solvency is protected by a multi-layer waterfall. Withdrawals require notice and must be claimed within the 7-day claim window; expired claims automatically requeue.`,
    },
    {
      n: '05',
      id: 'twap-reference',
      title: 'TWAP Price Bounds (Not active on testnet)',
      summary: 'Time-weighted average price bounds design preventing oracle manipulation (active in Phase 2 with live DEX pools).',
      content: `On mainnet, ArcumEngine validates spot prices against UniswapV3TwapReference. On testnet, this module is currently disabled as live Uniswap V3 synthetic equity pairs are not yet deployed.`,
    },
    {
      n: '06',
      id: 'ai-agents',
      title: 'AI Agents & Delegation Policies',
      summary: 'Model Context Protocol tool server allowing AI agents to quote, trade, and hedge under bounded on-chain policies on AgentRouter.sol.',
      content: `Arcum exposes standard MCP tools. AI agents execute autonomous trades under AgentRouter policies: budget caps, maximum per trade, allowed stocks, and instant owner revocation.`,
    },
    {
      n: '07',
      id: 'contracts',
      title: 'Verified Smart Contracts (Timelock: Testnet owner is EOA)',
      summary: 'Open-source Cancun EVM smart contracts on Robinhood Chain. Timelock not deployed yet (mainnet requirement).',
      content: `All core contracts (ArcumEngine, WriterPool, Reserve, FeeRouter, SeriesRegistry, AgentRouter) are verified on Robinhood Chain Testnet (46630). On testnet, contracts are owned by the deployer EOA. The TimelockController is a mainnet requirement and is not yet deployed on testnet.`,
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


        <div className="border border-[var(--surplus-line-24)] rounded-xl overflow-x-auto font-mono text-xs">
          <table className="_4VSiGW_ledger">
            <thead>
              <tr>
                <th className="w-1/4">Contract Name</th>
                <th className="w-2/5">Role & Capability</th>
                <th className="w-1/6">On-Chain Address</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const addrs = selectedNetwork === 'testnet' ? TESTNET_CONTRACT_ADDRESSES : CONTRACT_ADDRESSES;
                const cfg = selectedNetwork === 'testnet' ? TESTNET_CHAIN_CONFIG : CHAIN_CONFIG;
                return [
                  { name: 'ArcumEngine', role: 'Core Everlasting Pricing Engine', addr: addrs.engine },
                  { name: 'WriterPool', role: 'USDG Liquidity & Queue Vault (AWP)', addr: addrs.writerPoolProxy },
                  { name: 'AgentRouter', role: 'Autonomous AI Delegation Policy', addr: addrs.agentRouter },
                  { name: 'UniswapV3Twap', role: 'TWAP Reference Oracle (PriceGuard Bound)', addr: addrs.twapReference },
                  { name: 'Reserve', role: 'Layer 1 First-Loss Solvency', addr: addrs.reserve },
                  { name: 'FeeRouter', role: '80/10/5/5 Protocol Fee Waterfall', addr: addrs.feeRouter },
                  { name: 'Timelock', role: selectedNetwork === 'mainnet' ? 'Safe 2-of-2 Multi-Sig Governance' : 'EOA Deployer (Testnet)', addr: selectedNetwork === 'mainnet' ? (addrs as any).owner : addrs.timelock },
                  { name: 'USDG', role: selectedNetwork === 'mainnet' ? 'USDG — Production Settlement Token' : 'Settlement Stablecoin (6 dp)', addr: cfg.usdgAddress },
                ].map((c) => (
                  <tr key={c.name}>
                    <td className="font-bold text-[var(--surplus-line)] whitespace-normal">{c.name}</td>
                    <td className="text-[var(--surplus-line-80)] whitespace-normal leading-relaxed">{c.role}</td>
                    <td className="font-mono text-[var(--surplus-line-62)] whitespace-nowrap">
                      {c.addr === '0x0000000000000000000000000000000000000000' ? (
                        <span className="text-[var(--surplus-line-62)] font-sans italic text-[11px]">EOA owner</span>
                      ) : (
                        `${c.addr.slice(0, 8)}...${c.addr.slice(-6)}`
                      )}
                    </td>
                    <td className="text-right space-x-2 whitespace-nowrap">
                      {c.addr !== '0x0000000000000000000000000000000000000000' && (
                        <>
                          <button
                            onClick={() => handleCopy(c.name, c.addr)}
                            className="px-2.5 py-1 rounded border border-[var(--surplus-line-40)] text-[11px] hover:bg-[var(--surplus-line)] hover:text-[var(--surplus-ground)] transition-all font-bold cursor-pointer"
                          >
                            {copiedAddress === c.name ? 'Copied' : 'Copy'}
                          </button>
                          <a
                            href={`${cfg.blockExplorer}/address/${c.addr}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 rounded border border-[var(--surplus-line-40)] text-[11px] hover:bg-[var(--surplus-line)] hover:text-[var(--surplus-ground)] transition-all font-bold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <span>Explorer</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </>
                      )}
                    </td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>

        {/* Capability Status Table (Production Architecture Scope) */}
        <div className="space-y-3 pt-6 border-t border-[var(--surplus-line-24)] font-mono text-xs">
          <div>
            <h3 className="text-base font-display font-medium text-[var(--surplus-line)]">
              Protocol Capability & Architecture Status
            </h3>
            <p className="text-[11px] text-[var(--surplus-line-62)]">
              Operational status of core protocol modules and architecture on Robinhood Chain Mainnet (Chain ID: 4663).
            </p>
            <p className="text-[11px] text-[var(--surplus-line-62)] mt-1">
              All core financial primitives, automated oracle feeds, and solvency layers are fully deployed and operational on-chain.
            </p>
          </div>

          <div className="border border-[var(--surplus-line-24)] rounded-xl overflow-x-auto">
            <table className="_4VSiGW_ledger">
              <thead>
                <tr>
                  <th className="w-1/3">Module / Capability</th>
                  <th className="w-1/3">Production Status</th>
                  <th className="w-1/3">Operational Scope</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="font-bold text-[var(--surplus-line)]">Everlasting Pricing Engine (ArcumEngine)</td>
                  <td><span className="text-emerald-400 font-bold">Active — Continuous Mark & Funding</span></td>
                  <td className="text-[var(--surplus-line-62)]">Core continuous perpetual options pricing & accruals</td>
                </tr>
                <tr>
                  <td className="font-bold text-[var(--surplus-line)]">USDG Writer Liquidity Pool (WriterPool)</td>
                  <td><span className="text-emerald-400 font-bold">Active — Dynamic Underwriting & Queue</span></td>
                  <td className="text-[var(--surplus-line-62)]">Institutional LP capital vault & async settlement queue</td>
                </tr>
                <tr>
                  <td className="font-bold text-[var(--surplus-line)]">Volatility Oracle (VolOracle)</td>
                  <td><span className="text-emerald-400 font-bold">Active — Automated Vol-Engine Feeds</span></td>
                  <td className="text-[var(--surplus-line-62)]">Signed Black-Scholes implied volatility continuous oracle</td>
                </tr>
                <tr>
                  <td className="font-bold text-[var(--surplus-line)]">Canonical Series Registry (SeriesRegistry)</td>
                  <td><span className="text-emerald-400 font-bold">Active — Listed Equity Series</span></td>
                  <td className="text-[var(--surplus-line-62)]">Canonical listing of strikes, assets, and token addresses</td>
                </tr>
                <tr>
                  <td className="font-bold text-[var(--surplus-line)]">PriceGuard & Circuit Breakers</td>
                  <td><span className="text-emerald-400 font-bold">Active — NYSE Session Bounds</span></td>
                  <td className="text-[var(--surplus-line-62)]">Trading session boundaries, TWAP sanity, & price guards</td>
                </tr>
                <tr>
                  <td className="font-bold text-[var(--surplus-line)]">Solvency Reserve (First Loss Layer)</td>
                  <td><span className="text-emerald-400 font-bold">Active — Capital Solvency Backstop</span></td>
                  <td className="text-[var(--surplus-line-62)]">First-loss buffer absorbing systemic volatility before LP NAV</td>
                </tr>
                <tr>
                  <td className="font-bold text-[var(--surplus-line)]">Protocol Fee Waterfall (FeeRouter)</td>
                  <td><span className="text-emerald-400 font-bold">Active — 80/10/5/5 Distribution</span></td>
                  <td className="text-[var(--surplus-line-62)]">Automated fee routing to writers, treasury, and reserve</td>
                </tr>
                <tr>
                  <td className="font-bold text-[var(--surplus-line)]">AI Agent Policy Router (AgentRouter)</td>
                  <td><span className="text-emerald-400 font-bold">Active — Non-Custodial Delegation</span></td>
                  <td className="text-[var(--surplus-line-62)]">Autonomous MCP agent tools with cryptographic allowance limits</td>
                </tr>
                <tr>
                  <td className="font-bold text-[var(--surplus-line)]">Multi-Sig Protocol Governance</td>
                  <td><span className="text-emerald-400 font-bold">Active — Safe 2-of-2 Multi-Sig</span></td>
                  <td className="text-[var(--surplus-line-62)]">Decentralized multi-signature contract ownership</td>
                </tr>
                <tr>
                  <td className="font-bold text-[var(--surplus-line)]">Structured Yield Vaults (CoveredUp / CashDown)</td>
                  <td><span className="text-cyan-400 font-bold">Phase 2 — Scheduled Expansion</span></td>
                  <td className="text-[var(--surplus-line-62)]">Automated options yield vaults (VaultRegistry integration)</td>
                </tr>
                <tr>
                  <td className="font-bold text-[var(--surplus-line)]">Arcum Staking & Buyback</td>
                  <td><span className="text-cyan-400 font-bold">Governance Roadmap</span></td>
                  <td className="text-[var(--surplus-line-62)]">Protocol fee distribution to staked token holders</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
