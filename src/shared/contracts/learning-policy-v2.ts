import { z } from "zod";

import type { LessonBlueprintV2 } from "@/shared/contracts/lesson-v2";

export const LEARNING_RUNTIME_POLICY_VERSION =
  "learning-runtime-policy:v2" as const;

const entityIdSchema = z.string().regex(/^[a-z][a-z0-9_-]{2,63}$/);

export const supportStepSchema = z.enum([
  "replay",
  "context_hint",
  "keyword_hint",
  "english_caption",
  "chunk_boundaries",
  "vietnamese_meaning",
  "slower_playback",
]);
export type SupportStep = z.infer<typeof supportStepSchema>;

const SUPPORT_ORDER: Record<SupportStep, number> = {
  replay: 0,
  context_hint: 1,
  keyword_hint: 2,
  english_caption: 3,
  chunk_boundaries: 4,
  vietnamese_meaning: 5,
  slower_playback: 6,
};

const FULL_REVEAL_STEPS = new Set<SupportStep>([
  "english_caption",
  "chunk_boundaries",
  "vietnamese_meaning",
]);

export const progressiveSupportPolicySchema = z
  .object({
    steps: z.array(supportStepSchema).min(1).max(7),
    minimumAttemptsBeforeFullReveal: z.number().int().min(1).max(3),
  })
  .strict()
  .superRefine((value, context) => {
    if (new Set(value.steps).size !== value.steps.length) {
      context.addIssue({
        code: "custom",
        path: ["steps"],
        message: "Progressive support steps must be unique.",
      });
    }

    let previousOrder = -1;
    for (const [index, step] of value.steps.entries()) {
      const currentOrder = SUPPORT_ORDER[step];
      if (currentOrder < previousOrder) {
        context.addIssue({
          code: "custom",
          path: ["steps", index],
          message: "Progressive support steps must follow the canonical order.",
        });
      }
      previousOrder = currentOrder;
    }
  });
export type ProgressiveSupportPolicy = z.infer<
  typeof progressiveSupportPolicySchema
>;

export const transferChangedDimensionSchema = z.enum([
  "speaker",
  "wording",
  "location",
  "relationship",
  "channel",
  "information",
  "speed",
  "conversational_problem",
  "required_next_turn",
]);
export type TransferChangedDimension = z.infer<
  typeof transferChangedDimensionSchema
>;

export const transferPolicySchema = z
  .object({
    changedDimensions: z
      .array(transferChangedDimensionSchema)
      .min(1)
      .max(4),
    answerExposure: z.literal("after_attempt"),
    unseenInput: z.boolean(),
  })
  .strict()
  .superRefine((value, context) => {
    if (new Set(value.changedDimensions).size !== value.changedDimensions.length) {
      context.addIssue({
        code: "custom",
        path: ["changedDimensions"],
        message: "Transfer changed dimensions must be unique.",
      });
    }
  });
export type TransferPolicy = z.infer<typeof transferPolicySchema>;

export const retryPolicySchema = z
  .object({
    requiredAfterCorrection: z.boolean(),
    retryScope: z.enum(["same_item", "full_task"]),
    maxCorrections: z.union([z.literal(1), z.literal(2)]),
    maxAttemptsPerSession: z.number().int().min(2).max(5),
  })
  .strict();
export type RetryPolicy = z.infer<typeof retryPolicySchema>;

export const capabilityEvidenceDimensionSchema = z.enum([
  "comprehension",
  "productive_recall",
  "interactional_use",
  "delayed_transfer",
]);
export type CapabilityEvidenceDimension = z.infer<
  typeof capabilityEvidenceDimensionSchema
>;

export const capabilityKindSchema = z.enum([
  "comprehension",
  "language_item",
  "interactional",
]);
export type CapabilityKind = z.infer<typeof capabilityKindSchema>;

export const activityLearningPolicySchema = z
  .object({
    activityId: entityIdSchema,
    taskScope: z.enum(["micro_item", "capability"]),
    support: progressiveSupportPolicySchema.nullable(),
    retry: retryPolicySchema,
    transfer: transferPolicySchema.nullable(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.taskScope === "capability" &&
      value.retry.requiredAfterCorrection &&
      value.retry.retryScope !== "full_task"
    ) {
      context.addIssue({
        code: "custom",
        path: ["retry", "retryScope"],
        message:
          "A corrected capability task must require a full-task retry.",
      });
    }
  });
export type ActivityLearningPolicy = z.infer<
  typeof activityLearningPolicySchema
>;

export const capabilityLearningPolicySchema = z
  .object({
    outcomeId: entityIdSchema,
    kind: capabilityKindSchema,
    requiredForIndependent: z
      .array(capabilityEvidenceDimensionSchema)
      .min(1)
      .max(4),
  })
  .strict()
  .superRefine((value, context) => {
    const required = new Set(value.requiredForIndependent);
    if (required.size !== value.requiredForIndependent.length) {
      context.addIssue({
        code: "custom",
        path: ["requiredForIndependent"],
        message: "Capability evidence dimensions must be unique.",
      });
    }

    if (!required.has("comprehension")) {
      context.addIssue({
        code: "custom",
        path: ["requiredForIndependent"],
        message: "Every capability requires comprehension evidence.",
      });
    }

    if (
      value.kind !== "comprehension" &&
      !required.has("productive_recall")
    ) {
      context.addIssue({
        code: "custom",
        path: ["requiredForIndependent"],
        message:
          "Language-item and interactional capabilities require productive recall.",
      });
    }

    if (value.kind === "interactional" && !required.has("interactional_use")) {
      context.addIssue({
        code: "custom",
        path: ["requiredForIndependent"],
        message: "Interactional capabilities require interactional-use evidence.",
      });
    }

    if (!required.has("delayed_transfer")) {
      context.addIssue({
        code: "custom",
        path: ["requiredForIndependent"],
        message:
          "Independent capability claims require delayed-transfer evidence.",
      });
    }
  });
