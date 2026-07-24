import { describe, it, expect } from "vitest";
import { supabaseKvBackend } from "../kvBackend.js";
import { createDailyStats } from "../dailyStats.js";
import { createLangOrderStore } from "../langOrder.js";

// Minimal fake of the Supabase query builder for a per-user kv table.
function fakeClient() {
  const store = {}; // keyed by `${user_id}|${k}`
  const client = {
    store,
    from() {
      return {
        select() {
          let uid, kk;
          const chain = {
            eq(col, val) {
              if (col === "user_id") uid = val;
              else kk = val;
              return chain;
            },
            maybeSingle: async () => {
              const key = `${uid}|${kk}`;
              return {
                data: key in store ? { value: store[key] } : null,
                error: null,
              };
            },
          };
          return chain;
        },
        async upsert(row) {
          store[`${row.user_id}|${row.k}`] = row.value;
          return { error: null };
        },
      };
    },
  };
  return client;
}

describe("supabaseKvBackend", () => {
  it("round-trips get/set scoped to the user", async () => {
    const be = supabaseKvBackend(fakeClient(), "u1");
    expect(await be.get("x")).toBeNull();
    await be.set("x", "hello");
    expect(await be.get("x")).toEqual({ key: "x", value: "hello" });
  });

  it("isolates users", async () => {
    const client = fakeClient();
    await supabaseKvBackend(client, "u1").set("k", "a");
    await supabaseKvBackend(client, "u2").set("k", "b");
    expect((await supabaseKvBackend(client, "u1").get("k")).value).toBe("a");
    expect((await supabaseKvBackend(client, "u2").get("k")).value).toBe("b");
  });

  it("works as a backend for dailyStats and langOrder (cross-device sync)", async () => {
    const client = fakeClient();
    // device A writes
    const a = supabaseKvBackend(client, "u1");
    const statsA = createDailyStats(a);
    const orderA = createLangOrderStore(a, ["ko", "en", "es"]);
    await statsA.bump();
    await statsA.bump();
    await orderA.save(["es", "ko", "en"]);
    // device B (same user) reads the same cloud values
    const b = supabaseKvBackend(client, "u1");
    expect(await createDailyStats(b).load()).toBe(2);
    expect(await createLangOrderStore(b, ["ko", "en", "es"]).load()).toEqual([
      "es",
      "ko",
      "en",
    ]);
  });
});
