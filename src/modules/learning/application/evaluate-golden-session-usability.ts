import {
  goldenSessionUsabilityStudySchema,
  type GoldenSessionRecognitionLevel,
  type GoldenSessionUsabilityStudy,
} from "@/shared/contracts/golden-session-usability";

export type GoldenSessionCountThreshold = {
  passed: boolean;
  observed: number;
  required: number;
};

export type GoldenSessionZeroThreshold = {
  passed: boolean;
  observed: number;
  requiredMaximum: 0;
};

export type GoldenSessionTimeThreshold = {
  passed: boolean;
  medianSeconds: number | null;
  missingEvidenceCount: number;
  minimumSeconds: 240;
  maximumSeconds: 480;
};

export type GoldenSessionUsabilityEvaluation = {
  passed: boolean;
  participantCount: 5;
  thresholds: {
    completedWithoutModeratorInstruction: GoldenSessionCountThreshold;
    lessonGoalRestated: GoldenSessionCountThreshold;
    changedContextTransferAttempted: GoldenSessionCountThreshold;
    blockedParticipants: GoldenSessionZeroThreshold;
    severeDefects: GoldenSessionZeroThreshold;
    medianSessionTime: GoldenSessionTimeThreshold;
    targetRecognitionImproved: GoldenSessionCountThreshold;
  };
  diagnostics: {
    participantsWithRuntimeErrors: number;
  };
};

const recognitionRank: Record<GoldenSessionRecognitionLevel, number> = {
  not_recognized: 0,
  partial: 1,
  recognized: 2,
};

function countThreshold(observed: number, required: number) {
  return {
    passed: observed >= required,
    observed,
    required,
  } satisfies GoldenSessionCountThreshold;
}

function zeroThreshold(observed: number) {
  return {
    passed: observed === 0,
    observed,
    requiredMaximum: 0 as const,
  } satisfies GoldenSessionZeroThreshold;
}

function medianSessionTime(
  study: GoldenSessionUsabilityStudy,
): GoldenSessionTimeThreshold {
  const elapsed = study.participants.map(
    (participant) => participant.measurement.observedElapsedSeconds,
  );
  const missingEvidenceCount = elapsed.filter((value) => value === null).length;

  if (missingEvidenceCount > 0) {
    return {
      passed: false,
      medianSeconds: null,
      missingEvidenceCount,
      minimumSeconds: 240,
      maximumSeconds: 480,
    };
  }

  const sorted = elapsed
    .filter((value): value is number => value !== null)
    .sort((left, right) => left - right);
  const medianSeconds = sorted[2] ?? null;

  return {
    passed:
      medianSeconds !== null && medianSeconds >= 240 && medianSeconds <= 480,
    medianSeconds,
    missingEvidenceCount: 0,
    minimumSeconds: 240,
    maximumSeconds: 480,
  };
}

export function evaluateGoldenSessionUsabilityStudy(
  input: GoldenSessionUsabilityStudy,
): GoldenSessionUsabilityEvaluation {
  const study = goldenSessionUsabilityStudySchema.parse(input);

  const completedWithoutModeratorInstruction = study.participants.filter(
    (participant) =>
      participant.measurement.completed &&
      participant.observation.completedWithoutModeratorInstruction,
  ).length;
  const lessonGoalRestated = study.participants.filter(
    (participant) => participant.observation.lessonGoalRestated,
  ).length;
  const changedContextTransferAttempted = study.participants.filter(
    (participant) => participant.measurement.transfer.attemptCount >= 1,
  ).length;
  const blockedParticipants = study.participants.filter(
    (participant) => participant.observation.blocked,
  ).length;
  const severeDefects = study.participants.filter(
    (participant) => participant.observation.severeDefectKind !== null,
  ).length;
  const targetRecognitionImproved = study.participants.filter(
    (participant) =>
      recognitionRank[participant.observation.afterTargetRecognition] >
      recognitionRank[participant.observation.beforeTargetRecognition],
  ).length;
  const participantsWithRuntimeErrors = study.participants.filter(
    (participant) => participant.measurement.runtimeErrors.length > 0,
  ).length;

  const thresholds = {
    completedWithoutModeratorInstruction: countThreshold(
      completedWithoutModeratorInstruction,
      4,
    ),
    lessonGoalRestated: countThreshold(lessonGoalRestated, 4),
    changedContextTransferAttempted: countThreshold(
      changedContextTransferAttempted,
      4,
    ),
    blockedParticipants: zeroThreshold(blockedParticipants),
    severeDefects: zeroThreshold(severeDefects),
    medianSessionTime: medianSessionTime(study),
    targetRecognitionImproved: countThreshold(targetRecognitionImproved, 3),
  };

  return {
    passed: Object.values(thresholds).every((threshold) => threshold.passed),
    participantCount: 5,
    thresholds,
    diagnostics: {
      participantsWithRuntimeErrors,
    },
  };
}
