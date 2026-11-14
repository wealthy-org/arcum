import { describe, expect, it } from "bun:test";
import { ArcumTelegramBot } from "../src/bot/telegram";

describe("Arcum Telegram Bot Service", () => {
  it("handles /start command", () => {
    const res = ArcumTelegramBot.handleCommand("/start");
    expect(res.text).toContain("Welcome to Arcum Options Bot");
  });

  it("handles /quote NVDA UP 145 command", () => {
    const res = ArcumTelegramBot.handleCommand("/quote NVDA UP 145");
    expect(res.text).toContain("NVDA");
    expect(res.text).toContain("Mark Price");
    expect(res.text).toContain("Delta");
    expect(res.text).toContain("USDG");
  });

  it("handles /shield and /pool commands", () => {
    const shieldRes = ArcumTelegramBot.handleCommand("/shield NVDA 100");
    expect(shieldRes.text).toContain("Shield Put Protection");
    expect(shieldRes.text).toContain("Weekly Put");

    const poolRes = ArcumTelegramBot.handleCommand("/pool");
    expect(poolRes.text).toContain("Writer Pool Telemetry");
    expect(poolRes.text).toContain("NAV Per Share");
  });
});
