import {
  foundationUnitSchema,
  type FoundationUnit,
} from "@/shared/contracts/curriculum";

import { PRE_A1_INTRODUCE_YOURSELF } from "./pre-a1-introduce-yourself";
import {
  PRE_A1_ASK_FOR_REPEAT,
  PRE_A1_ASK_WHAT_IT_MEANS,
  PRE_A1_SAY_WHAT_YOU_DO,
} from "./pre-a1-survival";

/**
 * The syllabus.
 *
 * Parsed at module load rather than trusted. A unit that violates its own rules
 * — teaching a chunk its input never says, or claiming evidence for language it
 * does not teach — must fail here, where a test sees it, and not later on a
 * learner's screen.
 */
const AUTHORED: readonly FoundationUnit[] = [
  PRE_A1_INTRODUCE_YOURSELF,
  PRE_A1_ASK_FOR_REPEAT,
  PRE_A1_SAY_WHAT_YOU_DO,
  PRE_A1_ASK_WHAT_IT_MEANS,
];

export const FOUNDATION_UNITS: readonly FoundationUnit[] = AUTHORED.map(
  (unit) => foundationUnitSchema.parse(unit),
);

export function foundationUnitById(id: string): FoundationUnit | null {
  return FOUNDATION_UNITS.find((unit) => unit.id === id) ?? null;
}

/**
 * The Vietnamese a chunk means, looked up on the server.
 *
 * A reading activity is answered by choosing a meaning, so something has to
 * hold which meaning is right. It is here rather than in the response payload
 * for the same reason the graded chunk is: a browser that holds the answer is
 * not being measured, it is being asked to be honest.
 */
export function chunkMeaningVi(text: string): string | null {
  const wanted = text.trim().toLowerCase();
  for (const unit of FOUNDATION_UNITS) {
    for (const chunk of unit.targetChunks) {
      if (chunk.text.trim().toLowerCase() === wanted) return chunk.vi;
    }
  }
  return null;
}
