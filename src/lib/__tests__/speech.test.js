import { describe, it, expect, vi } from "vitest";
import { pickVoice, speak } from "../speech.js";

// Minimal fake of window.speechSynthesis
function fakeSynth({ speaking = false } = {}) {
  return {
    speaking,
    pending: false,
    getVoices: () => [],
    resume: vi.fn(),
    cancel: vi.fn(),
    speak: vi.fn(),
  };
}
// jsdom lacks SpeechSynthesisUtterance
globalThis.SpeechSynthesisUtterance = class {
  constructor(t) {
    this.text = t;
  }
};

describe("speak (mobile robustness)", () => {
  it("resumes and speaks, without cancelling when idle", () => {
    const s = fakeSynth({ speaking: false });
    expect(speak("hola", "es-ES", s)).toBe(true);
    expect(s.resume).toHaveBeenCalled();
    expect(s.cancel).not.toHaveBeenCalled();
    expect(s.speak).toHaveBeenCalledTimes(1);
  });
  it("cancels first only when something is already playing", () => {
    const s = fakeSynth({ speaking: true });
    speak("hola", "es-ES", s);
    expect(s.cancel).toHaveBeenCalledTimes(1);
    expect(s.speak).toHaveBeenCalledTimes(1);
  });
  it("returns false with no text or synth", () => {
    expect(speak("", "es-ES", fakeSynth())).toBe(false);
    expect(speak("hi", "es-ES", null)).toBe(false);
  });
});

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
    expect(pickVoice([{ lang: "de_DE", name: "Anna" }], "de-DE").name).toBe(
      "Anna",
    );
  });
  it("returns null when nothing matches or list is empty", () => {
    expect(pickVoice(voices, "it-IT")).toBeNull();
    expect(pickVoice([], "ko-KR")).toBeNull();
  });
});
