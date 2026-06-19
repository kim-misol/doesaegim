import { describe, it, expect } from "vitest";
import { pickVoice } from "../speech.js";

const voices = [
  { lang: "en-US", name: "Alex" },
  { lang: "en-GB", name: "Daniel" },
  { lang: "ko-KR", name: "Yuna" },
  { lang: "fr-FR", name: "Thomas" },
];

describe("pickVoice", () => {
  it("prefers an exact language-region match", () => {
    expect(pickVoice(voices, "en-US").name).toBe("Alex");
  });
  it("falls back to the base language", () => {
    expect(pickVoice(voices, "fr-CA").name).toBe("Thomas");
  });
  it("returns null when nothing matches or list is empty", () => {
    expect(pickVoice(voices, "de-DE")).toBeNull();
    expect(pickVoice([], "ko-KR")).toBeNull();
  });
});
