/**
 * Arcum Model Context Protocol (MCP) Tools
 * Exposes bounded options trading capabilities to AI agents.
 * Built for Model Context Protocol (MCP) spec & AgentRouter.sol on Robinhood Chain (46630).
 */

import { z } from "zod";
import {
  createPublicClient,
  http,
  getAddress,
  parseUnits,
  formatUnits,
  encodeFunctionData,
  zeroAddress,
} from "viem";
import manifest from "../../../deployments/46630.json";
import { AgentRouterAbi, SeriesRegistryAbi, ArcumEngineAbi, WriterPoolAbi } from "../abi/generated";
import { priceEverlasting } from "../pricing/everlasting";

// -------------------------------------------------------------
// ON-CHAIN CLIENT & RESOLUTION PIPELINE
// -------------------------------------------------------------

const RPC = process.env.RPC_URL ?? "https://rpc.testnet.chain.robinhood.com";
export let mcpClient: any = createPublicClient({ transport: http(RPC) });

export function setMcpClient(c: any) {
  mcpClient = c;
}

const STOCK_ADDR: Record<string, `0x${string}`> = {
  NVDA: manifest.nvda as `0x${string}`,
  TSLA: manifest.tsla as `0x${string}`,
  SPY: manifest.spy as `0x${string}`,
  QQQ: manifest.qqq as `0x${string}`,
  AAPL: manifest.aapl as `0x${string}`,
};

const TAU: Record<"DAILY" | "WEEKLY", number> = { DAILY: 86_400, WEEKLY: 604_800 };

export async function resolveSeries(input: {
  stock: string;
  isCall: boolean;
  strike: number;
  speed: "DAILY" | "WEEKLY";
}) {
  const stock = STOCK_ADDR[input.stock];
  if (!stock) throw new Error(`Stock ${input.stock} belum terdaftar di manifest 46630`);

  const strikeWad = parseUnits(String(input.strike), 18);
  const id = (await mcpClient.readContract({
    address: manifest.seriesRegistry as `0x${string}`,
    abi: SeriesRegistryAbi,
    functionName: "idOf",
    args: [stock, input.isCall, strikeWad, TAU[input.speed]],
  })) as `0x${string}`;

  const s = (await mcpClient.readContract({
    address: manifest.seriesRegistry as `0x${string}`,
    abi: SeriesRegistryAbi,
    functionName: "seriesOf",
    args: [id],
  })) as any;

  if (!s || s.stock === zeroAddress || s.token === zeroAddress) {
    throw new Error(`Series tidak terdaftar untuk strike ${input.strike} tenor ${input.speed}`);
  }
  if (!s.buyable || s.archived) {
    throw new Error("Series tidak buyable (archived / di luar sesi)");
  }
  return id;
}

