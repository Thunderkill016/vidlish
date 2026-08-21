import {
  checkComprehensibleInput,
  tokenise,
} from "./check-comprehensible-input";

/**
 * Turns drafted sentences into input a beginner can actually learn from.
 *
 * The gate in `check-comprehensible-input` answers one question about one
 * sentence: is at most one word new? That is necessary and not sufficient. A
 * sentence can pass it while introducing the wrong new word — the model reached
 * for `often` when the batch exists to teach `water` — and a learner who meets
 * `often` has met a word nothing else in their session will reinforce, and the
 * evidence recorded against the batch would name a word they never practised.
 *
 * So this asks the stricter question: is the one new word the word we set out
 * to teach? Anything else is discarded rather than repaired. Repairing a
 * sentence would mean writing language on the model's behalf and then
 * attributing it to a checked source, which is the failure the whole grounding
 * design exists to prevent.
 *
 * Discarding is cheap because the provider is asked for more sentences than are
 * needed. What is not cheap is a learner meeting a word they cannot yet hold.
 */

export type RejectedDraft = {
  readonly sentence: string;
  readonly reason:
    | "too_hard"
    | "nothing_new"
    | "wrong_new_word"
    | "duplicate";
  /** Present when a word disqualified the sentence, for diagnosis. */
  readonly offendingWords?: readonly string[];
};

export type ComposedBeginnerInput =
  | { kind: "ready"; sentences: string[]; rejected: RejectedDraft[] }
  | { kind: "insufficient"; sentences: string[]; rejected: RejectedDraft[] };

export function composeBeginnerInput(input: {
  readonly target: string;
  readonly known: ReadonlySet<string>;
  readonly drafts: readonly string[];
  /** How many usable sentences the session needs. */
  readonly wanted: number;
}): ComposedBeginnerInput {
  const target = input.target.toLocaleLowerCase("en-US");
  const sentences: string[] = [];
  const rejected: RejectedDraft[] = [];
  const seen = new Set<string>();

  for (const draft of input.drafts) {
    const sentence = draft.trim();
    if (sentence.length === 0) continue;

    // Two sentences that differ only in spacing or case are one sentence to a
    // learner, and serving both would inflate the practice count without
    // adding a single repetition of the target in a new context.
    const fingerprint = tokenise(sentence).join(" ");
    if (seen.has(fingerprint)) {
      rejected.push({ sentence, reason: "duplicate" });
      continue;
    }
    seen.add(fingerprint);

    const verdict = checkComprehensibleInput({ sentence, known: input.known });
    if (verdict.kind === "too_hard") {
      rejected.push({
        sentence,
        reason: "too_hard",
        offendingWords: verdict.newWords,
      });
      continue;
    }
    if (verdict.kind === "nothing_new") {
      // Every word already known — so the target is known too, and this batch
      // should never have been requested. Named separately from a sentence
      // that teaches the wrong word, because the two have different causes:
      // one is a stale known-set, the other is a wandering model.
      rejected.push({ sentence, reason: "nothing_new" });
      continue;
    }

    const [newWord] = verdict.newWords;
    if (newWord !== target) {
      rejected.push({
        sentence,
        reason: "wrong_new_word",
        offendingWords: [newWord],
      });
      continue;
    }

    sentences.push(sentence);
    if (sentences.length === input.wanted) break;
  }

  const kind = sentences.length >= input.wanted ? "ready" : "insufficient";
  return { kind, sentences, rejected };
}

/**
 * Whether asking for this batch makes sense at all.
 *
 * Requesting sentences for a word the learner already produces independently
 * burns a model call and, worse, spends a session slot on nothing. Caught here
 * rather than after generation so the cost is never paid.
 */
export function beginnerInputBatchIsWorthAsking(input: {
  readonly target: string;
  readonly known: ReadonlySet<string>;
}): boolean {
  return !input.known.has(input.target.toLocaleLowerCase("en-US"));
}
