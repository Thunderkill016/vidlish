import {
  lessonBlueprintV2Schema,
  LESSON_V2_PIPELINE_VERSION,
  LESSON_V2_SCHEMA_VERSION,
  type EvidenceRef,
  type LessonBlueprintV2,
  type SourceEvidence,
} from "@/shared/contracts/lesson-v2";
import {
  learningAuthoringDraftV2Schema,
  type LearningAuthoringDraftV2,
} from "@/shared/contracts/learning-authoring-draft-v2";
import {
  learningAuthoringBriefSchema,
  type LearningAuthoringBrief,
  type VideoLearningProfileV2,
} from "@/shared/contracts/learning-generation-v2";
import type { LearnerContextSnapshot } from "@/shared/contracts/lesson-v2";
import type { CanonicalTranscript } from "@/shared/contracts/transcript";

/**
 * Turns a model's authoring draft into a lesson blueprint.
 *
 * This is where the grounding invariant is enforced. The model never writes a
 * quote or a timestamp: it names windows and candidates the brief already
 * permitted, and everything a learner will hear is looked up here from the
 * canonical transcript. A model that invents a plausible sentence therefore
 * cannot get it in front of a learner — the sentence has no segment to come
 * from, so hydration fails instead of quietly inventing evidence.
 */

export class LearningBlueprintHydrationError extends Error {
  readonly name = "LearningBlueprintHydrationError";
}

function fail(message: string): never {
  throw new LearningBlueprintHydrationError(message);
}

export type HydrateLearningBlueprintInput = {
  readonly brief: LearningAuthoringBrief;
  readonly draft: LearningAuthoringDraftV2;
  readonly profile: VideoLearningProfileV2;
  /**
   * The full learner snapshot. The brief carries only the part an authoring
   * model is allowed to see — item history stays out of anything sent to a
   * provider — so the blueprint gets it from the caller instead.
   */
  readonly learnerSnapshot: LearnerContextSnapshot;
  readonly transcript: CanonicalTranscript;
  /** Carried on the job, not in the brief. */
  readonly videoTitle: string;
  readonly channelName: string;
  readonly blueprintId: string;
  readonly modelId: string;
  readonly createdAt: string;
};

