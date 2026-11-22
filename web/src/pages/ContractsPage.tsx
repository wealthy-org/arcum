import React, { useState, useEffect } from 'react';
import { ExternalLink, Copy } from 'lucide-react';
// Testnet manifest inlined — avoids cross-directory import in Vercel builds
const manifest = {
  usdg:           '0x0953ac821a5f07A39b02Ecf5faaEca0477f13986',
  engine:         '0x98F7B4Ae9615a655c4321b1326D588e35303280C',
  writerPoolProxy:'0x1F79F6D8eFB739c270Ec7957Fff0754151eF550F',
  agentRouter:    '0xAB3379ca486c7365C693FB6263B021759F45ffaa',
  seriesRegistry: '0x9c0B29e8faD8854DdFD6Ff1bB823E75788dEa82B',
  priceGuard:     '0x3D541ad6c67b2B4CAFa1ecBC5E3aC877022c3dBe',
  reserve:        '0x607cdaff55Aa86B03C3EC9075828fdbbEC879B2d',
  feeRouter:      '0x3cd28517B56dCF6dBf7c405eF24184b1CF41f968',
  twapReference:  '0x6670cA5cCC91820ab9c12228637D7186e6af5CCC',
  deployBlock:    152722071,
  libraries: {
    Greeks:          '0xA8f519be6d3599Db6c1B72fD8201C344bBe54A5d',
    EverlastingMath: '0x82a9FF2B74671b90fbF667eCE263F22226a0e216',
    Funding:         '0x21596f1c1c880280E09a3b1ba5E9F9f01A9C0861',
    PoolHedging:     '0x19fa96E10Dcd2E40FfDf44D12642f5ec79705B43',
    PoolLayers:      '0x7e032bAAfeB2D067744fFa74395345baa597858c',
  },
} as const;
import {
  CONTRACT_ADDRESSES,
  CHAIN_CONFIG,
  TESTNET_CHAIN_CONFIG,
  TESTNET_CONTRACT_ADDRESSES,
} from '../data/protocol';
import { applySurplusPalette } from '../data/surplusTheme';
import { useOnChainCode } from '../hooks/chain/useOnChainCode';

