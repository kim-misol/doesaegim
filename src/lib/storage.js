// Persistence layer. The backend is injectable so tests can pass a fake and
// the app can use the artifact/host `window.storage` or an in-memory fallback.

export const STORE_KEY = "vocab_words_v1";

function memoryBackend() {
  const mem = {};
  return {
    async get(k) {
      return k in mem ? { key: k, value: mem[k] } : null;
    },
    async set(k, v) {
      mem[k] = v;
      return { key: k, value: v };
    },
  };
}

export function getBackend() {
  if (typeof window !== "undefined" && window.storage) return window.storage;
  return memoryBackend();
}

export function createWordStore(backend = getBackend(), key = STORE_KEY) {
  return {
    async load() {
      try {
        const r = await backend.get(key); // some backends throw on missing keys
        if (!r || !r.value) return [];
        const parsed = JSON.parse(r.value);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    },
    async save(words) {
      try {
        await backend.set(key, JSON.stringify(words));
        return true;
      } catch {
        return false;
      }
    },
  };
}
