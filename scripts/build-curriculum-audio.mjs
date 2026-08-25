/**
 * Pre-renders every English line the beginner track speaks, using Kokoro.
 *
 * Why this exists: the learner's first skill is listening, and what they
 * actually heard was `window.speechSynthesis` — whichever robot voice their
 * browser happened to ship, at whatever quality, with no guarantee it is the
 * same voice twice or that the browser has an English voice at all. Listening
 * is the one thing this product measures from day one, and it was measuring it
 * against a stimulus nobody chose.
 *
 * Kokoro is 82M parameters, Apache-2.0, and runs on a plain CPU. It is not
 * shipped to the browser: the syllabus speaks a small fixed set of lines, so
 * rendering them once at build time costs the learner nothing to download a
 * model for and gives every learner the identical stimulus — which is also what
 * makes a listening score comparable between sessions.
 *
 *   node scripts/build-curriculum-audio.mjs            # render missing lines
 *   node scripts/build-curriculum-audio.mjs --force    # re-render everything
 *
 * Output: 16-bit PCM WAV at Kokoro's native 24 kHz. Float32 is what the model
 * returns and it doubles the file for no audible gain; resampling below 24 kHz
 * would degrade the exact thing this script exists to improve.
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const OUT_DIR = path.normalize("public/audio/curriculum");
const MANIFEST = path.normalize("src/adapters/audio/curriculum-audio.json");
const TEMP_BUNDLE = path.normalize("node_modules/.cache/curriculum-content.mjs");
const TEMP_ENTRY = path.normalize("node_modules/.cache/curriculum-entry.ts");

/** One voice for the whole syllabus. Two voices would confound a listening
 *  score with speaker adaptation — the learner would get better at this voice,
 *  not at English. */
const VOICE = "af_heart";
const MODEL = "onnx-community/Kokoro-82M-v1.0-ONNX";

const force = process.argv.includes("--force");

/**
 * The syllabus is TypeScript with a path alias, so it is bundled rather than
 * read with a regex. Reading source with a regex is how this repository's SQL
 * contract test ended up asserting on text instead of behaviour.
 */
function loadSyllabus() {
  mkdirSync(path.dirname(TEMP_BUNDLE), { recursive: true });
  // The measurement bank is rendered by the same pipeline as the syllabus, and
  // for a stronger reason: a proficiency score is only comparable between
  // sittings if the sentences sounded the same both times. A browser voice that
  // changes with the device would move the score without the learner changing.
  writeFileSync(
    TEMP_ENTRY,
    [
      'export { FOUNDATION_UNITS } from "@/modules/curriculum/content";',
      'export { ELICITED_IMITATION_ITEMS } from "@/modules/measurement/content/elicited-imitation-items";',
    ].join("\n"),
  );
  execFileSync(
    path.normalize("node_modules/.bin/esbuild"),
    [
      TEMP_ENTRY,
      "--bundle",
      "--format=esm",
      "--platform=node",
      `--alias:@=${path.resolve("src")}`,
      `--outfile=${TEMP_BUNDLE}`,
      "--log-level=warning",
    ],
    { stdio: "inherit" },
  );
  return import(pathToFileURL(path.resolve(TEMP_BUNDLE)).href);
}

/** Every distinct English line the learner will hear, in a stable order. */
function spokenLines(units, measurementItems) {
  const seen = new Map();
  for (const unit of units) {
    for (const scene of unit.inputScenes) add(seen, scene.text);
    for (const chunk of unit.targetChunks) add(seen, chunk.text);
  }
  for (const item of measurementItems) add(seen, item.text);
  return [...seen.values()].sort((left, right) => (left.key < right.key ? -1 : 1));
}

function add(seen, text) {
  const key = normalise(text);
  if (!key || seen.has(key)) return;
  seen.set(key, { key, text: text.trim() });
}

/** The key the runtime will look a line up by. Must match the adapter. */
function normalise(text) {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

function fileNameFor(key) {
  return `${createHash("sha256").update(key).digest("hex").slice(0, 16)}.wav`;
}

/** Float32 in [-1, 1] to 16-bit PCM WAV. */
function toPcmWav(samples, rate) {
  const bytes = Buffer.alloc(44 + samples.length * 2);
  bytes.write("RIFF", 0);
  bytes.writeUInt32LE(36 + samples.length * 2, 4);
  bytes.write("WAVE", 8);
  bytes.write("fmt ", 12);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20); // PCM
  bytes.writeUInt16LE(1, 22); // mono
  bytes.writeUInt32LE(rate, 24);
  bytes.writeUInt32LE(rate * 2, 28);
  bytes.writeUInt16LE(2, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write("data", 36);
  bytes.writeUInt32LE(samples.length * 2, 40);
  for (let index = 0; index < samples.length; index += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[index]));
    bytes.writeInt16LE(Math.round(clamped * 32767), 44 + index * 2);
  }
  return bytes;
}

/**
 * A line that renders to near-silence is worse than no line: the learner is
 * told to listen, hears nothing, and concludes their ears are the problem.
 */
function isAudible(samples) {
  let peak = 0;
  let energy = 0;
  for (const sample of samples) {
    const magnitude = Math.abs(sample);
    if (magnitude > peak) peak = magnitude;
    energy += sample * sample;
  }
  const rms = Math.sqrt(energy / Math.max(1, samples.length));
  return { ok: peak > 0.05 && rms > 0.005, peak, rms };
}

const { FOUNDATION_UNITS, ELICITED_IMITATION_ITEMS } = await loadSyllabus();
const lines = spokenLines(FOUNDATION_UNITS, ELICITED_IMITATION_ITEMS);
console.log(
  `${lines.length} dòng tiếng Anh (${ELICITED_IMITATION_ITEMS.length} câu đo trình độ)`,
);

mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(path.dirname(MANIFEST), { recursive: true });

const { KokoroTTS } = await import("kokoro-js");
const tts = await KokoroTTS.from_pretrained(MODEL, { dtype: "q8", device: "cpu" });

const manifest = {};
let rendered = 0;
let reused = 0;
let totalBytes = 0;

for (const line of lines) {
  const file = fileNameFor(line.key);
  const target = path.join(OUT_DIR, file);
  manifest[line.key] = `/audio/curriculum/${file}`;

  if (!force && existsSync(target)) {
    reused += 1;
    continue;
  }

  const audio = await tts.generate(line.text, { voice: VOICE });
  const check = isAudible(audio.audio);
  if (!check.ok) {
    throw new Error(
      `"${line.text}" rendered near-silent (peak ${check.peak.toFixed(3)}, rms ${check.rms.toFixed(4)})`,
    );
  }
  const wav = toPcmWav(audio.audio, audio.sampling_rate);
  writeFileSync(target, wav);
  totalBytes += wav.length;
  rendered += 1;
  process.stdout.write(`  ✓ ${line.text}\n`);
}

// A file left behind by a line the syllabus no longer says is dead weight the
// next reader has to work out the provenance of.
const keep = new Set(Object.values(manifest).map((url) => path.basename(url)));
let removed = 0;
for (const entry of readdirSync(OUT_DIR)) {
  if (keep.has(entry)) continue;
  rmSync(path.join(OUT_DIR, entry));
  removed += 1;
}

writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
rmSync(TEMP_BUNDLE, { force: true });
rmSync(TEMP_ENTRY, { force: true });

console.log(
  `dựng ${rendered}, dùng lại ${reused}, xoá ${removed}` +
    (rendered ? `, ${(totalBytes / 1024 / 1024).toFixed(2)} MB mới` : ""),
);
