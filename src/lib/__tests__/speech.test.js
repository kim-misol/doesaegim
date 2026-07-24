import { describe, it, expect } from "vitest";
import { pickVoice } from "../speech.js";

const voices = [
  { lang: "en-US", name: "Alex", localService: true },
  { lang: "en-GB", name: "Daniel", localService: true },
  { lang: "ko-KR", name: "Yuna", localService: true },
  { lang: "es-MX", name: "Paulina", localService: true },
  { lang: "es-ES", name: "Mónica (cloud)", localService: false },
  { lang: "es-ES", name: "Mónica", localService: true },
];

describe("pickVoice", () => {
  it("prefers an exact language-region match", () => {
    expect(pickVoice(voices, "en-US").name).toBe("Alex");
  });
  it("falls back to the base language when no exact region", () => {
    expect(pickVoice(voices, "es-AR").name).toBe("Paulina"); // any es-*
  });
  it("prefers on-device (localService) voice among matches", () => {
    expect(pickVoice(voices, "es-ES").name).toBe("Mónica"); // local, not cloud
  });
  it("normalizes underscore locales", () => {
    expect(pickVoice([{ lang: "de_DE", name: "Anna" }], "de-DE").name).toBe("Anna");
  });
  it("returns null when nothing matches or list is empty", () => {
    expect(pickVoice(voices, "it-IT")).toBeNull();
    expect(pickVoice([], "ko-KR")).toBeNull();
  });
});
