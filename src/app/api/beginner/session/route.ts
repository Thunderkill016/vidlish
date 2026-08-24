import { type NextRequest, NextResponse } from "next/server";

import { compileUnitActivity } from "@/modules/curriculum/application/compile-unit-activity";
import { foundationUnitById } from "@/modules/curriculum/content";
import { startBeginnerSession } from "@/modules/learning/application/start-beginner-session";
import { createIdentityService } from "@/platform/identity/create-identity-service";
import { createBeginnerProgressRepository } from "@/platform/learning/create-beginner-progress-repository";
import { resolveTodaysAction } from "@/platform/learning/resolve-todays-action";
import {
  BEGINNER_SENTENCES_PER_SESSION,
  beginnerCandidatesFor,
  beginnerVocabularyCatalogue,
  createBeginnerInputProvider,
} from "@/platform/learning/create-beginner-session-runtime";
import {
  beginnerSessionResponseSchema,
  beginnerUnitActivitySchema,
  beginnerWordIntroductionSchema,
} from "@/shared/contracts/beginner-session";
import { authErrors } from "@/shared/errors/product-error";
import { productErrorResponse } from "@/shared/http/product-error-response";
import { assertSameOrigin } from "@/shared/http/same-origin";

/**
 * What this learner should meet next.
 *
 * POST rather than GET because assembling a session can call a model, and a
 * GET that spends money is a GET something will eventually prefetch.
 *
 * Every attemptable item also receives an opaque server-owned challenge. The
 * learner-visible word/sentence can live in the browser; the evidence target
 * and answer key cannot be chosen by the later attempt request.
 */
export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const access = await (await createIdentityService()).resolveCurrentAccess();
    if (!access) throw authErrors.sessionRequired();

    const progress = createBeginnerProgressRepository();

    // The curriculum answers first, and only for activities whose language is
    // already within reach. Until then the beginner word path below keeps
    // working, which is what lets a syllabus exist for someone at zero.
    const todays = await resolveTodaysAction(access.userId);
    if (todays.kind === "unit_activity") {
      const unit = foundationUnitById(todays.unitId);
      const compiled = unit ? compileUnitActivity(unit, todays.activityId) : null;
      if (compiled?.kind === "compiled") {
        const activity = compiled.activity;
        // A retrieval is graded, so it needs the same server-held authority a
        // dictated sentence gets: the browser never sends the answer it is
        // being marked against.
        const [gradedChunk] = activity.evidenceKeys;
        const challenge = gradedChunk
          ? await progress.createEvidenceChallenge({
              ownerUserId: access.userId,
              kind: "dictation",
              word: gradedChunk,
              sentence: gradedChunk,
            })
          : null;

        const payload = beginnerUnitActivitySchema.parse({
          kind: "unit_activity",
          unitId: activity.unitId,
          activityId: activity.activityId,
          strand: activity.strand,
          skill: activity.skill,
          promptVi: activity.promptVi,
          listen: activity.listen,
          targets: activity.targets,
          supportAllowed: activity.supportAllowed,
          ...(challenge ? { challengeId: challenge.id } : {}),
        });
        return NextResponse.json(payload, {
          status: 200,
          headers: { "Cache-Control": "private, no-store" },
        });
      }
    }

    const known = new Set(await progress.knownWords(access.userId));
    const provider = createBeginnerInputProvider();

    const outcome = await startBeginnerSession({
      catalogue: beginnerVocabularyCatalogue(),
      known,
      candidatesFor: beginnerCandidatesFor,
      generate: async (input) => {
        if (!provider) return [];
        const drafted = await provider.draft(input);
        return drafted.sentences;
      },
      wanted: BEGINNER_SENTENCES_PER_SESSION,
    });

    if (outcome.kind === "introduce_word") {
      const challenge = await progress.createEvidenceChallenge({
        ownerUserId: access.userId,
        kind: "introduce_word",
        word: outcome.target,
        sentence: null,
      });
      const payload = beginnerWordIntroductionSchema.parse({
        ...outcome,
        challengeId: challenge.id,
      });
      return NextResponse.json(payload, {
        status: 200,
        headers: { "Cache-Control": "private, no-store" },
      });
    }

    if (outcome.kind !== "ready") {
      // Both remaining outcomes are honest answers rather than failures, and
      // the learner is told which: nothing left to teach, or nothing usable for
      // the word that is next.
      return NextResponse.json(
        { kind: outcome.kind },
        { status: 200, headers: { "Cache-Control": "private, no-store" } },
      );
    }

    const sentences = await Promise.all(
      outcome.plan.sentences.map(async (text) => {
        const challenge = await progress.createEvidenceChallenge({
          ownerUserId: access.userId,
          kind: "dictation",
          word: outcome.plan.target,
          sentence: text,
        });
        return { text, challengeId: challenge.id };
      }),
    );

    const payload = beginnerSessionResponseSchema.parse({
      target: outcome.plan.target,
      source: outcome.plan.source,
      sentences,
      knownWordCount: outcome.plan.knownWordCount,
    });

    return NextResponse.json(payload, {
      status: 200,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return productErrorResponse(error, authErrors.rejected());
  }
}
