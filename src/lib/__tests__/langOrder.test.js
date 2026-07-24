import { describe, it, expect } from "vitest";
import { normalizeOrder, moveItem } from "../langOrder.js";

const ALL = ["ko", "en", "es", "it", "de"];

describe("normalizeOrder", () => {
  it("keeps a valid saved order", () => {
    const saved = ["es", "en", "ko", "it", "de"];
    expect(normalizeOrder(saved, ALL)).toEqual(saved);
  });
  it("appends languages missing from the saved order", () => {
    expect(normalizeOrder(["es", "en"], ALL)).toEqual(["es", "en", "ko", "it", "de"]);
  });
  it("drops unknown/removed languages and dedupes", () => {
    expect(normalizeOrder(["fr", "es", "es", "en"], ALL)).toEqual([
      "es", "en", "ko", "it", "de",
    ]);
  });
  it("falls back to all when saved is empty/null", () => {
    expect(normalizeOrder(null, ALL)).toEqual(ALL);
    expect(normalizeOrder([], ALL)).toEqual(ALL);
  });
});

describe("moveItem", () => {
  it("moves an item down", () => {
    expect(moveItem(["a", "b", "c", "d"], 0, 2)).toEqual(["b", "c", "a", "d"]);
  });
  it("moves an item up", () => {
    expect(moveItem(["a", "b", "c", "d"], 3, 1)).toEqual(["a", "d", "b", "c"]);
  });
  it("is a no-op for same/out-of-range indices", () => {
    expect(moveItem(["a", "b"], 1, 1)).toEqual(["a", "b"]);
    expect(moveItem(["a", "b"], 0, 5)).toEqual(["a", "b"]);
  });
});
