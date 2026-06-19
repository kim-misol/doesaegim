import { describe, it, expect } from "vitest";
import {
  createWord,
  schedule,
  isDue,
  dueLabel,
  nextIntervalDays,
  endOfDay,
  INTERVALS,
  DAY,
} from "../srs.js";

const T0 = new Date("2026-01-15T09:00:00").getTime();

describe("createWord", () => {
  it("trims fields and starts at box 0, due now", () => {
    const w = createWord({
      srcLang: "en",
      tgtLang: "ko",
      word: "  apple ",
      meaning: " 사과 ",
      now: T0,
    });
    expect(w.word).toBe("apple");
    expect(w.meaning).toBe("사과");
    expect(w.box).toBe(0);
    expect(w.due).toBe(T0);
    expect(w.srcLang).toBe("en");
    expect(w.tgtLang).toBe("ko");
  });
});

describe("schedule", () => {
  it("promotes the box and pushes due forward on recall", () => {
    const w = createWord({ srcLang: "en", tgtLang: "ko", word: "a", meaning: "ㄱ", now: T0 });
    const w1 = schedule(w, true, T0);
    expect(w1.box).toBe(1);
    expect(w1.due).toBe(T0 + INTERVALS[1] * DAY);
  });

  it("resets to box 0 / due now when forgotten", () => {
    let w = createWord({ srcLang: "en", tgtLang: "ko", word: "a", meaning: "ㄱ", now: T0 });
    w = schedule(w, true, T0); // box 1
    w = schedule(w, true, T0); // box 2
    const forgotten = schedule(w, false, T0 + 5 * DAY);
    expect(forgotten.box).toBe(0);
    expect(forgotten.due).toBe(T0 + 5 * DAY);
  });

  it("caps the box at the final interval", () => {
    let w = createWord({ srcLang: "en", tgtLang: "ko", word: "a", meaning: "ㄱ", now: T0 });
    for (let i = 0; i < 20; i++) w = schedule(w, true, T0);
    expect(w.box).toBe(INTERVALS.length - 1);
  });

  it("does not mutate the input word", () => {
    const w = createWord({ srcLang: "en", tgtLang: "ko", word: "a", meaning: "ㄱ", now: T0 });
    schedule(w, true, T0);
    expect(w.box).toBe(0);
  });
});

describe("isDue", () => {
  it("is due when scheduled at or before end of today", () => {
    expect(isDue({ due: T0 }, T0)).toBe(true);
  });
  it("is not due when scheduled for a future day", () => {
    expect(isDue({ due: endOfDay(T0) + DAY }, T0)).toBe(false);
  });
});

describe("dueLabel", () => {
  it("buckets relative due dates", () => {
    expect(dueLabel(T0 - 1000, T0)).toBe("지금");
    expect(dueLabel(endOfDay(T0) + DAY, T0)).toBe("내일");
    expect(dueLabel(endOfDay(T0) + 3 * DAY, T0)).toBe("3일 후");
  });
});

describe("nextIntervalDays", () => {
  it("clamps the box into range", () => {
    expect(nextIntervalDays(0)).toBe(INTERVALS[0]);
    expect(nextIntervalDays(99)).toBe(INTERVALS[INTERVALS.length - 1]);
  });
});
