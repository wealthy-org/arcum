import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { StockInfo } from '../types';

interface StockTickerBarProps {
  stocks: StockInfo[];
  selectedStock: StockInfo;
  onSelectStock: (stock: StockInfo) => void;
  onNavigate?: (route: string, tab?: string) => void;
}

export const StockTickerBar: React.FC<StockTickerBarProps> = ({
  stocks,
  selectedStock,
  onSelectStock,
  onNavigate,
}) => {
  return (
    <div className="bg-arcum-bgElevated border-b border-white/[0.08] overflow-x-auto scrollbar-none py-2 px-4">
      <div className="max-w-7xl mx-auto flex items-center gap-4 min-w-max">
        <span className="text-xs uppercase tracking-wider text-arcum-muted font-mono font-medium pr-3 border-r border-white/10 flex items-center gap-1.5 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-arcum-cyan animate-pulse" />
          Underlying (USDG)
        </span>

        {stocks.map((stock) => {
          const isSelected = selectedStock.symbol === stock.symbol;
          const isPositive = stock.change24h >= 0;

          return (
            <button
              key={stock.symbol}
              onClick={() => {
                onSelectStock(stock);
                if (onNavigate) onNavigate('dashboard', 'trade');
              }}
              className={`flex items-center gap-3 px-3 py-1 rounded-md text-xs font-mono transition-all ${
                isSelected
                  ? 'bg-arcum-cyan/15 border border-arcum-cyan/40 text-white shadow-sm font-bold'
                  : 'hover:bg-white/5 text-arcum-muted hover:text-white border border-transparent'
              }`}
            >
              <div className="font-bold font-sans text-white">{stock.symbol}</div>
              <div className="font-tabular font-medium text-white">${stock.price.toFixed(2)}</div>
              <div
                className={`flex items-center gap-0.5 font-tabular font-medium ${
                  isPositive ? 'text-arcum-up' : 'text-arcum-down'
                }`}
              >
                {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {isPositive ? '+' : ''}{stock.change24h.toFixed(2)}%
              </div>
              <div className="text-[10px] text-arcum-muted bg-arcum-surface px-1.5 py-0.5 rounded border border-white/5">
                IV {(stock.ivDailyBps / 100).toFixed(0)}%
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
