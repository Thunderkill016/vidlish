import { type NextRequest, NextResponse } from "next/server";

import { isNonword, sampleNonwords } from "@/adapters/vocabulary/nonword-catalogue";
import { assessSelfReportReliability } from "@/modules/learning/application/assess-self-report-reliability";
import { createIdentityService } from "@/platform/identity/create-identity-service";
import { createBeginnerProgressRepository } from "@/platform/learning/create-beginner-progress-repository";
import {
  beginnerCalibrationItemsSchema,
  beginnerCalibrationRequestSchema,
  beginnerCalibrationResponseSchema,
} from "@/shared/contracts/beginner-session";
import { authErrors } from "@/shared/errors/product-error";
import { readAuthJsonBody } from "@/shared/http/json-body";
import { productErrorResponse } from "@/shared/http/product-error-response";
import { assertSameOrigin } from "@/shared/http/same-origin";

/** Real words the learner claims, mixed with words that cannot be known. */
const REAL_ITEMS = 7;
const NONWORD_ITEMS = 3;

export async function GET(request: NextRequest) {
  try {
    // No same-origin assertion here, unlike POST. Browsers omit the Origin
    // header on same-origin GET, so asserting it rejects the product's own
    // page. GET changes nothing, and the reply is scoped to the caller's own
    // session, so there is nothing for a cross-site request to steal.
    void request;
    const access = await (await createIdentityService()).resolveCurrentAccess();
    if (!access) throw authErrors.sessionRequired();

    const progress = await createBeginnerProgressRepository();
    const known = await progress.knownWords(access.userId);
    const words = known.slice(0, REAL_ITEMS);
    // Seeded by how far the learner has come, so the same check is stable while
    // they are on it and different once they have moved on.
    const fakes = sampleNonwords(NONWORD_ITEMS, known.length);

    // Interleaved rather than appended: three unknown-looking items in a row at
    // the end tell the learner exactly which ones to say no to.
    const items: string[] = [];
    const pool = [...words, ...fakes];
    for (let index = 0; index < pool.length; index += 1) {
      items.splice((index * 7) % (items.length + 1), 0, pool[index]);
    }

    const payload = beginnerCalibrationItemsSchema.parse({ items });
    return NextResponse.json(payload, {
      status: 200,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return productErrorResponse(error, authErrors.rejected());
  }
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const access = await (await createIdentityService()).resolveCurrentAccess();
    if (!access) throw authErrors.sessionRequired();

    const parsed = beginnerCalibrationRequestSchema.safeParse(
      await readAuthJsonBody(request),
    );
    if (!parsed.success) throw authErrors.rejected();

    // Which items were real is decided here, from the artifact, never from the
    // request. That is the whole security of the mechanism.
    const trials = parsed.data.answers.map((answer) => ({
      item: answer.item,
      isNonword: isNonword(answer.item),
      claimedKnown: answer.claimedKnown,
    }));

    const verdict = assessSelfReportReliability(trials);
    if (verdict.kind !== "measured") throw authErrors.rejected();

    const nonwordTrials = trials.filter((trial) => trial.isNonword);
    const wordTrials = trials.filter((trial) => !trial.isNonword);

    const progress = await createBeginnerProgressRepository();
    await progress.recordCalibration({
      ownerUserId: access.userId,
      wordTrials: wordTrials.length,
      nonwordTrials: nonwordTrials.length,
      hits: wordTrials.filter((trial) => trial.claimedKnown).length,
      falseAlarms: nonwordTrials.filter((trial) => trial.claimedKnown).length,
      reliable: verdict.reliable,
    });

    const payload = beginnerCalibrationResponseSchema.parse({
      reliable: verdict.reliable,
      falseAlarmRate: verdict.falseAlarmRate,
      corrected: verdict.corrected,
    });
    return NextResponse.json(payload, {
      status: 201,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return productErrorResponse(error, authErrors.rejected());
  }
}
