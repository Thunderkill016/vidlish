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

  it("names the field and the kind of failure", () => {
    // Four production failures named the same field and could not say which
    // kind of failure it was — a literal that did not match, or a union whose
    // discriminator never selected a branch. Those point at different bugs.
    // `schema_rejected` on its own leaves you guessing which of the draft's
    // forty fields was wrong — production returned exactly that.
    const parsed = z
      .object({ activities: z.array(z.object({ criteriaVi: z.array(z.string()).min(2) })) })
      .safeParse({ activities: [{ criteriaVi: [] }, { criteriaVi: ["a"] }] });
    expect(parsed.success).toBe(false);
    expect(classifyAuthoringFailure(parsed.error)).toBe(
      "schema_rejected:ACTIVITIES_0_CRITERIAVI_TOO_SMALL",
    );
  });

  it("carries what the schema wanted, when it is one of our own labels", () => {
    // A path says which field. On a discriminated union the expected value also
    // says which branch matched, which is what a bare path could not.
    const parsed = z
      .object({ activities: z.array(z.object({ phase: z.literal("retrieve") })) })
      .safeParse({ activities: [{ phase: "notice" }] });
    expect(parsed.success).toBe(false);
    expect(classifyAuthoringFailure(parsed.error)).toBe(
      "schema_rejected:ACTIVITIES_0_PHASE_INVALID_VALUE_WANTS_RETRIEVE",
    );
  });

  it("never carries free text", () => {
    // Model output can carry learner content. Only short lowercase identifiers
    // — our own enum labels — are safe to store.
    const secret = "PRIVATE-LEARNER-TEXT-91ac and more words";
    const parsed = z
      .object({ promptVi: z.literal("x") })
      .safeParse({ promptVi: secret });
    expect(parsed.success).toBe(false);

    // What the schema *wanted* may be included; what arrived never is.
    const detail = classifyAuthoringFailure(parsed.error);
    expect(detail).not.toContain("PRIVATE");
    expect(detail).not.toContain("LEARNER");
    expect(detail).toMatch(/^[a-z_]+(:[A-Z0-9_]{1,60})?$/);
  });

  it("falls back to the bare code when the issue carries no path", () => {
    const parsed = z.string().safeParse(1);
    expect(parsed.success).toBe(false);
    expect(classifyAuthoringFailure(parsed.error)).toBe("schema_rejected");
  });

  it("truncates a long path to what the column allows", () => {
    // The column caps the code at 60 characters. A deep path would otherwise
    // fail the check constraint, the write would error, and the workflow would
    // swallow it — leaving the field empty for the failure that needed it most.
    const deep = "averyLongSegmentName".repeat(6);
    const parsed = z
      .object({ [deep]: z.string() })
      .safeParse({ [deep]: 1 });
    expect(parsed.success).toBe(false);

    // The whole suffix, not just the path: appending the code and label after
    // truncating only the path pushed past the column and the write would have
    // been rejected.
    const detail = classifyAuthoringFailure(parsed.error);
    expect(detail.split(":")[1]!.length).toBe(60);
    expect(detail).toMatch(/^[a-z_]+(:[A-Z0-9_]{1,60})?$/);
  });

  it("keeps the detail inside what the database column accepts", () => {
    // The column is constrained; a detail it rejects would make the write fail
    // and the workflow swallow it, so the field goes quiet exactly when needed.
    const COLUMN = /^[a-z_]+(:[A-Z0-9_]{1,60})?$/;
    const parsed = z
      .object({ "weird key!" : z.array(z.object({ "x-y": z.string() })) })
      .safeParse({ "weird key!": [{ "x-y": 1 }] });
    expect(parsed.success).toBe(false);
    expect(classifyAuthoringFailure(parsed.error)).toMatch(COLUMN);
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
