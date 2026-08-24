import { type NextRequest, NextResponse } from "next/server";

import { chunkMeaningVi } from "@/modules/curriculum/content";
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
    let heardBack: string | null = null;

    // Every kind except the standalone word is graded against text the server
    // holds. The kind came from the challenge, and the challenge came from the
    // skill the unit declared, so a speaking activity cannot be answered by
    // typing however the browser chooses to phrase the request.
    if (parsed.data.kind === "introduce_word") {
      if (challenge.sentence !== null) throw authErrors.rejected();
      successful = parsed.data.claimedIndependent;
    } else if (challenge.sentence === null) {
      throw authErrors.rejected();
    } else if (parsed.data.kind === "dictation") {
      dictation = scoreDictation({
        target: challenge.sentence,
        heard: parsed.data.heard,
      });
      successful = dictation.perfect;
    } else if (parsed.data.kind === "spoken") {
      // Scored exactly like a dictation because the comparison is the same:
      // positional, case- and punctuation-insensitive, against text the browser
      // never received. What differs is the dimension it lands in and the fact
      // that the transcript goes back to the learner, because a recogniser that
      // mishears must be visibly wrong rather than silently authoritative.
      dictation = scoreDictation({
        target: challenge.sentence,
        heard: parsed.data.transcript,
      });
      successful = dictation.perfect;
      heardBack = parsed.data.transcript;
    } else if (parsed.data.kind === "written") {
      dictation = scoreDictation({
        target: challenge.sentence,
        heard: parsed.data.written,
      });
      successful = dictation.perfect;
    } else {
      const expected = chunkMeaningVi(challenge.sentence);
      // A chunk with no authored meaning cannot be read for meaning. Failing
      // closed is the only honest answer; guessing would grade the learner
      // against nothing.
      if (expected === null) throw authErrors.rejected();
      successful =
        parsed.data.chosenVi.trim().toLowerCase() ===
        expected.trim().toLowerCase();
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
      ...(heardBack === null ? {} : { heardBack }),
    });

    return NextResponse.json(payload, {
      status: 201,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return productErrorResponse(error, authErrors.rejected());
  }
}
