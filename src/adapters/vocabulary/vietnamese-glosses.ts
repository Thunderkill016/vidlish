import { AUTHORED_GLOSSES } from "./authored-glosses";
import glosses from "./vietnamese-glosses.json";

/**
 * What a word means, in Vietnamese, written by people.
 *
 * The first words a learner meets are the ones they have no way to check. A
 * wrong gloss there is not a small error: it becomes a belief that every later
 * sentence quietly reinforces, and the learner has no evidence with which to
 * catch it. So these come from Wiktionary — written and revised by people, with
 * an edit history — rather than from a model.
 *
 * Coverage is 1,838 of the 2,214 catalogue words, and the gaps are not random.
 * They fall hardest on the function words taught first, because Vietnamese has
 * no article and no case-marked pronoun, so `the`, `you` and `him` have no
 * entry to take. Those need an explanation rather than a translation, and
 * pretending otherwise would hand a learner a word that does not do the job.
 */

const GLOSSES = glosses as Record<string, readonly string[]>;

export function vietnameseGlossFor(word: string): readonly string[] | null {
  const key = word.toLocaleLowerCase("en-US");
  // Authored first. Where a person has written the meaning of a word the
  // learner meets in their first week, that beats whatever the scrape found —
  // the scrape returned the alphabet letter for `i` and the unit of area for
  // `are`, and a beginner has no way to notice either.
  return AUTHORED_GLOSSES[key] ?? GLOSSES[key] ?? null;
}

export function glossedWordCount(): number {
  return new Set([...Object.keys(GLOSSES), ...Object.keys(AUTHORED_GLOSSES)]).size;
}
