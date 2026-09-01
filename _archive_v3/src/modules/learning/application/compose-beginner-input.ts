import {
  checkComprehensibleInput,
  tokenise,
} from "./check-comprehensible-input";

/**
 * Turns drafted sentences into input that passes the current beginner policy.
 *
 * `check-comprehensible-input` applies the current conservative lexical-novelty
 * gate. Passing that gate is necessary for this generator and still not enough:
 * a draft can remain wrong for the batch if the permitted new item is not the
 * target we deliberately selected — the model reached for `often` when the
 * batch exists to teach `water`.
 *
 * So this asks the stricter authoring question: is the permitted new lexical
 * item the target we set out to teach? Anything else is discarded rather than
 * repaired. This protects target identity and keeps model wandering from
 * silently becoming curriculum.
 *
 * Discarding is cheap because the provider is asked for more sentences than are
 * needed. What is not acceptable is widening or changing the learning target
 * just to increase generation success.
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

    // Two sentences that differ only in spacing or case are one sentence for
    // this practice-selection purpose; serving both would inflate repetition
    // without adding a new context for the target.
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
      // Every token is already in the lexical set used by this gate, so the
      // batch would not introduce the selected target under the current policy.
      // This is named separately from model wandering because the two failures
      // require different diagnosis.
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
 * Whether asking for this batch makes sense under the current lexical policy.
 *
 * Requesting sentences for an item already present in the gate's productive-
 * independent set burns a model call and spends a target-teaching slot on an
 * item this policy does not classify as new. A future multidimensional learner
 * model may make a more specific decision; this function must not invent that
 * evidence in advance.
 */
export function beginnerInputBatchIsWorthAsking(input: {
  readonly target: string;
  readonly known: ReadonlySet<string>;
}): boolean {
  return !input.known.has(input.target.toLocaleLowerCase("en-US"));
}
