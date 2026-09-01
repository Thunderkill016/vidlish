import { FOUNDATION_UNITS } from "@/modules/curriculum/content";

/**
 * The Vietnamese meanings a reading activity offers, built on the server.
 *
 * Reading is checked by asking which meaning the English carries, so something
 * must supply the wrong answers too. Building them in the browser would hand it
 * the correct one — the distractors and the answer would arrive together and
 * the only thing separating them would be a field name.
 *
 * Distractors are drawn from meanings the syllabus actually teaches. A wrong
 * answer that is obviously absurd tests nothing: the learner picks the only
 * plausible option without reading the English at all.
 */
export function buildReadingOptions(input: {
  readonly correctVi: string;
  /** Stable input so the same challenge always renders the same order. */
  readonly seed: string;
  readonly count?: number;
}): string[] {
  const wanted = Math.max(2, Math.min(input.count ?? 4, 6));
  const normalised = input.correctVi.trim().toLowerCase();

  const pool: string[] = [];
  for (const unit of FOUNDATION_UNITS) {
    for (const chunk of unit.targetChunks) {
      const candidate = chunk.vi.trim();
      if (candidate.toLowerCase() === normalised) continue;
      if (pool.some((existing) => existing.toLowerCase() === candidate.toLowerCase())) {
        continue;
      }
      pool.push(candidate);
    }
  }

  // Deterministic pick and order. A reshuffle on every render would let a
  // learner reload until the answer sat where they expected it.
  //
  // The distractors are taken by rotating the pool rather than by stepping a
  // fixed stride: a stride that shares a factor with the pool size revisits the
  // same entry, which produced duplicate options and made one of them
  // unmarkable.
  const rotation = fingerprint(input.seed);
  const chosen: string[] = [];
  for (let step = 0; step < pool.length && chosen.length < wanted - 1; step += 1) {
    chosen.push(pool[(rotation + step) % pool.length]);
  }

  const options = [input.correctVi.trim(), ...chosen];
  const at = rotation % options.length;
  // Move the answer out of first position by a fixed amount rather than
  // shuffling, so position carries no information across activities.
  return [...options.slice(at), ...options.slice(0, at)];
}

function fingerprint(seed: string): number {
  let value = 0;
  for (let index = 0; index < seed.length; index += 1) {
    value = (value * 31 + seed.charCodeAt(index)) % 100003;
  }
  return value;
}
