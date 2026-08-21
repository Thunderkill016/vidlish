import { describe, expect, it } from "vitest";
import { z } from "zod";

import { classifyAuthoringFailure } from "./classify-authoring-failure";
import { AuthoringQualityError } from "@/modules/learning/application/review-authoring-draft";
import { LearningAuthoringFailure } from "@/modules/learning/ports/learning-authoring-provider";

const DETAIL = /^[a-z_]+(:[A-Z_]+)?$/;

describe("classifyAuthoringFailure", () => {
  it("names the rule a rejected draft broke", () => {
    // The most useful thing to know: it says whether to fix the prompt or the
    // rule, which a generic label never could.
    expect(
      classifyAuthoringFailure(
        new AuthoringQualityError("no recall", "NO_FORM_RETRIEVAL"),
      ),
    ).toBe("quality_rejected:NO_FORM_RETRIEVAL");
  });

  it("separates a retryable provider failure from a rejected request", () => {
    expect(
      classifyAuthoringFailure(new LearningAuthoringFailure("503", true)),
    ).toBe("provider_failure");
    expect(
      classifyAuthoringFailure(new LearningAuthoringFailure("400", false)),
    ).toBe("provider_rejected");
  });

  it("recognises a schema rejection", () => {
    const parsed = z.object({ a: z.string() }).safeParse({ a: 1 });
    expect(parsed.success).toBe(false);
    expect(classifyAuthoringFailure(parsed.error)).toBe("schema_rejected");
  });

  it("never returns a provider message", () => {
    // Provider messages carry model output and model output can carry learner
    // content, so nothing free-form may reach a diagnostic column.
    const secret = "PRIVATE-LEARNER-TEXT-91ac";
    for (const error of [
      new LearningAuthoringFailure(secret, true),
      new AuthoringQualityError(secret, "DUPLICATE_OPTIONS"),
      new Error(secret),
      secret,
    ]) {
      const detail = classifyAuthoringFailure(error);
      expect(detail).not.toContain(secret);
      expect(detail).toMatch(DETAIL);
    }
  });

  it("still says something when it is handed a non-error", () => {
    expect(classifyAuthoringFailure("boom")).toBe("unexpected_error");
    expect(classifyAuthoringFailure(undefined)).toBe("unexpected_error");
  });
});
