// Today's review-progress math. Pure + tested.
//
//   progress = passedToday / (passedToday + dueTotal)
//
// All currently-due cards count toward the goal, including words added today.
// So adding a word makes the remaining count go up and the ring can move
// backward — that's expected. The completed count (passedToday) is never reset.

import { isDue } from "./srs.js";

export function reviewProgress(words = [], passedToday = 0, now = Date.now()) {
  let dueTotal = 0;
  for (const w of words) if (isDue(w, now)) dueTotal += 1;
  const goal = passedToday + dueTotal;
  const pct =
    goal > 0
      ? Math.min(100, Math.max(0, Math.round((passedToday / goal) * 100)))
      : 100;
  return { dueTotal, goal, pct };
}