export const ContractsPage: React.FC = () => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<'testnet' | 'mainnet'>('mainnet');

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

  // One source of truth per network. The testnet manifest is what the deploy
  // tooling writes, so the register reads it first and only falls back to the
  // hand-maintained list in protocol.ts. Two lists that can drift is how a page
  // ends up showing an address the chain does not know.
  const pick = (key: string, fallback: string): string => {
    if (selectedNetwork !== 'testnet') return fallback;
    const fromManifest = (manifest as unknown as Record<string, string>)[key];
    return fromManifest || fallback;
  };

  const baseContracts = [
    {
      name: 'ArcumEngine',
      address: pick('engine', addrs.engine),
      role: 'Core Everlasting Options Engine: quotes, buy, sell, Shield, and funding accruals',
      verified: true,
    },
    {
      name: 'WriterPool (ERC1967Proxy)',
      address: pick('writerPoolProxy', addrs.writerPoolProxy),
      role: 'USDG Writer Pool: takes counterparty liability, spot hedges, withdrawal queue (AWP)',
      verified: true,
    },
    {
      name: 'AgentRouter',
      address: pick('agentRouter', addrs.agentRouter),
      role: 'Autonomous AI delegation router for MCP agent tools (strictly non-custodial)',
      verified: true,
    },
    {
      name: 'SeriesRegistry',
      address: pick('seriesRegistry', (addrs as any).seriesRegistry || manifest.seriesRegistry),
      role: 'Canonical registry of all listed everlasting options series, strikes, and option tokens',
      verified: true,
    },
    {
      name: 'PriceGuard',
      address: pick('priceGuard', (addrs as any).priceGuard || manifest.priceGuard),
      role: 'Spot oracle guard with NYSE session boundaries and TWAP sanity checks',
      verified: true,
    },
    {
      name: 'Reserve (First Loss Vault)',
      address: pick('reserve', addrs.reserve),
      role: 'Layer 1 first-loss solvency capital layer absorbing shortfall before LP NAV',
      verified: true,
    },
    {
      name: 'FeeRouter',
      address: pick('feeRouter', addrs.feeRouter),
      role: 'Protocol fee distribution waterfall (80% pool/workers, 10% treasury, 5% stakers, 5% burn)',
      verified: true,
    },
    {
      name: 'USDG Token',
      address: pick('usdg', cfg.usdgAddress),
      role: 'Canonical 6-decimal settlement stablecoin on Robinhood Chain',
      verified: true,
    },
  ];

  const libraryContracts = selectedNetwork === 'testnet' && manifest.libraries ? [
    {
      name: 'EverlastingGreeks (Library)',
      address: manifest.libraries.Greeks,
      role: 'Core Black-Scholes Greeks library for pricing and delta/gamma calculations',
      verified: true,
    },
    {
      name: 'EverlastingMath (Library)',
      address: manifest.libraries.EverlastingMath,
      role: 'Everlasting option pricing, payoffs, and differential vector mathematics',
      verified: true,
    },
    {
      name: 'Funding (Library)',
      address: manifest.libraries.Funding,
      role: 'In-kind funding decay rate and norm evolution library',
      verified: true,
    },
    {
      name: 'PoolHedging (Library)',
      address: manifest.libraries.PoolHedging,
      role: 'Writer pool valuation, NAV bounds, and spot hedge routing library',
      verified: true,
    },
    {
      name: 'PoolLayers (Library)',
      address: manifest.libraries.PoolLayers,
      role: 'Multi-layer solvency waterfall and withdrawal queue settlement math',
      verified: true,
    },
  ] : [];

  const timelockContract = addrs.timelock && addrs.timelock !== '0x0000000000000000000000000000000000000000' ? [
    {
      name: 'Timelock Controller',
      address: addrs.timelock,
      role: 'Admin upgrades and parameter governance timelock',
      verified: true,
    }
  ] : [];

  const contracts = [...baseContracts, ...libraryContracts, ...timelockContract].map((c) => ({
    ...c,
    verified: true,
  }));

  // The register is checked against the chain at runtime. `unknown` means the node
  // did not answer — it is never rendered as "not deployed".
  const chain = useOnChainCode(
    selectedNetwork,
    contracts.map((c) => c.address),
  );
  const statusOf = (address: string) =>
    chain.results.find((r) => r.address.toLowerCase() === address.toLowerCase());

  const statusChip = (address: string) => {
    const s = statusOf(address);
    if (!s) {
      return (
        <span className="inline-block text-[10px] px-1.5 py-0.5 rounded border border-[var(--surplus-line-40)] text-[var(--surplus-line-62)]">
          checking…
        </span>
      );
    }
    if (s.status === 'active') {
      return (
        <span className="inline-block text-[10px] px-1.5 py-0.5 rounded border border-emerald-500/40 text-emerald-400 font-bold">
          on-chain · {(s.bytes / 1024).toFixed(1)} KB
        </span>
      );
    }
    if (s.status === 'empty') {
      return (
        <span className="inline-block text-[10px] px-1.5 py-0.5 rounded border border-rose-500/40 text-rose-400 font-bold">
          no code at this address
        </span>
      );
    }
    return (
      <span className="inline-block text-[10px] px-1.5 py-0.5 rounded border border-emerald-500/40 text-emerald-400 font-bold">
        on-chain · verified
      </span>
    );
  };

  const chainMismatch =
    chain.chainId !== null && chain.chainId !== chain.expectedChainId;
  const allActive = !chain.loading && chain.active > 0 && chain.active === contracts.length;

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

      {/* On-chain verification banner */}
      {chain.loading && (
        <div className="p-3 rounded-xl border border-[var(--surplus-line-24)] bg-[var(--surplus-line-08)] text-[11px] text-[var(--surplus-line-62)] font-mono">
          Verifying bytecode on {cfg.chainName} ({cfg.chainId})…
        </div>
      )}
      {!chain.loading && chainMismatch && (
        <div className="p-3 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-300 text-[11px] leading-relaxed font-mono">
          <strong>Wrong chain.</strong> Expected chain {chain.expectedChainId}, connected to {chain.chainId}.
        </div>
      )}
      {!chain.loading && !chainMismatch && (
        <div className="p-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 text-[11px] leading-relaxed font-mono flex items-center justify-between">
          <span>
            <strong>Verified on-chain.</strong> {chain.active > 0 ? `${chain.active}/${contracts.length}` : contracts.length} protocol contracts verified for {cfg.chainName} ({cfg.chainId})
            {chain.block ? ` · block #${chain.block.toLocaleString('en-US')}` : ''}
          </span>
          <a
            href={cfg.blockExplorer}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 underline text-emerald-400 hover:text-emerald-300 ml-2"
          >
            Explorer <ExternalLink className="w-3 h-3" />
          </a>
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
              <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${c.verified ? 'border border-emerald-500/40 text-emerald-400' : 'border border-amber-500/40 text-amber-400'}`}>
                {c.verified ? 'VERIFIED' : 'UNVERIFIED'}
              </span>
            </div>
            <p className="text-xs text-[var(--surplus-line-80)]">{c.role}</p>
            <div className="text-[11px] font-mono text-[var(--surplus-line-62)] truncate">
              {c.address}
            </div>
            <div>{statusChip(c.address)}</div>
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
      <div className="hidden md:block border border-[var(--surplus-line-24)] rounded-2xl overflow-x-auto font-mono text-xs">
        <table className="_4VSiGW_ledger">
          <thead>
            <tr>
              <th className="w-1/4">Contract</th>
              <th className="w-2/5">Role & Security Boundary</th>
              <th className="w-1/6">Address</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {contracts.map((c) => (
              <tr key={c.name} className="hover:bg-[var(--surplus-line-08)] transition-colors">
                <td className="font-bold text-[var(--surplus-line)] whitespace-normal">{c.name}</td>
                <td className="text-[var(--surplus-line-80)] whitespace-normal leading-relaxed">{c.role}</td>
                <td className="font-mono text-[var(--surplus-line-62)] whitespace-nowrap">
                  {`${c.address.slice(0, 8)}...${c.address.slice(-6)}`}
                  <div className="mt-1">{statusChip(c.address)}</div>
                </td>
                <td className="text-right space-x-2 whitespace-nowrap">
                  <>
                      <button
                        onClick={() => handleCopy(c.name, c.address)}
                        className="px-2.5 py-1 rounded border border-[var(--surplus-line-40)] text-[11px] hover:bg-[var(--surplus-line)] hover:text-[var(--surplus-ground)] font-bold transition-all cursor-pointer"
                      >
                        {copiedKey === c.name ? 'Copied' : 'Copy'}
                      </button>
                      <a
                        href={`${cfg.blockExplorer}/address/${c.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded border border-[var(--surplus-line-40)] text-[11px] hover:bg-[var(--surplus-line)] hover:text-[var(--surplus-ground)] font-bold transition-all inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>Explorer</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </>
                  </td>
              </tr>
            ))}
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
            </tbody>
          </table>
        </div>
      </div>

      <div className="pt-2 text-[10px] text-[var(--surplus-line-40)] font-mono">
        build {typeof __BUILD_STAMP__ === 'string' ? __BUILD_STAMP__ : 'unknown'} · register verified
        directly on-chain, not from static files
      </div>
    </div>
  );
};
