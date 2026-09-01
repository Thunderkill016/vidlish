import {
  foundationUnitSchema,
  type FoundationUnit,
} from "@/shared/contracts/curriculum";

import {
  A1_ASKING_WITH_BE,
  A1_OTHER_PEOPLE,
  A1_SAYING_NO,
  A1_THIS_IS,
} from "./a1-core";
import {
  A1_CAN,
  A1_HOW_OFTEN,
  A1_THERE_IS,
  A1_WANT_TO,
  A1_WHY_BECAUSE,
  A1_YESTERDAY,
} from "./a1-core-2";
import {
  A1_COMPARING,
  A1_DOING_NOW,
  A1_HOW_MUCH,
  A1_JOINING_IDEAS,
} from "./a1-core-3";
import {
  A1_DID_YOU,
  A1_IT_WAS_DONE,
  A1_WHEN_AND_ANYONE,
  A1_WHICH_ONE,
} from "./a1-core-4";
import {
  A2_POLITE,
  A2_WHAT_HAPPENS_NEXT,
  A2_YESTERDAY_QUESTIONS,
} from "./a2-core";
import {
  A2_GETTING_THINGS_DONE,
  A2_IF_AND_BECAUSE,
  A2_MORE_AND_MOST,
  A2_ONGOING_WORK,
  A2_REPORTING,
} from "./a2-core-2";
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
  A1_THIS_IS,
  A1_OTHER_PEOPLE,
  A1_SAYING_NO,
  A1_ASKING_WITH_BE,
  A1_CAN,
  A1_THERE_IS,
  A1_WANT_TO,
  A1_WHY_BECAUSE,
  A1_YESTERDAY,
  A1_HOW_OFTEN,
  A1_JOINING_IDEAS,
  A1_COMPARING,
  A1_HOW_MUCH,
  A1_DOING_NOW,
  A1_WHICH_ONE,
  A1_WHEN_AND_ANYONE,
  A1_IT_WAS_DONE,
  A1_DID_YOU,
  A2_YESTERDAY_QUESTIONS,
  A2_WHAT_HAPPENS_NEXT,
  A2_POLITE,
  A2_IF_AND_BECAUSE,
  A2_REPORTING,
  A2_MORE_AND_MOST,
  A2_GETTING_THINGS_DONE,
  A2_ONGOING_WORK,
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
