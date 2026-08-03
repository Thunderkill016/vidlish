import { NextResponse } from "next/server";

import {
  ProductError,
  authErrors,
  toProductError,
} from "@/shared/errors/product-error";

const statusByCode = {
  AUTH_EMAIL_INVALID: 400,
  AUTH_CODE_INVALID_OR_EXPIRED: 400,
  AUTH_CODE_COOLDOWN: 429,
  AUTH_TEMPORARILY_UNAVAILABLE: 503,
  AUTH_SESSION_REQUIRED: 401,
  AUTH_BETA_ACCESS_REVOKED: 403,
  AUTH_REQUEST_REJECTED: 403,
  VIDEO_URL_INVALID: 400,
  VIDEO_NOT_FOUND: 404,
  VIDEO_PRIVATE: 422,
  VIDEO_RESTRICTED: 422,
  VIDEO_UNAVAILABLE: 422,
  VIDEO_METADATA_FAILED: 503,
} as const;

export function productErrorResponse(
  error: unknown,
  fallback: ProductError = authErrors.unavailable(),
): NextResponse {
  const productError =
    error instanceof ProductError ? error : toProductError(error, fallback);
  return NextResponse.json(
    { error: productError.toPublic() },
    {
      status: statusByCode[productError.code],
      headers: { "Cache-Control": "private, no-store" },
    },
  );
}
