/**
 * Checks that the rendered audio actually contains the distinction it trains.
 *
 * Everything else about this feature can be right — the pairs verified against
 * CMUdict, four genuinely different voices, an audibility guard on every file —
 * and the training still be worthless if the speech model pronounced "pin" and
 * "bin" the same way. Nothing in the pipeline would notice: both files exist,
 * both are audible, both are different files because they are different words.
 *
 * So compare where they differ. For a contrast at the start of the word, the
 * loudness curves should diverge early; for one at the end, late. If a pair's
 * difference sits in the wrong half, the model is distinguishing them by
 * something other than the sound being taught, and the trial would teach that
 * something instead.
 *
 *   node scripts/checks/pronunciation-contrast-audible.mjs
 */
import { readFileSync } from "node:fs";

const MANIFEST = "src/adapters/audio/pronunciation-audio.json";
const CONTENT = "src/modules/pronunciation/content/minimal-pairs.ts";
const POINTS = 64;
/** How much of the curve counts as "the half the contrast lives in". */
const HALF = POINTS / 2;

/**
 * Seconds during which the speaker was actually making sound.
 *
 * Not the file's duration. Kokoro pads its output to a fixed frame count —
 * "pin", "bin" and "mouse" all come back at exactly 64844 bytes — so file
 * length measures the padding, not the speech. The first version of this check
 * divided the data chunk by the sample rate, and the vowel-length differences
 * it reported were partly an artefact of that. The conclusion survived the
 * correction; the numbers moved.
 */
function voicedSeconds(path) {
  const samples = decodeWav(path);
  const perFrame = 240; // 10 ms at 24 kHz
  const frames = [];
  for (let start = 0; start + perFrame <= samples.length; start += perFrame) {
    let sum = 0;
    for (let i = 0; i < perFrame; i += 1) sum += samples[start + i] ** 2;
    frames.push(Math.sqrt(sum / perFrame));
  }
  const peak = Math.max(...frames);
  if (peak === 0) return 0;
  const floor = peak * 0.1;
  return frames.filter((frame) => frame >= floor).length / 100;
}

function decodeWav(path) {
  const buffer = readFileSync(path);
  let offset = 12;
  while (offset < buffer.length - 8) {
    const id = buffer.toString("ascii", offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    if (id === "data") {
      const count = Math.floor(size / 2);
      const samples = new Float32Array(count);
      for (let i = 0; i < count; i += 1) {
        samples[i] = buffer.readInt16LE(offset + 8 + i * 2) / 32768;
      }
      return samples;
    }
    offset += 8 + size + (size % 2);
  }
  throw new Error(`no data chunk in ${path}`);
}

/** Loudness over time, trimmed to speech and stretched to a fixed length. */
function shape(samples) {
  const frames = [];
  const per = 240; // 10 ms at 24 kHz
  for (let start = 0; start + per <= samples.length; start += per) {
    let sum = 0;
    for (let i = 0; i < per; i += 1) sum += samples[start + i] ** 2;
    frames.push(Math.sqrt(sum / per));
  }
  const peak = Math.max(...frames);
  const floor = peak * 0.1;
  const first = frames.findIndex((f) => f >= floor);
  let last = frames.length - 1;
  while (last > first && frames[last] < floor) last -= 1;
  const trimmed = frames.slice(first, last + 1);

  const out = [];
  for (let i = 0; i < POINTS; i += 1) {
    const at = (i / (POINTS - 1)) * (trimmed.length - 1);
    const lo = Math.floor(at);
    const hi = Math.min(lo + 1, trimmed.length - 1);
    const f = at - lo;
    out.push((trimmed[lo] * (1 - f) + trimmed[hi] * f) / peak);
  }
  return out;
}

// Read the pairs and their declared position straight out of the content file.
const source = readFileSync(CONTENT, "utf8");
const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
const blocks = source.split('    id: "').slice(1);

let checked = 0;
const wrongHalf = [];
for (const block of blocks) {
  const position = block.match(/position: "(initial|final)"/)?.[1];
  if (!position) continue;
  const pairs = [...block.matchAll(/\{ a: "([a-z]+)", b: "([a-z]+)" \}/g)];
  for (const [, a, b] of pairs) {
    for (const voice of Object.keys(manifest[a] ?? {})) {
      const shapeA = shape(decodeWav(`public${manifest[a][voice]}`));
      const shapeB = shape(decodeWav(`public${manifest[b][voice]}`));
      let early = 0;
      let late = 0;
      for (let i = 0; i < POINTS; i += 1) {
        const delta = Math.abs(shapeA[i] - shapeB[i]);
        if (i < HALF) early += delta;
        else late += delta;
      }
      checked += 1;
      const inRightHalf = position === "initial" ? early > late : late > early;
      if (!inRightHalf) wrongHalf.push(`${a}/${b} (${voice}, ${position})`);
    }
  }
}

const share = wrongHalf.length / checked;
console.log(`Nơi hai từ khác nhau — ${checked} cặp-giọng`);
console.log(`  nằm đúng nửa của tương phản: ${(100 * (1 - share)).toFixed(1)}%`);
console.log(
  "  (chỉ báo thô: bước này kéo giãn mọi bản thu về cùng độ dài, nên nó cố tình\n" +
    "   xoá mất tín hiệu độ dài — thứ được đo riêng ở dưới.)",
);

// The second and much stronger check: vowel length before a voiced coda.
//
// English lengthens the vowel before a voiced final consonant, by something on
// the order of 50-100 ms. If the speech model encodes that, the training audio
// carries the real cue; if it does not, the learner is being asked to hear a
// distinction that was never rendered.
//
// What makes this evidence rather than a hopeful number is the control group.
// The S/TH contrast is voiceless against voiceless, so phonetics predicts *no*
// length difference there. A measure that finds the effect everywhere is
// measuring its own wishful thinking; one that finds it only where it should be
// is measuring the thing.
console.log("\nĐộ dài nguyên âm trước âm cuối kêu (chỉ tính lúc có tiếng)");
for (const block of blocks) {
  const id = block.split('"')[0];
  if (!/position: "final"/.test(block)) continue;
  const pairs = [...block.matchAll(/\{ a: "([a-z]+)", b: "([a-z]+)" \}/g)];
  let longer = 0;
  let total = 0;
  const deltas = [];
  for (const [, a, b] of pairs) {
    for (const voice of Object.keys(manifest[a] ?? {})) {
      const da = voicedSeconds(`public${manifest[a][voice]}`);
      const db = voicedSeconds(`public${manifest[b][voice]}`);
      total += 1;
      if (db > da) longer += 1;
      deltas.push(db - da);
    }
  }
  const mean = deltas.reduce((sum, x) => sum + x, 0) / deltas.length;
  const expected = id !== "final_s_th";
  const label = expected ? "" : "  ← nhóm đối chứng: KHÔNG nên có chênh lệch";
  console.log(
    `  ${id.padEnd(20)} ${String(longer).padStart(2)}/${total}  ` +
      `${String(Math.round((100 * longer) / total)).padStart(3)}%  ` +
      `${String(Math.round(mean * 1000)).padStart(5)} ms${label}`,
  );
}
