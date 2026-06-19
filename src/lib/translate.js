// AI meaning auto-complete, powered by Claude.
//
// Token optimization:
//  - Haiku model (cheapest) — translation is a light task.
//  - Low max_tokens cap.
//  - Terse system prompt + short JSON keys ("t"/"m"/"n") to shrink output.
//  - In-memory cache keyed by mode|src|tgt|word so repeats cost 0 tokens.
//  - Only called on an explicit user action (the "뜻 가져오기" button).
//
// To use real Google Translate / Naver dictionary instead, replace the body of
// fetchMeanings with your backend call returning [{ meaning, note }]. The rest
// of the app is unaffected.

import { LANGS } from "./languages.js";

export const TRANSLATE_MODEL = "claude-haiku-4-5-20251001";
export const TRANSLATE_MAX_TOKENS = 256;

export function buildSystemPrompt(srcLang, tgtLang, mode) {
  const src = LANGS[srcLang].label;
  const tgt = LANGS[tgtLang].label;
  if (mode === "dict") {
    return `Bilingual dictionary. Give up to 5 senses of the ${src} input translated into ${tgt}. Output ONLY JSON: {"t":[{"m":"<${tgt}>","n":"<pos/usage in ${tgt}, may be empty>"}]}. No markdown.`;
  }
  return `Translator. Translate the ${src} input into ${tgt}. Output ONLY JSON: {"t":[{"m":"<${tgt}>","n":""}]} with 1-3 best translations, most common first. No markdown.`;
}

export function cacheKey(word, srcLang, tgtLang, mode) {
  return `${mode}|${srcLang}|${tgtLang}|${word.trim().toLowerCase()}`;
}

export function parseResponse(data) {
  const text = (data?.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");
  const clean = text.replace(/```json/g, "").replace(/```/g, "").trim();
  const parsed = JSON.parse(clean);
  const arr = parsed.t || parsed.translations || [];
  return arr
    .map((x) => ({ meaning: x.m ?? x.meaning ?? "", note: x.n ?? x.note ?? "" }))
    .filter((x) => x.meaning);
}

const memCache = new Map();

export async function fetchMeanings(
  word,
  srcLang,
  tgtLang,
  mode,
  {
    fetchImpl = typeof fetch !== "undefined" ? fetch : undefined,
    cache = memCache,
  } = {}
) {
  const key = cacheKey(word, srcLang, tgtLang, mode);
  if (cache.has(key)) return cache.get(key);
  if (!fetchImpl) throw new Error("no fetch available");

  const res = await fetchImpl("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: TRANSLATE_MODEL,
      max_tokens: TRANSLATE_MAX_TOKENS,
      system: buildSystemPrompt(srcLang, tgtLang, mode),
      messages: [{ role: "user", content: word.trim() }],
    }),
  });
  if (!res.ok) throw new Error("request failed: " + res.status);

  const out = parseResponse(await res.json());
  cache.set(key, out);
  return out;
}

export function _clearCache() {
  memCache.clear();
}
