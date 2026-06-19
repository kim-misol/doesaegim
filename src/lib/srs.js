// Spaced repetition (Leitner) — all pure functions so they're trivial to test.

export const DAY = 86400000;

// Box index -> days until the card is due again after a correct recall.
export const INTERVALS = [0, 1, 3, 7, 14, 30];

export const nextIntervalDays = (box) =>
  INTERVALS[Math.min(Math.max(box, 0), INTERVALS.length - 1)];

let counter = 0;
export function makeId(now = Date.now()) {
  counter = (counter + 1) % 1_000_000;
  return now.toString(36) + "-" + counter.toString(36);
}

export function createWord({ srcLang, tgtLang, word, meaning, now = Date.now() }) {
  return {
    id: makeId(now),
    srcLang, // language of the word itself
    tgtLang, // language of the saved meaning
    word: word.trim(),
    meaning: meaning.trim(),
    createdAt: now,
    box: 0,
    due: now,
  };
}

export function endOfDay(ts = Date.now()) {
  const d = new Date(ts);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

// A card counts for today's session if it's due any time up to end of today.
export function isDue(word, now = Date.now()) {
  return word.due <= endOfDay(now);
}

// Returns a NEW word object with updated box/due. Never mutates the input.
export function schedule(word, remembered, now = Date.now()) {
  if (remembered) {
    const box = Math.min(word.box + 1, INTERVALS.length - 1);
    return { ...word, box, due: now + INTERVALS[box] * DAY };
  }
  return { ...word, box: 0, due: now }; // forgot -> back into today's queue
}

export function dueLabel(due, now = Date.now()) {
  if (due <= now) return "지금";
  const days = Math.ceil((due - endOfDay(now)) / DAY);
  if (days <= 0) return "오늘";
  if (days === 1) return "내일";
  return `${days}일 후`;
}
