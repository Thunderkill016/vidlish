import type {
  EvidenceRef,
  LessonBlueprintV2,
  LearningActivity,
} from "@/shared/contracts/lesson-v2";

export type LearnerActivityView =
  | {
      id: string;
      phase: "gist";
      activityType: "gist_choice";
      outcomeIds: string[];
      instructionVi: string;
      evidence: EvidenceRef[];
      estimatedSeconds: number;
      promptVi: string;
      options: Array<{ id: string; textVi: string }>;
    }
  | {
      id: string;
      phase: "practice";
      activityType: "meaning_in_context";
      outcomeIds: string[];
      instructionVi: string;
      evidence: EvidenceRef[];
      estimatedSeconds: number;
      targetItemId: string;
      promptVi: string;
      options: Array<{ id: string; textVi: string }>;
    }
  | {
      id: string;
      phase: "retrieve";
      activityType: "chunk_recall";
      outcomeIds: string[];
      instructionVi: string;
      evidence: EvidenceRef[];
      estimatedSeconds: number;
      targetItemId: string;
      promptVi: string;
      hintVi: string | null;
    }
  | {
      id: string;
      phase: "transfer";
      activityType: "guided_transfer";
      outcomeIds: string[];
      instructionVi: string;
      evidence: EvidenceRef[];
      estimatedSeconds: number;
      targetItemIds: string[];
      scenarioVi: string;
      promptVi: string;
    }
  | {
      id: string;
      phase: "reflect";
      activityType: "exit_ticket";
      outcomeIds: string[];
      instructionVi: string;
      evidence: EvidenceRef[];
      estimatedSeconds: number;
      promptVi: string;
    };

export type LearnerBlueprintView = Pick<
  LessonBlueprintV2,
  | "schemaVersion"
  | "pipelineVersion"
  | "blueprintId"
  | "source"
  | "learnerSnapshot"
  | "videoProfile"
  | "outcomes"
> & {
  targetItems: Array<{ id: string; itemKey: string }>;
  activities: LearnerActivityView[];
};

function common(activity: LearningActivity) {
  return {
    id: activity.id,
    phase: activity.phase,
    activityType: activity.activityType,
    outcomeIds: activity.outcomeIds,
    instructionVi: activity.instructionVi,
    evidence: activity.evidence,
    estimatedSeconds: activity.estimatedSeconds,
  };
}

export function createLearnerBlueprintView(
  blueprint: LessonBlueprintV2,
): LearnerBlueprintView {
  const activities: LearnerActivityView[] = blueprint.activities.map(
    (activity) => {
      switch (activity.activityType) {
        case "gist_choice":
          return {
            ...common(activity),
            phase: activity.phase,
            activityType: activity.activityType,
            promptVi: activity.promptVi,
            options: activity.options,
          };
        case "meaning_in_context":
          return {
            ...common(activity),
            phase: activity.phase,
            activityType: activity.activityType,
            targetItemId: activity.targetItemId,
            promptVi: activity.promptVi,
            options: activity.options,
          };
        case "chunk_recall":
          return {
            ...common(activity),
            phase: activity.phase,
            activityType: activity.activityType,
            targetItemId: activity.targetItemId,
            promptVi: activity.promptVi,
            hintVi: activity.hintVi,
          };
        case "guided_transfer":
          return {
            ...common(activity),
            phase: activity.phase,
            activityType: activity.activityType,
            targetItemIds: activity.targetItemIds,
            scenarioVi: activity.scenarioVi,
            promptVi: activity.promptVi,
          };
        case "exit_ticket":
          return {
            ...common(activity),
            phase: activity.phase,
            activityType: activity.activityType,
            promptVi: activity.promptVi,
          };
      }
    },
  );

  return {
    schemaVersion: blueprint.schemaVersion,
    pipelineVersion: blueprint.pipelineVersion,
    blueprintId: blueprint.blueprintId,
    source: blueprint.source,
    learnerSnapshot: blueprint.learnerSnapshot,
    videoProfile: blueprint.videoProfile,
    outcomes: blueprint.outcomes,
    targetItems: blueprint.targetItems.map((item) => ({
      id: item.id,
      itemKey: item.itemKey,
    })),
    activities,
  };
}
