/**
 * Arcum Protocol Watchdog & Telemetry Alerting Engine
 * Monitored continuously by autonomous daemons and operator runbooks.
 * Checks:
 *   1. Funding Norm Lag (Hourly re-marking invariant)
 *   2. Solvency & Writer Pool Capacity Utilization (<35% NAV total cap, <8% per-name)
 *   3. Market Sessions & Queued Sell Accumulation (Selling never blocked)
 *   4. Operator Key Isolation (Keeper != Hedger != Vol Signer)
 *   5. High-Value Whale Trade Alerts (>10,000 USDG)
 */

export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface ProtocolAlert {
  id: string;
  timestamp: number;
  severity: AlertSeverity;
  category: 'FUNDING_NORM' | 'SOLVENCY' | 'MARKET_SESSION' | 'KEY_ISOLATION' | 'WHALE_TRADE';
  message: string;
  details?: Record<string, any>;
}

export interface WatchdogMetrics {
  timestamp: number;
  status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
  fundingLagMinutes: number;
  writerPoolNavUsdg: number;
  capacityUtilizationPct: number;
  maxPerNameUtilizationPct: number;
  marketSession: 'REGULAR' | 'EXTENDED' | 'CLOSED' | 'HALTED';
  queuedSellsCount: number;
  keysIsolated: boolean;
  activeAlertsCount: number;
}

export class ArcumWatchdog {
  private alerts: ProtocolAlert[] = [];
  private lastAccrualTimestamp: number;
  private poolNavUsdg: number;
  private totalLiabilitiesUsdg: number;
  private perNameLiabilitiesUsdg: Record<string, number>;
  private marketSession: 'REGULAR' | 'EXTENDED' | 'CLOSED' | 'HALTED';
  private queuedSells: number;
  private operatorKeys: { keeper: string; hedger: string; volSigner: string };

  constructor(initialState?: {
    lastAccrualTimestamp?: number;
    poolNavUsdg?: number;
    totalLiabilitiesUsdg?: number;
    perNameLiabilitiesUsdg?: Record<string, number>;
    marketSession?: 'REGULAR' | 'EXTENDED' | 'CLOSED' | 'HALTED';
    queuedSells?: number;
    operatorKeys?: { keeper: string; hedger: string; volSigner: string };
  }) {
    const now = Date.now();
    this.lastAccrualTimestamp = initialState?.lastAccrualTimestamp ?? (now - 30 * 60 * 1000); // 30 min ago default
    this.poolNavUsdg = initialState?.poolNavUsdg ?? 2500000;
    this.totalLiabilitiesUsdg = initialState?.totalLiabilitiesUsdg ?? 500000;
    this.perNameLiabilitiesUsdg = initialState?.perNameLiabilitiesUsdg ?? {
      NVDA: 120000,
      TSLA: 95000,
      SPY: 45000,
      QQQ: 60000,
      AAPL: 50000
    };
    this.marketSession = initialState?.marketSession ?? 'REGULAR';
    this.queuedSells = initialState?.queuedSells ?? 0;
    this.operatorKeys = initialState?.operatorKeys ?? {
      keeper: "0x1111111111111111111111111111111111111111",
      hedger: "0x2222222222222222222222222222222222222222",
      volSigner: "0x3333333333333333333333333333333333333333",
    };
  }

