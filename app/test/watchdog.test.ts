import { describe, expect, it } from "bun:test";
import { ArcumWatchdog } from "../src/monitoring/watchdog";

describe("Arcum Protocol Watchdog & Telemetry Alerting Engine", () => {
  it("reports HEALTHY state under normal operational conditions", () => {
    const watchdog = new ArcumWatchdog();
    const metrics = watchdog.runAuditCycle();

    expect(metrics.status).toBe("HEALTHY");
    expect(metrics.keysIsolated).toBe(true);
    expect(metrics.capacityUtilizationPct).toBeLessThan(35.0);
    expect(metrics.activeAlertsCount).toBe(0);
  });

  it("triggers WARNING and CRITICAL alerts when keeper funding accrual lags", () => {
    const now = Date.now();
    
    // 70 minutes lag -> WARNING
    const watchdogWarn = new ArcumWatchdog({
      lastAccrualTimestamp: now - 70 * 60 * 1000,
    });
    const metricsWarn = watchdogWarn.runAuditCycle(now);
    expect(metricsWarn.status).toBe("DEGRADED");
    expect(watchdogWarn.getAlerts().some(a => a.severity === 'WARNING' && a.category === 'FUNDING_NORM')).toBe(true);

    // 95 minutes lag -> CRITICAL
    const watchdogCrit = new ArcumWatchdog({
      lastAccrualTimestamp: now - 95 * 60 * 1000,
    });
    const metricsCrit = watchdogCrit.runAuditCycle(now);
    expect(metricsCrit.status).toBe("CRITICAL");
    expect(watchdogCrit.getAlerts().some(a => a.severity === 'CRITICAL' && a.category === 'FUNDING_NORM')).toBe(true);
  });

  it("triggers CRITICAL alert when Writer Pool capacity exceeds 35% NAV cap", () => {
    const watchdog = new ArcumWatchdog({
      poolNavUsdg: 1000000,
      totalLiabilitiesUsdg: 360000, // 36% > 35%
    });
    const metrics = watchdog.runAuditCycle();

    expect(metrics.status).toBe("CRITICAL");
    expect(metrics.capacityUtilizationPct).toBe(36.0);
    expect(watchdog.getAlerts().some(a => a.category === 'SOLVENCY' && a.severity === 'CRITICAL')).toBe(true);
  });

  it("handles HALTED market session and queued sells gracefully", () => {
    const watchdog = new ArcumWatchdog({
      marketSession: 'HALTED',
      queuedSells: 12,
    });
    const metrics = watchdog.runAuditCycle();

    expect(metrics.marketSession).toBe("HALTED");
    expect(metrics.queuedSellsCount).toBe(12);
    expect(watchdog.getAlerts().some(a => a.category === 'MARKET_SESSION')).toBe(true);
  });

  it("detects key isolation failure when duplicate keys are used", () => {
    const watchdog = new ArcumWatchdog({
      operatorKeys: {
        keeper: "0xSameKey111111111111111111111111111111111",
        hedger: "0xSameKey111111111111111111111111111111111", // Conflict!
        volSigner: "0x3333333333333333333333333333333333333333",
      }
    });
    const metrics = watchdog.runAuditCycle();

    expect(metrics.keysIsolated).toBe(false);
    expect(metrics.status).toBe("CRITICAL");
    expect(watchdog.getAlerts().some(a => a.category === 'KEY_ISOLATION')).toBe(true);
  });

  it("records whale trade and generates INFO alert", () => {
    const watchdog = new ArcumWatchdog();
    watchdog.recordTrade(25000, "NVDA", "0x71C8a13e2f9B71cA14Fa959C5193B6d24666a49B");

    const alerts = watchdog.getAlerts();
    expect(alerts.some(a => a.category === 'WHALE_TRADE' && a.message.includes("NVDA"))).toBe(true);
  });
});
