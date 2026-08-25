import inventory from "@/adapters/vocabulary/cefrj-grammar-a1-a2.json";
import type { FoundationUnit } from "@/shared/contracts/curriculum";

export type GrammarItem = {
  readonly code: string;
  readonly item: string;
  readonly sentenceType: string;
  readonly band: string;
  readonly level: string;
};

export const GRAMMAR_INVENTORY = inventory as readonly GrammarItem[];

export type GrammarCoverage = {
  readonly level: string;
  readonly total: number;
  readonly covered: number;
  readonly missing: readonly GrammarItem[];
};

/**
 * How much of a published level the syllabus actually teaches.
 *
 * "Comprehensive" was a claim with nothing behind it. This turns it into a
 * fraction: the CEFR-J Grammar Profile says what A1 consists of, the units say
 * what they teach, and the difference is the backlog — in the order it should
 * be written, because the profile is sub-levelled by teaching order.
 */
export function grammarCoverageFor(
  units: readonly FoundationUnit[],
  level: string,
): GrammarCoverage {
  const taught = new Set(units.flatMap((unit) => unit.grammarCodes));
  const inLevel = GRAMMAR_INVENTORY.filter((entry) => entry.level === level);
  const missing = inLevel.filter((entry) => !taught.has(entry.code));
  return {
    level,
    total: inLevel.length,
    covered: inLevel.length - missing.length,
    missing,
  };
}

/** Codes a unit claims that the published inventory does not contain. */
export function unknownGrammarCodes(units: readonly FoundationUnit[]): string[] {
  const known = new Set(GRAMMAR_INVENTORY.map((entry) => entry.code));
  return [...new Set(units.flatMap((unit) => unit.grammarCodes))]
    .filter((code) => !known.has(code))
    .sort();
}
