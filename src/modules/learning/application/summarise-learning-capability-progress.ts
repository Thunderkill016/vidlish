import type { LearningCapabilityObservation, LearningSkill } from "@/shared/contracts/learning-capability";
import {
  learningCapabilityProgressSummarySchema,
  type LearningCapabilityProgressSummary,
  type LearningSkillCapabilitySummary,
} from "@/shared/contracts/learning-capability-progress";

const SKILLS = ["listening", "reading", "speaking", "writing"] as const satisfies readonly LearningSkill[];

function latestTimestamp(
  observations: readonly LearningCapabilityObservation[],
): string | null {
  if (observations.length === 0) return null;
  return observations.reduce<string | null>((latest, observation) => {
    if (latest === null) return observation.observedAt;
    return Date.parse(observation.observedAt) > Date.parse(latest)
      ? observation.observedAt
      : latest;
  }, null);
}

function summariseSkill(
  skill: LearningSkill,
  observations: readonly LearningCapabilityObservation[],
): LearningSkillCapabilitySummary {
  const matching = observations.filter(
    (observation) => observation.targetSkill === skill,
  );

  return {
    skill,
    objectiveIndependentSuccesses: matching.filter(
      (observation) =>
        observation.verification === "objective" &&
        observation.outcome === "successful" &&
        observation.support === "independent",
    ).length,
    objectiveSupportedSuccesses: matching.filter(
      (observation) =>
        observation.verification === "objective" &&
        observation.outcome === "successful" &&
        observation.support === "supported",
    ).length,
    objectiveFailures: matching.filter(
      (observation) =>
        observation.verification === "objective" &&
        observation.outcome === "unsuccessful",
    ).length,
    unscoredObservations: matching.filter(
      (observation) => observation.outcome === "unscored",
    ).length,
    latestObservedAt: latestTimestamp(matching),
  };
}

/**
 * Summarise evidence events, not mastery and not lesson completion.
 *
 * Repeated attempts remain repeated observations on purpose. This read model
 * answers "what evidence has Vidlish actually observed by skill?"; it does not
 * convert event counts into a proficiency score or deduplicate activities into
 * invented mastered-item counts.
 */
export function summariseLearningCapabilityProgress(
  observations: readonly LearningCapabilityObservation[],
): LearningCapabilityProgressSummary {
  return learningCapabilityProgressSummarySchema.parse({
    totalObservations: observations.length,
    skills: SKILLS.map((skill) => summariseSkill(skill, observations)),
  });
}
