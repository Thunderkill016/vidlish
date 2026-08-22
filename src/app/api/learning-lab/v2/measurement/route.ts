import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getAdminSupabaseClient } from "@/adapters/supabase/admin-client";
import { SupabaseLearningMeasurementReader } from "@/adapters/supabase/learning-measurement-reader";
import { createIdentityService } from "@/platform/identity/create-identity-service";
import { learningMeasurementSummarySchema } from "@/shared/contracts/learning-measurement";
import { authErrors } from "@/shared/errors/product-error";
import { productErrorResponse } from "@/shared/http/product-error-response";
import { assertSameOrigin } from "@/shared/http/same-origin";

const querySchema = z
  .object({
    sessionId: z.string().uuid(),
  })
  .strict();

export async function GET(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const access = await (await createIdentityService()).resolveCurrentAccess();
    if (!access) throw authErrors.sessionRequired();

    const parsed = querySchema.safeParse({
      sessionId: request.nextUrl.searchParams.get("sessionId"),
    });
    if (!parsed.success) throw authErrors.rejected();

    const summary = await new SupabaseLearningMeasurementReader(
      getAdminSupabaseClient(),
    ).read(access.userId, parsed.data.sessionId);
    if (!summary) throw authErrors.rejected();

    return NextResponse.json(learningMeasurementSummarySchema.parse(summary), {
      status: 200,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return productErrorResponse(error, authErrors.rejected());
  }
}
