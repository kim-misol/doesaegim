import { describe, it, expect } from "vitest";
import { diffWords } from "../sync.js";

const w = (id, over = {}) => ({
  id,
  srcLang: "en",
  tgtLang: "ko",
  word: "w" + id,
  meaning: "m" + id,
  box: 0,
  due: 1000,
  ...over,
});

describe("diffWords", () => {
  it("treats brand-new cards as upserts", () => {
    const { upserts, deleteIds } = diffWords([], [w("1"), w("2")]);
    expect(upserts.map((x) => x.id)).toEqual(["1", "2"]);
    expect(deleteIds).toEqual([]);
  });

  it("emits only changed cards as upserts", () => {
    const prev = [w("1"), w("2")];
    const next = [w("1"), w("2", { box: 3, due: 5000 })];
    const { upserts, deleteIds } = diffWords(prev, next);
    expect(upserts.map((x) => x.id)).toEqual(["2"]);
    expect(deleteIds).toEqual([]);
  });

  it("detects deletions", () => {
    const { upserts, deleteIds } = diffWords([w("1"), w("2")], [w("1")]);
    expect(upserts).toEqual([]);
    expect(deleteIds).toEqual(["2"]);
  });

  it("no-op when identical", () => {
    const prev = [w("1"), w("2")];
    const { upserts, deleteIds } = diffWords(prev, [w("1"), w("2")]);
    expect(upserts).toEqual([]);
    expect(deleteIds).toEqual([]);
  });
});
