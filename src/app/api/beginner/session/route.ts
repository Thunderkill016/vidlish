import { type NextRequest, NextResponse } from "next/server";

import { startBeginnerSession } from "@/modules/learning/application/start-beginner-session";
import { createIdentityService } from "@/platform/identity/create-identity-service";
import { createBeginnerProgressRepository } from "@/platform/learning/create-beginner-progress-repository";
import {
  BEGINNER_SENTENCES_PER_SESSION,
  beginnerCandidatesFor,
  beginnerVocabularyCatalogue,
  createBeginnerInputProvider,
} from "@/platform/learning/create-beginner-session-runtime";
import {
  beginnerSessionResponseSchema,
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
 */
export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const access = await (await createIdentityService()).resolveCurrentAccess();
    if (!access) throw authErrors.sessionRequired();

    const progress = createBeginnerProgressRepository();
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
      const payload = beginnerWordIntroductionSchema.parse(outcome);
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

    const payload = beginnerSessionResponseSchema.parse({
      target: outcome.plan.target,
      source: outcome.plan.source,
      sentences: outcome.plan.sentences.map((text) => ({ text })),
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
