import manifest from "./pronunciation-audio.json";

/**
 * The recorded words the pronunciation trainer plays, one entry per voice.
 *
 * Rendered at build time by `scripts/build-pronunciation-audio.mjs`. Several
 * voices on purpose, which is the exact opposite of the rule for syllabus audio
 * and for the same underlying reason stated in reverse: a listening *score* is
 * only comparable between sessions if the voice never changes, and a sound
 * *category* is only robust if it survived voices that did.
 */
const RECORDED: Record<string, Record<string, string>> = manifest;

export function pronunciationAudioFor(word: string, voice: string): string | null {
  return RECORDED[word.toLowerCase()]?.[voice] ?? null;
}

export function pronunciationVoicesFor(word: string): readonly string[] {
  return Object.keys(RECORDED[word.toLowerCase()] ?? {});
}

export function recordedPronunciationWordCount(): number {
  return Object.keys(RECORDED).length;
}