  public runAuditCycle(currentTimeMs: number = Date.now()): WatchdogMetrics {
    this.alerts = [];

    // 1. Funding Norm Lag Check (Thresholds: 60m WARN, 90m CRITICAL)
    const elapsedMinutes = (currentTimeMs - this.lastAccrualTimestamp) / (60 * 1000);
    if (elapsedMinutes >= 90) {
      this.alerts.push({
        id: `ALERT-NORM-${currentTimeMs}`,
        timestamp: currentTimeMs,
        severity: 'CRITICAL',
        category: 'FUNDING_NORM',
        message: `CRITICAL: Keeper funding accrual delayed by ${elapsedMinutes.toFixed(1)} mins (max threshold: 90m). Norm decay is drifting.`,
        details: { elapsedMinutes, lastAccrualTimestamp: this.lastAccrualTimestamp }
      });
    } else if (elapsedMinutes >= 60) {
      this.alerts.push({
        id: `ALERT-NORM-${currentTimeMs}`,
        timestamp: currentTimeMs,
        severity: 'WARNING',
        category: 'FUNDING_NORM',
        message: `WARNING: Keeper funding accrual is due (${elapsedMinutes.toFixed(1)} mins since last touch).`,
        details: { elapsedMinutes }
      });
    }

    // 2. Writer Pool Solvency & Risk Cap Checks (Total Cap: 35% NAV, Per-Name Cap: 8% NAV)
    const totalCapacityPct = (this.totalLiabilitiesUsdg / this.poolNavUsdg) * 100;
    if (totalCapacityPct >= 35.0) {
      this.alerts.push({
        id: `ALERT-CAP-TOTAL-${currentTimeMs}`,
        timestamp: currentTimeMs,
        severity: 'CRITICAL',
        category: 'SOLVENCY',
        message: `CRITICAL: Total option liabilities (${totalCapacityPct.toFixed(2)}%) exceed protocol max risk cap (35.00% NAV). Buys throttled.`,
        details: { totalCapacityPct, totalLiabilitiesUsdg: this.totalLiabilitiesUsdg, poolNavUsdg: this.poolNavUsdg }
      });
    } else if (totalCapacityPct >= 30.0) {
      this.alerts.push({
        id: `ALERT-CAP-TOTAL-${currentTimeMs}`,
        timestamp: currentTimeMs,
        severity: 'WARNING',
        category: 'SOLVENCY',
        message: `WARNING: Total option liabilities approaching risk cap (${totalCapacityPct.toFixed(2)}% / 35.00%).`,
        details: { totalCapacityPct }
      });
    }

    let maxPerNamePct = 0;
    for (const [stock, liab] of Object.entries(this.perNameLiabilitiesUsdg)) {
      const perNamePct = (liab / this.poolNavUsdg) * 100;
      if (perNamePct > maxPerNamePct) maxPerNamePct = perNamePct;

      if (perNamePct >= 8.0) {
        this.alerts.push({
          id: `ALERT-CAP-NAME-${stock}-${currentTimeMs}`,
          timestamp: currentTimeMs,
          severity: 'CRITICAL',
          category: 'SOLVENCY',
          message: `CRITICAL: Concentration risk for ${stock} (${perNamePct.toFixed(2)}%) exceeds 8.00% per-name cap.`,
          details: { stock, perNamePct }
        });
      }
    }

    // 3. Market Session & Queued Sells Check
    if (this.marketSession === 'HALTED') {
      this.alerts.push({
        id: `ALERT-SESSION-HALT-${currentTimeMs}`,
        timestamp: currentTimeMs,
        severity: 'WARNING',
        category: 'MARKET_SESSION',
        message: `NOTICE: Underlying equity market is currently HALTED. Buys paused. Sells are queued to escrow tickets (${this.queuedSells} pending).`,
        details: { queuedSells: this.queuedSells }
      });
    }

    if (this.queuedSells > 0 && this.marketSession === 'REGULAR') {
      this.alerts.push({
        id: `ALERT-QUEUED-SELLS-${currentTimeMs}`,
        timestamp: currentTimeMs,
        severity: 'INFO',
        category: 'MARKET_SESSION',
        message: `INFO: ${this.queuedSells} sell tickets ready for batch fulfillment as session is now REGULAR.`,
        details: { queuedSells: this.queuedSells }
      });
    }

    // 4. Operator Key Isolation Check
    const keys = [this.operatorKeys.keeper, this.operatorKeys.hedger, this.operatorKeys.volSigner];
    const uniqueKeys = new Set(keys.map(k => k.toLowerCase()));
    const keysIsolated = uniqueKeys.size === 3;
    if (!keysIsolated) {
      this.alerts.push({
        id: `ALERT-KEY-ISOLATION-${currentTimeMs}`,
        timestamp: currentTimeMs,
        severity: 'CRITICAL',
        category: 'KEY_ISOLATION',
        message: `CRITICAL: Key isolation failure detected! Keeper, Hedger, and Volatility Signer must use distinct private keys.`,
        details: { operatorKeys: this.operatorKeys }
      });
    }

    // Determine Overall Status
    const hasCritical = this.alerts.some(a => a.severity === 'CRITICAL');
    const hasWarning = this.alerts.some(a => a.severity === 'WARNING');
    const status = hasCritical ? 'CRITICAL' : (hasWarning ? 'DEGRADED' : 'HEALTHY');

    return {
      timestamp: currentTimeMs,
      status,
      fundingLagMinutes: elapsedMinutes,
      writerPoolNavUsdg: this.poolNavUsdg,
      capacityUtilizationPct: totalCapacityPct,
      maxPerNameUtilizationPct: maxPerNamePct,
      marketSession: this.marketSession,
      queuedSellsCount: this.queuedSells,
      keysIsolated,
      activeAlertsCount: this.alerts.length
    };
  }

  public recordTrade(tradeUsdg: number, stock: string, user: string) {
    if (tradeUsdg >= 10000) {
      this.alerts.push({
        id: `ALERT-WHALE-${Date.now()}`,
        timestamp: Date.now(),
        severity: 'INFO',
        category: 'WHALE_TRADE',
        message: `WHALE TRADE: Large trade detected on ${stock} ($${tradeUsdg.toLocaleString()} USDG) by ${user.slice(0, 8)}...`,
        details: { tradeUsdg, stock, user }
      });
    }
  }

  public updateAccrualTimestamp(ts: number) {
    this.lastAccrualTimestamp = ts;
  }

  public setMarketSession(session: 'REGULAR' | 'EXTENDED' | 'CLOSED' | 'HALTED') {
    this.marketSession = session;
  }

  public setQueuedSells(count: number) {
    this.queuedSells = count;
  }

  public getAlerts(): ProtocolAlert[] {
    return [...this.alerts];
  }
}
