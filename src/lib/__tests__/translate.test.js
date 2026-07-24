import { describe, it, expect, vi } from "vitest";
import {
  buildSystemPrompt,
  parseResponse,
  cacheKey,
  fetchMeanings,
  getEndpoint,
  isAutocompleteAvailable,
  buildHeaders,
} from "../translate.js";

describe("buildSystemPrompt", () => {
  it("names both source and target languages", () => {
    const p = buildSystemPrompt("en", "ko", "translate");
    expect(p).toContain("English");
    expect(p).toContain("한국어");
  });
  it("requests multiple senses in dict mode", () => {
    expect(buildSystemPrompt("de", "ko", "dict")).toMatch(/senses/i);
  });
  it("supports the newly added languages", () => {
    const p = buildSystemPrompt("es", "it", "translate");
    expect(p).toContain("Español");
    expect(p).toContain("Italiano");
  });
});

describe("buildHeaders", () => {
  it("adds apikey + Authorization when anon key is present", () => {
    const h = buildHeaders("sb_publishable_abc");
    expect(h.apikey).toBe("sb_publishable_abc");
    expect(h.Authorization).toBe("Bearer sb_publishable_abc");
    expect(h["Content-Type"]).toBe("application/json");
  });
  it("omits auth headers when no key", () => {
    const h = buildHeaders(null);
    expect(h.apikey).toBeUndefined();
    expect(h.Authorization).toBeUndefined();
  });
});

describe("parseResponse", () => {
  it("parses short-key JSON from text blocks", () => {
    const data = {
      content: [{ type: "text", text: '{"t":[{"m":"사과","n":"명사"}]}' }],
    };
    expect(parseResponse(data)).toEqual([{ meaning: "사과", note: "명사" }]);
  });
  it("strips markdown fences and drops empty meanings", () => {
    const data = {
      content: [
        {
          type: "text",
          text: '```json\n{"t":[{"m":"","n":""},{"m":"개","n":""}]}\n```',
        },
      ],
    };
    expect(parseResponse(data)).toEqual([{ meaning: "개", note: "" }]);
  });
  it("also accepts the long-key shape", () => {
    const data = {
      content: [
        {
          type: "text",
          text: '{"translations":[{"meaning":"chat","note":""}]}',
        },
      ],
    };
    expect(parseResponse(data)).toEqual([{ meaning: "chat", note: "" }]);
  });
});

describe("cacheKey", () => {
  it("is case- and whitespace-insensitive on the word", () => {
    expect(cacheKey("  Dog ", "en", "de", "translate")).toBe(
      cacheKey("dog", "en", "de", "translate"),
    );
  });
});

describe("getEndpoint", () => {
  it("returns env variable value when set", () => {
    expect(
      getEndpoint({ VITE_TRANSLATE_ENDPOINT: "https://proxy.example.com" }),
    ).toBe("https://proxy.example.com");
  });
  it("returns null when not set", () => {
    expect(getEndpoint({})).toBeNull();
  });
});

describe("isAutocompleteAvailable", () => {
  it("returns true when endpoint is configured", () => {
    expect(
      isAutocompleteAvailable({
        VITE_TRANSLATE_ENDPOINT: "https://proxy.example.com",
      }),
    ).toBe(true);
  });
  it("returns false when no endpoint", () => {
    expect(isAutocompleteAvailable({})).toBe(false);
  });
});

describe("fetchMeanings", () => {
  const okResponse = (text) => ({
    ok: true,
    json: async () => ({ content: [{ type: "text", text }] }),
  });
  const ENDPOINT = "https://proxy.example.com/translate";

  it("calls the API once, then serves from cache", async () => {
    const cache = new Map();
    const fetchImpl = vi.fn(async () =>
      okResponse('{"t":[{"m":"chien","n":""}]}'),
    );
    const a = await fetchMeanings("dog", "en", "de", "translate", {
      fetchImpl,
      cache,
      endpoint: ENDPOINT,
    });
    const b = await fetchMeanings("dog", "en", "de", "translate", {
      fetchImpl,
      cache,
      endpoint: ENDPOINT,
    });
    expect(a).toEqual([{ meaning: "chien", note: "" }]);
    expect(b).toEqual(a);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("throws on a non-ok response", async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 500 }));
    await expect(
      fetchMeanings("x", "en", "ko", "translate", {
        fetchImpl,
        cache: new Map(),
        endpoint: ENDPOINT,
      }),
    ).rejects.toThrow();
  });

  it("POSTs to the configured endpoint", async () => {
    const fetchImpl = vi.fn(async () =>
      okResponse('{"t":[{"m":"고양이","n":""}]}'),
    );
    await fetchMeanings("cat", "en", "ko", "translate", {
      fetchImpl,
      cache: new Map(),
      endpoint: ENDPOINT,
    });
    expect(fetchImpl.mock.calls[0][0]).toBe(ENDPOINT);
    expect(fetchImpl.mock.calls[0][1].method).toBe("POST");
  });

  it("sends the apikey header when an anon key is provided", async () => {
    const fetchImpl = vi.fn(async () => okResponse('{"t":[{"m":"x","n":""}]}'));
    await fetchMeanings("cat", "en", "ko", "translate", {
      fetchImpl,
      cache: new Map(),
      endpoint: ENDPOINT,
      anonKey: "sb_publishable_abc",
    });
    const headers = fetchImpl.mock.calls[0][1].headers;
    expect(headers.apikey).toBe("sb_publishable_abc");
    expect(headers.Authorization).toBe("Bearer sb_publishable_abc");
  });

  it("throws when no endpoint is provided", async () => {
    await expect(
      fetchMeanings("dog", "en", "de", "translate", {
        fetchImpl: vi.fn(),
        cache: new Map(),
        endpoint: null,
      }),
    ).rejects.toThrow(/endpoint/i);
  });
});
