import { describe, it, expect, vi } from "vitest";

const auth = {
  signInWithOtp: vi.fn(async () => ({ error: null })),
  verifyOtp: vi.fn(async () => ({ data: { user: { id: "u" } }, error: null })),
};
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ auth }) }));

const { signInWithEmail, verifyEmailCode, normalizeCode } =
  await import("../supabase.js");
const env = {
  VITE_SUPABASE_URL: "https://x.supabase.co",
  VITE_SUPABASE_ANON_KEY: "k",
};

describe("normalizeCode", () => {
  it("keeps digits only", () => {
    expect(normalizeCode(" 123 456\n")).toBe("123456");
    expect(normalizeCode("12-34")).toBe("1234");
  });
});

describe("verifyEmailCode", () => {
  it("verifies an email OTP", async () => {
    const r = await verifyEmailCode("a@b.co", " 123 456 ", env);
    expect(auth.verifyOtp).toHaveBeenCalledWith({
      email: "a@b.co",
      token: "123456",
      type: "email",
    });
    expect(r.error).toBeNull();
  });

  it("rejects an empty code without calling Supabase", async () => {
    auth.verifyOtp.mockClear();
    const r = await verifyEmailCode("a@b.co", "  ", env);
    expect(r.error).toBeTruthy();
    expect(auth.verifyOtp).not.toHaveBeenCalled();
  });

  it("returns an error when cloud is not configured", async () => {
    vi.resetModules();
    const m = await import("../supabase.js");
    const r = await m.verifyEmailCode("a@b.co", "123456", {});
    expect(r.error).toBeTruthy();
  });
});

describe("signInWithEmail", () => {
  it("still requests an OTP email", async () => {
    await signInWithEmail("a@b.co", env);
    expect(auth.signInWithOtp).toHaveBeenCalled();
    expect(auth.signInWithOtp.mock.calls[0][0].email).toBe("a@b.co");
  });
});
