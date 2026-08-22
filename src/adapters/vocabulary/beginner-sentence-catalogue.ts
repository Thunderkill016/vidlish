import { measureKnownCoverage } from "@/modules/learning/application/measure-known-coverage";

import catalogue from "./tatoeba-beginner-sentences.json";

/**
 * Human-written sentences for a learner's first thousand words.
 *
 * These are not generated. Every one was written by a person on Tatoeba and
 * kept only if each of its words is in the A1/A2 catalogue, so the corpus can be
 * read by a person before it is served — which is the whole reason it is an
 * artifact and not a live query.
 *
 * `target` is the word the sentence can teach: the last of its words to be
 * taught in the curriculum order, and therefore the only one that can still be
 * new by the time the sentence becomes usable.
 */

export type BeginnerSentence = {
  /** Tatoeba sentence id, so any sentence can be traced back to its author. */
  readonly id: number;
  readonly text: string;
  readonly words: number;
  readonly target: string;
  /** A human translation where Tatoeba has one. Most sentences have none. */
  readonly vi?: string;
  /**
   * Present only for recordings whose licence permits reuse outside Tatoeba.
   * Vanishingly rare — the listening step cannot be built on this.
   */
  readonly audio?: { readonly licence: string; readonly attribution: string };
};

const SENTENCES = catalogue as readonly BeginnerSentence[];

const BY_TARGET = new Map<string, BeginnerSentence[]>();
for (const sentence of SENTENCES) {
  const bucket = BY_TARGET.get(sentence.target);
  if (bucket) bucket.push(sentence);
  else BY_TARGET.set(sentence.target, [sentence]);
}

export function beginnerSentencesFor(target: string): readonly BeginnerSentence[] {
  return BY_TARGET.get(target.toLocaleLowerCase("en-US")) ?? [];
}

export function allBeginnerSentences(): readonly BeginnerSentence[] {
  return SENTENCES;
}

/**
 * How many corpus sentences the learner could read with nothing unknown in
 * them. This is a reading measure taken from evidence rather than from an
 * assumed level, and it moves only when the learner learns something.
 */
export function readableSentenceCount(known: ReadonlySet<string>): number {
  let readable = 0;
  for (const sentence of SENTENCES) {
    if (
      measureKnownCoverage({ text: sentence.text, known }).unknown.length === 0
    ) {
      readable += 1;
    }
  }
  return readable;
}

export function beginnerSentenceCatalogueSize(): number {
  return SENTENCES.length;
}
