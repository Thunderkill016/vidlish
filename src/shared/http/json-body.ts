import type { NextRequest } from "next/server";

import { authErrors } from "@/shared/errors/product-error";

const MAX_AUTH_JSON_BYTES = 8 * 1024;

export async function readAuthJsonBody(request: NextRequest): Promise<unknown> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) throw authErrors.rejected();

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_AUTH_JSON_BYTES) {
    throw authErrors.rejected();
  }

  try {
    return await request.json();
  } catch {
    throw authErrors.rejected();
  }
}
