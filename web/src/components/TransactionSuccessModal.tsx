import React from 'react';
import { CheckCircle2, ExternalLink, X } from 'lucide-react';
import { ArcumLogo } from './ArcumLogo';
import { getExplorerTxUrl } from '../config/wagmi';

export interface TransactionSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  txHash: string | null;
  details?: {
    action?: string;
    asset?: string;
    units?: string | number;
    amount?: string | number;
    strike?: string | number;
  };
}

export const TransactionSuccessModal: React.FC<TransactionSuccessModalProps> = ({
  isOpen,
  onClose,
  title,
  txHash,
  details,
}) => {
  if (!isOpen || !txHash) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="surplus-window rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200 text-[var(--surplus-line)] font-mono text-xs">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--surplus-line-40)] pb-3">
          <div className="flex items-center gap-2.5">
            <ArcumLogo size={24} />
            <div>
              <h3 className="font-display font-medium text-base text-[var(--surplus-line)]">
                Robinhood Testnet Receipt
              </h3>
              <p className="text-[11px] text-[var(--surplus-line-62)]">On-Chain Transaction Confirmed</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--surplus-line-62)] hover:text-[var(--surplus-line)] p-1 rounded-lg transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Transaction Info Summary Card */}
        <div className="p-3.5 rounded-xl border border-[var(--surplus-line-24)] bg-[var(--surplus-line-08)] space-y-2">
          {details?.action && (
            <div className="flex justify-between items-center text-[var(--surplus-line-62)]">
              <span>Operation:</span>
              <span className="text-[var(--surplus-line)] font-bold">{details.action}</span>
            </div>
          )}
          {details?.asset && (
            <div className="flex justify-between items-center text-[var(--surplus-line-62)]">
              <span>Asset / Contract:</span>
              <span className="text-[var(--surplus-line)] font-bold">{details.asset}</span>
            </div>
          )}
          {details?.strike !== undefined && (
            <div className="flex justify-between items-center text-[var(--surplus-line-62)]">
              <span>Strike Price:</span>
              <span className="text-[var(--surplus-line)] font-bold">${details.strike}</span>
            </div>
          )}
          {details?.units !== undefined && (
            <div className="flex justify-between items-center text-[var(--surplus-line-62)]">
              <span>Units:</span>
              <span className="text-[var(--surplus-line)] font-bold">{details.units}</span>
            </div>
          )}
          {details?.amount !== undefined && (
            <div className="flex justify-between items-center text-[var(--surplus-line-62)]">
              <span>Amount:</span>
              <span className="text-emerald-400 font-bold">{details.amount}</span>
            </div>
          )}
          <div className="flex justify-between items-center text-[var(--surplus-line-62)] pt-1 border-t border-[var(--surplus-line-14)]">
            <span>Target Network:</span>
            <span className="text-[var(--surplus-line)] font-bold">Robinhood Testnet (46630)</span>
          </div>
        </div>

        {/* Confirmation Status Box */}
        <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 space-y-3 text-center">
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <div className="text-sm font-bold text-[var(--surplus-line)]">{title}</div>
            <p className="text-[11px] text-[var(--surplus-line-80)]">
              Transaction confirmed on Robinhood Chain Testnet.
            </p>
          </div>
          <a
            href={getExplorerTxUrl(txHash, 46630)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--surplus-line-40)] text-xs font-bold text-[var(--surplus-line)] hover:bg-[var(--surplus-line)] hover:text-[var(--surplus-ground)] transition-all cursor-pointer"
          >
            <span>View on Blockscout Explorer</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Bottom CTA Button */}
        <button
          onClick={onClose}
          className="stamp-btn py-3 w-full text-xs font-bold cursor-pointer"
        >
          Done
        </button>
      </div>
    </div>
  );
};
