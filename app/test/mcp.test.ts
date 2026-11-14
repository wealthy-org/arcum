import { describe, expect, it } from "bun:test";
import { ArcumMCPHandler, QuoteToolSchema } from "../src/mcp/tools";

describe("Arcum MCP Tool Server", () => {
  it("validates parameters using Zod schemas", () => {
    const valid = QuoteToolSchema.safeParse({
      stock: 'NVDA',
      strike: 145,
      speed: 'DAILY',
      isCall: true,
      units: 10,
    });
    expect(valid.success).toBe(true);

    const invalid = QuoteToolSchema.safeParse({
      stock: 'INVALID_STOCK',
      strike: -10,
      speed: 'MONTHLY',
    });
    expect(invalid.success).toBe(false);
  });

  it("handles agent quote execution via MCP", () => {
    const result = ArcumMCPHandler.handleQuote({
      stock: 'NVDA',
      strike: 145,
      speed: 'DAILY',
      isCall: true,
      units: 10,
    });

    expect(result.stock).toBe('NVDA');
    expect(result.spot).toBe(142.50);
    expect(result.markPriceUsdg).toBeGreaterThan(0);
    expect(result.totalCostUsdg).toBeGreaterThan(result.markPriceUsdg * 10);
    expect(result.protocolFeeUsdg).toBeGreaterThan(0);
  });

  it("handles chain inspection via MCP", () => {
    const chain = ArcumMCPHandler.handleChain({ stock: 'TSLA' });
    expect(chain.stock).toBe('TSLA');
    expect(chain.spotPrice).toBe(248.80);
    expect(chain.strikes.length).toBeGreaterThan(3);
    expect(chain.settlementToken).toBe('USDG');
  });

  it("handles 1-click shield calculation via MCP", () => {
    const shield = ArcumMCPHandler.handleShield({
      stock: 'NVDA',
      heldUnits: 100,
      protectionPct: 5,
    });
    expect(shield.stock).toBe('NVDA');
    expect(shield.heldUnits).toBe(100);
    expect(shield.selectedStrike).toBe(135);
    expect(shield.totalShieldCostUsdg).toBeGreaterThan(0);
  });

  it("handles writer pool inspection via MCP", () => {
    const pool = ArcumMCPHandler.handleCheckWriterPool({ includeHistoricalApr: true });
    expect(pool.navUsdg).toBe(0.0);
    expect(pool.capacityUtilizationPct).toBe(0.0);
    expect(pool.lockPolicy.withdrawalNoticeHours).toBe(0.5);
  });

  it("handles policy verification and trade execution via MCP", () => {
    const policy = ArcumMCPHandler.handleCheckPolicy({
      agentAddress: "0xAgent4663eDe908B8159E5bBbC2096C6E89e7F538",
      ownerAddress: "0x71C8a13e2f9B71cA14Fa959C5193B6d24666a49B",
    });
    expect(policy.status).toBe("ACTIVE");
    expect(policy.totalBudgetUsdg).toBe(2500.0);
    expect(policy.isNonCustodial).toBe(true);

    const trade = ArcumMCPHandler.handleExecuteTrade({
      agentAddress: "0xAgent4663eDe908B8159E5bBbC2096C6E89e7F538",
      ownerAddress: "0x71C8a13e2f9B71cA14Fa959C5193B6d24666a49B",
      stock: "NVDA",
      strike: 145,
      speed: "DAILY",
      isCall: true,
      units: 10,
      maxCostUsdg: 250.0,
    });
    expect(trade.success).toBe(true);
    expect(trade.executionDetails.recipient).toBe("0x71C8a13e2f9B71cA14Fa959C5193B6d24666a49B");
  });
});
