import React, { useEffect } from 'react';
import { Shield, Lock, EyeOff } from 'lucide-react';
import { applySurplusPalette } from '../data/surplusTheme';

export const PrivacyPage: React.FC = () => {
  useEffect(() => {
    applySurplusPalette('privacy');
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 font-mono text-[var(--surplus-line)] space-y-8">
      <div className="border-b border-[var(--surplus-line-24)] pb-4 space-y-2">
        <span className="text-xs uppercase tracking-wider text-[var(--surplus-line-62)]">Legal & Transparency</span>
        <h1 className="text-3xl sm:text-4xl font-display font-medium text-[var(--surplus-line)]">
          Privacy Policy
        </h1>
        <p className="text-xs text-[var(--surplus-line-62)]">
          Last updated: November 2026 • Arcum Protocol (Robinhood Chain)
        </p>
      </div>

      <div className="surplus-window p-6 sm:p-8 rounded-2xl space-y-6 text-xs leading-relaxed">
        <div className="flex items-center gap-3 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
          <EyeOff className="w-5 h-5 shrink-0 text-emerald-400" />
          <span>
            Arcum is a completely non-custodial decentralized application. We do not collect, store, sell, or monetize any personal identification information (PII).
          </span>
        </div>

        <section className="space-y-2">
          <h2 className="text-base font-bold font-sans text-[var(--surplus-line)]">1. Information We Do Not Collect</h2>
          <p className="text-[var(--surplus-line-80)]">
            We do not collect names, email addresses, phone numbers, IP addresses, cookies, or KYC data. You interact with Arcum smart contracts directly via your self-custodial Web3 wallet (e.g., MetaMask, Rainbow, Rabby).
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold font-sans text-[var(--surplus-line)]">2. Public Blockchain Data</h2>
          <p className="text-[var(--surplus-line-80)]">
            When you execute transactions (buying options, depositing liquidity, closing positions, or delegating agent policies), your wallet address, transaction parameters, and block timestamps are recorded on the public Robinhood Chain blockchain. This data is public, immutable, and accessible by anyone running an archive node or block explorer.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold font-sans text-[var(--surplus-line)]">3. RPC & Node Providers</h2>
          <p className="text-[var(--surplus-line-80)]">
            When you connect to Robinhood Chain Testnet (46630), your browser sends JSON-RPC queries directly to the public testnet endpoint (<code className="text-amber-300">https://rpc.testnet.chain.robinhood.com</code>). Please refer to the node provider's terms for details regarding server-level connection logs.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold font-sans text-[var(--surplus-line)]">4. Local Storage</h2>
          <p className="text-[var(--surplus-line-80)]">
            Arcum saves minimal user preferences (such as light/dark theme preference) in your browser’s local storage. No tracking beacons or third-party analytical trackers are embedded in the code.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold font-sans text-[var(--surplus-line)]">5. Open Source Code</h2>
          <p className="text-[var(--surplus-line-80)]">
            Arcum frontend and smart contract codebases are open source. Anyone can audit the network calls and contract calls executed by this interface.
          </p>
        </section>
      </div>
    </div>
  );
};
