// Supported languages and their display / speech metadata.
export const LANGS = {
  ko: { label: "한국어", code: "ko-KR", tag: "KO", tint: "#E8C39E" },
  en: { label: "English", code: "en-US", tag: "EN", tint: "#9EC1E8" },
  fr: { label: "Français", code: "fr-FR", tag: "FR", tint: "#E89EB8" },
};

export const LANG_KEYS = ["ko", "en", "fr"];

export const isLang = (key) => LANG_KEYS.includes(key);

// Pick any language that differs from the given one (used to auto-resolve
// the "word language === meaning language" conflict in the add form).
export const otherLang = (key) => LANG_KEYS.find((l) => l !== key);
