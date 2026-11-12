import React, { useState } from 'react';
import { Coins, CheckCircle2, ExternalLink, X, RefreshCw, AlertCircle, Copy } from 'lucide-react';
import { useAccount, useWriteContract } from 'wagmi';
import { getContractsForChain, getExplorerTxUrl } from '../config/wagmi';
import { ERC20_ABI } from '../contracts/abis';
import { ArcumLogo } from './ArcumLogo';

interface TestnetFaucetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const TestnetFaucetModal: React.FC<TestnetFaucetModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { address, isConnected, chainId } = useAccount();
  const [isMinting, setIsMinting] = useState<boolean>(false);
  const [mintTxHash, setMintTxHash] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const { writeContractAsync } = useWriteContract();
  const activeContracts = getContractsForChain(chainId || 46630);

  if (!isOpen) return null;

  const handleClaimFaucet = async () => {
    if (!address) return;
    setIsMinting(true);
    setErrorMsg(null);
    setMintTxHash(null);

    try {
      // 1,000 USDG with 6 decimals = 1,000,000,000 units
      const mintAmount = 1000_000_000n;

      const hash = await writeContractAsync({
        address: activeContracts.usdg,
        abi: ERC20_ABI,
        functionName: 'mint',
        args: [address, mintAmount],
      });

      setMintTxHash(hash);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.warn('On-chain mint result:', err);
      if (err?.message?.includes('User rejected')) {
        setErrorMsg('Transaction rejected in wallet.');
      } else {
        // Honest error message: do not fabricate fake confirmation hash
        const cleanMsg = err?.shortMessage || err?.message || 'Transaction could not be confirmed on chain.';
        setErrorMsg(`${cleanMsg} (Ensure wallet holds Testnet ETH for gas on Chain 46630).`);
      }
    } finally {
      setIsMinting(false);
    }
  };

  const handleCopyToken = () => {
    navigator.clipboard.writeText(activeContracts.usdg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="surplus-window rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200 text-[var(--surplus-line)] font-mono text-xs">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--surplus-line-40)] pb-3">
          <div className="flex items-center gap-2.5">
            <ArcumLogo size={24} />
            <div>
              <h3 className="font-display font-medium text-base text-[var(--surplus-line)]">
                Robinhood Testnet Faucet
              </h3>
              <p className="text-[11px] text-[var(--surplus-line-62)]">USDG Settlement Collateral</p>
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

        {/* Info Card */}
        <div className="space-y-3">
          <div className="p-3.5 rounded-xl border border-[var(--surplus-line-24)] bg-[var(--surplus-line-08)] space-y-2">
            <div className="flex justify-between items-center text-[var(--surplus-line-62)]">
              <span>Recipient:</span>
              <span className="text-[var(--surplus-line)] font-bold">
                {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Wallet Disconnected'}
              </span>
            </div>
            <div className="flex justify-between items-center text-[var(--surplus-line-62)]">
              <span>Claim Amount:</span>
              <span className="text-emerald-400 font-bold">1,000.00 USDG</span>
            </div>
            <div className="flex justify-between items-center text-[var(--surplus-line-62)]">
              <span>Target Network:</span>
              <span className="text-[var(--surplus-line)] font-bold">Robinhood Testnet (46630)</span>
            </div>
            <div className="pt-2 border-t border-[var(--surplus-line-14)] text-[10px] text-[var(--surplus-line-62)] leading-relaxed">
              • Wallet requires a small amount of Testnet ETH for network gas fee on Chain 46630.
            </div>
          </div>

          {/* Token Address Copy Helper */}
          <div className="flex items-center justify-between p-2.5 rounded-xl border border-[var(--surplus-line-24)] bg-[var(--surplus-line-08)] text-[11px]">
            <span className="text-[var(--surplus-line-62)] truncate max-w-[240px]">
              USDG: {activeContracts.usdg.slice(0, 10)}...{activeContracts.usdg.slice(-6)}
            </span>
            <button
              onClick={handleCopyToken}
              className="flex items-center gap-1 text-[var(--surplus-line)] hover:underline ml-2 cursor-pointer font-bold"
            >
              <Copy className="w-3 h-3" />
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="p-3 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-300 text-xs flex items-start gap-2 leading-relaxed">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Success Confirmation Card */}
        {mintTxHash ? (
          <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 space-y-3 text-center">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-bold text-[var(--surplus-line)]">1,000 USDG Claimed!</div>
              <p className="text-[11px] text-[var(--surplus-line-80)]">
                Transaction confirmed on Robinhood Chain Testnet.
              </p>
            </div>
            <a
              href={getExplorerTxUrl(mintTxHash, chainId || 46630)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--surplus-line-40)] text-xs font-bold text-[var(--surplus-line)] hover:bg-[var(--surplus-line)] hover:text-[var(--surplus-ground)] transition-all"
            >
              <span>View on Blockscout Explorer</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        ) : (
          <button
            onClick={handleClaimFaucet}
            disabled={!isConnected || isMinting}
            className="stamp-btn py-3.5 w-full text-xs font-bold"
          >
            {isMinting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                <span>Broadcasting to Testnet...</span>
              </>
            ) : (
              <>
                <Coins className="w-4 h-4 mr-2" />
                <span>{isConnected ? 'Claim 1,000 Test USDG' : 'Connect Wallet First'}</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
