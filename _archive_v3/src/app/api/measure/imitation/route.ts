import { type NextRequest, NextResponse } from "next/server";

import { curriculumAudioFor } from "@/adapters/audio/curriculum-audio";
import {
  REPRODUCED_WITHIN_ERRORS,
  estimateImitationCeiling,
} from "@/modules/measurement/application/estimate-imitation-ceiling";
import { scoreElicitedImitation } from "@/modules/measurement/application/score-elicited-imitation";
import { imitationBankVersion } from "@/modules/measurement/content/bank-version";
import { ELICITED_IMITATION_ITEMS } from "@/modules/measurement/content/elicited-imitation-items";
import { createIdentityService } from "@/platform/identity/create-identity-service";
import { createImitationMeasurementRepository } from "@/platform/measurement/create-imitation-measurement-repository";
import {
  imitationResultSchema,
  imitationSittingSchema,
  imitationSubmissionSchema,
} from "@/shared/contracts/imitation-measurement";
import { authErrors } from "@/shared/errors/product-error";
import { readAuthJsonBody } from "@/shared/http/json-body";
import { productErrorResponse } from "@/shared/http/product-error-response";
import { assertSameOrigin } from "@/shared/http/same-origin";

export const dynamic = "force-dynamic";

/**
 * Hands out the sitting: audio and lengths, never the sentences.
 *
 * The learner has to hear each sentence and say it back, so the text is the one
 * thing the browser must not hold. With the sentence on screen this stops
 * measuring whether they parsed it and starts measuring whether they can read
 * aloud, and the score would keep rising while nothing changed.
 */
export async function GET() {
  try {
    const access = await (await createIdentityService()).resolveCurrentAccess();
    if (!access) throw authErrors.sessionRequired();

    const items = ELICITED_IMITATION_ITEMS.map((item) => {
      const audioUrl = curriculumAudioFor(item.text);
      // An item with no recording cannot be part of a sitting: the learner
      // would be asked to repeat silence and scored for failing to.
      return audioUrl
        ? { id: item.id, audioUrl, syllables: item.syllables }
        : null;
    }).filter((item) => item !== null);

    const payload = imitationSittingSchema.parse({
      bankVersion: imitationBankVersion(),
      items,
    });

    return NextResponse.json(payload, {
      status: 200,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return productErrorResponse(error, authErrors.rejected());
  }
}

/**
 * Scores the sitting and stores the verdict.
 *
 * The transcripts are graded here and dropped here. What is kept is which
 * lengths held and which broke — enough to compare this sitting with the next
 * one, and not enough to reconstruct anything the learner said.
 */
export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const access = await (await createIdentityService()).resolveCurrentAccess();
    if (!access) throw authErrors.sessionRequired();

    const parsed = imitationSubmissionSchema.safeParse(
      await readAuthJsonBody(request),
    );
    if (!parsed.success) throw authErrors.rejected();

    // A sitting taken against a different bank is not comparable with this
    // one, and silently scoring it against today's items would produce a
    // number that looks like the others and is not.
    if (parsed.data.bankVersion !== imitationBankVersion()) {
      throw authErrors.rejected();
    }

    const byId = new Map(ELICITED_IMITATION_ITEMS.map((item) => [item.id, item]));
    const perItem = [];
    for (const attempt of parsed.data.attempts) {
      const item = byId.get(attempt.itemId);
      if (!item) throw authErrors.rejected();
      const score = scoreElicitedImitation({
        target: item.text,
        heard: attempt.transcript,
      });
      perItem.push({
        itemId: item.id,
        syllables: item.syllables,
        errors: score.errors,
        heardBack: attempt.transcript,
      });
    }

    // One item may not be answered twice. Otherwise the easiest sentence could
    // be repeated ten times and reported as ten items held.
    const distinct = new Set(perItem.map((entry) => entry.itemId));
    if (distinct.size !== perItem.length) throw authErrors.rejected();

    const ceiling = estimateImitationCeiling(
      perItem.map((entry) => ({
        syllables: entry.syllables,
        errors: entry.errors,
      })),
    );
    if (ceiling.kind !== "measured") throw authErrors.rejected();

    const stored = await createImitationMeasurementRepository().record({
      ownerUserId: access.userId,
      measurement: {
        attempted: ceiling.attempted,
        passed: ceiling.passed,
        heldTo: ceiling.heldTo,
        brokeAt: ceiling.brokeAt,
        aboveBank: ceiling.aboveBank,
        bankVersion: parsed.data.bankVersion,
      },
    });

    const payload = imitationResultSchema.parse({
      attempted: ceiling.attempted,
      passed: ceiling.passed,
      heldTo: ceiling.heldTo,
      brokeAt: ceiling.brokeAt,
      aboveBank: ceiling.aboveBank,
      takenAt: stored.takenAt,
      perItem: perItem.map((entry) => ({
        ...entry,
        // The same threshold the ceiling was computed with. Repeating the
        // literal here would let the report disagree with the verdict.
        reproduced: entry.errors <= REPRODUCED_WITHIN_ERRORS,
      })),
    });

    return NextResponse.json(payload, {
      status: 201,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return productErrorResponse(error, authErrors.rejected());
  }
}
