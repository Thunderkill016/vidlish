export type ProductErrorCode =
  | "AUTH_EMAIL_INVALID"
  | "AUTH_CODE_INVALID_OR_EXPIRED"
  | "AUTH_CODE_COOLDOWN"
  | "AUTH_TEMPORARILY_UNAVAILABLE"
  | "AUTH_SESSION_REQUIRED"
  | "AUTH_BETA_ACCESS_REVOKED"
  | "AUTH_REQUEST_REJECTED";

export type ProductErrorAction = "retry" | "contact_support";

export type PublicProductError = {
  code: ProductErrorCode;
  messageVi: string;
  retryable: boolean;
  action?: ProductErrorAction;
};

export class ProductError extends Error {
  readonly name = "ProductError";

  constructor(
    readonly code: ProductErrorCode,
    readonly messageVi: string,
    readonly retryable: boolean,
    readonly action?: ProductErrorAction,
  ) {
    super(messageVi);
  }

  toPublic(): PublicProductError {
    return {
      code: this.code,
      messageVi: this.messageVi,
      retryable: this.retryable,
      ...(this.action ? { action: this.action } : {}),
    };
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

export function toProductError(error: unknown): ProductError {
  return error instanceof ProductError ? error : authErrors.unavailable();
}
