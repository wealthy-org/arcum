import React, { useState } from 'react';

export const ARCUM_TOKEN_CA = '0x5e424abb19dbaf9c929e6792b1c987c6e51d00ad';

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  }
}

export const ContractAddress: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    if (await copyText(ARCUM_TOKEN_CA)) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    }
  };

  return (
    <button
      type="button"
      onClick={onCopy}
      title="Copy contract address"
      aria-label={`Copy contract address ${ARCUM_TOKEN_CA}`}
      className={`group inline-flex max-w-full items-center gap-2 rounded-full border border-[var(--surplus-line-24)] bg-[var(--surplus-line-08)] px-3 py-1.5 font-mono text-[11px] text-[var(--surplus-line-80)] transition-colors hover:border-[var(--surplus-line)] hover:text-[var(--surplus-line)] active:scale-[0.98] select-text ${className}`}
    >
      <span className="font-bold uppercase tracking-wider text-[var(--surplus-line-62)]">CA</span>
      <span className="hidden lg:inline truncate">{ARCUM_TOKEN_CA}</span>
      <span className="lg:hidden">{short(ARCUM_TOKEN_CA)}</span>
      <span
        className={`shrink-0 font-bold ${copied ? 'text-emerald-400' : 'text-[var(--surplus-line-62)] group-hover:text-[var(--surplus-line)]'}`}
        aria-live="polite"
      >
        {copied ? 'Copied ✓' : 'Copy'}
      </span>
    </button>
  );
};
