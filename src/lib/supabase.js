// Supabase client singleton + auth helpers. Everything is guarded so the app
// runs (local-only mode) even when Supabase env vars are absent or the SDK is
// not installed.
//
// Required env (client, safe to expose — anon key is public by design):
//   VITE_SUPABASE_URL
//   VITE_SUPABASE_ANON_KEY

let _client = null;
let _loaded = false;

export function cloudConfig(env = import.meta.env) {
  return {
    url: env?.VITE_SUPABASE_URL ?? null,
    anonKey: env?.VITE_SUPABASE_ANON_KEY ?? null,
  };
}

export function isCloudConfigured(env = import.meta.env) {
  const { url, anonKey } = cloudConfig(env);
  return !!(url && anonKey);
}

// Lazily create the client. Dynamic import keeps @supabase/supabase-js out of
// the critical path and lets the build succeed even if it's not installed.
export async function getSupabase(env = import.meta.env) {
  if (_client || _loaded) return _client;
  _loaded = true;
  if (!isCloudConfigured(env)) return null;
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const { url, anonKey } = cloudConfig(env);
    _client = createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  } catch {
    _client = null; // SDK missing — stay in local mode
  }
  return _client;
}

// --- auth ---------------------------------------------------------------

export async function currentUser(env = import.meta.env) {
  const sb = await getSupabase(env);
  if (!sb) return null;
  const { data } = await sb.auth.getUser();
  return data?.user ?? null;
}

// Passwordless magic-link sign in. Returns { error } shape.
export async function signInWithEmail(email, env = import.meta.env) {
  const sb = await getSupabase(env);
  if (!sb) return { error: new Error("cloud not configured") };
  return sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin + window.location.pathname },
  });
}

export async function signOut(env = import.meta.env) {
  const sb = await getSupabase(env);
  if (sb) await sb.auth.signOut();
}

// Subscribe to login/logout. Returns an unsubscribe fn (no-op if unconfigured).
export async function onAuthChange(cb, env = import.meta.env) {
  const sb = await getSupabase(env);
  if (!sb) return () => {};
  const { data } = sb.auth.onAuthStateChange((_evt, session) => cb(session?.user ?? null));
  return () => data?.subscription?.unsubscribe?.();
}
