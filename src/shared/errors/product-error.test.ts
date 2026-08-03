import { describe, expect, it } from "vitest";

import { authErrors, toProductError } from "@/shared/errors/product-error";

describe("ProductError", () => {
  it("exposes only the stable public contract", () => {
    expect(authErrors.cooldown().toPublic()).toEqual({
      code: "AUTH_CODE_COOLDOWN",
      messageVi: "Vui lòng chờ trước khi yêu cầu mã mới.",
      retryable: true,
      action: "retry",
    });
  });

  it("maps unknown provider detail to a safe generic error", () => {
    const error = toProductError(new Error("secret provider payload"));
    expect(error.code).toBe("AUTH_TEMPORARILY_UNAVAILABLE");
    expect(error.messageVi).not.toContain("secret provider payload");
  });
});