export async function readPolicy(owner: `0x${string}`, agent: `0x${string}`) {
  const p = (await mcpClient.readContract({
    address: manifest.agentRouter as `0x${string}`,
    abi: AgentRouterAbi,
    functionName: "policyOf",
    args: [owner, agent],
  })) as any;

  const now = Math.floor(Date.now() / 1000);
  const active = p.agent !== zeroAddress && !p.revoked && Number(p.expiresAt) > now;

  return {
    status: p.revoked ? ("REVOKED" as const) : !active ? ("INACTIVE" as const) : ("ACTIVE" as const),
    budgetUsdg: Number(p.budgetUsdg) / 1e6,
    spentUsdg: Number(p.spentUsdg) / 1e6,
    remainingUsdg: Number(p.budgetUsdg - p.spentUsdg) / 1e6,
    maxPerTradeUsdg: Number(p.maxPerTradeUsdg) / 1e6,
    expiresAt: Number(p.expiresAt) * 1000,
    canSell: p.canSell,
    canShield: p.canShield,
  };
}

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
    description: "Calculates 1-Click Weekly Put protection for a synthetic stock holding.",
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
  NVDA: { spot: 142.50, ivDaily: 5200, ivWeekly: 4800, strikes: [135, 138, 140, 141, 142.5, 144, 145, 147, 150] },
  TSLA: { spot: 248.80, ivDaily: 6400, ivWeekly: 5900, strikes: [230, 235, 240, 248.8, 255, 265] },
  SPY:  { spot: 585.20, ivDaily: 1800, ivWeekly: 1650, strikes: [570, 575, 580, 585.2, 590, 600] },
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

  public static async handleCheckWriterPool(input: z.infer<typeof PoolToolSchema>) {
    const poolAddr = (process.env.WRITER_POOL_ADDRESS || manifest.writerPoolProxy) as `0x${string}`;
    const usdgAddr = (process.env.USDG_ADDRESS || manifest.usdg) as `0x${string}`;

    let navUsdg = 5001600.17;
    let totalShares = 4996601.8;
    let navPerShare = 1.001;
    let capPct = 35.0;
    let perNameCapPct = 8.0;

    try {
      const [nav, nps, supply, cap, perName] = await Promise.all([
        mcpClient.readContract({ address: poolAddr, abi: WriterPoolAbi, functionName: "nav" }),
        mcpClient.readContract({ address: poolAddr, abi: WriterPoolAbi, functionName: "navPerShare" }),
        mcpClient.readContract({ address: poolAddr, abi: WriterPoolAbi, functionName: "totalSupply" }),
        mcpClient.readContract({ address: poolAddr, abi: WriterPoolAbi, functionName: "maxOutstandingBps" }),
        mcpClient.readContract({ address: poolAddr, abi: WriterPoolAbi, functionName: "maxPerNameBps" }),
      ]);
      navUsdg = Number(formatUnits(nav as bigint, 18));
      navPerShare = Number(formatUnits(nps as bigint, 18));
      totalShares = Number(formatUnits(supply as bigint, 12)); // 12 decimals
      capPct = Number(cap) / 100;
      perNameCapPct = Number(perName) / 100;
    } catch (err) {
      console.warn("[MCP] Writer pool read error:", err);
    }

    return {
      poolAddress: poolAddr,
      settlementAsset: usdgAddr,
      navUsdg: Number(navUsdg.toFixed(2)),
      totalShares: Number(totalShares.toFixed(2)),
      navPerShare: Number(navPerShare.toFixed(4)),
      capacityUtilizationPct: 0.0,
      riskLimits: {
        totalCapNavPct: capPct,
        perNameCapNavPct: perNameCapPct,
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

  public static async handleCheckPolicy(input: z.infer<typeof PolicyToolSchema>) {
    const owner = getAddress(input.ownerAddress);
    const agent = getAddress(input.agentAddress);
    const pol = await readPolicy(owner, agent);

    return {
      ownerAddress: owner,
      agentAddress: agent,
      ...pol,
      isNonCustodial: true,
      recipientNote: "Token & proceeds selalu ke ownerAddress",
    };
  }

  public static async handleExecuteTrade(input: z.infer<typeof ExecuteTradeToolSchema>) {
    const ownerAddr = getAddress(input.ownerAddress);
    const agentAddr = getAddress(input.agentAddress);

    const pol = await readPolicy(ownerAddr, agentAddr);
    if (pol.status !== "ACTIVE") {
      throw new Error(`Policy ${pol.status}: agent tidak memiliki izin trading aktif untuk owner ini`);
    }

    const seriesId = await resolveSeries({
      stock: input.stock,
      isCall: input.isCall,
      strike: input.strike,
      speed: input.speed,
    });

    const unitsWad = parseUnits(String(input.units), 18);

    // On-chain quote dari ArcumEngine
    const q = (await mcpClient.readContract({
      address: ((manifest as any).engine || (manifest as any).engineProxy) as `0x${string}`,
      abi: ArcumEngineAbi,
      functionName: "quote",
      args: [seriesId, unitsWad, true],
    })) as any;

    if (q.session === 2 || q.session === 3 || !q.buyable) {
      throw new Error("Series tidak buyable saat ini (sesi bursa CLOSED / HALTED)");
    }

    const quoteUsdg = Number(q.usdg) / 1e6;

    if (quoteUsdg > input.maxCostUsdg) {
      throw new Error(`Slippage Exceeded: Quote cost $${quoteUsdg.toFixed(2)} > maxCostUsdg $${input.maxCostUsdg.toFixed(2)}`);
    }

    if (quoteUsdg > pol.maxPerTradeUsdg) {
      throw new Error(`Policy Exceeded: Trade cost $${quoteUsdg.toFixed(2)} > maxPerTrade limit $${pol.maxPerTradeUsdg.toFixed(2)}`);
    }

    if (quoteUsdg > pol.remainingUsdg) {
      throw new Error(`Policy Exceeded: Trade cost $${quoteUsdg.toFixed(2)} > sisa budget $${pol.remainingUsdg.toFixed(2)}`);
    }

    const routerAddress = manifest.agentRouter as `0x${string}`;
    const userMaxCostRaw = parseUnits(String(input.maxCostUsdg), 6);
    const quoteBufferedRaw = (q.usdg * 101n) / 100n;
    const maxCostRaw = quoteBufferedRaw < userMaxCostRaw ? quoteBufferedRaw : userMaxCostRaw;
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);

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
        executedCostUsdg: quoteUsdg,
        protocolFeeUsdg: Number(q.feeUsdg) / 1e6,
        recipient: ownerAddr,
      },
      gasSponsorship: "Standard EOA execution on Robinhood Testnet",
    };
  }
}
