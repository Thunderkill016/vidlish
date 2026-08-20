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
const configuredBetaEmails =
  process.env.TEST_BETA_EMAILS ??
  [
    "invited@example.com",
    "fresh@example.com",
    "learning-preview@example.com",
    "v2lab-chromium@example.com",
    "v2lab-mobile-chromium@example.com",
  ].join(",");

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  // Always one worker. The whole suite drives a single dev server whose
  // in-memory repositories are one module-global, shared by every spec and one
  // beta user. Parallel workers race over that shared state, so a local run
  // reported failures CI never saw. Serial is also not slower here: the
  // journeys are seconds each, and the retries a race provokes cost more.
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
      // Keep ordinary E2E isolated in memory, while allowing the dedicated
      // durable job to opt into the real local Supabase repository.
      LEARNING_SESSION_REPOSITORY:
        process.env.LEARNING_SESSION_REPOSITORY ?? "fake",
      TEST_BETA_EMAILS: configuredBetaEmails,
      VIDEO_METADATA_ADAPTER: process.env.VIDEO_METADATA_ADAPTER ?? "fixture",
      YOUTUBE_VIEWER_REGION: process.env.YOUTUBE_VIEWER_REGION ?? "VN",
      YOUTUBE_METADATA_TIMEOUT_MS:
        process.env.YOUTUBE_METADATA_TIMEOUT_MS ?? "1000",
      // Both projects drive one dev server faster than a human. Throttling is
      // covered separately, so normal browser journeys use a raised ceiling.
      // Deliberately NOT read from process.env. CI sets the product defaults
      // (3 jobs/minute) at workflow level, and these three exist precisely to
      // override them: the suite drives one dev server as one beta user, far
      // faster than a human, so on 3/minute the job-creating journeys throttle
      // themselves with "Bạn thao tác quá nhanh" and fail on /create. Throttling
      // is covered by generation-policy.test.ts, so no assertion is lost here.
      GENERATION_MAX_ACTIVE_JOBS: "20",
      GENERATION_MAX_JOBS_PER_MINUTE: "60",
      GENERATION_MAX_JOBS_PER_DAY: "1000",
      // Pinned to fixtures like CI. Without these two, a developer with a real
      // `.env.local` runs the journeys against Gemini and Supadata over the
      // network: the create flow stalls and unrelated specs fail for a reason
      // that has nothing to do with their change.
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
