import { selectNextVocabulary, type VocabularyEntry } from "./select-next-vocabulary";
import { composeBeginnerInput } from "./compose-beginner-input";
import { retrieveBeginnerInput } from "./retrieve-beginner-input";

/**
 * Assembles one session for a learner who may know nothing at all.
 *
 * The order of operations is the product: what the learner meets next comes
 * from evidence, not from a curriculum position or a streak. Two learners with
 * the same number of sessions behind them get different words if they can
 * produce different words.
 *
 * Retrieval is tried first and generation is the fallback, but "fallback" here
 * is not a rare path — measured against the catalogue order, a learner with 25
 * known words has almost no human-written sentence available, so the first
 * dozens of words come from the model and the corpus takes over after that.
 */

export type BeginnerSessionPlan = {
  readonly target: string;
  readonly source: "retrieved" | "generated";
  readonly sentences: readonly string[];
  readonly knownWordCount: number;
};

export type BeginnerSessionOutcome =
  | { kind: "ready"; plan: BeginnerSessionPlan }
  | { kind: "catalogue_exhausted" }
  | { kind: "introduce_word"; target: string; knownWordCount: number }
  | { kind: "no_usable_input"; target: string };

/**
 * Bootstrap threshold for the current conservative beginner policy.
 *
 * The sentence gate currently permits one server-selected target outside the
 * learner's independently produced lexical set. With no evidence at all, there
 * is no multi-word sentence that can satisfy that policy. With only one known
 * word, possible strings are so constrained that the current runtime still
 * bootstraps another standalone word before asking retrieval/generation for a
 * varied sentence batch.
 *
 * The threshold is an auditable product choice, not a universal definition of
 * i+1, comprehensibility, or how first words must be acquired. Changing it is a
 * learning-policy feature and needs learner evidence; this function merely
 * enforces the current choice.
 */
export const SENTENCES_NEED_AT_LEAST = 1;

export async function startBeginnerSession(input: {
  readonly catalogue: readonly VocabularyEntry[];
  readonly known: ReadonlySet<string>;
  /** Human-written candidates for a target, in catalogue order. */
  readonly candidatesFor: (target: string) => readonly string[];
  /** Asks the model for sentences. Only called when retrieval falls short. */
  readonly generate: (request: {
    target: string;
    known: readonly string[];
    count: number;
  }) => Promise<readonly string[]>;
  readonly wanted: number;
}): Promise<BeginnerSessionOutcome> {
  const [next] = selectNextVocabulary({
    catalogue: input.catalogue,
    known: input.known,
    limit: 1,
  });
  if (!next) return { kind: "catalogue_exhausted" };

  const retrieved = retrieveBeginnerInput({
    target: next.word,
    known: input.known,
    candidates: input.candidatesFor(next.word),
    wanted: input.wanted,
  });

  if (retrieved.source === "retrieved") {
    return {
      kind: "ready",
      plan: {
        target: next.word,
        source: "retrieved",
        sentences: retrieved.sentences,
        knownWordCount: input.known.size,
      },
    };
  }

  if (input.known.size <= SENTENCES_NEED_AT_LEAST) {
    // Fail closed inside the current bootstrap policy instead of paying a model
    // for material this same runtime would reject afterwards.
    return {
      kind: "introduce_word",
      target: next.word,
      knownWordCount: input.known.size,
    };
  }

  const drafted = await input.generate({
    target: next.word,
    known: [...input.known],
    count: input.wanted,
  });

  // The generated drafts go through the same gate the retrieved ones did. A
  // model that reaches outside the permitted vocabulary produces waste here,
  // not a lesson the learner cannot read under the current policy.
  const composed = composeBeginnerInput({
    target: next.word,
    known: input.known,
    drafts: drafted,
    wanted: input.wanted,
  });

  if (composed.kind !== "ready") {
    // The current session design requires a varied batch before it banks this
    // target through sentence work. That is a product policy, not a claim that
    // one sentence can never teach anything.
    return { kind: "no_usable_input", target: next.word };
  }

  return {
    kind: "ready",
    plan: {
      target: next.word,
      source: "generated",
      sentences: composed.sentences,
      knownWordCount: input.known.size,
    },
  };
}
