/**
 * Builds the nonword artifact used to check that a learner's self-report means
 * anything.
 *
 * Method, and why this one: pseudowords are built by recombining onsets and
 * rimes that are attested in real short English words, then discarding any
 * string that is itself a real word. Recombining attested parts is what makes
 * them plausible — a learner must not be able to reject them by their shape
 * alone, or the check measures spelling intuition rather than overclaiming.
 *
 * The exclusion list is the whole vocabulary of the Tatoeba English corpus,
 * roughly two million sentences. Excluding only the A1/A2 catalogue would leave
 * real but uncommon words in the set, and a learner who says they know a real
 * word is not overclaiming — they would be marked unreliable for being right.
 *
 * Run: node scripts/build-nonword-set.mjs <dir-with-tatoeba-exports>
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const SOURCE = process.argv[2];
if (!SOURCE) {
  console.error("usage: node scripts/build-nonword-set.mjs <export-dir>");
  process.exit(1);
}

const OUT = "src/adapters/vocabulary/nonwords.json";
const WANTED = 120;

/** Rimes are lifted from words at least this common, so junk cannot leak in. */
const MIN_RIME_OCCURRENCES = 200;
const MIN_SOURCE_LENGTH = 3;
const MAX_SOURCE_LENGTH = 6;

/**
 * The onset inventory of English, written out rather than mined.
 *
 * A first attempt mined onsets from the corpus and produced `hrbispr` and
 * `ckenea`: the corpus contains typos, names and foreign words, and every one
 * of them became a licensed onset. A learner rejects those by shape alone, so
 * the check would have measured spelling intuition instead of overclaiming —
 * the exact failure this file's method exists to avoid.
 */
const ONSETS = [
  "b", "c", "d", "f", "g", "h", "j", "k", "l", "m", "n", "p", "r", "s", "t",
  "v", "w", "y", "z",
  "bl", "br", "ch", "cl", "cr", "dr", "fl", "fr", "gl", "gr", "pl", "pr", "sc",
  "sh", "sk", "sl", "sm", "sn", "sp", "st", "sw", "th", "tr", "tw", "wh",
  "scr", "shr", "spl", "spr", "str", "thr",
];

const real = new Set();
const occurrences = new Map();
for (const line of readFileSync(path.join(SOURCE, "eng_sentences.tsv"), "utf8").split("\n")) {
  const text = line.split("\t")[2];
  if (!text) continue;
  for (const raw of text.toLowerCase().split(/[^a-z']+/)) {
    const word = raw.replace(/^'+|'+$/g, "");
    if (!word) continue;
    real.add(word);
    occurrences.set(word, (occurrences.get(word) ?? 0) + 1);
  }
}
for (const entry of JSON.parse(readFileSync("src/adapters/vocabulary/cefrj-a1-a2.json", "utf8"))) {
  real.add(entry.word);
}

const VOWELS = /[aeiouy]/;
const rimes = new Set();
for (const [word, count] of occurrences) {
  if (count < MIN_RIME_OCCURRENCES) continue;
  if (word.length < MIN_SOURCE_LENGTH || word.length > MAX_SOURCE_LENGTH) continue;
  if (!/^[a-z]+$/.test(word)) continue;
  const at = word.search(VOWELS);
  if (at <= 0 || at > 3) continue;
  const rime = word.slice(at);
  if (rime.length < 2 || rime.length > 4) continue;
  rimes.add(rime);
}

// Deterministic, so the artifact can be rebuilt and diffed rather than trusted.
const orderedOnsets = [...ONSETS].sort();
const orderedRimes = [...rimes].sort();

function hash(value) {
  let h = 2166136261;
  for (const character of value) {
    h ^= character.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const nonwords = [];
const seen = new Set();
for (let step = 0; nonwords.length < WANTED && step < 200_000; step += 1) {
  const onset = orderedOnsets[hash(`o${step}`) % orderedOnsets.length];
  const rime = orderedRimes[hash(`r${step}`) % orderedRimes.length];
  const candidate = `${onset}${rime}`;
  if (candidate.length < 4 || candidate.length > 7) continue;
  if (real.has(candidate) || seen.has(candidate)) continue;
  // A pseudoword one letter away from a real word tests eyesight, not knowledge.
  if ([...real].length && withinOneEdit(candidate, real)) continue;
  seen.add(candidate);
  nonwords.push(candidate);
}

function withinOneEdit(candidate, dictionary) {
  for (let i = 0; i < candidate.length; i += 1) {
    if (dictionary.has(candidate.slice(0, i) + candidate.slice(i + 1))) return true;
    for (let code = 97; code <= 122; code += 1) {
      const letter = String.fromCharCode(code);
      if (letter === candidate[i]) continue;
      if (dictionary.has(candidate.slice(0, i) + letter + candidate.slice(i + 1))) {
        return true;
      }
    }
  }
  return false;
}

nonwords.sort();
writeFileSync(OUT, `${JSON.stringify(nonwords, null, 0)}\n`);
console.log(`${nonwords.length} nonwords from ${orderedOnsets.length} onsets and ${orderedRimes.length} rimes, checked against ${real.size} real words`);
