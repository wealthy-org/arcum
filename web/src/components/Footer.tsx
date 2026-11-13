import React from 'react';
import { ArcumLogo } from './ArcumLogo';

interface FooterProps {
  onNavigate: (route: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="border-t border-[var(--surplus-line-14)] bg-[var(--surplus-ground)] text-[var(--surplus-line-62)] font-mono text-xs py-8 px-6 transition-colors duration-700 ease-out">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-[var(--surplus-line)]">
          <ArcumLogo size={20} />
          <span className="font-display font-medium text-sm">Arcum</span>
          <span className="text-[11px] text-[var(--surplus-line-62)]">· Robinhood Chain (4663) · USDG Settlement</span>
        </div>

        <div className="flex items-center gap-4 text-[11px] text-[var(--surplus-line-80)]">
          <button onClick={() => onNavigate('dashboard')} className="hover:text-[var(--surplus-line)] transition-colors cursor-pointer">
            Trade
          </button>
          <button onClick={() => onNavigate('docs')} className="hover:text-[var(--surplus-line)] transition-colors cursor-pointer">
            Prospectus
          </button>
          <button onClick={() => onNavigate('contracts')} className="hover:text-[var(--surplus-line)] transition-colors cursor-pointer">
            Register
          </button>
          <button onClick={() => onNavigate('exit')} className="hover:text-[var(--surplus-line)] transition-colors cursor-pointer">
            Emergency Exit
          </button>
          <a
            href="https://x.com/arcumpool"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[var(--surplus-line)] transition-colors inline-flex items-center gap-1.5 font-medium ml-1"
            title="Follow Arcum on X (@arcumpool)"
          >
            <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            <span>@arcumpool</span>
          </a>
        </div>
      </div>
    </footer>
  );
};
