// Text-to-speech via the Web Speech API. pickVoice is pure and unit-tested;
// speak is a thin imperative wrapper around the browser synth.

export function pickVoice(voices, langCode) {
  if (!voices || !voices.length) return null;
  const base = langCode.split("-")[0];
  return (
    voices.find((v) => v.lang === langCode) ||
    voices.find((v) => v.lang && v.lang.startsWith(base)) ||
    null
  );
}

export function speak(
  text,
  langCode,
  synth = typeof window !== "undefined" ? window.speechSynthesis : null
) {
  if (!text || !synth) return false;
  try {
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = langCode;
    const v = pickVoice(synth.getVoices ? synth.getVoices() : [], langCode);
    if (v) u.voice = v;
    u.rate = 0.95;
    synth.speak(u);
    return true;
  } catch {
    return false;
  }
}
