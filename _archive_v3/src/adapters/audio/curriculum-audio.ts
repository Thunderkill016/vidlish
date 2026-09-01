import manifest from "./curriculum-audio.json";
import syllableManifest from "./curriculum-syllables.json";

/**
 * The recorded English for a line the syllabus speaks.
 *
 * What the learner used to hear was `window.speechSynthesis` — whichever voice
 * their browser shipped, at whatever quality, with no guarantee it is the same
 * voice twice or that an English voice exists at all. Listening is the first
 * thing this product teaches and the first thing it measures, and it was
 * measuring it against a stimulus nobody had chosen.
 *
 * These files are rendered once at build time by `scripts/build-curriculum-audio.mjs`
 * with a single voice, so every learner hears the identical stimulus. That is
 * not only a quality decision: a listening score is only comparable between
 * sessions if what was played did not change underneath it.
 *
 * Returns null for anything the syllabus does not speak — generated sentences,
 * for instance — and the caller falls back to the browser voice rather than
 * playing silence.
 */
const RECORDED: Record<string, string> = manifest;

export function curriculumAudioFor(text: string): string | null {
  return RECORDED[normaliseSpokenLine(text)] ?? null;
}

/** Must match the key the build script writes. */
export function normaliseSpokenLine(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

export function recordedLineCount(): number {
  return Object.keys(RECORDED).length;
}

/**
 * How many syllables a spoken line has, counted at build time against CMUdict.
 *
 * The rhythm scorer turns a duration into an articulation rate by dividing by
 * this, and refuses lines too short to carry rhythm at all. Counting in the
 * browser is not an option — the dictionary has 130k entries — and guessing
 * from spelling would put an estimate underneath a measurement.
 *
 * Rebuilt by `node scripts/build-syllable-manifest.mjs`.
 */
const SYLLABLES: Record<string, number> = syllableManifest;

export function syllablesForLine(text: string): number | null {
  return SYLLABLES[normaliseSpokenLine(text)] ?? null;
}
