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
  | { kind: "introduce_word"; target: string; knownWordCount: number };

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

/**
 * How far down the teaching order the session may look for a word the corpus
 * can actually illustrate.
 *
 * Taking strictly the next word measured badly: simulated from zero against the
 * real catalogue and the real corpus, **43 of the first 100 words had no i+1
 * sentence at all**, and the starved ones were the words that matter most —
 * `you`, `the`, `to`, `a`, `it`, `that`. Each of those arrives as a bare word
 * with no context, which is a flashcard, and this product's whole claim is that
 * flashcards are not how a language is met.
 *
 * Looking a little further down the order fixes it, because whether a word can
 * be illustrated depends on what the learner already knows, and two words of
 * equal frequency are not equally teachable today.
 *
 * The width was measured rather than picked. Starved words in the first hundred:
 *
 *     window   1 → 43        window  40 → 9
 *     window   5 → 38        window  80 → 1
 *     window  20 → 26
 *
 * Forty is where the curve flattens. The cost of looking further is teaching a
 * rarer word sooner, and that cost was measured too: at forty, the least common
 * word among the first hundred still ranks 136th by spoken frequency and **no
 * A2 word is pulled forward at all**. Eighty saves eight more words and pushes
 * that to 172nd, which is paying more of the ordering for less of the problem.
 */
export const TEACHABLE_SEARCH_WINDOW = 40;

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
  const candidates = selectNextVocabulary({
    catalogue: input.catalogue,
    known: input.known,
    limit: TEACHABLE_SEARCH_WINDOW,
  });
  const [first] = candidates;
  if (!first) return { kind: "catalogue_exhausted" };

  // Prefer a word the corpus can show in a sentence today. Order still decides
  // between two words that are both teachable; this only refuses to spend the
  // learner's next turn on a word nothing can illustrate while a comparably
  // common one can be.
  for (const candidate of candidates) {
    const retrieved = retrieveBeginnerInput({
      target: candidate.word,
      known: input.known,
      candidates: input.candidatesFor(candidate.word),
      wanted: input.wanted,
    });
    if (retrieved.source !== "retrieved") continue;
    return {
      kind: "ready",
      plan: {
        target: candidate.word,
        source: "retrieved",
        sentences: retrieved.sentences,
        knownWordCount: input.known.size,
      },
    };
  }

  // Nothing in the window can be retrieved. The word taught is then the one the
  // order actually names, not whichever happened to be searched last.
  const next = first;

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
    // Serving a short batch would be the tempting outcome, and it is still
    // refused: one sentence cannot show the same word in a changed context,
    // which is the only thing separating learning a word from memorising a
    // string. Whatever was drafted is discarded here.
    //
    // What is not refused any more is the turn itself. This used to end the
    // session with "no usable input", and measured against the real catalogue
    // and corpus that happened on 56 of the first 300 words — including `the`,
    // `to`, `a`, `it`, `that`, `and`, `of` and `what`, which is to say the words
    // the learner needs most. Being handed nothing is worse than being handed
    // the word: the standalone introduction is exactly how the very first word
    // of the language is taught, it records its evidence as a self-report the
    // nonword calibration keeps honest, and it claims nothing about sentences.
    return {
      kind: "introduce_word",
      target: next.word,
      knownWordCount: input.known.size,
    };
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
