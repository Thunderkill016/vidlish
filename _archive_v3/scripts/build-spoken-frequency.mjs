/**
 * Adds spoken frequency to the vocabulary catalogue.
 *
 * The catalogue's own README recorded the weakness this fixes: CEFR-J carries a
 * level and a part of speech but no frequency, so the order within a level fell
 * back to part of speech and then to the alphabet. That produced a first fifty
 * of `a, all, an, another, any, anybody, anyone, anything` — which is not
 * English, it is a dictionary.
 *
 * The frequency comes from SUBTLEX-US: 51 million words of film and television
 * subtitles. For a product whose first skill is listening, and whose learner
 * watches streamers and podcasts, a subtitle corpus is the right instrument
 * rather than merely an available one — written-corpus frequency over-weights
 * words nobody says out loud.
 *
 * Licensing: the JSON packaging is ISC, the underlying SUBTLEX-US data is
 * CC BY-SA, and ShareAlike reaches this derived file. Attribution: Brysbaert &
 * New, Ghent University.
 *
 * Run: node scripts/build-spoken-frequency.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";

const SOURCE =
  "https://raw.githubusercontent.com/words/subtlex-word-frequencies/master/index.json";
const CATALOGUE = "src/adapters/vocabulary/cefrj-a1-a2.json";
const OUT = "src/adapters/vocabulary/spoken-frequency.json";

const response = await fetch(SOURCE);
if (!response.ok) throw new Error(`SUBTLEX fetch failed: ${response.status}`);
const rows = await response.json();

// The corpus keeps case, so `I` and `i` arrive as separate rows. A learner
// meets one word, so the counts are added rather than one of them chosen.
const counts = new Map();
for (const row of rows) {
  const word = String(row.word).toLowerCase();
  counts.set(word, (counts.get(word) ?? 0) + Number(row.count));
}

const catalogue = JSON.parse(readFileSync(CATALOGUE, "utf8"));
const frequency = {};
let missing = 0;
for (const entry of catalogue) {
  const count = counts.get(entry.word);
  if (count === undefined) {
    missing += 1;
    continue;
  }
  frequency[entry.word] = count;
}

writeFileSync(OUT, `${JSON.stringify(frequency, null, 0)}\n`);
console.log(
  `${Object.keys(frequency).length} of ${catalogue.length} catalogue words carry a spoken frequency, ${missing} do not`,
);
