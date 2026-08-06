import { defineConfig, devices } from "@playwright/test";

const port = 3100;
const configuredBetaEmails =
  process.env.TEST_BETA_EMAILS ??
  "invited@example.com,fresh@example.com,learning-preview@example.com";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
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
      GENERATION_MAX_ACTIVE_JOBS:
        process.env.GENERATION_MAX_ACTIVE_JOBS ?? "20",
      GENERATION_MAX_JOBS_PER_MINUTE:
        process.env.GENERATION_MAX_JOBS_PER_MINUTE ?? "60",
      GENERATION_MAX_JOBS_PER_DAY:
        process.env.GENERATION_MAX_JOBS_PER_DAY ?? "1000",
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
