import { describe, expect, it } from "bun:test";
import { ArcumMCPHandler, QuoteToolSchema, setMcpClient } from "../src/mcp/tools";
import manifest from "../../deployments/46630.json";

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

  it("handles policy verification and trade execution via MCP", async () => {
    // 1. Live on-chain verification for real revoked policy on testnet
    const livePolicy = await ArcumMCPHandler.handleCheckPolicy({
      agentAddress: "0x1111111111111111111111111111111111111111",
      ownerAddress: "0x04ef238C3B757F87175028c4Bfd81809cA2c03c1",
    });
    expect(livePolicy.status).toBe("REVOKED");
    expect(livePolicy.budgetUsdg).toBe(500.0);
    expect(livePolicy.maxPerTradeUsdg).toBe(100.0);
    expect(livePolicy.isNonCustodial).toBe(true);

    // 2. Mock active policy for execution trade path test
    setMcpClient({
      readContract: async ({ functionName }: any) => {
        if (functionName === "policyOf") {
          return {
            agent: "0x1111111111111111111111111111111111111111",
            budgetUsdg: 500_000_000n,
            spentUsdg: 0n,
            maxPerTradeUsdg: 100_000_000n,
            expiresAt: BigInt(Math.floor(Date.now() / 1000) + 86400),
            canSell: true,
            canShield: true,
            revoked: false,
          };
        }
        if (functionName === "idOf") {
          return "0xd473e186aff4837c2b2d71829c64ee117b6f5a832bc5c5b188b28623928bc572";
        }
        if (functionName === "seriesOf") {
          return {
            stock: "0x98a7b951482601E825dC5609A2224e0677f9101D",
            isCall: true,
            speed: 0,
            tauSeconds: 86400,
            strike: 141_000_000_000_000_000_000n,
            token: "0x8dca2945dadD367EF523351907A02FA591EE06A8",
            norm: 1_000_000_000_000_000_000n,
            lastAccrual: 1794588625n,
            listedAt: 1794563030n,
            buyable: true,
            archived: false,
          };
        }
        if (functionName === "quote") {
          return {
            usdg: 2_244_363n,
            feeUsdg: 672n,
            vMarkWad: 2_240_330_428_564_227_924n,
            session: 0, // REGULAR
            buyable: true,
          };
        }
        return null;
      },
    });

    const trade = await ArcumMCPHandler.handleExecuteTrade({
      agentAddress: "0x1111111111111111111111111111111111111111",
      ownerAddress: "0x04ef238C3B757F87175028c4Bfd81809cA2c03c1",
      stock: "NVDA",
      strike: 141,
      speed: "DAILY",
      isCall: true,
      units: 1,
      maxCostUsdg: 50.0,
    });
    expect(trade.success).toBe(true);
    expect(trade.status).toBe("UNSIGNED");
    expect(trade.tx.to).toBe(manifest.agentRouter as `0x${string}`);
    expect(trade.tx.data.startsWith("0x")).toBe(true);
    expect(trade.executionDetails.recipient).toBe("0x04ef238C3B757F87175028c4Bfd81809cA2c03c1");
  });
});
