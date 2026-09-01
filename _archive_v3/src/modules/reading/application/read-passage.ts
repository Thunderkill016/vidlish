/**
 * Turns a passage into something a learner can read *and touch*.
 *
 * The existing `tokenise` in the learning module answers "which words are in
 * this sentence" and throws the text away. A reading surface needs the text
 * back, exactly as written, with every word individually addressable — so it
 * can be coloured by what this learner knows and tapped for a meaning.
 *
 * Why this matters enough to exist: Cambridge puts zero to B2 at 500–600
 * guided hours. This repo's authored syllabus is about fifteen. The remaining
 * hours can only come from material the learner already wanted to read, and
 * that means rendering arbitrary text, not a catalogue.
 *
 * The full argument is in docs/product/READING_SURFACE_SPEC.md.
 */

export type PassageToken =
  /** A word the learner can tap. `lemma` is what gets matched against knowledge. */
  | {
      readonly kind: "word";
      /** Exactly as it appears, so the passage can be rebuilt character for character. */
      readonly text: string;
      readonly lemma: string;
      /** Every base form it could be an inflection of, best guess first. */
      readonly candidates: readonly string[];
      readonly index: number;
    }
  /** Spaces, punctuation, line breaks — rendered, never tappable. */
  | { readonly kind: "gap"; readonly text: string };

/**
 * Every base form a word could be an inflection of, best guess first.
 *
 * Returning candidates rather than one lemma is the whole design, and it came
 * from three failing tests. English does not let you recover a base form from a
 * stem: `walked` drops to `walk`, `hoped` drops to `hope`, `stopped` drops to
 * `stop` — same suffix, three different stems, and nothing in "walk" or "hop"
 * says which happened. A single guess is wrong about a third of the time, and a
 * wrong lemma silently marks a known word as new.
 *
 * So this stops guessing and hands the caller every possibility. The caller
 * already holds the set of words this learner knows, and checking a set is free.
 * The first candidate that the learner knows is the answer; if none of them is
 * known, the word is genuinely new and the guesswork never mattered.
 *
 * The candidates are inflections only — the flemma, not the word family. A word
 * family would credit a learner who knows *nation* with *national*,
 * *nationality* and *internationalise*. That unit is validated for learners with
 * heavy exposure and a Germanic first language; Vietnamese is neither, so
 * counting families here would inflate the one number this product asks the
 * learner to trust.
 *
 * `-er` and `-est` are left alone on purpose. *Bigger* really is an inflection
 * of *big*, but *teacher* is not *teach*, and no cheap rule separates them.
 */
export function lemmaCandidatesOf(word: string): readonly string[] {
  const lower = word.toLocaleLowerCase("en-US");
  const bare = lower.replace(/[’']s$/u, "");
  const out = new Set<string>([lower, bare]);

  const add = (candidate: string) => {
    if (candidate.length >= 2) out.add(candidate);
  };

  if (/[^aeiou]ies$/.test(bare)) add(`${bare.slice(0, -3)}y`);
  if (/[^aeiou]ied$/.test(bare)) add(`${bare.slice(0, -3)}y`);
  if (/(ches|shes|sses|xes|zes)$/.test(bare)) add(bare.slice(0, -2));
  if (/s$/.test(bare)) add(bare.slice(0, -1));
  for (const suffix of ["ing", "ed"]) {
    if (!bare.endsWith(suffix)) continue;
    const stem = bare.slice(0, -suffix.length);
    add(stem);
    // hope -> hoping, stop -> stopping: offer both repairs, take neither on faith.
    add(`${stem}e`);
    if (/([^aeiou])\1$/.test(stem)) add(stem.slice(0, -1));
  }
  return [...out];
}

/**
 * The single form used for display and for counting a word the learner has not
 * met. Always the word as written, lowercased — never a guess.
 */
export function lemmaOf(word: string): string {
  return word.toLocaleLowerCase("en-US").replace(/[’']s$/u, "");
}

/**
 * Splits a passage into words and the text between them.
 *
 * Concatenating every `text` in order reproduces the input exactly. That is the
 * property the renderer depends on and the tests check: a reader who sees text
 * that quietly differs from the source cannot trust anything else on the page.
 */
export function readPassage(passage: string): readonly PassageToken[] {
  const tokens: PassageToken[] = [];
  // Apostrophes stay inside words so "don't" is one word, not two.
  const pattern = /[A-Za-z]+(?:[’'][A-Za-z]+)*/gu;
  let cursor = 0;
  let index = 0;

  for (const match of passage.matchAll(pattern)) {
    const at = match.index ?? 0;
    if (at > cursor) tokens.push({ kind: "gap", text: passage.slice(cursor, at) });
    tokens.push({
      kind: "word",
      text: match[0],
      lemma: lemmaOf(match[0]),
      candidates: lemmaCandidatesOf(match[0]),
      index: index++,
    });
    cursor = at + match[0].length;
  }
  if (cursor < passage.length) {
    tokens.push({ kind: "gap", text: passage.slice(cursor) });
  }
  return tokens;
}

export type WordStatus = "known" | "learning" | "new";

/**
 * How a word should be shown to this learner.
 *
 * Three states, following the model every reading product converged on: unmarked
 * for known, one colour for words being learned, another for words never met.
 * The text itself becomes the progress display.
 *
 * Matched across every candidate base form, so meeting *walked*, *walks* or
 * *walking* all count the learner's knowledge of *walk* — without this module
 * having to guess which of them the base form is.
 */
export function statusOf(
  token: PassageToken,
  sets: { readonly known: ReadonlySet<string>; readonly learning: ReadonlySet<string> },
): WordStatus {
  if (token.kind !== "word") return "new";
  // Known beats learning: meeting `walked` should count what the learner knows
  // about `walk`, and a word cannot be both.
  if (token.candidates.some((candidate) => sets.known.has(candidate))) return "known";
  if (token.candidates.some((candidate) => sets.learning.has(candidate))) return "learning";
  return "new";
}

export type PassageCoverage = {
  readonly words: number;
  readonly known: number;
  readonly learning: number;
  readonly unknown: number;
  /** Share of running words the learner already knows, 0..1. */
  readonly knownShare: number;
};

/**
 * What share of this passage the learner already knows.
 *
 * Reported, never used as a gate. Laufer and Ravenhorst-Kalovski's 95% figure
 * is the threshold for reading *with guidance* — which is what a tap-for-meaning
 * layer is — and their own result is that small vocabulary gains help
 * comprehension even when they barely move coverage. A product that refused a
 * passage below a percentage would be withholding a benefit its own metric
 * cannot see.
 */
export function coverageOf(
  tokens: readonly PassageToken[],
  sets: { readonly known: ReadonlySet<string>; readonly learning: ReadonlySet<string> },
): PassageCoverage {
  let known = 0;
  let learning = 0;
  let unknown = 0;
  for (const token of tokens) {
    if (token.kind !== "word") continue;
    const status = statusOf(token, sets);
    if (status === "known") known += 1;
    else if (status === "learning") learning += 1;
    else unknown += 1;
  }
  const words = known + learning + unknown;
  return {
    words,
    known,
    learning,
    unknown,
    knownShare: words === 0 ? 0 : known / words,
  };
}
