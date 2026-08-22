import { defineConfig, devices } from "@playwright/test";

const port = 3100;
/**
 * `v2lab-*` give the learning-lab specs one learner each.
 *
 * Both browser projects drive the same dev server, and a resumed session is
 * shared by everything signed in as that learner — correctly so, since that is
 * what a learner returning on a second device gets. Running the same journey
 * twice as one person therefore has the second run pick up the first run's
 * support ladder, which is the product behaving properly and the test lying.
 */
/**
 * Every learner the suite signs in as.
 *
 * Unioned with `TEST_BETA_EMAILS` rather than replaced by it. The env var used
 * to win outright, and CI sets its own copy of this list — so adding a learner
 * here passed locally and failed in CI with a sign-in that silently bounced,
 * which reads like a broken feature rather than a stale list in a second file.
 * Two places holding the same list will drift; a union cannot.
 */
const DEFAULT_BETA_EMAILS = [
  "invited@example.com",
  "fresh@example.com",
  "learning-preview@example.com",
  "v2lab-chromium@example.com",
  "v2lab-mobile-chromium@example.com",
  "measurement-chromium@example.com",
  "measurement-mobile-chromium@example.com",
  "beginner-chromium@example.com",
  "beginner-mobile-chromium@example.com",
  "beginner-challenge-chromium@example.com",
  "beginner-challenge-mobile-chromium@example.com",
  "personal-first-chromium@example.com",
  "personal-first-mobile-chromium@example.com",
];

const configuredBetaEmails = [
  ...new Set([
    ...DEFAULT_BETA_EMAILS,
    ...(process.env.TEST_BETA_EMAILS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  ]),
].join(",");

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["html", { open: "never" }], ["list"]] : "list",
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `pnpm dev --hostname 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}/sign-in`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      AUTH_ADAPTER: process.env.AUTH_ADAPTER ?? "fake",
      AUTH_FAKE_CODE: process.env.AUTH_FAKE_CODE ?? "123456",
      LEARNING_SESSION_REPOSITORY:
        process.env.LEARNING_SESSION_REPOSITORY ?? "fake",
      TEST_BETA_EMAILS: configuredBetaEmails,
      VIDEO_METADATA_ADAPTER: process.env.VIDEO_METADATA_ADAPTER ?? "fixture",
      YOUTUBE_VIEWER_REGION: process.env.YOUTUBE_VIEWER_REGION ?? "VN",
      YOUTUBE_METADATA_TIMEOUT_MS:
        process.env.YOUTUBE_METADATA_TIMEOUT_MS ?? "1000",
      GENERATION_MAX_ACTIVE_JOBS: "20",
      GENERATION_MAX_JOBS_PER_MINUTE: "60",
      GENERATION_MAX_JOBS_PER_DAY: "1000",
      LESSON_PROVIDER: process.env.LESSON_PROVIDER ?? "fixture",
      TRANSCRIPT_NATIVE_ADAPTER:
        process.env.TRANSCRIPT_NATIVE_ADAPTER ?? "fixture",
      NEXT_PUBLIC_AUTH_RESEND_COOLDOWN_SECONDS:
        process.env.NEXT_PUBLIC_AUTH_RESEND_COOLDOWN_SECONDS ?? "1",
      NEXT_PUBLIC_SUPABASE_URL:
        process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
        "test-publishable-key",
      SUPABASE_SECRET_KEY:
        process.env.SUPABASE_SECRET_KEY ?? "test-secret-key",
    },
  },
});
