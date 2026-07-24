// 되새김 · translate proxy (Supabase Edge Function, Deno)
//
// Hides the Anthropic API key server-side. The client (src/lib/translate.js)
// sends a plain POST with no auth header, so deploy this WITHOUT JWT checking
// and guard abuse with an Origin allowlist + strict input validation:
//
//   supabase functions deploy translate --no-verify-jwt
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//   supabase secrets set ALLOWED_ORIGINS=https://<user>.github.io,http://localhost:5173
//
// Client contract (src/lib/translate.js):
//   POST body { word, srcLang, tgtLang, mode, systemPrompt }
//   → forwards Anthropic's response JSON as-is; the client parses the model
//     text `{"t":[{"m":..,"n":..}]}` from `content[].text`.
//
// Note: an Origin allowlist stops other websites' browsers, not raw curl. For
// a personal app that + Haiku + max_tokens:256 keeps cost negligible. For
// stronger limits, front it with per-user auth or a rate limiter.

const LANGS = ["ko", "en", "es", "it", "de"];
const MODES = ["dict", "translate"];

function allowlist(): string[] {
  return (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function corsHeaders(origin: string | null) {
  const list = allowlist();
  // If no allowlist configured, allow all (dev). Otherwise echo only if listed.
  const allow =
    list.length === 0 ? "*" : list.includes(origin ?? "") ? origin! : "";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

const json = (body: unknown, status: number, cors: Record<string, string>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const cors = corsHeaders(origin);

  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST")
    return json({ error: "method not allowed" }, 405, cors);

  // reject disallowed browser origins (empty Allow-Origin => blocked by CORS,
  // but also fail fast server-side)
  const list = allowlist();
  if (list.length && origin && !list.includes(origin))
    return json({ error: "forbidden origin" }, 403, cors);

  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return json({ error: "server misconfigured" }, 500, cors);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid json" }, 400, cors);
  }

  const word = String(body.word ?? "").trim();
  const { srcLang, tgtLang, mode, systemPrompt } = body as Record<
    string,
    string
  >;

  if (!word || word.length > 100) return json({ error: "bad word" }, 400, cors);
  if (!LANGS.includes(srcLang) || !LANGS.includes(tgtLang))
    return json({ error: "bad lang" }, 400, cors);
  if (!MODES.includes(mode)) return json({ error: "bad mode" }, 400, cors);
  if (!systemPrompt || systemPrompt.length > 1000)
    return json({ error: "bad prompt" }, 400, cors);

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      system: systemPrompt,
      messages: [{ role: "user", content: word }],
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    return json({ error: "upstream", status: res.status, detail }, 502, cors);
  }
  return json(await res.json(), 200, cors);
});
