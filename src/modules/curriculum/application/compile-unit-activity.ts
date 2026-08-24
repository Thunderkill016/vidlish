import type {
  CurriculumActivity,
  FoundationUnit,
} from "@/shared/contracts/curriculum";

/**
 * Turns one curriculum activity into something the beginner runtime can serve.
 *
 * The obvious target was `LessonBlueprintV2`, so that one runtime drives both
 * paths. It is not reachable yet, and the reason is worth writing down: that
 * contract is bound to a video in thirty-four places outside its own tests —
 * `source.videoId`, `source.transcriptHash`, `videoProfile.durationMs`, an
 * evidence catalogue of transcript segments, and an `EvidenceRef` with start and
 * end milliseconds on every activity.
 *
 * A curriculum unit has no video. Compiling one into that shape would mean
 * inventing a job id, a transcript hash and timestamps for audio that does not
 * exist — fabricated provenance, which is the single thing the grounding design
 * exists to prevent. Unifying the two runtimes is a real project and not a step
 * on the way to this one.
 *
 * So this compiles to the beginner session instead: the runtime that already
 * plays audio before showing text, scores what the learner writes, and records
 * evidence. What it lacked was anything to say what should be served, and that
 * is exactly what a unit knows.
 */

export type CompiledActivity = {
  readonly unitId: string;
  readonly activityId: string;
  readonly strand: CurriculumActivity["strand"];
  readonly skill: CurriculumActivity["skill"];
  readonly promptVi: string;
  /** Lines the learner hears, in order, before any text is shown. */
  readonly listen: readonly string[];
  /** The language being practised, with its Vietnamese meaning. */
  readonly targets: readonly { text: string; vi: string }[];
  /** False when the activity is a retrieval: support would make it something else. */
  readonly supportAllowed: boolean;
  /** Every chunk this activity can bank evidence for. */
  readonly evidenceKeys: readonly string[];
};

export type CompileResult =
  | { kind: "compiled"; activity: CompiledActivity }
  | { kind: "unknown_activity"; activityId: string };

export function compileUnitActivity(
  unit: FoundationUnit,
  activityId: string,
): CompileResult {
  const activity = unit.activities.find((item) => item.id === activityId);
  if (!activity) return { kind: "unknown_activity", activityId };

  const meanings = new Map(
    unit.targetChunks.map((chunk) => [chunk.text, chunk.vi] as const),
  );

  // Only the scenes that actually say something this activity practises. A
  // listening step that plays the whole unit would make every activity the same
  // audio, and the learner would stop listening for anything in particular.
  const spoken = unit.inputScenes.filter((scene) =>
    activity.targets.some((target) =>
      scene.text.toLocaleLowerCase("en-US").includes(target.toLocaleLowerCase("en-US")),
    ),
  );

  return {
    kind: "compiled",
    activity: {
      unitId: unit.id,
      activityId: activity.id,
      strand: activity.strand,
      skill: activity.skill,
      promptVi: activity.promptVi,
      listen: spoken.map((scene) => scene.text),
      targets: activity.targets.map((text) => ({
        text,
        // The schema already guarantees every target is a chunk the unit
        // teaches, so a missing meaning would be a schema bug rather than
        // content to paper over.
        vi: meanings.get(text) ?? "",
      })),
      supportAllowed: activity.supportAllowed,
      // Evidence is only ever claimed for language the learner had to produce.
      // An activity where support may stay open cannot bank anything, because
      // nothing it observes distinguishes knowing from reading.
      evidenceKeys: activity.supportAllowed ? [] : activity.targets,
    },
  };
}
