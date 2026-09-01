import { describe, expect, it } from "vitest";

import {
  emailSchema,
  passwordSchema,
  sanitizeIntendedPath,
  signUpWithPasswordSchema,
} from "@/shared/contracts/auth";

describe("auth contracts", () => {
  it("normalizes valid email", () => {
    expect(emailSchema.parse("  Learner@Example.COM ")).toBe("learner@example.com");
  });

  it("rejects invalid email and short passwords", () => {
    expect(emailSchema.safeParse("not-an-email").success).toBe(false);
    expect(passwordSchema.safeParse("short").success).toBe(false);
    expect(passwordSchema.parse("a long enough password")).toBe("a long enough password");
  });

  it("requires password confirmation when a learner creates an account", () => {
    expect(
      signUpWithPasswordSchema.safeParse({
        email: "learner@example.com",
        password: "a long enough password",
        passwordConfirmation: "different password",
      }).success,
    ).toBe(false);
  });

  it.each([
    [undefined, "/start"],
    ["/library?status=ready", "/library?status=ready"],
    ["https://evil.example", "/start"],
    ["//evil.example", "/start"],
    ["%2F%2Fevil.example", "/start"],
    ["/sign-in?next=/library", "/start"],
    ["/api/auth/sign-out", "/start"],
    ["/\\evil.example", "/start"],
  ])("sanitizes intended path %s", (input, expected) => {
    expect(sanitizeIntendedPath(input)).toBe(expected);
  });
});
