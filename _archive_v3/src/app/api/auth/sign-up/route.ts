import { type NextRequest, NextResponse } from "next/server";

import { createIdentityService } from "@/platform/identity/create-identity-service";
import { authErrors } from "@/shared/errors/product-error";
import { readAuthJsonBody } from "@/shared/http/json-body";
import { assertSameOrigin } from "@/shared/http/same-origin";
import { productErrorResponse } from "@/shared/http/product-error-response";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    // This used to refuse every adapter but the fake one, which meant the
    // password flow existed only in tests: production ran `supabase`, both
    // routes returned 403, and the one-time-code routes this replaced had
    // already been deleted. Nobody could sign in at all.
    //
    // CI could not have caught it — every job runs `AUTH_ADAPTER: fake`, so the
    // suite exercised the one branch that worked. The Supabase provider
    // implements the password methods in full; the guard was the only thing
    // standing between them and a learner.
    const body = await readAuthJsonBody(request);
    const service = await createIdentityService();
    const confirmationRedirect = new URL("/auth/callback", request.url);
    confirmationRedirect.searchParams.set("next", "/start");
    const result = await service.signUpWithPassword(
      body as {
        email: string;
        password: string;
        passwordConfirmation: string;
        intendedPath?: string;
      },
      confirmationRedirect.toString(),
    );

    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return productErrorResponse(error);
  }
}
