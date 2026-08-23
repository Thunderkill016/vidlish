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
 * Records one beginner challenge attempt.
 *
 * The browser reports learner action only. The target word and, for dictation,
 * the answer-key sentence come from a server-issued challenge. The final write
 * consumes that challenge atomically with the evidence upsert so replay cannot
 * manufacture evidence.
 *
 * What the learner wrote is used for scoring and then dropped. The evidence
 * kept is the bounded result for the server-issued challenge, not the raw text.
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
    const challenge = await progress.evidenceChallenge({
      ownerUserId: access.userId,
      challengeId: parsed.data.challengeId,
    });
    if (!challenge || challenge.kind !== parsed.data.kind) {
      throw authErrors.rejected();
    }

    const calibration = await progress.latestCalibration(access.userId);
    const trusted = calibration === null || calibration.reliable;

    let successful: boolean;
    let dictation: ReturnType<typeof scoreDictation> | null = null;

    if (parsed.data.kind === "dictation") {
      if (challenge.sentence === null) throw authErrors.rejected();
      dictation = scoreDictation({
        target: challenge.sentence,
        heard: parsed.data.heard,
      });
      successful = dictation.perfect;
    } else {
      if (challenge.sentence !== null) throw authErrors.rejected();
      successful = parsed.data.claimedIndependent;
    }

    // A checked answer outranks a reported one. Where there is nothing to check
    // — the first standalone word — the report stands, and the nonword check is
    // what keeps that self-report calibrated. The database then derives the
    // evidence modality from the server-owned challenge kind: dictation cannot
    // accidentally become productive-known evidence.
    const evidence = await progress.recordChallengeEvidence({
      ownerUserId: access.userId,
      challengeId: challenge.id,
      successful,
      independent: successful && !parsed.data.usedSupport && trusted,
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
