import { describe, expect, it } from "bun:test";
import { createHealthResponse, startServer } from "../src/api/server";

describe("Arcum API & Health Telemetry", () => {
  it("verifies service key isolation", () => {
    // Isolated keys
    const healthy = createHealthResponse(
      '0x1111111111111111111111111111111111111111',
      '0x2222222222222222222222222222222222222222',
      '0x3333333333333333333333333333333333333333'
    );
    expect(healthy.status).toBe('healthy');
    expect(healthy.keyIsolation.isolated).toBe(true);

    // Reused key must trigger unhealthy status
    const reused = createHealthResponse(
      '0x1111111111111111111111111111111111111111',
      '0x1111111111111111111111111111111111111111', // Reused!
      '0x3333333333333333333333333333333333333333'
    );
    expect(reused.status).toBe('unhealthy');
    expect(reused.keyIsolation.isolated).toBe(false);
  });

  it("serves /v1/health and /v1/config endpoints via HTTP", async () => {
    const server = startServer(3008);

    const healthRes = await fetch(`http://localhost:${server.port}/v1/health`);
    expect(healthRes.status).toBe(200);
    const healthJson = (await healthRes.json()) as any;
    expect(healthJson.chainId).toBe(4663);
    expect(healthJson.services.indexer.running).toBe(true);

    const configRes = await fetch(`http://localhost:${server.port}/v1/config`);
    expect(configRes.status).toBe(200);
    const configJson = (await configRes.json()) as any;
    expect(configJson.feeBps).toBe(3);

    const telemetryRes = await fetch(`http://localhost:${server.port}/v1/telemetry`);
    expect(telemetryRes.status).toBe(200);
    const telemetryJson = (await telemetryRes.json()) as any;
    expect(telemetryJson.status).toBeDefined();
    expect(telemetryJson.capacityUtilizationPct).toBeDefined();

    const alertsRes = await fetch(`http://localhost:${server.port}/v1/alerts`);
    expect(alertsRes.status).toBe(200);
    const alertsJson = (await alertsRes.json()) as any;
    expect(Array.isArray(alertsJson)).toBe(true);

    const daemonRes = await fetch(`http://localhost:${server.port}/v1/daemon`);
    expect(daemonRes.status).toBe(200);
    const daemonJson = (await daemonRes.json()) as any;
    expect(daemonJson.running).toBe(true);
    expect(daemonJson.keeper).toBeDefined();

    server.stop();
  });
});
