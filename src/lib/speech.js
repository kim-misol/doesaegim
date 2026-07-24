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

// Some mobile browsers (esp. iOS Safari) auto-suspend the synth and require a
// speak() triggered inside a user gesture to "unlock" audio. primeSpeech()
// should be called once from the first tap so later speak() calls are audible.
let primed = false;
export function primeSpeech(
  synth = typeof window !== "undefined" ? window.speechSynthesis : null,
) {
  if (primed || !synth) return;
  try {
    synth.resume?.();
    const u = new SpeechSynthesisUtterance("");
    u.volume = 0;
    synth.speak(u);
    primed = true;
  } catch {
    /* ignore */
  }
}

// Fallback for browsers without Web Speech synthesis (notably Firefox/Chrome
// on iOS, which don't expose speechSynthesis at all). Plays a TTS audio clip.
// Best-effort: must be called inside a user gesture on mobile.
let audioEl = null;
export function speakViaAudio(text, langCode) {
  if (typeof Audio === "undefined") return false;
  try {
    const tl = (langCode || "en").split("-")[0];
    const url =
      "https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob" +
      `&tl=${encodeURIComponent(tl)}&q=${encodeURIComponent(text.slice(0, 200))}`;
    if (!audioEl) audioEl = new Audio();
    audioEl.src = url;
    const p = audioEl.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
    return true;
  } catch {
    return false;
  }
}

export function speak(
  text,
  langCode,
  synth = typeof window !== "undefined" ? window.speechSynthesis : null,
) {
  if (!text) return false;
  // No Web Speech synthesis (iOS Firefox/Chrome) → audio fallback.
  if (!synth || typeof synth.speak !== "function") {
    return speakViaAudio(text, langCode);
  }
  try {
    // Mobile engines often pause themselves; wake it up first.
    synth.resume?.();
    // Only cancel if something is actually playing — an unconditional cancel()
    // right before speak() swallows the audio on iOS.
    if (synth.speaking || synth.pending) synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = langCode; // always set so the engine targets the right language
    u.rate = 0.95;
    u.volume = 1;
    const v = pickVoice(synth.getVoices ? synth.getVoices() : [], langCode);
    if (v) {
      u.voice = v;
      u.lang = v.lang; // match the chosen voice's exact locale
    }
    synth.speak(u);
    return true;
  } catch {
    return speakViaAudio(text, langCode);
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
