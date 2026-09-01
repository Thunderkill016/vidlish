import {
  composeBeginnerInput,
  type ComposedBeginnerInput,
} from "./compose-beginner-input";

/**
 * Finds human-written sentences for the word a learner is about to meet.
 *
 * Retrieval runs before generation, and the reason is not cost. A generated
 * sentence can be grammatical, use only permitted words, pass every check this
 * codebase can perform, and still be something no person would ever say. That
 * failure is invisible to the gate, and it is exactly what made the earlier
 * lessons unusable. A retrieved sentence cannot fail that way, because a human
 * already decided it was worth writing.
 *
 * What retrieval cannot do is cover the beginning. Measured against the
 * catalogue order, a learner with 25 words has almost nothing available and one
 * with 100 has most of the next fifty targets covered. So generation is not a
 * rare fallback — it is required for roughly the first fifty words, and becomes
 * the exception after that.
 */

export type BeginnerInputSource = "retrieved" | "generation_required";

export type BeginnerInputSelection = ComposedBeginnerInput & {
  readonly source: BeginnerInputSource;
};

export function retrieveBeginnerInput(input: {
  readonly target: string;
  readonly known: ReadonlySet<string>;
  /** Candidate sentences for this target, in catalogue order. */
  readonly candidates: readonly string[];
  readonly wanted: number;
}): BeginnerInputSelection {
  const composed = composeBeginnerInput({
    target: input.target,
    known: input.known,
    drafts: input.candidates,
    wanted: input.wanted,
  });

  // A partial result still goes to generation. Mixing a retrieved sentence with
  // a generated one inside a single batch would leave no way to tell, later,
  // which kind of sentence a learner actually struggled with.
  const source: BeginnerInputSource =
    composed.kind === "ready" ? "retrieved" : "generation_required";

  return { ...composed, source };
}
