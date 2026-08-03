import { type NextRequest, NextResponse } from "next/server";

import { createIdentityService } from "@/platform/identity/create-identity-service";
import { assertSameOrigin } from "@/shared/http/same-origin";
import { productErrorResponse } from "@/shared/http/product-error-response";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const service = await createIdentityService();
    await service.signOut();

    const response = NextResponse.redirect(new URL("/sign-in", request.url), 303);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch (error) {
    return productErrorResponse(error);
  }
}
