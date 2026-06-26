// Persistence layer.
//
// Backends share an async interface:
//   get(key) -> { key, value } | null
//   set(key, value) -> { key, value }
//
// Selection priority for a real web / iOS app (selectBackend):
//   1) window.storage  — Claude artifact host (only if ever run there)
//   2) localStorage    — browser, Vite dev, GitHub Pages, Capacitor WebView
//   3) in-memory       — last-resort fallback (NOT persistent)
//
// For guaranteed native iOS persistence, resolveBackend() upgrades to
// @capacitor/preferences when running on a Capacitor native platform.

export const STORE_KEY = "vocab_words_v1";

export function memoryBackend() {
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

export function localStorageBackend(
  ls = typeof window !== "undefined" ? window.localStorage : null
) {
  if (!ls) return null;
  return {
    async get(k) {
      const v = ls.getItem(k);
      return v == null ? null : { key: k, value: v };
    },
    async set(k, v) {
      ls.setItem(k, v);
      return { key: k, value: v };
    },
  };
}

// Preferences: @capacitor/preferences-style API
//   get({ key }) -> Promise<{ value: string | null }>
//   set({ key, value }) -> Promise<void>
export function capacitorBackend(Preferences) {
  if (!Preferences) return null;
  return {
    async get(k) {
      const r = await Preferences.get({ key: k });
      return r && r.value != null ? { key: k, value: r.value } : null;
    },
    async set(k, v) {
      await Preferences.set({ key: k, value: v });
      return { key: k, value: v };
    },
  };
}

function hostBackend() {
  if (typeof window !== "undefined" && window.storage) return window.storage;
  return null;
}

export function selectBackend() {
  return hostBackend() || localStorageBackend() || memoryBackend();
}

// Async upgrade: prefer native Capacitor Preferences when available,
// otherwise fall back to the synchronous selection above. The dynamic
// import is ignored by Vite so the app builds even without the plugin.
export async function resolveBackend() {
  try {
    const cap = typeof window !== "undefined" ? window.Capacitor : null;
    if (cap && typeof cap.isNativePlatform === "function" && cap.isNativePlatform()) {
      const spec = "@capacitor/preferences";
      const mod = await import(/* @vite-ignore */ spec);
      const be = capacitorBackend(mod && mod.Preferences);
      if (be) return be;
    }
  } catch {
    // plugin not installed or not a native platform — fall through
  }
  return selectBackend();
}

export function createWordStore(backend = selectBackend(), key = STORE_KEY) {
  return {
    async load() {
      try {
        const r = await backend.get(key);
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
