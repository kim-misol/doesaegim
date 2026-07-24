import { describe, it, expect } from "vitest";
import { wordToRow, rowToWord } from "../rows.js";

const word = {
  id: "a1",
  srcLang: "en",
  tgtLang: "ko",
  word: "apple",
  meaning: "사과",
  box: 2,
  due: 1_700_000_000_000,
  createdAt: 1_600_000_000_000,
};

describe("rows mapping", () => {
  it("wordToRow renames to snake_case and attaches user_id", () => {
    expect(wordToRow(word, "u9")).toEqual({
      id: "a1",
      user_id: "u9",
      src_lang: "en",
      tgt_lang: "ko",
      word: "apple",
      meaning: "사과",
      box: 2,
      due: 1_700_000_000_000,
      created_at: 1_600_000_000_000,
    });
  });

  it("round-trips row -> word -> row", () => {
    const row = wordToRow(word, "u9");
    const back = rowToWord(row);
    expect(back).toEqual(word);
  });

  it("rowToWord coerces bigint-as-string to number", () => {
    const w = rowToWord({
      id: "x",
      user_id: "u",
      src_lang: "fr",
      tgt_lang: "en",
      word: "chat",
      meaning: "cat",
      box: "1",
      due: "1700000000000",
      created_at: "1600000000000",
    });
    expect(w.box).toBe(1);
    expect(w.due).toBe(1_700_000_000_000);
    expect(typeof w.createdAt).toBe("number");
  });
});
