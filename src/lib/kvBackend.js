// Supabase-backed key/value store, per user. Implements the same interface as
// the local storage backends (get(k) -> { value } | null, set(k, v)) so the
// existing dailyStats / langOrder stores sync across devices unchanged when a
// user is signed in. Client is injected → unit-testable with a fake.
//
// Backing table: kv (user_id uuid, k text, value text, primary key (user_id,k))

export function supabaseKvBackend(client, userId, table = "kv") {
  return {
    async get(k) {
      const { data, error } = await client
        .from(table)
        .select("value")
        .eq("user_id", userId)
        .eq("k", k)
        .maybeSingle();
      if (error) throw error;
      return data && data.value != null ? { key: k, value: data.value } : null;
    },
    async set(k, v) {
      const { error } = await client
        .from(table)
        .upsert({ user_id: userId, k, value: v }, { onConflict: "user_id,k" });
      if (error) throw error;
      return { key: k, value: v };
    },
  };
}
