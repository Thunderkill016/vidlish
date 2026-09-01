import { describe, expect, it } from "vitest";

import {
  authErrors,
  toProductError,
  videoErrors,
} from "@/shared/errors/product-error";

describe("ProductError", () => {
  it("exposes only the stable public contract", () => {
    expect(authErrors.rateLimited().toPublic()).toEqual({
      code: "AUTH_RATE_LIMITED",
      messageVi: "Bạn đã thử quá nhiều lần. Hãy chờ một lúc rồi thử lại.",
      retryable: true,
      action: "retry",
    });
  });

  it("uses the canonical non-retryable action for unsupported source speech", () => {
    expect(videoErrors.languageUnsupported().toPublic()).toEqual({
      code: "VIDEO_LANGUAGE_UNSUPPORTED",
      messageVi:
        "Video này không có đủ lời nói tiếng Anh gốc để tạo một bài học có căn cứ.",
      retryable: false,
      action: "choose_another_video",
    });
  });

  it("maps unknown provider detail to a safe generic error", () => {
    const error = toProductError(new Error("secret provider payload"));
    expect(error.code).toBe("AUTH_TEMPORARILY_UNAVAILABLE");
    expect(error.messageVi).not.toContain("secret provider payload");
  });
});
