import { z } from "zod";

export const productErrorCodeSchema = z.enum([
  "AUTH_EMAIL_INVALID",
  "AUTH_CODE_INVALID_OR_EXPIRED",
  "AUTH_CODE_COOLDOWN",
  "AUTH_TEMPORARILY_UNAVAILABLE",
  "AUTH_SESSION_REQUIRED",
  "AUTH_BETA_ACCESS_REVOKED",
  "AUTH_REQUEST_REJECTED",
  "VIDEO_URL_INVALID",
  "VIDEO_NOT_FOUND",
  "VIDEO_PRIVATE",
  "VIDEO_RESTRICTED",
  "VIDEO_UNAVAILABLE",
  "VIDEO_METADATA_FAILED",
  "JOB_CONCURRENCY_LIMIT",
  "ACCOUNT_QUOTA_EXCEEDED",
  "RATE_LIMITED",
  "JOB_NOT_FOUND",
  "JOB_CREATE_FAILED",
]);

export type ProductErrorCode = z.infer<typeof productErrorCodeSchema>;

export const productErrorActionSchema = z.enum([
  "retry",
  "capture_audio",
  "provide_transcript",
  "choose_another_video",
  "create_new_job",
  "contact_support",
]);
export type ProductErrorAction = z.infer<typeof productErrorActionSchema>;

export const publicProductErrorSchema = z
  .object({
    code: productErrorCodeSchema,
    messageVi: z.string().min(1).max(500),
    retryable: z.boolean(),
    action: productErrorActionSchema.optional(),
    jobId: z.string().uuid().optional(),
  })
  .strict();

export type PublicProductError = z.infer<typeof publicProductErrorSchema>;

export class ProductError extends Error {
  readonly name = "ProductError";

  constructor(
    readonly code: ProductErrorCode,
    readonly messageVi: string,
    readonly retryable: boolean,
    readonly action?: ProductErrorAction,
    readonly jobId?: string,
  ) {
    super(messageVi);
  }

  toPublic(): PublicProductError {
    return publicProductErrorSchema.parse({
      code: this.code,
      messageVi: this.messageVi,
      retryable: this.retryable,
      ...(this.action ? { action: this.action } : {}),
      ...(this.jobId ? { jobId: this.jobId } : {}),
    });
  }
}

export const authErrors = {
  invalidEmail: () =>
    new ProductError("AUTH_EMAIL_INVALID", "Email không hợp lệ.", false),
  invalidCode: () =>
    new ProductError(
      "AUTH_CODE_INVALID_OR_EXPIRED",
      "Mã đăng nhập không đúng hoặc đã hết hạn. Hãy kiểm tra lại hoặc yêu cầu mã mới.",
      false,
    ),
  cooldown: () =>
    new ProductError(
      "AUTH_CODE_COOLDOWN",
      "Vui lòng chờ trước khi yêu cầu mã mới.",
      true,
      "retry",
    ),
  unavailable: () =>
    new ProductError(
      "AUTH_TEMPORARILY_UNAVAILABLE",
      "Vidlish chưa thể xử lý yêu cầu đăng nhập. Hãy thử lại sau ít phút.",
      true,
      "retry",
    ),
  sessionRequired: () =>
    new ProductError(
      "AUTH_SESSION_REQUIRED",
      "Phiên đăng nhập không còn hiệu lực. Hãy đăng nhập lại.",
      false,
    ),
  revoked: () =>
    new ProductError(
      "AUTH_BETA_ACCESS_REVOKED",
      "Quyền truy cập private beta không còn hiệu lực.",
      false,
      "contact_support",
    ),
  rejected: () =>
    new ProductError("AUTH_REQUEST_REJECTED", "Yêu cầu không hợp lệ.", false),
} as const;

export const videoErrors = {
  invalidUrl: () =>
    new ProductError(
      "VIDEO_URL_INVALID",
      "Liên kết YouTube không hợp lệ. Hãy kiểm tra và thử lại.",
      false,
    ),
  notFound: () =>
    new ProductError(
      "VIDEO_NOT_FOUND",
      "Không tìm thấy hoặc không thể truy cập video này. Hãy kiểm tra liên kết.",
      false,
    ),
  private: () =>
    new ProductError(
      "VIDEO_PRIVATE",
      "Video này đang ở chế độ riêng tư và không thể dùng trong Vidlish.",
      false,
    ),
  restricted: () =>
    new ProductError(
      "VIDEO_RESTRICTED",
      "Video này không cho phép phát trong Vidlish hoặc bị giới hạn tại khu vực hiện tại.",
      false,
    ),
  unavailable: () =>
    new ProductError(
      "VIDEO_UNAVAILABLE",
      "Video này hiện chưa sẵn sàng để sử dụng. Hãy chọn video khác.",
      false,
    ),
  metadataFailed: (retryable = true) =>
    new ProductError(
      "VIDEO_METADATA_FAILED",
      retryable
        ? "Vidlish chưa thể kiểm tra video. Hãy thử lại."
        : "Vidlish chưa thể kiểm tra video do cấu hình dịch vụ.",
      retryable,
      retryable ? "retry" : undefined,
    ),
} as const;

export const generationErrors = {
  concurrencyLimit: () =>
    new ProductError(
      "JOB_CONCURRENCY_LIMIT",
      "Bạn đã có quá nhiều bài học đang được tạo. Hãy chờ một bài hoàn tất rồi thử lại.",
      true,
      "retry",
    ),
  quotaExceeded: () =>
    new ProductError(
      "ACCOUNT_QUOTA_EXCEEDED",
      "Bạn đã dùng hết lượt tạo bài học hiện tại.",
      false,
      "contact_support",
    ),
  rateLimited: () =>
    new ProductError(
      "RATE_LIMITED",
      "Bạn thao tác quá nhanh. Hãy chờ một chút rồi thử lại.",
      true,
      "retry",
    ),
  notFound: () =>
    new ProductError(
      "JOB_NOT_FOUND",
      "Không tìm thấy tiến trình tạo bài học này.",
      false,
      "create_new_job",
    ),
  createFailed: () =>
    new ProductError(
      "JOB_CREATE_FAILED",
      "Vidlish chưa thể bắt đầu tạo bài học. Hãy thử lại.",
      true,
      "retry",
    ),
} as const;

export function toProductError(
  error: unknown,
  fallback: ProductError = authErrors.unavailable(),
): ProductError {
  return error instanceof ProductError ? error : fallback;
}
