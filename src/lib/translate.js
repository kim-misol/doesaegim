import { LANGS } from "./languages.js";

export function getEndpoint(env = import.meta?.env ?? {}) {
  return env.VITE_TRANSLATE_ENDPOINT ?? null;
}

export function isAutocompleteAvailable(env = import.meta?.env ?? {}) {
  return !!getEndpoint(env);
}

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
    endpoint = getEndpoint(),
  } = {}
) {
  if (!endpoint) throw new Error("no endpoint configured — set VITE_TRANSLATE_ENDPOINT");

  const key = cacheKey(word, srcLang, tgtLang, mode);
  if (cache.has(key)) return cache.get(key);
  if (!fetchImpl) throw new Error("no fetch available");

  const res = await fetchImpl(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      word: word.trim(),
      srcLang,
      tgtLang,
      mode,
      systemPrompt: buildSystemPrompt(srcLang, tgtLang, mode),
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
