import { describe, it, expect } from "vitest";
import { reviewProgress } from "../progress.js";

const NOW = new Date("2026-07-24T14:00:00").getTime();

const due = (id) => ({
  id,
  srcLang: "en",
  tgtLang: "ko",
  word: "w" + id,
  meaning: "m" + id,
  box: 0,
  due: NOW - 1000,
  createdAt: NOW - 1000,
});

describe("reviewProgress", () => {
  it("goal is passedToday + all due cards", () => {
    const r = reviewProgress([due("1"), due("2"), due("3")], 0, NOW);
    expect(r.dueTotal).toBe(3);
    expect(r.goal).toBe(3);
    expect(r.pct).toBe(0);
  });

  it("rises as cards are passed", () => {
    // 2 remaining + 3 passed → 3/5 = 60%
    expect(reviewProgress([due("1"), due("2")], 3, NOW).pct).toBe(60);
  });

  it("adding a due card raises the goal (ring may move back) but keeps passed", () => {
    const before = reviewProgress([due("1"), due("2")], 1, NOW); // 1/3 = 33
    const after = reviewProgress([due("1"), due("2"), due("3")], 1, NOW); // 1/4 = 25
    expect(after.goal).toBe(before.goal + 1);
    expect(after.pct).toBeLessThan(before.pct);
  });

  it("clamps to 100 and never below 0", () => {
    expect(reviewProgress([], 4, NOW).pct).toBe(100); // nothing due
    expect(reviewProgress([], 0, NOW).pct).toBe(100);
  });
});