export function hydrateLearningBlueprint(
  input: HydrateLearningBlueprintInput,
): LessonBlueprintV2 {
  const brief = learningAuthoringBriefSchema.parse(input.brief);
  const draft = learningAuthoringDraftV2Schema.parse(input.draft);

  if (input.transcript.normalizedHash !== brief.transcriptHash) {
    // A blueprint hydrated against a different transcript would cite real
    // segment IDs pointing at the wrong speech.
    fail("Draft was authored against a different transcript.");
  }

  const segmentById = new Map(
    input.transcript.segments.map((segment) => [segment.id, segment] as const),
  );
  const windowById = new Map(
    brief.windows.map((window) => [window.id, window] as const),
  );
  const itemByCandidateId = new Map(
    brief.targetItems.map((item) => [item.id, item] as const),
  );

  /** Every segment the brief permitted, hydrated once. */
  const evidenceCatalog: SourceEvidence[] = [];
  const catalogued = new Set<string>();
  for (const window of brief.windows) {
    for (const segmentId of window.sourceSegmentIds) {
      if (catalogued.has(segmentId)) continue;
      const segment = segmentById.get(segmentId);
      if (!segment) {
        fail(`Permitted window cites a segment outside the transcript: ${segmentId}`);
      }
      catalogued.add(segmentId);
      evidenceCatalog.push({
        origin: "source_quote",
        segmentId: segment.id,
        startMs: segment.startMs,
        endMs: segment.endMs,
        text: segment.text,
      });
    }
  }
  if (evidenceCatalog.length === 0) {
    fail("Authoring brief permitted no source evidence.");
  }

  function evidenceFor(
    windowIds: readonly string[],
    captionPolicy: EvidenceRef["captionPolicy"],
  ): EvidenceRef[] {
    return windowIds.map((windowId) => {
      const window = windowById.get(windowId);
      if (!window) {
        // The model named a window the brief did not offer. Accepting it would
        // let the lesson quote speech the language gate never permitted.
        fail(`Draft cites a window outside the authoring brief: ${windowId}`);
      }
      const segments = window.sourceSegmentIds.map((segmentId) => {
        const segment = segmentById.get(segmentId);
        if (!segment) fail(`Window cites an unknown segment: ${segmentId}`);
        return segment;
      });
      const startMs = Math.min(...segments.map((segment) => segment.startMs));
      const endMs = Math.max(...segments.map((segment) => segment.endMs));
      return {
        sourceSegmentIds: window.sourceSegmentIds,
        startMs,
        endMs,
        captionPolicy,
        replayAllowed: true as const,
      };
    });
  }

  function targetItemIdFor(candidateId: string): string {
    const item = itemByCandidateId.get(candidateId);
    if (!item) {
      fail(`Draft teaches a candidate the gate rejected: ${candidateId}`);
    }
    return item.id;
  }

  const noteByCandidateId = new Map(
    draft.targetItemNotes.map((note) => [note.candidateId, note] as const),
  );

  const activities = draft.activities.map((activity) => {
    const shared = {
      id: activity.id,
      outcomeIds: activity.outcomeIds,
      instructionVi: activity.instructionVi,
      estimatedSeconds: activity.estimatedSeconds,
    };

    switch (activity.activityType) {
      case "gist_choice":
        return {
          ...shared,
          phase: activity.phase,
          activityType: activity.activityType,
          evidence: evidenceFor(activity.evidenceWindowIds, activity.captionPolicy),
          promptVi: activity.promptVi,
          options: activity.options,
          evaluation: {
            kind: "single_choice" as const,
            correctOptionId: activity.correctOptionId,
          },
          feedback: activity.feedback,
        };
      case "meaning_in_context":
        return {
          ...shared,
          phase: activity.phase,
          activityType: activity.activityType,
          evidence: evidenceFor(activity.evidenceWindowIds, activity.captionPolicy),
          targetItemId: targetItemIdFor(activity.candidateId),
          promptVi: activity.promptVi,
          options: activity.options,
          evaluation: {
            kind: "single_choice" as const,
            correctOptionId: activity.correctOptionId,
          },
          feedback: activity.feedback,
        };
      case "chunk_recall":
        return {
          ...shared,
          phase: activity.phase,
          activityType: activity.activityType,
          evidence: evidenceFor(activity.evidenceWindowIds, activity.captionPolicy),
          targetItemId: targetItemIdFor(activity.candidateId),
          promptVi: activity.promptVi,
          hintVi: activity.hintVi,
          evaluation: {
            kind: "normalized_text_set" as const,
            // The gate already proved this surface form appears in the source,
            // so it always counts. The model's variants are kept on top — they
            // only widen what is accepted, and being lenient about a spelling
            // costs less than marking a learner wrong for a contraction.
            accepted: [
              ...new Set([
                itemByCandidateId.get(activity.candidateId)!.surfaceForm,
                ...activity.accepted,
              ]),
            ].slice(0, 10),
          },
          reveal: {
            // Deliberately the gate's surface form, not `activity.revealAnswer`.
            // This is the string shown to the learner as the right answer, and
            // the model has no source of truth for it — an invented phrase here
            // is the learner memorising something nobody said in the video.
            answer: itemByCandidateId.get(activity.candidateId)!.surfaceForm,
            explanationVi: activity.revealExplanationVi,
          },
          feedback: activity.feedback,
        };
      case "guided_transfer":
        return {
          ...shared,
          phase: activity.phase,
          activityType: activity.activityType,
          evidence: [],
          targetItemIds: activity.candidateIds.map(targetItemIdFor),
          scenarioVi: activity.scenarioVi,
          promptVi: activity.promptVi,
          evaluation: {
            kind: "self_check" as const,
            criteriaVi: activity.criteriaVi,
            // Nested inside the evaluation in the blueprint, flat in the draft.
            // The exemplar is part of what "done well" means, so it lives with
            // the criteria rather than beside them.
            ...(activity.exemplarAfterAttempt === undefined
              ? {}
              : { exemplarAfterAttempt: activity.exemplarAfterAttempt }),
          },
          feedback: activity.feedback,
        };
      case "exit_ticket":
        return {
          ...shared,
          phase: activity.phase,
          activityType: activity.activityType,
          evidence: [],
          promptVi: activity.promptVi,
          evaluation: { kind: "unscored_reflection" as const },
          feedback: activity.feedback,
        };
    }
  });

  const targetItems = brief.targetItems.map((item) => {
    const note = noteByCandidateId.get(item.id);
    return {
      id: item.id,
      itemKey: item.key,
      surfaceForm: item.surfaceForm,
      kind: item.kind,
      contextualMeaningVi: item.contextualMeaningVi,
      // The model may sharpen the wording; the fallback keeps the gate's own.
      communicativeFunctionVi:
        note?.communicativeFunctionVi ?? item.communicativeFunctionVi,
      register: item.register,
      pronunciationNoteVi: note?.pronunciationNoteVi ?? null,
      sourceSegmentIds: item.sourceSegmentIds,
    };
  });

  return lessonBlueprintV2Schema.parse({
    schemaVersion: LESSON_V2_SCHEMA_VERSION,
    pipelineVersion: LESSON_V2_PIPELINE_VERSION,
    blueprintId: input.blueprintId,
    source: {
      jobId: brief.jobId,
      videoId: brief.videoId,
      videoTitle: input.videoTitle,
      channelName: input.channelName,
      transcriptHash: brief.transcriptHash,
    },
    learnerSnapshot: input.learnerSnapshot,
    videoProfile: {
      durationMs: input.profile.durationMs,
      challengeSummaryVi: draft.challengeSummaryVi,
      challengeDimensions: [],
      lexicalCoverageEstimate: input.profile.lexicalCoverageEstimate,
    },
    outcomes: brief.outcomes,
    targetItems,
    evidenceCatalog,
    activities,
    provenance: {
      diagnosisVersion: input.profile.diagnosisVersion,
      authoringVersion: draft.draftVersion,
      modelId: input.modelId,
      createdAt: input.createdAt,
    },
  });
}
