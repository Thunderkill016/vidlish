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
 * Below this, a sentence cannot exist.
 *
 * i+1 means every word known except one, so a learner who knows `k` words can
 * only be served a sentence of at most `k + 1` words — and at zero that is a
 * one-word sentence, which is not a sentence. The corpus keeps nothing shorter
 * than two words for the same reason.
 *
 * This is not a tuning knob. It is arithmetic, and it means the very first
 * words of a language cannot be taught the way every later word is: they have
 * to be met on their own, heard and said, before any sentence can hold them.
 * A product that pretends otherwise either serves input the learner cannot
 * read, or quietly counts words they never produced.
 *
 * The number is how many known words a sentence needs, so one known word is
 * enough: `I go` is two words with one of them new. It was compared with `<=`
 * and so excluded the very case it names, which held a learner on single words
 * for one turn longer than the arithmetic requires.
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

  if (input.known.size < SENTENCES_NEED_AT_LEAST) {
    // Nothing is wrong here: at this point in a learner's life there is no
    // sentence that could exist. Deciding it before the model call also means
    // never paying for one, and never inviting a model to invent a sentence
    // the gate would have to throw away anyway.
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
  // not a lesson the learner cannot read.
  const composed = composeBeginnerInput({
    target: next.word,
    known: input.known,
    drafts: drafted,
    wanted: input.wanted,
  });

  if (composed.kind !== "ready") {
    // Serving a short batch would be the tempting outcome. It is worse than
    // none: a session with one sentence cannot show the same word in a changed
    // context, which is the only thing that distinguishes learning it from
    // memorising a string.
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
