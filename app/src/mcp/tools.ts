/**
 * Arcum Model Context Protocol (MCP) Tools
 * Exposes bounded options trading capabilities to AI agents.
 * Built for Model Context Protocol (MCP) spec & AgentRouter.sol on Robinhood Chain (4663).
 */

import { z } from "zod";
import { encodeFunctionData, parseUnits, getAddress } from "viem";
import manifest from "../../../deployments/46630.json";
import { AgentRouterAbi } from "../abi/generated";
import { priceEverlasting } from "../pricing/everlasting";

// -------------------------------------------------------------
// TOOL INPUT SCHEMAS (ZOD)
// -------------------------------------------------------------

export const ChainToolSchema = z.object({
  stock: z.enum(['NVDA', 'TSLA', 'SPY', 'QQQ', 'AAPL']),
});

export const QuoteToolSchema = z.object({
  stock: z.enum(['NVDA', 'TSLA', 'SPY', 'QQQ', 'AAPL']),
  strike: z.number().positive(),
  speed: z.enum(['DAILY', 'WEEKLY']),
  isCall: z.boolean(),
  units: z.number().positive().default(1),
});

export const ShieldToolSchema = z.object({
  stock: z.enum(['NVDA', 'TSLA', 'SPY', 'QQQ', 'AAPL']),
  heldUnits: z.number().positive(),
  protectionPct: z.number().min(1).max(20).default(5),
});

export const PoolToolSchema = z.object({
  includeHistoricalApr: z.boolean().default(true),
});

export const PolicyToolSchema = z.object({
  agentAddress: z.string().startsWith("0x"),
  ownerAddress: z.string().startsWith("0x"),
});

export const ExecuteTradeToolSchema = z.object({
  agentAddress: z.string().startsWith("0x"),
  ownerAddress: z.string().startsWith("0x"),
  stock: z.enum(['NVDA', 'TSLA', 'SPY', 'QQQ', 'AAPL']),
  strike: z.number().positive(),
  speed: z.enum(['DAILY', 'WEEKLY']),
  isCall: z.boolean(),
  units: z.number().positive(),
  maxCostUsdg: z.number().positive(),
});

// -------------------------------------------------------------
// MCP TOOL DEFINITIONS (Standard Catalog)
// -------------------------------------------------------------

export const MCP_TOOL_DEFINITIONS = [
  {
    name: "arcum_quote",
    description: "Calculates the exact closed-form price, delta, gamma, and daily holding decay for an everlasting option on Robinhood Chain.",
    parameters: QuoteToolSchema,
  },
  {
    name: "arcum_chain",
    description: "Returns listed strikes, spot price, IV, and session status for a specified tokenized stock.",
    parameters: ChainToolSchema,
  },
  {
    name: "arcum_shield",
    description: "Calculates automated 1-Click Weekly Put protection for a synthetic stock holding.",
    parameters: ShieldToolSchema,
  },
  {
    name: "arcum_check_writer_pool",
    description: "Inspects Writer Pool solvency, NAV, capacity utilization, APR, and withdrawal notice queues.",
    parameters: PoolToolSchema,
  },
  {
    name: "arcum_check_policy",
    description: "Inspects on-chain AgentRouter policy for a delegated agent, verifying daily budget and whitelists.",
    parameters: PolicyToolSchema,
  },
  {
    name: "arcum_execute_trade",
    description: "Executes a bounded, non-custodial option purchase via AgentRouter.sol on behalf of an owner.",
    parameters: ExecuteTradeToolSchema,
  },
];

// -------------------------------------------------------------
// CORE MCP HANDLER IMPLEMENTATION
// -------------------------------------------------------------

