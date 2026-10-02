import { describe, it, expect, vi } from "vitest";
import { saveFile, toBase64 } from "../download.js";

describe("toBase64", () => {
  it("encodes strings as UTF-8", () => {
    expect(toBase64("되")).toBe("65CY");
  });
  it("encodes ArrayBuffer / Uint8Array", () => {
    expect(toBase64(new Uint8Array([104, 105]).buffer)).toBe("aGk=");
    expect(toBase64(new Uint8Array([104, 105]))).toBe("aGk=");
  });
});

describe("saveFile", () => {
  it("uses the web download on non-native", async () => {
    const web = vi.fn();
    const native = vi.fn();
    await saveFile("a.json", "{}", "application/json", {
      isNative: () => false,
      web,
      native,
    });
    expect(web).toHaveBeenCalledWith("a.json", "{}", "application/json");
    expect(native).not.toHaveBeenCalled();
  });

  it("writes base64 then shares on native", async () => {
    const native = vi.fn();
    const web = vi.fn();
    await saveFile("a.csv", "x", "text/csv", {
      isNative: () => true,
      web,
      native,
    });
    expect(native).toHaveBeenCalledWith("a.csv", "eA==");
    expect(web).not.toHaveBeenCalled();
  });

  it("treats a cancelled share sheet as success", async () => {
    const native = vi.fn().mockRejectedValue(new Error("Share canceled"));
    await expect(
      saveFile("a", "x", "t", { isNative: () => true, native }),
    ).resolves.toBeUndefined();
  });

  it("rethrows other native errors", async () => {
    const native = vi.fn().mockRejectedValue(new Error("disk full"));
    await expect(
      saveFile("a", "x", "t", { isNative: () => true, native }),
    ).rejects.toThrow("disk full");
  });
});
