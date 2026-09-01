/**
 * Builds the vocabulary catalogue from the CEFR-J Vocabulary Profile.
 *
 * The artifact used to be produced by hand, and one of its filters cost the
 * product its most important word. "Drop headwords that are not a single
 * lowercase word" was written to remove multi-word entries and spelling
 * variants; what it actually removed was every capitalised headword, and CEFR-J
 * capitalises the pronoun **I**.
 *
 * That is 2,038,529 occurrences in a 49.7-million-token corpus of spoken
 * English — 4.1% of everything anyone says — and because the comprehensibility
 * gate can only count a word the learner has evidence for, no sentence
 * containing `I` could ever be fully known. It also took the days of the week,
 * the months, `OK`, `TV`, `CD`, `Internet`, `ID` and `PC`: 92 A1/A2 entries in
 * total.
 *
 * So the rule is now written as what it meant: keep an entry when its first
 * spelling is a single alphabetic word, whatever case it is printed in, and
 * store it lowercased because that is how every consumer matches.
 *
 * Source: CEFR-J Vocabulary Profile 1.5, openlanguageprofiles/olp-en-cefrj.
 * Copyright Tono Laboratory, Tokyo University of Foreign Studies. Free for
 * research and commercial use with citation.
 *
 * Run: node scripts/build-cefrj-catalogue.mjs [--through B1]
 */
import { writeFileSync } from "node:fs";

const SOURCE =
  "https://raw.githubusercontent.com/openlanguageprofiles/olp-en-cefrj/master/cefrj-vocabulary-profile-1.5.csv";
const OUT = "src/adapters/vocabulary/cefrj-a1-a2.json";

const LEVELS = ["A1", "A2", "B1", "B2"];
const throughArg = process.argv.indexOf("--through");
const through = throughArg > -1 ? process.argv[throughArg + 1] : "A2";
if (!LEVELS.includes(through)) {
  throw new Error(`--through must be one of ${LEVELS.join(", ")}`);
}
const kept = LEVELS.slice(0, LEVELS.indexOf(through) + 1);

const response = await fetch(SOURCE);
if (!response.ok) throw new Error(`CEFR-J fetch failed: ${response.status}`);
const csv = await response.text();

const byWord = new Map();
let multiWord = 0;
let outOfRange = 0;

for (const line of csv.split(/\r?\n/).slice(1)) {
  if (!line.trim()) continue;
  const [headField, pos, level] = line.split(",");
  const cefr = String(level ?? "").trim();
  if (!kept.includes(cefr)) {
    outOfRange += 1;
    continue;
  }

  // `a.m./A.M./am/AM` — the first spelling is the one to teach.
  const first = String(headField ?? "").split("/")[0].trim();
  if (!/^[A-Za-z]+$/.test(first)) {
    // Multi-word entries and anything carrying punctuation. A learner meets
    // `alarm clock` as a phrase, not as a catalogue word.
    multiWord += 1;
    continue;
  }

  const word = first.toLowerCase();
  const existing = byWord.get(word);
  // A word listed at two levels belongs at the earlier one: it should be
  // taught when it is first needed, not twice.
  if (existing && LEVELS.indexOf(existing.cefr) <= LEVELS.indexOf(cefr)) continue;
  byWord.set(word, { word, pos: String(pos ?? "").trim(), cefr });
}

const catalogue = [...byWord.values()].sort((left, right) => {
  const byLevel = LEVELS.indexOf(left.cefr) - LEVELS.indexOf(right.cefr);
  return byLevel !== 0 ? byLevel : left.word < right.word ? -1 : 1;
});

writeFileSync(OUT, `${JSON.stringify(catalogue, null, 2)}\n`);

const perLevel = new Map();
for (const entry of catalogue) {
  perLevel.set(entry.cefr, (perLevel.get(entry.cefr) ?? 0) + 1);
}
console.log(`${catalogue.length} từ, tới cấp ${through}`);
for (const level of kept) console.log(`  ${level}: ${perLevel.get(level) ?? 0}`);
console.log(`bỏ: ${multiWord} mục nhiều từ hoặc có dấu, ${outOfRange} dòng ngoài dải cấp độ`);
if (!byWord.has("i")) throw new Error("the pronoun I is missing — the filter is wrong again");
