import type { NextRequest } from "next/server";

import { authErrors } from "@/shared/errors/product-error";

const MAX_AUTH_JSON_BYTES = 8 * 1024;

/**
 * Reads a JSON request body, refusing anything that is not a small JSON object
 * before it reaches a schema. `maxBytes` is a per-endpoint ceiling: a body the
 * endpoint could never accept should not be buffered to find that out.
 */
export async function readJsonBody(
  request: NextRequest,
  maxBytes: number,
): Promise<unknown> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) throw authErrors.rejected();

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw authErrors.rejected();
  }

  try {
    return await request.json();
  } catch {
    throw authErrors.rejected();
  }
}

export async function readAuthJsonBody(request: NextRequest): Promise<unknown> {
  return readJsonBody(request, MAX_AUTH_JSON_BYTES);
}
