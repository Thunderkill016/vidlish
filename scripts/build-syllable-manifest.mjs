/**
 * Counts the syllables in every line the syllabus speaks, once, at build time.
 *
 * The rhythm scorer needs a syllable count to turn a duration into an
 * articulation rate, and to refuse lines too short to carry rhythm at all. The
 * browser cannot count them: CMUdict is a 130k-entry pronunciation dictionary,
 * far too large to ship, and the alternative — guessing from spelling — is
 * exactly the kind of estimate this product refuses to build a measurement on.
 *
 * So the count is measured here against real pronunciations and shipped as
 * data. Kept separate from the audio build because that one loads Kokoro and
 * takes minutes; this takes a second, and the two should not have to run
 * together.
 *
 *   node scripts/build-syllable-manifest.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dictionary } from "cmu-pronouncing-dictionary";

const AUDIO_MANIFEST = "src/adapters/audio/curriculum-audio.json";
const OUT = "src/adapters/audio/curriculum-syllables.json";

/**
 * A syllable is a stressed vowel phoneme. CMUdict marks every vowel with a
 * stress digit — AA1, IH0, EY2 — so counting them counts syllables directly
 * rather than inferring them from letters.
 */
function syllablesOf(text) {
  const words = text.toLowerCase().match(/[a-z']+/g) ?? [];
  if (words.length === 0) return null;
  let total = 0;
  for (const word of words) {
    const pronunciation = dictionary[word];
    if (!pronunciation) return null;
    total += (pronunciation.match(/[AEIOU][A-Z]*[012]/g) ?? []).length;
  }
  return total > 0 ? total : null;
}

const lines = Object.keys(JSON.parse(readFileSync(AUDIO_MANIFEST, "utf8")));
const manifest = {};
const unknown = [];
for (const line of lines) {
  const syllables = syllablesOf(line);
  if (syllables === null) {
    unknown.push(line);
    continue;
  }
  manifest[line] = syllables;
}

writeFileSync(OUT, `${JSON.stringify(manifest, null, 2)}\n`);

const counted = Object.keys(manifest).length;
const shadowable = Object.values(manifest).filter((n) => n >= 4).length;
console.log(
  `đếm ${counted}/${lines.length} dòng · ${shadowable} dòng đủ dài để shadowing (>= 4 âm tiết)`,
);
if (unknown.length > 0) {
  console.log(`CMUdict không có: ${unknown.slice(0, 5).join(", ")}`);
}
// A line the dictionary cannot pronounce is a line whose audio nobody verified
// either. Refuse rather than shipping a manifest with holes in it.
process.exitCode = unknown.length > 0 ? 1 : 0;
