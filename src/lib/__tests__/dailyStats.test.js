import { describe, it, expect } from "vitest";
import { createDailyStats, dayStamp } from "../dailyStats.js";

const fakeBackend = () => ({
  store: {},
  async get(k) {
    return k in this.store ? { key: k, value: this.store[k] } : null;
  },
  async set(k, v) {
    this.store[k] = v;
    return { key: k, value: v };
  },
});

const DAY = 86400000;
const t0 = new Date("2026-07-24T09:00:00").getTime();

describe("dailyStats", () => {
  it("starts at 0", async () => {
    const s = createDailyStats(fakeBackend());
    expect(await s.load(t0)).toBe(0);
  });

  it("bump increments within the same day", async () => {
    const s = createDailyStats(fakeBackend());
    expect(await s.bump(t0)).toBe(1);
    expect(await s.bump(t0)).toBe(2);
    expect(await s.load(t0)).toBe(2);
  });

  it("resets when the day changes", async () => {
    const be = fakeBackend();
    const s = createDailyStats(be);
    await s.bump(t0);
    await s.bump(t0);
    expect(await s.load(t0)).toBe(2);
    // next day → load sees 0, next bump starts at 1
    expect(await s.load(t0 + DAY)).toBe(0);
    expect(await s.bump(t0 + DAY)).toBe(1);
  });

  it("dayStamp is local-calendar based", () => {
    expect(dayStamp(t0)).toBe("2026-7-24");
  });
});
