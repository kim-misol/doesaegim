import { describe, it, expect } from "vitest";
import { findDuplicates, normalizeWordKey } from "../dedupe.js";

const words = [
  {
    id: "1",
    srcLang: "es",
    tgtLang: "ko",
    word: "resiliencia",
    meaning: "회복력",
  },
  { id: "2", srcLang: "en", tgtLang: "ko", word: "Apple", meaning: "사과" },
  {
    id: "3",
    srcLang: "es",
    tgtLang: "en",
    word: "resiliencia",
    meaning: "resilience",
  },
];

describe("findDuplicates", () => {
  it("matches same word + same source language, case/space-insensitive", () => {
    const d = findDuplicates(words, "  RESILIENCIA ", "es");
    expect(d.map((w) => w.id)).toEqual(["1", "3"]);
  });
  it("does not match a different source language", () => {
    expect(findDuplicates(words, "apple", "es")).toEqual([]);
    expect(findDuplicates(words, "apple", "en").map((w) => w.id)).toEqual([
      "2",
    ]);
  });
  it("returns [] for empty input", () => {
    expect(findDuplicates(words, "   ", "es")).toEqual([]);
    expect(findDuplicates(words, "", "es")).toEqual([]);
  });
});

describe("normalizeWordKey", () => {
  it("trims and lowercases", () => {
    expect(normalizeWordKey("  Hola ")).toBe("hola");
  });
});
