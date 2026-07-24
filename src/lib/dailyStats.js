// Tiny device-local daily counter — how many cards were "passed" (remembered)
// today. Resets automatically when the date changes. Used to show today's
// review progress ring. Injectable backend (same shape as storage.js) → testable.

export const DAILY_KEY = "daily_stats_v1";

// Local calendar day stamp (not UTC) so "today" matches the user's clock.
export function dayStamp(now = Date.now()) {
  const d = new Date(now);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function createDailyStats(backend, key = DAILY_KEY) {
  return {
    // passed-card count for today (0 if nothing stored or it's a new day)
    async load(now = Date.now()) {
      try {
        const r = await backend.get(key);
        if (!r || !r.value) return 0;
        const o = JSON.parse(r.value);
        return o.date === dayStamp(now) ? o.count || 0 : 0;
      } catch {
        return 0;
      }
    },
    // increment today's count by one, resetting if the day rolled over
    async bump(now = Date.now()) {
      const stamp = dayStamp(now);
      let count = 1;
      try {
        const r = await backend.get(key);
        if (r && r.value) {
          const o = JSON.parse(r.value);
          if (o.date === stamp) count = (o.count || 0) + 1;
        }
      } catch {
        /* ignore corrupt value → start fresh */
      }
      try {
        await backend.set(key, JSON.stringify({ date: stamp, count }));
      } catch {
        /* best-effort persistence */
      }
      return count;
    },
  };
}
