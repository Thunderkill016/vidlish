import { type NextRequest, NextResponse } from "next/server";

import { scoreDictation } from "@/modules/learning/application/score-dictation";
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
 * Independence is decided here, not reported. When the learner wrote down what
 * they heard, the server compares it to the sentence and only the whole
 * sentence, with no support opened, counts — a client that could simply claim
 * independence would be claiming the one thing the database will never let
 * anyone take back.
 *
 * What the learner wrote is used and then dropped. The evidence kept is which
 * words came back, not the text they came in.
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

    const { sentence, heard } = parsed.data;
    const dictation =
      sentence !== undefined && heard !== undefined
        ? scoreDictation({ target: sentence, heard })
        : null;

    // A checked answer outranks a reported one. Where there is nothing to check
    // — the first words, which arrive alone — the report stands, and the
    // nonword check is what keeps it honest.
    const produced = dictation
      ? dictation.perfect
      : (parsed.data.claimedIndependent ?? false);

    const evidence = await progress.recordWordEvidence({
      ownerUserId: access.userId,
      word: parsed.data.word.toLocaleLowerCase("en-US"),
      independent: produced && !parsed.data.usedSupport && trusted,
    });

    const payload = beginnerAttemptResponseSchema.parse({
      word: evidence.word,
      successfulRetrievals: evidence.successfulRetrievals,
      known: evidence.lastIndependentAt !== null,
      ...(dictation ? { dictation } : {}),
    });

    return NextResponse.json(payload, {
      status: 201,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return productErrorResponse(error, authErrors.rejected());
  }
}
