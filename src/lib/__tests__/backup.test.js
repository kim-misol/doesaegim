import { describe, it, expect } from "vitest";
import {
  wordsToJSON,
  wordsFromJSON,
  wordsToCSV,
  wordsFromCSV,
  mergeWords,
} from "../backup.js";

const words = [
  { id: "1", srcLang: "en", tgtLang: "ko", word: "apple", meaning: "사과", box: 2, due: 1700000000000, createdAt: 1600000000000 },
  { id: "2", srcLang: "fr", tgtLang: "ko", word: "chat, noir", meaning: '고양이 "검은"', box: 0, due: 1710000000000, createdAt: 1610000000000 },
];

describe("JSON backup", () => {
  it("round-trips through wrapper", () => {
    const restored = wordsFromJSON(wordsToJSON(words));
    expect(restored).toEqual(words);
  });

  it("accepts a bare array too", () => {
    const restored = wordsFromJSON(JSON.stringify(words));
    expect(restored.map((w) => w.word)).toEqual(["apple", "chat, noir"]);
  });

  it("drops rows without word or meaning", () => {
    const restored = wordsFromJSON(JSON.stringify([{ word: "", meaning: "x" }, words[0]]));
    expect(restored).toHaveLength(1);
  });

  it("throws on malformed JSON", () => {
    expect(() => wordsFromJSON("{not json")).toThrow();
  });
});

describe("CSV backup", () => {
  it("round-trips including commas and quotes", () => {
    const restored = wordsFromCSV(wordsToCSV(words));
    expect(restored.map((w) => [w.word, w.meaning])).toEqual([
      ["apple", "사과"],
      ["chat, noir", '고양이 "검은"'],
    ]);
  });

  it("preserves srs fields", () => {
    const restored = wordsFromCSV(wordsToCSV(words));
    expect(restored[0].box).toBe(2);
    expect(restored[0].due).toBe(1700000000000);
  });
});

describe("mergeWords", () => {
  it("imported card overwrites same id, keeps others, newest-first", () => {
    const existing = [
      { id: "1", word: "old", createdAt: 100 },
      { id: "2", word: "keep", createdAt: 300 },
    ];
    const incoming = [{ id: "1", word: "new", createdAt: 200 }];
    const merged = mergeWords(existing, incoming);
    expect(merged.map((w) => [w.id, w.word])).toEqual([
      ["2", "keep"],
      ["1", "new"],
    ]);
  });
});
