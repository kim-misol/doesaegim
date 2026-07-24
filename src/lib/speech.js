// Text-to-speech via the Web Speech API. pickVoice is pure and unit-tested;
// speak is a thin imperative wrapper around the browser synth.

const norm = (l) => (l || "").replace(/_/g, "-").toLowerCase();

// Choose the best installed voice for a BCP-47 code:
//   1) exact language+region  (es-ES)
//   2) same base language, any region  (es-MX for es-ES)
// Within the chosen pool, prefer on-device (localService) then default voices.
export function pickVoice(voices, langCode) {
  if (!voices || !voices.length) return null;
  const target = norm(langCode);
  const base = target.split("-")[0];
  const exact = voices.filter((v) => norm(v.lang) === target);
  const sameBase = voices.filter((v) => norm(v.lang).split("-")[0] === base);
  const pool = exact.length ? exact : sameBase;
  if (!pool.length) return null;
  return (
    pool.find((v) => v.localService) || pool.find((v) => v.default) || pool[0]
  );
}

export function speak(
  text,
  langCode,
  synth = typeof window !== "undefined" ? window.speechSynthesis : null,
) {
  if (!text || !synth) return false;
  try {
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = langCode; // always set so the engine targets the right language
    const v = pickVoice(synth.getVoices ? synth.getVoices() : [], langCode);
    if (v) {
      u.voice = v;
      u.lang = v.lang; // match the chosen voice's exact locale
    }
    u.rate = 0.95;
    synth.speak(u);
    return true;
  } catch {
    return false;
  }
}

// True when the device actually has a voice for this language. Lets the UI
// warn the user (e.g. macOS lacks Spanish voice → English fallback).
export function hasVoiceFor(
  langCode,
  synth = typeof window !== "undefined" ? window.speechSynthesis : null,
) {
  const voices = synth && synth.getVoices ? synth.getVoices() : [];
  return !!pickVoice(voices, langCode);
}
