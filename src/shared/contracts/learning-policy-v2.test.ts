import { describe, expect, it } from "vitest";

import { createFixtureLearningBlueprint } from "@/adapters/fake/fixture-learning-blueprint";
import { createFixtureLearningRuntimePolicy } from "@/adapters/fake/fixture-learning-runtime-policy";
import {
  activityCompletionBlockers,
  canUseSupportStep,
  capabilityLearningPolicySchema,
  hasIndependentCapabilityEvidence,
  learningRuntimePolicyV2Schema,
  progressiveSupportPolicySchema,
  validateLearningRuntimePolicyAgainstBlueprint,
  type CapabilityEvidenceDimension,
  type LearningRuntimePolicyV2,
} from "@/shared/contracts/learning-policy-v2";

describe("learning runtime policy v2", () => {
  it("accepts the golden-session policy with ordered support, retry and transfer", () => {
    const blueprint = createFixtureLearningBlueprint();
    const policy = createFixtureLearningRuntimePolicy();

    expect(
      validateLearningRuntimePolicyAgainstBlueprint(policy, blueprint),
    ).toEqual([]);
    expect(policy.activityPolicies).toHaveLength(blueprint.activities.length);
  });

  it("rejects support ladders that reveal help out of canonical order", () => {
    const result = progressiveSupportPolicySchema.safeParse({
      steps: ["english_caption", "context_hint"],
      minimumAttemptsBeforeFullReveal: 1,
    });

    expect(result.success).toBe(false);
  });

  it("blocks full transcript and meaning support before the configured attempt boundary", () => {
    const support = progressiveSupportPolicySchema.parse({
      steps: [
        "replay",
        "context_hint",
        "english_caption",
        "vietnamese_meaning",
      ],
      minimumAttemptsBeforeFullReveal: 1,
    });

    expect(canUseSupportStep(support, "replay", 0)).toBe(true);
    expect(canUseSupportStep(support, "context_hint", 0)).toBe(true);
    expect(canUseSupportStep(support, "english_caption", 0)).toBe(false);
    expect(canUseSupportStep(support, "vietnamese_meaning", 0)).toBe(false);
    expect(canUseSupportStep(support, "english_caption", 1)).toBe(true);
  });

  it("requires a corrected capability task to be retried as a full task", () => {
    const policy = createFixtureLearningRuntimePolicy();
    const result = learningRuntimePolicyV2Schema.safeParse({
      ...policy,
      activityPolicies: policy.activityPolicies.map((activityPolicy) =>
        activityPolicy.activityId === "activity_transfer"
          ? {
              ...activityPolicy,
              retry: {
                ...activityPolicy.retry,
                retryScope: "same_item",
              },
            }
          : activityPolicy,
      ),
    });

    expect(result.success).toBe(false);
  });

  it("does not complete a corrected task until retry and transfer evidence exist", () => {
    const transferPolicy =
      createFixtureLearningRuntimePolicy().activityPolicies.find(
        (policy) => policy.activityId === "activity_transfer",
      );
    expect(transferPolicy).toBeDefined();

    expect(
      activityCompletionBlockers(transferPolicy!, {
        attemptCount: 1,
        correctionCount: 1,
        retryAttemptCount: 0,
        transferAttempted: false,
      }),
    ).toEqual(["RETRY_REQUIRED", "TRANSFER_REQUIRED"]);

    expect(
      activityCompletionBlockers(transferPolicy!, {
        attemptCount: 2,
        correctionCount: 1,
        retryAttemptCount: 1,
        transferAttempted: true,
      }),
    ).toEqual([]);
  });

  it("requires delayed transfer before an outcome can be called independent", () => {
    const policy = capabilityLearningPolicySchema.parse({
      outcomeId: "outcome_reuse_affiliation",
      kind: "interactional",
      requiredForIndependent: [
        "comprehension",
        "productive_recall",
        "interactional_use",
        "delayed_transfer",
      ],
    });
    const immediateEvidence = new Set<CapabilityEvidenceDimension>([
      "comprehension",
      "productive_recall",
      "interactional_use",
    ]);

    expect(hasIndependentCapabilityEvidence(policy, immediateEvidence)).toBe(
      false,
    );

    immediateEvidence.add("delayed_transfer");
    expect(hasIndependentCapabilityEvidence(policy, immediateEvidence)).toBe(
      true,
    );
  });

  it("rejects guided transfer without a declared changed-context policy", () => {
    const blueprint = createFixtureLearningBlueprint();
    const policy = createFixtureLearningRuntimePolicy();
    const brokenPolicy: LearningRuntimePolicyV2 = {
      ...policy,
      activityPolicies: policy.activityPolicies.map((activityPolicy) =>
        activityPolicy.activityId === "activity_transfer"
          ? { ...activityPolicy, transfer: null }
          : activityPolicy,
      ),
    };

    expect(
      validateLearningRuntimePolicyAgainstBlueprint(brokenPolicy, blueprint),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: "Guided transfer requires an explicit transfer policy.",
        }),
      ]),
    );
  });
});
