/**
 * Builds the beginner sentence artifact from Tatoeba's public exports.
 *
 * Why an artifact and not a live query: the sentences a learner meets in their
 * first thousand words must be reviewable by a person before they ship. A live
 * corpus call would mean nobody ever reads what gets served, and "a human wrote
 * it" stops being a guarantee the moment nobody checks which human or what.
 *
 * Run:
 *   node scripts/build-tatoeba-subset.mjs <dir-with-tatoeba-exports>
 *
 * Expects `eng_sentences.tsv`, `eng-vie_links.tsv`, `vie_sentences.tsv` and
 * `sentences_with_audio.csv` from https://downloads.tatoeba.org/exports/.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const SOURCE = process.argv[2];
if (!SOURCE) {
  console.error("usage: node scripts/build-tatoeba-subset.mjs <export-dir>");
  process.exit(1);
}

const CATALOGUE = "src/adapters/vocabulary/cefrj-a1-a2.json";
const OUT = "src/adapters/vocabulary/tatoeba-beginner-sentences.json";

/** Long sentences are not harder by one word, they are harder by memory load. */
const MIN_WORDS = 2;
const MAX_WORDS = 8;

/**
 * Sentences kept per target word. Enough that a learner meeting the same word
 * across a session and its later reviews never sees the same sentence twice,
 * and few enough that the whole artifact stays reviewable by a person.
 */
const PER_TARGET = 12;

/** Only these permit reuse outside Tatoeba without a non-commercial clause. */
const REUSABLE_AUDIO_LICENCES = new Set(["CC BY 4.0", "CC BY-SA 4.0"]);

const POS_PRIORITY = {
  determiner: 0,
  pronoun: 0,
  preposition: 1,
  conjunction: 1,
  auxiliary: 1,
  verb: 2,
  adverb: 3,
  adjective: 4,
  noun: 5,
};
const LEVEL_ORDER = { A1: 0, A2: 1, B1: 2, B2: 3 };

function tokenise(sentence) {
  return sentence
    .toLowerCase()
    .split(/[^a-z'’]+/)
    .map((token) => token.replace(/^'+|'+$/g, ""))
    .filter((token) => token.length > 0);
}

const catalogue = JSON.parse(readFileSync(CATALOGUE, "utf8"));
catalogue.sort(
  (a, b) =>
    (LEVEL_ORDER[a.cefr] ?? 9) - (LEVEL_ORDER[b.cefr] ?? 9) ||
    (POS_PRIORITY[a.pos] ?? 6) - (POS_PRIORITY[b.pos] ?? 6) ||
    a.word.localeCompare(b.word),
);
// Teaching position, not frequency: a sentence becomes usable at the moment the
// last of its words is taught, so that word is the one it can teach.
const position = new Map(catalogue.map((entry, index) => [entry.word, index]));

const vietnamese = new Map();
{
  const sentences = new Map();
  for (const line of readFileSync(path.join(SOURCE, "vie_sentences.tsv"), "utf8").split("\n")) {
    const [id, , text] = line.split("\t");
    if (text) sentences.set(Number(id), text);
  }
  for (const line of readFileSync(path.join(SOURCE, "eng-vie_links.tsv"), "utf8").split("\n")) {
    const [eng, vie] = line.split("\t");
    const text = sentences.get(Number(vie));
    if (text && !vietnamese.has(Number(eng))) vietnamese.set(Number(eng), text);
  }
}

// The licence field is a filter, not a footnote: an empty one means the audio
// may not be used outside Tatoeba at all.
const audio = new Map();
for (const line of readFileSync(path.join(SOURCE, "sentences_with_audio.csv"), "utf8").split("\n")) {
  const parts = line.split("\t");
  if (parts.length < 4) continue;
  const licence = parts[3].trim();
  if (!REUSABLE_AUDIO_LICENCES.has(licence)) continue;
  const id = Number(parts[1]);
  if (!audio.has(id)) audio.set(id, { licence, attribution: (parts[4] ?? "").trim() });
}

const byTarget = new Map();
for (const line of readFileSync(path.join(SOURCE, "eng_sentences.tsv"), "utf8").split("\n")) {
  const [rawId, , text] = line.split("\t");
  if (!text) continue;
  const words = tokenise(text);
  if (words.length < MIN_WORDS || words.length > MAX_WORDS) continue;

  let target = null;
  let latest = -1;
  let outsideCatalogue = false;
  for (const word of words) {
    const at = position.get(word);
    if (at === undefined) {
      outsideCatalogue = true;
      break;
    }
    if (at > latest) {
      latest = at;
      target = word;
    }
  }
  if (outsideCatalogue || target === null) continue;

  const id = Number(rawId);
  const entry = { id, text, words: words.length, target };
  const vi = vietnamese.get(id);
  if (vi) entry.vi = vi;
  const recording = audio.get(id);
  if (recording) entry.audio = recording;

  const bucket = byTarget.get(target);
  if (bucket) bucket.push(entry);
  else byTarget.set(target, [entry]);
}

const sentences = [];
for (const entry of catalogue) {
  const bucket = byTarget.get(entry.word);
  if (!bucket) continue;
  bucket.sort(
    (a, b) =>
      a.words - b.words ||
      (b.vi ? 1 : 0) - (a.vi ? 1 : 0) ||
      (b.audio ? 1 : 0) - (a.audio ? 1 : 0) ||
      a.id - b.id,
  );
  for (const kept of bucket.slice(0, PER_TARGET)) sentences.push(kept);
}

writeFileSync(OUT, `${JSON.stringify(sentences, null, 0)}\n`);
console.log(
  `${sentences.length} sentences covering ${new Set(sentences.map((s) => s.target)).size} of ${catalogue.length} catalogue words`,
);
