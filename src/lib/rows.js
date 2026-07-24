// Pure mapping between an app "word" and a Supabase table row.
//
// App word shape (see srs.createWord):
//   { id, srcLang, tgtLang, word, meaning, box, due, createdAt }
// Row shape (table `words`):
//   { id, user_id, src_lang, tgt_lang, word, meaning, box, due, created_at }
//
// `due` and `created_at` are epoch-ms integers stored as bigint, so the SRS
// math (which is in ms) stays identical and there are no timezone bugs.

export function wordToRow(word, userId) {
  return {
    id: word.id,
    user_id: userId,
    src_lang: word.srcLang,
    tgt_lang: word.tgtLang,
    word: word.word,
    meaning: word.meaning,
    box: word.box ?? 0,
    due: word.due ?? word.createdAt ?? Date.now(),
    created_at: word.createdAt ?? Date.now(),
  };
}

export function rowToWord(row) {
  return {
    id: row.id,
    srcLang: row.src_lang,
    tgtLang: row.tgt_lang,
    word: row.word,
    meaning: row.meaning,
    box: Number(row.box) || 0,
    due: Number(row.due),
    createdAt: Number(row.created_at),
  };
}
