// Pure backup/restore helpers. Export to JSON (full fidelity) or CSV
// (human-friendly), and import back with validation. No I/O.

import { LANG_KEYS } from "./languages.js";

export const BACKUP_VERSION = 1;

const isLang = (v) => LANG_KEYS.includes(v);

// ---- JSON ---------------------------------------------------------------

export function wordsToJSON(words, now = Date.now()) {
  return JSON.stringify(
    { app: "doesaegim", version: BACKUP_VERSION, exportedAt: now, words },
    null,
    2
  );
}

// Accepts either the wrapper object or a bare array. Throws on malformed data.
export function wordsFromJSON(str) {
  let data;
  try {
    data = JSON.parse(str);
  } catch {
    throw new Error("잘못된 JSON입니다.");
  }
  const arr = Array.isArray(data) ? data : data?.words;
  if (!Array.isArray(arr)) throw new Error("words 배열을 찾을 수 없습니다.");
  return arr.map(normalizeWord).filter(Boolean);
}

function normalizeWord(w, i) {
  if (!w || typeof w !== "object") return null;
  const word = String(w.word ?? "").trim();
  const meaning = String(w.meaning ?? "").trim();
  if (!word || !meaning) return null;
  const now = Date.now();
  return {
    id: w.id || `imp-${now.toString(36)}-${i}`,
    srcLang: isLang(w.srcLang) ? w.srcLang : "en",
    tgtLang: isLang(w.tgtLang) ? w.tgtLang : "ko",
    word,
    meaning,
    box: Number.isFinite(+w.box) ? +w.box : 0,
    due: Number.isFinite(+w.due) ? +w.due : now,
    createdAt: Number.isFinite(+w.createdAt) ? +w.createdAt : now,
  };
}

// Merge imported cards into existing ones; imported wins on id collision.
// Result is sorted newest-first to match the app's list ordering.
export function mergeWords(existing = [], incoming = []) {
  const byId = new Map(existing.map((w) => [w.id, w]));
  for (const w of incoming) byId.set(w.id, w);
  return [...byId.values()].sort((a, b) => b.createdAt - a.createdAt);
}

// ---- CSV ----------------------------------------------------------------

const CSV_COLS = ["srcLang", "tgtLang", "word", "meaning", "box", "due", "createdAt"];

const esc = (v) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function wordsToCSV(words) {
  const head = CSV_COLS.join(",");
  const rows = words.map((w) => CSV_COLS.map((c) => esc(w[c])).join(","));
  return [head, ...rows].join("\n");
}

// Minimal RFC-4180-ish parser (handles quotes, commas, escaped quotes).
export function parseCSV(str) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (inQuotes) {
      if (c === '"') {
        if (str[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c === "\r") { /* skip */ }
    else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows;
}

export function wordsFromCSV(str) {
  const rows = parseCSV(str).filter((r) => r.some((c) => c !== ""));
  if (rows.length === 0) return [];
  const header = rows[0].map((h) => h.trim());
  const idx = Object.fromEntries(CSV_COLS.map((c) => [c, header.indexOf(c)]));
  return rows
    .slice(1)
    .map((r, i) =>
      normalizeWord(
        {
          srcLang: r[idx.srcLang],
          tgtLang: r[idx.tgtLang],
          word: r[idx.word],
          meaning: r[idx.meaning],
          box: r[idx.box],
          due: r[idx.due],
          createdAt: r[idx.createdAt],
        },
        i
      )
    )
    .filter(Boolean);
}
