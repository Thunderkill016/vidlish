/**
 * The slowest useful playback rate a given player actually offers.
 *
 * VLR-102. YouTube does not guarantee a fixed set of rates: it varies by
 * client, and `setPlaybackRate` silently ignores a value outside
 * `getAvailablePlaybackRates()`. Asking for 0.75 and assuming it took is how a
 * learner ends up being told the audio is slower while it plays at full speed —
 * the support step is spent and nothing changed.
 *
 * So the rate is chosen from what the player reports, and the caller still has
 * to confirm the change through the player's own rate-change event rather than
 * trusting this answer.
 */
export const SLOW_PLAYBACK_TARGET_RATE = 0.75;

export function chooseSlowPlaybackRate(
  available: readonly number[],
  currentRate: number,
  target: number = SLOW_PLAYBACK_TARGET_RATE,
): number | null {
  // Only rates below what is playing now. A "slow down" that speeds the audio
  // up, or leaves it where it is, is not the support the learner asked for.
  const slower = available.filter(
    (rate) => Number.isFinite(rate) && rate > 0 && rate < currentRate,
  );
  if (slower.length === 0) return null;

  // Closest to the target; on a tie the slower one, because the learner reached
  // for this step after replay and a hint did not get them there.
  return slower.reduce((best, rate) => {
    const delta = Math.abs(rate - target);
    const bestDelta = Math.abs(best - target);
    if (delta < bestDelta) return rate;
    if (delta > bestDelta) return best;
    return rate < best ? rate : best;
  });
}
