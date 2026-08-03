import type { NextRequest } from "next/server";

import { authErrors } from "@/shared/errors/product-error";

export function assertSameOrigin(request: NextRequest): void {
  const origin = request.headers.get("origin");
  if (!origin || origin !== request.nextUrl.origin) throw authErrors.rejected();
}
