import { z } from "zod";

import { learningSkillSchema } from "@/shared/contracts/learning-capability";

export const learningSkillCapabilitySummarySchema = z
  .object({
    skill: learningSkillSchema,
    objectiveIndependentSuccesses: z.number().int().nonnegative(),
    objectiveSupportedSuccesses: z.number().int().nonnegative(),
    objectiveFailures: z.number().int().nonnegative(),
    unscoredObservations: z.number().int().nonnegative(),
    latestObservedAt: z.string().datetime({ offset: true }).nullable(),
  })
  .strict();
export type LearningSkillCapabilitySummary = z.infer<
  typeof learningSkillCapabilitySummarySchema
>;

export const learningCapabilityProgressSummarySchema = z
  .object({
    totalObservations: z.number().int().nonnegative(),
    skills: z.array(learningSkillCapabilitySummarySchema).length(4),
  })
  .strict()
  .superRefine((summary, context) => {
    const expected = ["listening", "reading", "speaking", "writing"] as const;
    const actual = summary.skills.map((entry) => entry.skill);
    if (
      actual.length !== expected.length ||
      actual.some((skill, index) => skill !== expected[index])
    ) {
      context.addIssue({
        code: "custom",
        path: ["skills"],
        message:
          "Capability progress must contain listening, reading, speaking and writing exactly once in canonical order.",
      });
    }
  });
export type LearningCapabilityProgressSummary = z.infer<
  typeof learningCapabilityProgressSummarySchema
>;