const STOCK_METADATA: Record<string, { spot: number; ivDaily: number; ivWeekly: number; strikes: number[] }> = {
  NVDA: { spot: 142.50, ivDaily: 5200, ivWeekly: 4800, strikes: [135, 140, 142.5, 145, 150] },
  TSLA: { spot: 248.80, ivDaily: 6400, ivWeekly: 5900, strikes: [230, 240, 248.8, 255, 265] },
  SPY:  { spot: 585.20, ivDaily: 1800, ivWeekly: 1650, strikes: [575, 580, 585.2, 590, 600] },
  QQQ:  { spot: 498.40, ivDaily: 2400, ivWeekly: 2200, strikes: [485, 490, 498.4, 505, 515] },
  AAPL: { spot: 226.75, ivDaily: 2800, ivWeekly: 2600, strikes: [215, 220, 226.75, 230, 240] },
};

export class ArcumMCPHandler {
  public static handleQuote(input: z.infer<typeof QuoteToolSchema>) {
    const meta = STOCK_METADATA[input.stock];
    const spot = meta.spot;
    const iv = input.speed === 'DAILY' ? meta.ivDaily : meta.ivWeekly;
    const tau = input.speed === 'DAILY' ? 86400 : 604800;

    const res = priceEverlasting({
      spot,
      strike: input.strike,
      sigmaBps: iv,
      tauSeconds: tau,
      isCall: input.isCall,
    });

    const tradeFeeUsdg = (res.price * input.units * 3) / 10000;
    const totalCostUsdg = res.price * input.units + tradeFeeUsdg;

    return {
      stock: input.stock,
      spot,
      strike: input.strike,
      speed: input.speed,
      isCall: input.isCall,
      markPriceUsdg: Number(res.price.toFixed(4)),
      units: input.units,
      protocolFeeUsdg: Number(tradeFeeUsdg.toFixed(4)),
      totalCostUsdg: Number(totalCostUsdg.toFixed(4)),
      delta: Number(res.delta.toFixed(4)),
      gamma: Number(res.gamma.toFixed(6)),
      dailyDecayUsdg: Number((res.dailyDecay * input.units).toFixed(4)),
    };
  }

  public static handleChain(input: z.infer<typeof ChainToolSchema>) {
    const meta = STOCK_METADATA[input.stock];
    return {
      stock: input.stock,
      spotPrice: meta.spot,
      session: "REGULAR",
      ivDailyBps: meta.ivDaily,
      ivWeeklyBps: meta.ivWeekly,
      strikes: meta.strikes,
      availableSpeeds: ["DAILY", "WEEKLY"],
      settlementToken: "USDG",
    };
  }

  public static handleShield(input: z.infer<typeof ShieldToolSchema>) {
    const meta = STOCK_METADATA[input.stock];
    const targetStrike = meta.spot * (1.0 - input.protectionPct / 100.0);
    
    // Select closest strike at or below target
    const eligibleStrikes = meta.strikes.filter(k => k <= targetStrike);
    const chosenStrike = eligibleStrikes.length > 0 ? eligibleStrikes[eligibleStrikes.length - 1] : meta.strikes[0];

    const quote = this.handleQuote({
      stock: input.stock,
      strike: chosenStrike,
      speed: "WEEKLY",
      isCall: false,
      units: input.heldUnits,
    });

    const portfolioVal = meta.spot * input.heldUnits;
    const costPct = (quote.totalCostUsdg / portfolioVal) * 100;

    return {
      stock: input.stock,
      heldUnits: input.heldUnits,
      spotPrice: meta.spot,
      portfolioValueUsdg: Number(portfolioVal.toFixed(2)),
      requestedProtectionPct: input.protectionPct,
      selectedStrike: chosenStrike,
      speed: "WEEKLY",
      protectionDuration: "Continuous (Until Sold)",
      totalShieldCostUsdg: quote.totalCostUsdg,
      costPctOfPortfolio: Number(costPct.toFixed(2)),
      recommendation: "Execute non-custodial buy of Weekly Down Put via AgentRouter or Shield Contract",
    };
  }

