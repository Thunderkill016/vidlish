/**
 * Renders every minimal-pair word in several voices.
 *
 * The "high variability" in high variability phonetic training is talker
 * variability, and it is not decoration: hearing one speaker teaches the
 * learner that speaker rather than the sound. A meta-analysis of 79 studies
 * puts HVPT at g = 0.67 against a control group, the strongest evidence behind
 * anything in this product — and three talkers is the floor it supports.
 *
 * One voice is also rendered and held out of training entirely. It is what
 * answers the only question that matters about a perceptual gain: did the
 * learner form a category, or memorise three voices?
 *
 *   node scripts/build-pronunciation-audio.mjs           # render what is missing
 *   node scripts/build-pronunciation-audio.mjs --force   # re-render everything
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { isAudible, toPcmWav } from "./lib/render-audio.mjs";

const OUT_DIR = path.normalize("public/audio/pronunciation");
const MANIFEST = path.normalize("src/adapters/audio/pronunciation-audio.json");
const TEMP_BUNDLE = path.normalize("node_modules/.cache/pronunciation-content.mjs");
const TEMP_ENTRY = path.normalize("node_modules/.cache/pronunciation-entry.ts");
const MODEL = "onnx-community/Kokoro-82M-v1.0-ONNX";
const force = process.argv.includes("--force");

/**
 * Loads the contrast set through the bundler rather than by reading the file
 * with a regular expression. The word list is TypeScript, and a regex over
 * source is a parser that is wrong in ways nobody notices until a word is
 * silently missing from the training set.
 */
async function loadContrasts() {
  mkdirSync(path.dirname(TEMP_ENTRY), { recursive: true });
  writeFileSync(
    TEMP_ENTRY,
    'export { contrastWords, TRAINING_VOICES, HELD_OUT_VOICE } from "@/modules/pronunciation/content/minimal-pairs";\n',
  );
  execFileSync(
    "npx",
    [
      "esbuild",
      TEMP_ENTRY,
      "--bundle",
      "--format=esm",
      "--platform=node",
      `--outfile=${TEMP_BUNDLE}`,
      "--alias:@=./src",
      "--log-level=error",
    ],
    { stdio: "inherit" },
  );
  return import(pathToFileURL(path.resolve(TEMP_BUNDLE)).href);
}

const { contrastWords, TRAINING_VOICES, HELD_OUT_VOICE } = await loadContrasts();
const voices = [...TRAINING_VOICES, HELD_OUT_VOICE];
const words = contrastWords();

console.log(`${words.length} từ × ${voices.length} giọng = ${words.length * voices.length} bản thu`);
mkdirSync(OUT_DIR, { recursive: true });

const { KokoroTTS } = await import("kokoro-js");
const tts = await KokoroTTS.from_pretrained(MODEL, { dtype: "q8", device: "cpu" });

const manifest = {};
let rendered = 0;
let reused = 0;

for (const word of words) {
  for (const voice of voices) {
    // The name is derived from both word and voice, so re-rendering one voice
    // never overwrites another's file.
    const name = `${createHash("sha256").update(`${word}|${voice}`).digest("hex").slice(0, 16)}.wav`;
    const target = path.join(OUT_DIR, name);
    manifest[word] ??= {};
    manifest[word][voice] = `/audio/pronunciation/${name}`;

    if (!force && existsSync(target)) {
      reused += 1;
      continue;
    }

    const audio = await tts.generate(word, { voice });
    const check = isAudible(audio.audio);
    if (!check.ok) {
      throw new Error(
        `"${word}" in ${voice} rendered near-silent (peak ${check.peak.toFixed(3)}, rms ${check.rms.toFixed(4)})`,
      );
    }
    writeFileSync(target, toPcmWav(audio.audio, audio.sampling_rate));
    rendered += 1;
  }
  process.stdout.write(`  ✓ ${word}\n`);
}

// A file left behind by a word the contrast set no longer uses is dead weight
// the next reader has to work out the provenance of.
const keep = new Set(
  Object.values(manifest).flatMap((byVoice) =>
    Object.values(byVoice).map((url) => path.basename(url)),
  ),
);
let removed = 0;
for (const entry of readdirSync(OUT_DIR)) {
  if (keep.has(entry)) continue;
  rmSync(path.join(OUT_DIR, entry));
  removed += 1;
}

writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
rmSync(TEMP_BUNDLE, { force: true });
rmSync(TEMP_ENTRY, { force: true });
console.log(`dựng ${rendered}, dùng lại ${reused}, xoá ${removed}`);
