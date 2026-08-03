import { type NextRequest, NextResponse } from "next/server";

import { createIdentityService } from "@/platform/identity/create-identity-service";
import { assertSameOrigin } from "@/shared/http/same-origin";
import { productErrorResponse } from "@/shared/http/product-error-response";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const body = (await request.json()) as unknown;
    const service = await createIdentityService();
    const result = await service.requestLoginCode(body as { email: string });

    return NextResponse.json(result, {
      status: 202,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return productErrorResponse(error);
  }
}
