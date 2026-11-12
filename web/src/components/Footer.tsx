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
          <button onClick={() => onNavigate('dashboard')} className="hover:text-[var(--surplus-line)] transition-colors">
            Trade
          </button>
          <button onClick={() => onNavigate('docs')} className="hover:text-[var(--surplus-line)] transition-colors">
            Prospectus
          </button>
          <button onClick={() => onNavigate('contracts')} className="hover:text-[var(--surplus-line)] transition-colors">
            Register
          </button>
          <button onClick={() => onNavigate('exit')} className="hover:text-[var(--surplus-line)] transition-colors">
            Emergency Exit
          </button>
        </div>
      </div>
    </footer>
  );
};
