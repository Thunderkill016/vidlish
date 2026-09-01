import nonwords from "./nonwords.json";

/**
 * Words that do not exist, used to check that a learner's self-report means
 * anything.
 *
 * The set lives server-side and the server decides which items in a check were
 * nonwords. If the browser said so, a learner could report every item as real
 * and every check would come back clean — which is the one thing this mechanism
 * exists to prevent.
 */

const NONWORDS = nonwords as readonly string[];
const LOOKUP = new Set(NONWORDS);

export function isNonword(item: string): boolean {
  return LOOKUP.has(item.toLocaleLowerCase("en-US"));
}

export function sampleNonwords(count: number, seed: number): string[] {
  // Deterministic from the seed so a check can be rebuilt and explained, and so
  // two requests in the same session cannot quietly serve different items.
  const picked: string[] = [];
  const used = new Set<number>();
  let cursor = Math.abs(seed) % NONWORDS.length;
  while (picked.length < Math.min(count, NONWORDS.length)) {
    if (!used.has(cursor)) {
      used.add(cursor);
      picked.push(NONWORDS[cursor]);
    }
    cursor = (cursor + 31) % NONWORDS.length;
  }
  return picked;
}

export function nonwordCatalogueSize(): number {
  return NONWORDS.length;
}