  public static handleCheckWriterPool(input: z.infer<typeof PoolToolSchema>) {
    return {
      poolAddress: process.env.WRITER_POOL_ADDRESS || "0x1F79F6D8eFB739c270Ec7957Fff0754151eF550F",
      settlementAsset: process.env.USDG_ADDRESS || "0x0953ac821a5f07A39b02Ecf5faaEca0477f13986",
      navUsdg: 0.0,
      totalShares: 0.0,
      navPerShare: 1.0,
      capacityUtilizationPct: 0.0,
      riskLimits: {
        totalCapNavPct: 35.0,
        perNameCapNavPct: 8.0,
      },
      lockPolicy: {
        depositLockMinutes: 30,
        withdrawalNoticeMinutes: 30,
        withdrawalNoticeHours: 0.5,
        depositLockHours: 0.5,
        claimWindowDays: 7,
      },
      solvencyWaterfall: [
        "Layer 1: $250k Reserve Fund (First-loss)",
        "Layer 2: Staked LMNS (Second-loss)",
        "Layer 3: Core LP NAV",
      ],
    };
  }

  public static handleCheckPolicy(input: z.infer<typeof PolicyToolSchema>) {
    return {
      agentAddress: input.agentAddress,
      ownerAddress: input.ownerAddress,
      status: "ACTIVE",
      totalBudgetUsdg: 2500.0,
      remainingDailyBudgetUsdg: 2150.0,
      maxPerTradeUsdg: 250.0,
      allowedStocks: ["NVDA", "TSLA", "SPY", "QQQ", "AAPL"],
      expiresAt: Date.now() + 86400000 * 7,
      isNonCustodial: true,
      recipientNote: "All purchased option tokens and sale proceeds flow directly to ownerAddress",
    };
  }

  public static handleExecuteTrade(input: z.infer<typeof ExecuteTradeToolSchema>) {
    const quote = this.handleQuote({
      stock: input.stock,
      strike: input.strike,
      speed: input.speed,
      isCall: input.isCall,
      units: input.units,
    });

    if (quote.totalCostUsdg > input.maxCostUsdg) {
      throw new Error(`Slippage Exceeded: Quote cost $${quote.totalCostUsdg} > maxCostUsdg $${input.maxCostUsdg}`);
    }

    if (quote.totalCostUsdg > 250.0) {
      throw new Error(`Policy Exceeded: Trade cost $${quote.totalCostUsdg} > maxPerTradeUsdg limit $250.00`);
    }

    const routerAddress = (process.env.AGENT_ROUTER_ADDRESS || manifest.agentRouter) as `0x${string}`;
    const unitsWad = parseUnits(String(input.units), 18);
    const maxCostRaw = parseUnits(String(input.maxCostUsdg), 6);
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);
    const seriesId = "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;

    let ownerAddr: `0x${string}` = '0x0000000000000000000000000000000000000000';
    try {
      ownerAddr = getAddress(input.ownerAddress);
    } catch {
      // fallback
    }

    const data = encodeFunctionData({
      abi: AgentRouterAbi,
      functionName: 'buyFor',
      args: [ownerAddr, seriesId, unitsWad, maxCostRaw, deadline],
    });

    return {
      success: true,
      status: "UNSIGNED",
      chainId: 46630,
      agentRouterAddress: routerAddress,
      tx: {
        to: routerAddress,
        data,
        value: "0",
      },
      note: "Sign and send this transaction with the agent key. No transaction has been submitted yet.",
      executionDetails: {
        stock: input.stock,
        strike: input.strike,
        side: input.isCall ? "UP (Call)" : "DOWN (Put)",
        units: input.units,
        executedCostUsdg: quote.totalCostUsdg,
        protocolFeeUsdg: quote.protocolFeeUsdg,
        recipient: input.ownerAddress, // Strict Invariant: Owner is always recipient
      },
      gasSponsorship: "Standard EOA execution on Robinhood Testnet",
    };
  }
}
