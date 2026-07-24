// Supported languages and their display / speech metadata.
export const LANGS = {
  ko: { label: "한국어", code: "ko-KR", tag: "KO", tint: "#E8C39E" },
  en: { label: "English", code: "en-US", tag: "EN", tint: "#9EC1E8" },
  es: { label: "Español", code: "es-ES", tag: "ES", tint: "#E8A99E" },
  it: { label: "Italiano", code: "it-IT", tag: "IT", tint: "#9EE8AE" },
  de: { label: "Deutsch", code: "de-DE", tag: "DE", tint: "#C7B0E8" },
};

export const LANG_KEYS = ["ko", "en", "es", "it", "de"];

export const isLang = (key) => LANG_KEYS.includes(key);

// Pick any language that differs from the given one (used to auto-resolve
// the "word language === meaning language" conflict in the add form).
export const otherLang = (key) => LANG_KEYS.find((l) => l !== key);
