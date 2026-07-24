import { describe, it, expect } from "vitest";
import { papagoUrl, naverDictUrl } from "../lookup.js";

describe("papagoUrl", () => {
  it("maps source/target langs and encodes the word", () => {
    expect(papagoUrl("resiliencia", "es", "ko")).toBe(
      "https://papago.naver.com/?sk=es&tk=ko&st=resiliencia",
    );
  });
  it("url-encodes spaces and special characters", () => {
    expect(papagoUrl("buenos días", "es", "ko")).toContain("st=buenos%20d%C3%ADas");
  });
  it("trims and handles all supported langs", () => {
    expect(papagoUrl(" Hund ", "de", "en")).toBe(
      "https://papago.naver.com/?sk=de&tk=en&st=Hund",
    );
  });
});

describe("naverDictUrl", () => {
  it("uses the language dictionary for the word's language", () => {
    expect(naverDictUrl("apple", "en")).toBe(
      "https://en.dict.naver.com/#/search?query=apple",
    );
    expect(naverDictUrl("resiliencia", "es")).toBe(
      "https://dict.naver.com/eskodict/#/search?query=resiliencia",
    );
  });
  it("encodes the query", () => {
    expect(naverDictUrl("caña", "es")).toContain("query=ca%C3%B1a");
  });
});
