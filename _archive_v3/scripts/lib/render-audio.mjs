/**
 * Turning Kokoro's float samples into a file, and refusing the silent ones.
 *
 * Shared by the two renderers rather than copied into both. They render for
 * opposite reasons — the syllabus uses one voice so a listening score stays
 * comparable between sessions, the pronunciation trainer uses several so a
 * sound category survives more than one speaker — but a WAV header is a WAV
 * header, and a near-silent file is a bug in either.
 */

/** 16-bit mono PCM, which is what the browser decodes without surprises. */
export function toPcmWav(samples, rate) {
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
 * Whether anything is actually audible in the samples.
 *
 * A text-to-speech model that fails returns silence rather than an error, and
 * silence written to a file looks exactly like success: the manifest gains an
 * entry, the build goes green, and the learner is told to listen to nothing.
 * Both thresholds are floors for "a voice happened", not quality judgements.
 */
export function isAudible(samples) {
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
