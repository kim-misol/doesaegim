import { describe, it, expect } from "vitest";
import { createRemoteWordStore } from "../remoteStore.js";
import { wordToRow } from "../rows.js";

// Minimal fake of the Supabase query builder that records calls.
function fakeClient(initialRows = []) {
  const calls = { upserts: [], deletes: [] };
  const rows = [...initialRows];
  const client = {
    calls,
    from() {
      return {
        select() {
          return {
            eq: async () => ({ data: rows, error: null }),
          };
        },
        async upsert(r) {
          calls.upserts.push(r);
          return { data: r, error: null };
        },
        delete() {
          return {
            in: async (_col, ids) => {
              calls.deletes.push(ids);
              return { error: null };
            },
          };
        },
      };
    },
  };
  return client;
}

const word = (id, over = {}) => ({
  id, srcLang: "en", tgtLang: "ko", word: "w" + id, meaning: "m" + id,
  box: 0, due: 1000, createdAt: Number(id.replace(/\D/g, "")) || 1, ...over,
});

describe("remoteStore", () => {
  it("load maps rows to words, newest first", async () => {
    const client = fakeClient([
      wordToRow(word("1", { createdAt: 100 }), "u"),
      wordToRow(word("2", { createdAt: 200 }), "u"),
    ]);
    const store = createRemoteWordStore(client, "u");
    const words = await store.load();
    expect(words.map((w) => w.id)).toEqual(["2", "1"]);
    expect(words[0].srcLang).toBe("en");
  });

  it("save upserts only new/changed cards", async () => {
    const client = fakeClient();
    const store = createRemoteWordStore(client, "u");
    await store.load(); // prev = []
    await store.save([word("1"), word("2")]);
    expect(client.calls.upserts).toHaveLength(1);
    expect(client.calls.upserts[0].map((r) => r.id)).toEqual(["1", "2"]);
    expect(client.calls.upserts[0][0].user_id).toBe("u");

    // second save with one edit -> single-row upsert, no deletes
    await store.save([word("1"), word("2", { box: 5 })]);
    expect(client.calls.upserts).toHaveLength(2);
    expect(client.calls.upserts[1].map((r) => r.id)).toEqual(["2"]);
    expect(client.calls.deletes).toHaveLength(0);
  });

  it("save deletes removed cards", async () => {
    const client = fakeClient();
    const store = createRemoteWordStore(client, "u");
    await store.load();
    await store.save([word("1"), word("2")]);
    await store.save([word("1")]);
    expect(client.calls.deletes[0]).toEqual(["2"]);
  });

  it("returns false when a write errors (keeps local state)", async () => {
    const client = fakeClient();
    client.from = () => ({
      upsert: async () => ({ error: new Error("boom") }),
      select: () => ({ eq: async () => ({ data: [], error: null }) }),
      delete: () => ({ in: async () => ({ error: null }) }),
    });
    const store = createRemoteWordStore(client, "u");
    const ok = await store.save([word("1")]);
    expect(ok).toBe(false);
  });
});
