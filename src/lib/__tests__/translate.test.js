import { describe, it, expect, vi } from "vitest";
import {
  buildSystemPrompt,
  parseResponse,
  cacheKey,
  fetchMeanings,
} from "../translate.js";

describe("buildSystemPrompt", () => {
  it("names both source and target languages", () => {
    const p = buildSystemPrompt("en", "ko", "translate");
    expect(p).toContain("English");
    expect(p).toContain("한국어");
  });
  it("requests multiple senses in dict mode", () => {
    expect(buildSystemPrompt("fr", "ko", "dict")).toMatch(/senses/i);
  });
});

describe("parseResponse", () => {
  it("parses short-key JSON from text blocks", () => {
    const data = { content: [{ type: "text", text: '{"t":[{"m":"사과","n":"명사"}]}' }] };
    expect(parseResponse(data)).toEqual([{ meaning: "사과", note: "명사" }]);
  });
  it("strips markdown fences and drops empty meanings", () => {
    const data = {
      content: [{ type: "text", text: '```json\n{"t":[{"m":"","n":""},{"m":"개","n":""}]}\n```' }],
    };
    expect(parseResponse(data)).toEqual([{ meaning: "개", note: "" }]);
  });
  it("also accepts the long-key shape", () => {
    const data = { content: [{ type: "text", text: '{"translations":[{"meaning":"chat","note":""}]}' }] };
    expect(parseResponse(data)).toEqual([{ meaning: "chat", note: "" }]);
  });
});

describe("cacheKey", () => {
  it("is case- and whitespace-insensitive on the word", () => {
    expect(cacheKey("  Dog ", "en", "fr", "translate")).toBe(
      cacheKey("dog", "en", "fr", "translate")
    );
  });
});

describe("fetchMeanings", () => {
  const okResponse = (text) => ({ ok: true, json: async () => ({ content: [{ type: "text", text }] }) });

  it("calls the API once, then serves from cache", async () => {
    const cache = new Map();
    const fetchImpl = vi.fn(async () => okResponse('{"t":[{"m":"chien","n":""}]}'));
    const a = await fetchMeanings("dog", "en", "fr", "translate", { fetchImpl, cache });
    const b = await fetchMeanings("dog", "en", "fr", "translate", { fetchImpl, cache });
    expect(a).toEqual([{ meaning: "chien", note: "" }]);
    expect(b).toEqual(a);
    expect(fetchImpl).toHaveBeenCalledTimes(1); // second call hits cache -> 0 tokens
  });

  it("throws on a non-ok response", async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 500 }));
    await expect(
      fetchMeanings("x", "en", "ko", "translate", { fetchImpl, cache: new Map() })
    ).rejects.toThrow();
  });

  it("uses the cheap Haiku model with a low token cap", async () => {
    const fetchImpl = vi.fn(async () => okResponse('{"t":[{"m":"고양이","n":""}]}'));
    await fetchMeanings("cat", "en", "ko", "translate", { fetchImpl, cache: new Map() });
    const body = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(body.model).toMatch(/haiku/);
    expect(body.max_tokens).toBeLessThanOrEqual(256);
  });
});
