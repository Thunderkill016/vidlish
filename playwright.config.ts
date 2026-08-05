import { defineConfig, devices } from "@playwright/test";

const port = 3100;

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
      AUTH_ADAPTER: "fake",
      AUTH_FAKE_CODE: "123456",
      // Two learners, so a test that needs an empty shelf does not depend on
      // whether another project already created a lesson — the in-memory
      // repository is one module-global shared by the whole dev server.
      TEST_BETA_EMAILS: "invited@example.com,fresh@example.com",
      VIDEO_METADATA_ADAPTER: "fixture",
      YOUTUBE_VIEWER_REGION: "VN",
      YOUTUBE_METADATA_TIMEOUT_MS: "1000",
      // Both projects drive one dev server as one beta user, faster than a
      // human ever would. On the product defaults (3 jobs/minute) the suite
      // throttles itself and the second project's job-creating tests fail with
      // "Bạn thao tác quá nhanh" — a self-inflicted failure, not a regression.
      // Throttling itself is covered by generation-policy.test.ts, so no e2e
      // assertion is lost by lifting the ceiling here.
      GENERATION_MAX_ACTIVE_JOBS: "20",
      GENERATION_MAX_JOBS_PER_MINUTE: "60",
      GENERATION_MAX_JOBS_PER_DAY: "1000",
      NEXT_PUBLIC_AUTH_RESEND_COOLDOWN_SECONDS: "1",
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-publishable-key",
      SUPABASE_SECRET_KEY: "test-secret-key",
    },
  },
});
