import { z } from "zod";

import { learningMeasurementSummarySchema } from "@/shared/contracts/learning-measurement";

export const goldenSessionRecognitionLevelSchema = z.enum([
  "not_recognized",
  "partial",
  "recognized",
]);
export type GoldenSessionRecognitionLevel = z.infer<
  typeof goldenSessionRecognitionLevelSchema
>;

export const goldenSessionBlockKindSchema = z.enum([
  "player",
  "support",
  "feedback",
  "retry",
  "transfer",
  "navigation",
  "other_flow",
]);
export type GoldenSessionBlockKind = z.infer<
  typeof goldenSessionBlockKindSchema
>;

export const goldenSessionSevereDefectKindSchema = z.enum([
  "grounding",
  "answer_exposure",
  "misleading_mastery",
]);
export type GoldenSessionSevereDefectKind = z.infer<
  typeof goldenSessionSevereDefectKindSchema
>;

export const goldenSessionModeratorObservationSchema = z
  .object({
    participantCode: z.string().regex(/^p[1-9][0-9]{0,2}$/),
    platform: z.enum(["desktop", "mobile"]),
    completedWithoutModeratorInstruction: z.boolean(),
    lessonGoalRestated: z.boolean(),
    beforeTargetRecognition: goldenSessionRecognitionLevelSchema,
    afterTargetRecognition: goldenSessionRecognitionLevelSchema,
    blocked: z.boolean(),
    blockKind: goldenSessionBlockKindSchema.nullable(),
    severeDefectKind: goldenSessionSevereDefectKindSchema.nullable(),
  })
  .strict()
  .superRefine((observation, context) => {
    if (observation.blocked && observation.blockKind === null) {
      context.addIssue({
        code: "custom",
        path: ["blockKind"],
        message: "A blocked participant requires a bounded block kind.",
      });
    }

    if (!observation.blocked && observation.blockKind !== null) {
      context.addIssue({
        code: "custom",
        path: ["blockKind"],
        message: "An unblocked participant cannot carry a block kind.",
      });
    }
  });
export type GoldenSessionModeratorObservation = z.infer<
  typeof goldenSessionModeratorObservationSchema
>;

export const goldenSessionUsabilityParticipantSchema = z
  .object({
    measurement: learningMeasurementSummarySchema,
    observation: goldenSessionModeratorObservationSchema,
  })
  .strict();
export type GoldenSessionUsabilityParticipant = z.infer<
  typeof goldenSessionUsabilityParticipantSchema
>;

export const goldenSessionUsabilityStudySchema = z
  .object({
    participants: z.array(goldenSessionUsabilityParticipantSchema).length(5),
  })
  .strict()
  .superRefine((study, context) => {
    const participantCodes = new Set<string>();
    const sessionIds = new Set<string>();

    study.participants.forEach((participant, index) => {
      const participantCode = participant.observation.participantCode;
      if (participantCodes.has(participantCode)) {
        context.addIssue({
          code: "custom",
          path: ["participants", index, "observation", "participantCode"],
          message: "Participant codes must be unique within a study.",
        });
      }
      participantCodes.add(participantCode);

      const sessionId = participant.measurement.sessionId;
      if (sessionIds.has(sessionId)) {
        context.addIssue({
          code: "custom",
          path: ["participants", index, "measurement", "sessionId"],
          message: "Session IDs must be unique within a study.",
        });
      }
      sessionIds.add(sessionId);
    });
  });
export type GoldenSessionUsabilityStudy = z.infer<
  typeof goldenSessionUsabilityStudySchema
>;
