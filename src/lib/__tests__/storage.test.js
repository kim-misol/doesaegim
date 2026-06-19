import { describe, it, expect } from "vitest";
import { createWordStore, STORE_KEY } from "../storage.js";

// Fake backend that throws on missing keys, like the real window.storage does.
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

describe("createWordStore", () => {
  it("returns [] when nothing is stored yet", async () => {
    const store = createWordStore(fakeBackend());
    expect(await store.load()).toEqual([]);
  });

  it("round-trips saved words", async () => {
    const store = createWordStore(fakeBackend());
    const words = [{ id: "1", word: "apple", meaning: "사과" }];
    expect(await store.save(words)).toBe(true);
    expect(await store.load()).toEqual(words);
  });

  it("recovers gracefully from corrupt JSON", async () => {
    const store = createWordStore(fakeBackend({ [STORE_KEY]: "{not json" }));
    expect(await store.load()).toEqual([]);
  });

  it("ignores non-array stored values", async () => {
    const store = createWordStore(fakeBackend({ [STORE_KEY]: '{"a":1}' }));
    expect(await store.load()).toEqual([]);
  });
});
