/**
 * Measures the rendered curriculum audio the way the product will measure a
 * learner, and reports what came back.
 *
 * The rhythm scorer is arithmetic, and arithmetic passes its own unit tests on
 * data the test wrote. This runs it on the 270 recordings that actually ship,
 * so the articulation rates it produces can be compared against what English
 * speech is known to run at. A measure that agrees with itself and disagrees
 * with reality is the thing this repo keeps catching late.
 *
 *   node scripts/checks/shadowing-reference-rates.mjs
 */
import { readFileSync } from "node:fs";
import { dictionary } from "cmu-pronouncing-dictionary";

const FRAME_RATE = 100;
const VOICED_FRACTION_OF_PEAK = 0.1;
/** Connected English speech is generally reported between these two rates. */
const PLAUSIBLE_RATE = { low: 2.5, high: 8.0 };

/** Minimal 16-bit PCM WAV reader — enough for what Kokoro renders. */
function decodeWav(path) {
  const buffer = readFileSync(path);
  let offset = 12; // past "RIFF" size "WAVE"
  let sampleRate = 0;
  let channels = 1;
  while (offset < buffer.length - 8) {
    const id = buffer.toString("ascii", offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    if (id === "fmt ") {
      channels = buffer.readUInt16LE(offset + 10);
      sampleRate = buffer.readUInt32LE(offset + 12);
    } else if (id === "data") {
      const count = Math.floor(size / 2);
      const samples = new Float32Array(Math.floor(count / channels));
      for (let index = 0; index < samples.length; index += 1) {
        samples[index] = buffer.readInt16LE(offset + 8 + index * 2 * channels) / 32768;
      }
      return { samples, sampleRate };
    }
    offset += 8 + size + (size % 2);
  }
  throw new Error(`no data chunk in ${path}`);
}

function envelopeOf(samples, sampleRate) {
  const perFrame = Math.max(1, Math.round(sampleRate / FRAME_RATE));
  const frames = [];
  for (let start = 0; start + perFrame <= samples.length; start += perFrame) {
    let sum = 0;
    for (let i = 0; i < perFrame; i += 1) sum += samples[start + i] ** 2;
    frames.push(Math.sqrt(sum / perFrame));
  }
  return frames;
}

function syllablesOf(text) {
  const words = text.toLowerCase().match(/[a-z']+/g) ?? [];
  let total = 0;
  for (const word of words) {
    const pronunciation = dictionary[word];
    if (!pronunciation) return null;
    total += (pronunciation.match(/[AEIOU][A-Z]*[012]/g) ?? []).length;
  }
  return total;
}

const catalogue = JSON.parse(
  readFileSync("src/adapters/audio/curriculum-audio.json", "utf8"),
);

const rates = [];
let skipped = 0;
for (const [text, url] of Object.entries(catalogue)) {
  const syllables = syllablesOf(text);
  if (!syllables) {
    skipped += 1;
    continue;
  }
  const { samples, sampleRate } = decodeWav(`public${url}`);
  const frames = envelopeOf(samples, sampleRate);
  const peak = Math.max(...frames);
  const floor = peak * VOICED_FRACTION_OF_PEAK;
  const voiced = frames.filter((frame) => frame >= floor).length / FRAME_RATE;
  if (voiced > 0) rates.push({ text, rate: syllables / voiced, syllables });
}

rates.sort((a, b) => a.rate - b.rate);
const at = (q) => rates[Math.floor(rates.length * q)]?.rate ?? Number.NaN;
const mean = rates.reduce((sum, entry) => sum + entry.rate, 0) / rates.length;
const outside = rates.filter(
  (entry) => entry.rate < PLAUSIBLE_RATE.low || entry.rate > PLAUSIBLE_RATE.high,
);

console.log(`Đo ${rates.length} bản thu thật (bỏ qua ${skipped} dòng CMUdict không có từ)`);
console.log(`  âm tiết/giây  trung bình ${mean.toFixed(2)}`);
console.log(`                thấp nhất ${at(0).toFixed(2)}  ·  P25 ${at(0.25).toFixed(2)}`);
console.log(`                trung vị  ${at(0.5).toFixed(2)}  ·  P75 ${at(0.75).toFixed(2)}`);
console.log(`                cao nhất  ${rates.at(-1)?.rate.toFixed(2)}`);
console.log(
  `  ngoài khoảng tiếng Anh thật (${PLAUSIBLE_RATE.low}–${PLAUSIBLE_RATE.high}): ${outside.length}`,
);
for (const entry of outside.slice(0, 5)) {
  console.log(`    ${entry.rate.toFixed(2)}  "${entry.text}" (${entry.syllables} âm tiết)`);
}
process.exitCode = outside.length > rates.length * 0.05 ? 1 : 0;
