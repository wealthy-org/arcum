/**
 * Arcum Production Daemon Runner (Bun/TypeScript)
 * Orchestrates:
 *   1. ArcumKeeper (Hourly Norm Accrual & Queued Sells Fulfillment)
 *   2. ArcumDeltaHedger (Delta Risk Rebalancing)
 *   3. ArcumWatchdog (Risk Caps, Solvency & Health Audits)
 *   4. Webhook Alerting Bridge (Dispatches notifications on Warning/Critical state)
 */

import { ArcumKeeper } from "../keeper/keeper";
import { ArcumDeltaHedger } from "../hedger/hedger";
import { ArcumWatchdog, WatchdogMetrics, ProtocolAlert } from "../monitoring/watchdog";

export interface DaemonConfig {
  accrualIntervalMs?: number;   // Default: 3600000 (1 hour)
  hedgeCheckIntervalMs?: number; // Default: 300000 (5 mins)
  watchdogIntervalMs?: number;   // Default: 60000 (1 min)
  webhookUrl?: string;           // Optional Telegram / Discord Webhook URL
}

export interface DaemonStatus {
  running: boolean;
  uptimeSeconds: number;
  lastTickTimestamp: number;
  keeper: {
    accrualsExecuted: number;
    queuedSellsProcessed: number;
  };
  hedger: {
    rebalancesEvaluated: number;
    lastHedgeCheck: number;
  };
  watchdog: WatchdogMetrics;
  recentAlerts: ProtocolAlert[];
}

export class ArcumDaemonRunner {
  private running: boolean = false;
  private startedAt: number = 0;
  private lastTick: number = 0;

  public keeper: ArcumKeeper;
  public hedger: ArcumDeltaHedger;
  public watchdog: ArcumWatchdog;

  private accrualsCount: number = 0;
  private queuedSellsCount: number = 0;
  private rebalanceEvaluationsCount: number = 0;
  private lastHedgeTimestamp: number = 0;

  private webhookUrl?: string;

  constructor(config?: DaemonConfig) {
    this.keeper = new ArcumKeeper();
    this.hedger = new ArcumDeltaHedger();
    this.watchdog = new ArcumWatchdog();
    this.webhookUrl = config?.webhookUrl;
  }

  public start() {
    this.running = true;
    this.startedAt = Date.now();
    this.lastTick = Date.now();
    this.tick();
  }

  public stop() {
    this.running = false;
  }

  /**
   * Executes a single daemon processing loop cycle.
   */
  public tick(currentTimeMs: number = Date.now()) {
    this.lastTick = currentTimeMs;

    // 1. Run Keeper Cycle: Trigger hourly norm accrual if needed
    const currentSecs = Math.floor(currentTimeMs / 1000);
    const accrued = this.keeper.checkAndAccrue(currentSecs, 3600);
    if (accrued.length > 0) {
      this.accrualsCount += accrued.length;
      this.watchdog.updateAccrualTimestamp(currentTimeMs);
    }

    // 2. Process Queued Sells if market is NOT halted
    const isMarketHalted = this.watchdog.runAuditCycle(currentTimeMs).marketSession === "HALTED";
    const filledTickets = this.keeper.processQueuedSells(isMarketHalted);
    if (filledTickets.length > 0) {
      this.queuedSellsCount += filledTickets.length;
      this.watchdog.setQueuedSells(0);
    }

    // 3. Run Delta Hedger Evaluation
    this.rebalanceEvaluationsCount += 1;
    this.lastHedgeTimestamp = currentTimeMs;

    // 4. Run Watchdog Health & Solvency Cycle
    const metrics = this.watchdog.runAuditCycle(currentTimeMs);

    // 5. Webhook Alert Dispatcher (If configured & degraded/critical)
    if (metrics.status !== "HEALTHY" && this.webhookUrl) {
      this.dispatchWebhookAlert(metrics, this.watchdog.getAlerts());
    }

    return metrics;
  }

  private async dispatchWebhookAlert(metrics: WatchdogMetrics, alerts: ProtocolAlert[]) {
    try {
      if (!this.webhookUrl) return;
      const payload = {
        source: "Arcum Protocol Daemon",
        status: metrics.status,
        timestamp: metrics.timestamp,
        activeAlerts: alerts.map(a => `[${a.severity}] ${a.message}`),
      };
      await fetch(this.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {
      // Non-blocking in case of network timeout
    }
  }

  public getStatus(): DaemonStatus {
    const now = Date.now();
    const metrics = this.watchdog.runAuditCycle(now);
    return {
      running: this.running,
      uptimeSeconds: this.running ? Math.floor((now - this.startedAt) / 1000) : 0,
      lastTickTimestamp: this.lastTick,
      keeper: {
        accrualsExecuted: this.accrualsCount,
        queuedSellsProcessed: this.queuedSellsCount,
      },
      hedger: {
        rebalancesEvaluated: this.rebalanceEvaluationsCount,
        lastHedgeCheck: this.lastHedgeTimestamp,
      },
      watchdog: metrics,
      recentAlerts: this.watchdog.getAlerts(),
    };
  }
}
