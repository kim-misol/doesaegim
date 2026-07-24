// Supabase-backed word store. Exposes the SAME interface as the local store
// (`load()` / `save(words)`) so App.jsx can swap backends without change.
//
// save(words) turns a whole-array write into the minimal set of row upserts +
// deletes via diffWords, then remembers the new snapshot. The Supabase client
// is injected, so this is unit-testable with a fake.

import { wordToRow, rowToWord } from "./rows.js";
import { diffWords } from "./sync.js";

export const TABLE = "words";

export function createRemoteWordStore(client, userId, table = TABLE) {
  let prev = []; // last-known snapshot, for diffing

  return {
    async load() {
      const { data, error } = await client
        .from(table)
        .select("*")
        .eq("user_id", userId);
      if (error) throw error;
      const words = (data || [])
        .map(rowToWord)
        .sort((a, b) => b.createdAt - a.createdAt); // newest first
      prev = words;
      return words;
    },

    async save(words) {
      const { upserts, deleteIds } = diffWords(prev, words);
      try {
        if (upserts.length) {
          const rows = upserts.map((w) => wordToRow(w, userId));
          const { error } = await client.from(table).upsert(rows);
          if (error) throw error;
        }
        if (deleteIds.length) {
          const { error } = await client
            .from(table)
            .delete()
            .in("id", deleteIds);
          if (error) throw error;
        }
        prev = words;
        return true;
      } catch {
        return false; // keep local React state; caller may retry on next edit
      }
    },
  };
}
