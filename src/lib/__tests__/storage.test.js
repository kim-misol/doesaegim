import { describe, it, expect, beforeEach } from "vitest";
import {
  createWordStore,
  selectBackend,
  localStorageBackend,
  capacitorBackend,
  memoryBackend,
  STORE_KEY,
} from "../storage.js";

// Generic fake backend that throws on missing keys (like window.storage).
function fakeBackend(initial = {}) {
  const mem = { ...initial };
  return {
    mem,
    async get(k) {
      if (!(k in mem)) throw new Error("missing key");
      return { key: k, value: mem[k] };
    },
    async set(k, v) {
      mem[k] = v;
      return { key: k, value: v };
    },
  };
}

// Fake @capacitor/preferences plugin (returns {value:null} when absent).
function fakePreferences(initial = {}) {
  const mem = { ...initial };
  return {
    mem,
    async get({ key }) {
      return { value: key in mem ? mem[key] : null };
    },
    async set({ key, value }) {
      mem[key] = value;
    },
  };
}

beforeEach(() => {
  if (typeof window !== "undefined" && window.localStorage) window.localStorage.clear();
  if (typeof window !== "undefined") delete window.storage;
});

describe("createWordStore (generic backend)", () => {
  it("returns [] when nothing is stored yet", async () => {
    expect(await createWordStore(fakeBackend()).load()).toEqual([]);
  });
  it("round-trips saved words", async () => {
    const store = createWordStore(fakeBackend());
    const words = [{ id: "1", word: "apple", meaning: "사과" }];
    expect(await store.save(words)).toBe(true);
    expect(await store.load()).toEqual(words);
  });
  it("recovers from corrupt JSON", async () => {
    expect(await createWordStore(fakeBackend({ [STORE_KEY]: "{nope" })).load()).toEqual([]);
  });
  it("ignores non-array stored values", async () => {
    expect(await createWordStore(fakeBackend({ [STORE_KEY]: '{"a":1}' })).load()).toEqual([]);
  });
});

describe("localStorageBackend", () => {
  it("returns null when there is no localStorage", () => {
    expect(localStorageBackend(null)).toBeNull();
  });
  it("persists across separate store instances (real jsdom localStorage)", async () => {
    const words = [{ id: "x", word: "chat", meaning: "고양이" }];
    await createWordStore(localStorageBackend()).save(words);
    // a brand-new store reading the same localStorage still sees the data
    expect(await createWordStore(localStorageBackend()).load()).toEqual(words);
    expect(window.localStorage.getItem(STORE_KEY)).toContain("chat");
  });
});

describe("capacitorBackend", () => {
  it("returns null without a Preferences plugin", () => {
    expect(capacitorBackend(null)).toBeNull();
  });
  it("round-trips through a Preferences-style plugin", async () => {
    const prefs = fakePreferences();
    const store = createWordStore(capacitorBackend(prefs));
    const words = [{ id: "1", word: "chien", meaning: "개" }];
    await store.save(words);
    expect(await store.load()).toEqual(words);
    expect(prefs.mem[STORE_KEY]).toContain("chien");
  });
  it("returns [] when the key was never set", async () => {
    expect(await createWordStore(capacitorBackend(fakePreferences())).load()).toEqual([]);
  });
});

describe("selectBackend priority", () => {
  it("prefers window.storage (artifact host) when present", () => {
    const host = memoryBackend();
    window.storage = host;
    expect(selectBackend()).toBe(host);
  });
  it("falls back to a persistent localStorage backend on the web", async () => {
    const store = createWordStore(selectBackend()); // no window.storage
    await store.save([{ id: "1", word: "livre", meaning: "책" }]);
    expect(window.localStorage.getItem(STORE_KEY)).toContain("livre");
  });
});
