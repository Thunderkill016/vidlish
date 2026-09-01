/**
 * Where sentences for a learner below A2 come from.
 *
 * The video path has a transcript to quote from, so the model there never
 * invents language — it points at language that already exists. At zero there
 * is no transcript: a beginner cannot yet understand any real video, and
 * waiting until they can is exactly the gap this product exists to cross. So
 * here the sentences are generated.
 *
 * That does not loosen the invariant, it moves it. The model still only
 * proposes: it is told the exact words the learner has evidence for and the one
 * new word to introduce, and every sentence it returns is checked against that
 * vocabulary by `composeBeginnerInput` before a learner ever sees it. A draft
 * that reaches for a word outside the list is discarded, not repaired — the
 * same way an ungrounded quote is discarded on the video path.
 *
 * The provider returns plain sentences and nothing else. No translations, no
 * explanations, no difficulty claims: everything a learner is told about a
 * sentence is derived server-side, from evidence, where it can be checked.
 */

export type DraftBeginnerInputRequest = {
  /** The one new word this batch exists to teach. */
  readonly target: string;
  /** Every word the learner has produced independently, lowercased. */
  readonly known: readonly string[];
  /** How many sentences to ask for. Ask for more than are needed. */
  readonly count: number;
};

export type BeginnerInputResult = {
  readonly sentences: readonly string[];
  readonly modelId: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
};

export interface BeginnerInputProvider {
  draft(request: DraftBeginnerInputRequest): Promise<BeginnerInputResult>;
}
