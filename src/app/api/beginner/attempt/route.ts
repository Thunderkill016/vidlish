import { type NextRequest, NextResponse } from "next/server";

import { createIdentityService } from "@/platform/identity/create-identity-service";
import { createBeginnerProgressRepository } from "@/platform/learning/create-beginner-progress-repository";
import {
  beginnerAttemptRequestSchema,
  beginnerAttemptResponseSchema,
} from "@/shared/contracts/beginner-session";
import { authErrors } from "@/shared/errors/product-error";
import { readAuthJsonBody } from "@/shared/http/json-body";
import { productErrorResponse } from "@/shared/http/product-error-response";
import { assertSameOrigin } from "@/shared/http/same-origin";

/**
 * Records one attempt at producing a word.
 *
 * The request carries no free text. What the learner typed or said is not sent,
 * because nothing here needs it: the only thing that changes the learner's
 * model is whether they produced the word with every support closed, and that
 * is a boolean the client already knows.
 */
export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const access = await (await createIdentityService()).resolveCurrentAccess();
    if (!access) throw authErrors.sessionRequired();

    const parsed = beginnerAttemptRequestSchema.safeParse(
      await readAuthJsonBody(request),
    );
    if (!parsed.success) throw authErrors.rejected();

    const progress = createBeginnerProgressRepository();

    // A learner whose last check showed they say yes to words that do not exist
    // has told the product their self-reports cannot be banked. The attempt is
    // still recorded — attendance is real — but it cannot claim independence,
    // because independence is the one thing the database will never let anyone
    // take back.
    const calibration = await progress.latestCalibration(access.userId);
    const trusted = calibration === null || calibration.reliable;

    const evidence = await progress.recordWordEvidence({
      ownerUserId: access.userId,
      word: parsed.data.word.toLocaleLowerCase("en-US"),
      independent: parsed.data.independent && trusted,
    });

    const payload = beginnerAttemptResponseSchema.parse({
      word: evidence.word,
      successfulRetrievals: evidence.successfulRetrievals,
      known: evidence.lastIndependentAt !== null,
    });

    return NextResponse.json(payload, {
      status: 201,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return productErrorResponse(error, authErrors.rejected());
  }
}
