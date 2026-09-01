const PREFERRED_SLOW_RATES = [0.75, 0.5, 0.25] as const;

/**
 * Pick the least-distorting slower rate YouTube actually exposes for the
 * current video. Falling back to 1 is truthful: the IFrame API does not
 * guarantee variable-rate playback for every video/device.
 */
export function selectLearningPlaybackRate(
  availableRates: readonly number[],
): number {
  const normalized = new Set(
    availableRates.filter((rate) => Number.isFinite(rate) && rate > 0),
  );

  for (const rate of PREFERRED_SLOW_RATES) {
    if (normalized.has(rate)) return rate;
  }

  const slower = [...normalized]
    .filter((rate) => rate < 1)
    .sort((left, right) => right - left);
  return slower[0] ?? 1;
}
