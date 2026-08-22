import { type NextRequest, NextResponse } from "next/server";

import { isNonword } from "@/adapters/vocabulary/nonword-catalogue";
import { assessSelfReportReliability } from "@/modules/learning/application/assess-self-report-reliability";
import { createIdentityService } from "@/platform/identity/create-identity-service";
import {
  answersMatchCalibrationItems,
  beginnerCalibrationItemsForKnown,
} from "@/platform/learning/beginner-calibration-items";
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

export async function GET(request: NextRequest) {
  try {
    // No same-origin assertion here, unlike POST. Browsers omit the Origin
    // header on same-origin GET, so asserting it rejects the product's own
    // page. GET changes nothing, and the reply is scoped to the caller's own
    // session, so there is nothing for a cross-site request to steal.
    void request;
    const access = await (await createIdentityService()).resolveCurrentAccess();
    if (!access) throw authErrors.sessionRequired();

    const progress = createBeginnerProgressRepository();
    const known = await progress.knownWords(access.userId);
    const items = beginnerCalibrationItemsForKnown(known);

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

    const progress = createBeginnerProgressRepository();
    const known = await progress.knownWords(access.userId);
    const expectedItems = beginnerCalibrationItemsForKnown(known);
    if (!answersMatchCalibrationItems(expectedItems, parsed.data.answers)) {
      // The server, not the browser, owns which trials this calibration is
      // about. Substituting one easy real-looking item for a nonword would make
      // an unreliable self-report look trustworthy forever.
      throw authErrors.rejected();
    }

    // Which items were real is decided here, from the server catalogue, never
    // from a classification supplied by the request.
    const trials = parsed.data.answers.map((answer) => ({
      item: answer.item,
      isNonword: isNonword(answer.item),
      claimedKnown: answer.claimedKnown,
    }));

    const verdict = assessSelfReportReliability(trials);
    if (verdict.kind !== "measured") throw authErrors.rejected();

    const nonwordTrials = trials.filter((trial) => trial.isNonword);
    const wordTrials = trials.filter((trial) => !trial.isNonword);

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
