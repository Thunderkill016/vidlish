import { describe, expect, it } from "vitest";

import { emailSchema, otpSchema, sanitizeIntendedPath } from "@/shared/contracts/auth";

describe("auth contracts", () => {
  it("normalizes valid email", () => {
    expect(emailSchema.parse("  Learner@Example.COM ")).toBe("learner@example.com");
  });

  it("rejects invalid email and non-six-digit OTP", () => {
    expect(emailSchema.safeParse("not-an-email").success).toBe(false);
    expect(otpSchema.safeParse("12345").success).toBe(false);
    expect(otpSchema.safeParse("12a456").success).toBe(false);
    expect(otpSchema.parse("123456")).toBe("123456");
  });

  it.each([
    [undefined, "/create"],
    ["/library?status=ready", "/library?status=ready"],
    ["https://evil.example", "/create"],
    ["//evil.example", "/create"],
    ["%2F%2Fevil.example", "/create"],
    ["/sign-in?next=/library", "/create"],
    ["/api/auth/sign-out", "/create"],
    ["/\\evil.example", "/create"],
  ])("sanitizes intended path %s", (input, expected) => {
    expect(sanitizeIntendedPath(input)).toBe(expected);
  });
});
