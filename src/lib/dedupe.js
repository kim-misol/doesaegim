// Duplicate-word detection for the Add screen. Pure + tested.
// A duplicate = same source language + same word (case/space-insensitive).

export function normalizeWordKey(s) {
  return (s || "").trim().toLowerCase();
}

export function findDuplicates(words = [], word, srcLang) {
  const key = normalizeWordKey(word);
  if (!key) return [];
  return words.filter(
    (w) => w.srcLang === srcLang && normalizeWordKey(w.word) === key,
  );
}
