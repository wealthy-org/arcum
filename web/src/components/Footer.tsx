import React from 'react';
import { ExternalLink, ShieldCheck } from 'lucide-react';
import { CONTRACT_ADDRESSES, CHAIN_CONFIG } from '../data/protocol';

interface FooterProps {
  onNavigate: (route: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="border-t border-white/[0.08] bg-arcum-bg text-arcum-muted text-xs mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-arcum-cyan via-arcum-cobalt to-arcum-violet p-[1.5px] shadow-[0_0_12px_rgba(25,230,255,0.3)]">
                <div className="w-full h-full bg-arcum-bg rounded-[6px] flex items-center justify-center font-display font-black text-arcum-cyan text-xs">
                  A
                </div>
              </div>
              <span className="font-display font-bold text-base text-white tracking-tight">ARCUM</span>
              <span className="text-[10px] font-mono text-arcum-cyan px-1.5 py-0.5 rounded bg-arcum-cyan/10 border border-arcum-cyan/25">
                4663
              </span>
            </div>
            <p className="text-arcum-muted leading-relaxed text-xs">
              Everlasting options protocol for tokenized US equities on Robinhood Chain. Continuous funding decay, zero expiration dates, and USDG settlement.
            </p>
            <div className="flex items-center gap-2 text-[11px] font-mono text-arcum-muted pt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-arcum-cyan" />
              Robinhood Chain Mainnet • Chain 4663
            </div>
          </div>

          {/* Protocol Links */}
          <div className="space-y-3">
            <div className="text-white font-mono text-xs font-semibold uppercase tracking-wider">
              Protocol
            </div>
            <ul className="space-y-2 font-mono text-xs">
              <li>
                <button onClick={() => onNavigate('dashboard')} className="hover:text-arcum-cyan transition-colors">
                  Swap (Trading Terminal)
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('markets')} className="hover:text-arcum-cyan transition-colors">
                  Pools (Strikes & Chains)
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('products')} className="hover:text-arcum-cyan transition-colors">
                  Shield Protection
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('writers')} className="hover:text-arcum-cyan transition-colors">
                  Writer Pool Yield
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('protocol')} className="hover:text-arcum-cyan transition-colors">
                  Protocol Analytics
                </button>
              </li>
            </ul>
          </div>

          {/* Developers & Verification */}
          <div className="space-y-3">
            <div className="text-white font-mono text-xs font-semibold uppercase tracking-wider">
              Developers & Security
            </div>
            <ul className="space-y-2 font-mono text-xs">
              <li>
                <button onClick={() => onNavigate('contracts')} className="hover:text-arcum-cyan transition-colors flex items-center gap-1.5">
                  Verified Contracts <ExternalLink className="w-3 h-3 text-arcum-muted" />
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('docs')} className="hover:text-arcum-cyan transition-colors">
                  Interactive Docs Portal
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('learn')} className="hover:text-arcum-cyan transition-colors">
                  Euler-Cauchy ODE Sandbox
                </button>
              </li>
              <li>
                <a
                  href={CHAIN_CONFIG.blockExplorer}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-arcum-cyan transition-colors flex items-center gap-1.5 text-arcum-muted"
                >
                  Blockscout Explorer <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                <button onClick={() => onNavigate('exit')} className="text-arcum-cyan hover:underline transition-colors flex items-center gap-1.5">
                  Emergency Exit Guide
                </button>
              </li>
            </ul>
          </div>

          {/* Security & Governance */}
          <div className="space-y-3">
            <div className="text-white font-mono text-xs font-semibold uppercase tracking-wider">
              Governance & Safety
            </div>
            <div className="space-y-2 text-xs text-arcum-muted">
              <div className="p-3 rounded-lg bg-arcum-bgElevated border border-white/5 space-y-1">
                <div className="flex items-center gap-1.5 text-white font-mono font-medium text-[11px]">
                  <ShieldCheck className="w-3.5 h-3.5 text-arcum-cyan" />
                  48-Hour Admin Timelock
                </div>
                <p className="text-[11px] text-arcum-muted">
                  No instant upgrades. All parameter updates enforce a 48h timelock notice.
                </p>
              </div>
              <p className="text-[11px] text-arcum-muted leading-relaxed">
                Settled exclusively in USDG. Zero margin calls or liquidations on option buyer positions.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-arcum-border flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[11px]">
          <div>
            © 2026 Arcum Protocol • Deployed on Robinhood Chain Mainnet (Chain ID 4663)
          </div>
          <div className="flex items-center gap-6">
            <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Mainnet Operational
            </span>
            <span className="text-arcum-muted">Cancun EVM Solc 0.8.28</span>
            <span className="text-arcum-cyan font-semibold">Sourcify Verified Exact Match</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
