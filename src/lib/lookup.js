// External lookup links — Papago translation + Naver dictionary.
// Pure URL builders so they're trivially testable. Opened in a new tab from
// the Add screen (no API keys, no cost).

// Papago web share URL: ?sk=<source>&tk=<target>&st=<text>
const PAPAGO_LANG = { ko: "ko", en: "en", es: "es", it: "it", de: "de" };

// Naver dictionary per the WORD's language (source). en/ko use subdomains;
// es/it/de use the mini-dictionary paths.
const NAVER_DICT = {
  ko: "https://ko.dict.naver.com/#/search?query=",
  en: "https://en.dict.naver.com/#/search?query=",
  es: "https://dict.naver.com/eskodict/#/search?query=",
  it: "https://dict.naver.com/itkodict/#/search?query=",
  de: "https://dict.naver.com/dekodict/#/search?query=",
};

export function papagoUrl(word, srcLang, tgtLang) {
  const sk = PAPAGO_LANG[srcLang] || "auto";
  const tk = PAPAGO_LANG[tgtLang] || "ko";
  const st = encodeURIComponent((word || "").trim());
  return `https://papago.naver.com/?sk=${sk}&tk=${tk}&st=${st}`;
}

export function naverDictUrl(word, srcLang) {
  const base =
    NAVER_DICT[srcLang] || "https://dict.naver.com/dict.search?query=";
  return base + encodeURIComponent((word || "").trim());
}
