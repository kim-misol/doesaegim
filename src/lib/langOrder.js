// User-defined order of the language review cards (device-local, injectable
// backend → testable). Pure helpers keep the reorder logic unit-tested.

export const LANG_ORDER_KEY = "lang_order_v1";

// Return a valid order: keep saved entries that still exist (deduped), then
// append any languages missing from the saved list (e.g. newly added langs).
export function normalizeOrder(saved, all) {
  const seen = new Set();
  const valid = [];
  for (const k of saved || []) {
    if (all.includes(k) && !seen.has(k)) {
      seen.add(k);
      valid.push(k);
    }
  }
  for (const k of all) if (!seen.has(k)) valid.push(k);
  return valid;
}

// Immutably move item at index `from` to index `to`.
export function moveItem(arr, from, to) {
  const n = arr.slice();
  if (from === to || from < 0 || to < 0 || from >= n.length || to >= n.length) {
    return n;
  }
  const [x] = n.splice(from, 1);
  n.splice(to, 0, x);
  return n;
}

export function createLangOrderStore(backend, all, key = LANG_ORDER_KEY) {
  return {
    async load() {
      try {
        const r = await backend.get(key);
        const saved = r && r.value ? JSON.parse(r.value) : null;
        return normalizeOrder(saved, all);
      } catch {
        return [...all];
      }
    },
    async save(order) {
      try {
        await backend.set(key, JSON.stringify(order));
        return true;
      } catch {
        return false;
      }
    },
  };
}
