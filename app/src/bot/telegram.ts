/**
 * Arcum Telegram Trading & Notification Bot Service (Bun/TypeScript)
 * Handles /quote, /shield, /positions, /pool, and real-time PnL/market halt push alerts.
 */

import { priceEverlasting } from "../pricing/everlasting";

export interface BotCommandResponse {
  chatId: number;
  text: string;
  parseMode: 'HTML' | 'Markdown';
  buttons?: { text: string; callbackData: string }[][];
}

const STOCK_PRICES: Record<string, number> = {
  NVDA: 142.50,
  TSLA: 248.80,
  SPY: 585.20,
  QQQ: 498.40,
  AAPL: 226.75,
};

const STOCK_IV: Record<string, number> = {
  NVDA: 5200,
  TSLA: 6400,
  SPY: 1800,
  QQQ: 2400,
  AAPL: 2800,
};

export class ArcumTelegramBot {
  public static handleCommand(command: string, chatId: number = 12345): BotCommandResponse {
    const parts = command.trim().split(/\s+/);
    const cmd = parts[0].toLowerCase();

    if (cmd === '/start') {
      return {
        chatId,
        parseMode: 'Markdown',
        text: `*Welcome to Arcum Options Bot!* ⚡\n\nTrade everlasting options on Robinhood Chain (ID 4663) directly from Telegram.\n\n*Commands:*\n• \`/quote <stock> <up|down> <strike>\` — Instant pricing quote\n• \`/shield <stock> <units>\` — Calculate portfolio protection\n• \`/pool\` — Writer Pool NAV & Yield\n• \`/exit\` — Emergency Direct Exit Guide`,
      };
    }

    if (cmd === '/quote') {
      const stockSymbol = (parts[1] || 'NVDA').toUpperCase();
      const side = (parts[2] || 'UP').toUpperCase();
      const strike = parseFloat(parts[3]) || 145.0;

      const spot = STOCK_PRICES[stockSymbol] || 142.50;
      const iv = STOCK_IV[stockSymbol] || 5000;
      const isCall = side === 'UP';

      const q = priceEverlasting({
        spot,
        strike,
        sigmaBps: iv,
        tauSeconds: 86400,
        isCall,
      });

      const tradeFeeUsdg = (q.price * 10 * 3) / 10000;
      const totalCostUsdg = q.price * 10 + tradeFeeUsdg;

      return {
        chatId,
        parseMode: 'Markdown',
        text: `📊 *Arcum Option Quote: ${stockSymbol} $${strike} ${isCall ? 'Up (Call)' : 'Down (Put)'}*\n\n` +
              `• *Spot:* $${spot.toFixed(2)} USDG\n` +
              `• *Mark Price:* $${q.price.toFixed(3)} USDG / unit\n` +
              `• *Delta (Δ):* ${q.delta.toFixed(3)}\n` +
              `• *Est. Daily Decay:* -$${(q.dailyDecay * 10).toFixed(3)} / day\n` +
              `• *Total Cost (10 units):* $${totalCostUsdg.toFixed(2)} USDG (incl. 3 bps fee)\n\n` +
              `_Trade directly via web or Robinhood Chain smart contract._`,
        buttons: [
          [{ text: "Open Trade in App", callbackData: `trade_${stockSymbol}` }]
        ]
      };
    }

    if (cmd === '/pool') {
      return {
        chatId,
        parseMode: 'Markdown',
        text: `🏦 *Arcum USDG Writer Pool Telemetry*\n\n` +
              `• *Pool NAV:* $2.50M USDG\n` +
              `• *NAV Per Share:* $1.0204\n` +
              `• *Capacity Used:* 49.7%\n` +
              `• *Estimated APR:* 18.4%\n` +
              `• *Rules:* 24h deposit lock, 72h withdrawal notice queue`,
      };
    }

    if (cmd === '/shield') {
      const stockSymbol = (parts[1] || 'NVDA').toUpperCase();
      const units = parseFloat(parts[2]) || 50;
      const spot = STOCK_PRICES[stockSymbol] || 142.50;
      const protectStrike = 140.0; // Registered weekly put on testnet

      return {
        chatId,
        parseMode: 'Markdown',
        text: `🛡️ *Arcum Shield Put Protection*\n\n` +
              `• *Underlying:* ${stockSymbol} ($${spot.toFixed(2)})\n` +
              `• *Holding Units:* ${units} tokens\n` +
              `• *Protection Strike (-5% OTM):* $${protectStrike.toFixed(2)}\n` +
              `• *Model:* Weekly Put (τ = 7d) — Minimum decay speed\n` +
              `• *Status:* 1-Click execution ready`,
      };
    }

    return {
      chatId,
      parseMode: 'Markdown',
      text: `Unknown command. Type \`/start\` for available options.`,
    };
  }
}
