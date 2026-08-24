export type GoldenStudyEnvironment = Readonly<
  Record<string, string | undefined>
>;

/**
 * The five-person Golden Session is a predeclared validation instrument.
 * Product extensions added after that protocol was locked must not silently
 * change the moderator-observed study surface.
 *
 * This flag is server-only and is set by `pnpm study:golden`. It does not make
 * fixture/CI evidence count as a real participant and it must not be enabled in
 * normal learner runtime.
 */
export function isGoldenStudyMode(
  env: GoldenStudyEnvironment = process.env,
): boolean {
  return env.GOLDEN_STUDY_MODE === "true";
}