export type CapabilityLearningPolicy = z.infer<
  typeof capabilityLearningPolicySchema
>;

export const learningRuntimePolicyV2Schema = z
  .object({
    schemaVersion: z.literal(LEARNING_RUNTIME_POLICY_VERSION),
    blueprintId: z.string().uuid(),
    activityPolicies: z.array(activityLearningPolicySchema).min(1).max(12),
    capabilityPolicies: z
      .array(capabilityLearningPolicySchema)
      .min(1)
      .max(4),
  })
  .strict()
  .superRefine((value, context) => {
    const activityIds = value.activityPolicies.map((policy) => policy.activityId);
    if (new Set(activityIds).size !== activityIds.length) {
      context.addIssue({
        code: "custom",
        path: ["activityPolicies"],
        message: "Activity learning policies must reference unique activities.",
      });
    }

    const outcomeIds = value.capabilityPolicies.map((policy) => policy.outcomeId);
    if (new Set(outcomeIds).size !== outcomeIds.length) {
      context.addIssue({
        code: "custom",
        path: ["capabilityPolicies"],
        message: "Capability learning policies must reference unique outcomes.",
      });
    }
  });
export type LearningRuntimePolicyV2 = z.infer<
  typeof learningRuntimePolicyV2Schema
>;

export type LearningRuntimePolicyIssue = {
  path: string;
  message: string;
};

export function validateLearningRuntimePolicyAgainstBlueprint(
  policy: LearningRuntimePolicyV2,
  blueprint: LessonBlueprintV2,
): LearningRuntimePolicyIssue[] {
  const issues: LearningRuntimePolicyIssue[] = [];

  if (policy.blueprintId !== blueprint.blueprintId) {
    issues.push({
      path: "blueprintId",
      message: "Learning runtime policy does not belong to this blueprint.",
    });
  }

  const activitiesById = new Map(
    blueprint.activities.map((activity) => [activity.id, activity]),
  );
  const outcomesById = new Set(blueprint.outcomes.map((outcome) => outcome.id));
  const policiesByActivityId = new Map(
    policy.activityPolicies.map((activityPolicy) => [
      activityPolicy.activityId,
      activityPolicy,
    ]),
  );

  for (const [index, activityPolicy] of policy.activityPolicies.entries()) {
    const activity = activitiesById.get(activityPolicy.activityId);
    if (!activity) {
      issues.push({
        path: `activityPolicies.${index}.activityId`,
        message: `Unknown blueprint activity: ${activityPolicy.activityId}`,
      });
      continue;
    }

    if (activity.activityType === "guided_transfer") {
      if (!activityPolicy.transfer) {
        issues.push({
          path: `activityPolicies.${index}.transfer`,
          message: "Guided transfer requires an explicit transfer policy.",
        });
      }
      if (activityPolicy.taskScope !== "capability") {
        issues.push({
          path: `activityPolicies.${index}.taskScope`,
          message: "Guided transfer must be treated as a capability task.",
        });
      }
    } else if (activityPolicy.transfer) {
      issues.push({
        path: `activityPolicies.${index}.transfer`,
        message: "Only guided-transfer activities may declare transfer policy.",
      });
    }
  }

  for (const activity of blueprint.activities) {
    if (
      activity.activityType === "guided_transfer" &&
      !policiesByActivityId.has(activity.id)
    ) {
      issues.push({
        path: "activityPolicies",
        message: `Missing policy for guided-transfer activity: ${activity.id}`,
      });
    }
  }

  for (const [index, capabilityPolicy] of policy.capabilityPolicies.entries()) {
    if (!outcomesById.has(capabilityPolicy.outcomeId)) {
      issues.push({
        path: `capabilityPolicies.${index}.outcomeId`,
        message: `Unknown blueprint outcome: ${capabilityPolicy.outcomeId}`,
      });
    }
  }

  return issues;
}

export type ActivityProgressEvidence = {
  attemptCount: number;
  correctionCount: number;
  retryAttemptCount: number;
  transferAttempted: boolean;
};

export type ActivityCompletionBlocker =
  | "ATTEMPT_REQUIRED"
  | "RETRY_REQUIRED"
  | "TRANSFER_REQUIRED";

export function activityCompletionBlockers(
  policy: ActivityLearningPolicy,
  evidence: ActivityProgressEvidence,
): ActivityCompletionBlocker[] {
  const blockers: ActivityCompletionBlocker[] = [];

  if (evidence.attemptCount < 1) blockers.push("ATTEMPT_REQUIRED");
  if (
    policy.retry.requiredAfterCorrection &&
    evidence.correctionCount > 0 &&
    evidence.retryAttemptCount < 1
  ) {
    blockers.push("RETRY_REQUIRED");
  }
  if (policy.transfer && !evidence.transferAttempted) {
    blockers.push("TRANSFER_REQUIRED");
  }

  return blockers;
}

export function canUseSupportStep(
  policy: ProgressiveSupportPolicy,
  step: SupportStep,
  attemptCount: number,
): boolean {
  if (!policy.steps.includes(step)) return false;
  if (
    FULL_REVEAL_STEPS.has(step) &&
    attemptCount < policy.minimumAttemptsBeforeFullReveal
  ) {
    return false;
  }
  return true;
}

export function hasIndependentCapabilityEvidence(
  policy: CapabilityLearningPolicy,
  availableEvidence: ReadonlySet<CapabilityEvidenceDimension>,
): boolean {
  return policy.requiredForIndependent.every((dimension) =>
    availableEvidence.has(dimension),
  );
}
