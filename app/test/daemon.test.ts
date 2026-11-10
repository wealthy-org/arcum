import { describe, expect, it } from "bun:test";
import { ArcumDaemonRunner } from "../src/daemon/runner";

describe("Arcum Production Daemon Runner", () => {
  it("initializes and reports idle status before start", () => {
    const runner = new ArcumDaemonRunner();
    const status = runner.getStatus();

    expect(status.running).toBe(false);
    expect(status.uptimeSeconds).toBe(0);
    expect(status.keeper.accrualsExecuted).toBe(0);
    expect(status.hedger.rebalancesEvaluated).toBe(0);
  });

  it("starts and executes tick loop cycle cleanly", () => {
    const runner = new ArcumDaemonRunner();
    runner.start();

    const statusAfterStart = runner.getStatus();
    expect(statusAfterStart.running).toBe(true);
    expect(statusAfterStart.hedger.rebalancesEvaluated).toBeGreaterThan(0);
    expect(statusAfterStart.watchdog.status).toBe("HEALTHY");

    runner.stop();
    expect(runner.getStatus().running).toBe(false);
  });

  it("triggers keeper accruals when elapsed interval passes", () => {
    const runner = new ArcumDaemonRunner();
    const nowSecs = Math.floor(Date.now() / 1000);

    // Register a series into keeper
    runner.keeper.registerSeries({
      id: "0xTestSeriesNVDA",
      stock: "NVDA",
      isCall: true,
      strike: 145,
      tauSeconds: 86400,
      norm: 1.0,
      lastAccrual: nowSecs - 3700, // 3700s ago (> 3600s interval)
      buyable: true,
    });

    runner.tick(nowSecs * 1000);
    const status = runner.getStatus();
    expect(status.keeper.accrualsExecuted).toBe(1);
  });

  it("fulfills queued sells when market session is REGULAR", () => {
    const runner = new ArcumDaemonRunner();
    const nowSecs = Math.floor(Date.now() / 1000);

    runner.keeper.registerQueuedTicket({
      ticketId: 101,
      seriesId: "0xNVDA_145",
      seller: "0xSeller",
      tokens: 25,
      queuedAt: nowSecs - 60,
    });

    runner.tick(nowSecs * 1000);
    const status = runner.getStatus();
    expect(status.keeper.queuedSellsProcessed).toBe(1);
  });
});
