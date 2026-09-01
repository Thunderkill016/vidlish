import type { BeginnerEvidenceChallengeKind } from "@/modules/learning/ports/beginner-progress-repository";

/**
 * Which server-owned challenge kind a curriculum skill is graded through.
 *
 * The curriculum has always labelled each activity listening / speaking /
 * reading / writing, and the runtime ignored the label: every activity was
 * issued a `dictation` challenge and answered by typing. Thirteen of the
 * twenty-two authored activities claim speaking, so the product was recording
 * speaking practice from a keyboard.
 *
 * The mapping lives here rather than inline at the route because it is the
 * rule, not a detail of one handler: a skill the product cannot yet grade must
 * be a compile error at this table, not a silent fallback to typing.
 */
export function challengeKindForSkill(
  skill: "listening" | "speaking" | "reading" | "writing",
): BeginnerEvidenceChallengeKind {
  switch (skill) {
    case "listening":
      // Heard, then typed back. The typing is the readout, the listening is
      // the thing being measured.
      return "dictation";
    case "speaking":
      return "spoken";
    case "reading":
      return "reading";
    case "writing":
      return "written";
  }
}

/**
 * Whether an attempt of this kind may be answered with a keyboard.
 *
 * Speaking is the one that cannot. Everything else is typed or chosen, so the
 * runtime is free to render an input box; for speaking it must capture speech
 * or refuse to serve the activity at all.
 */
export function challengeKindAcceptsTypedAnswer(
  kind: BeginnerEvidenceChallengeKind,
): boolean {
  return kind !== "spoken";
}
