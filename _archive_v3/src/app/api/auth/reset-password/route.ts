import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createIdentityService } from "@/platform/identity/create-identity-service";
import { authErrors } from "@/shared/errors/product-error";
import { readAuthJsonBody } from "@/shared/http/json-body";
import { productErrorResponse } from "@/shared/http/product-error-response";
import { assertSameOrigin } from "@/shared/http/same-origin";

const requestSchema = z
  .object({ email: z.string().email().max(320) })
  .strict();

/**
 * Sends a learner a link to set a password.
 *
 * This exists because the product changed how people sign in. Every account
 * created before that change was made with a one-time code and has no password,
 * so its owner can neither sign in — nothing to type — nor sign up, because the
 * address is taken. Without this route they are locked out of their own
 * evidence permanently.
 *
 * The response is the same whether or not the address is known. Anything else
 * turns this into a way to ask the product which of a list of people have
 * accounts.
 */
export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const parsed = requestSchema.safeParse(await readAuthJsonBody(request));
    if (!parsed.success) throw authErrors.rejected();

    const origin = new URL(request.url).origin;
    const service = await createIdentityService();
    await service.sendPasswordReset(parsed.data.email, `${origin}/reset-password`);

    return NextResponse.json(
      { sent: true },
      { status: 202, headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return productErrorResponse(error);
  }
}
