import { type NextRequest, NextResponse } from "next/server";

import { createIdentityService } from "@/platform/identity/create-identity-service";
import { getServerConfig } from "@/platform/config/server";
import { authErrors } from "@/shared/errors/product-error";
import { readAuthJsonBody } from "@/shared/http/json-body";
import { assertSameOrigin } from "@/shared/http/same-origin";
import { productErrorResponse } from "@/shared/http/product-error-response";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    if (getServerConfig().AUTH_ADAPTER !== "fake") throw authErrors.rejected();
    const body = await readAuthJsonBody(request);
    const service = await createIdentityService();
    const result = await service.signInWithPassword(
      body as { email: string; password: string; intendedPath?: string },
    );

    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return productErrorResponse(error);
  }
}
