import { describe, expect, it } from "vitest";

import {
  GOLDEN_STUDY_CODE,
  GOLDEN_STUDY_EMAIL,
  GOLDEN_STUDY_LESSON_VERSION_ID,
  buildGoldenStudyRuntimeEnv,
  parseSupabaseStatusEnv,
} from "./golden-study-harness.mjs";

const local = {
  API_URL: "http://127.0.0.1:54321",
  ANON_KEY: "local-anon",
  SERVICE_ROLE_KEY: "local-service",
  DB_URL: "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
};

describe("Golden study harness", () => {
  it("parses quoted Supabase status output without losing URL punctuation", () => {
    expect(
      parseSupabaseStatusEnv(`
API_URL="${local.API_URL}"
ANON_KEY='${local.ANON_KEY}'
SERVICE_ROLE_KEY="${local.SERVICE_ROLE_KEY}"
DB_URL="${local.DB_URL}"
STUDIO_URL=http://127.0.0.1:54323
`),
    ).toMatchObject(local);
  });

  it("fails closed when local Supabase did not expose every required credential", () => {
    expect(() =>
      parseSupabaseStatusEnv(`
API_URL=${local.API_URL}
ANON_KEY=${local.ANON_KEY}
DB_URL=${local.DB_URL}
`),
    ).toThrow(/SERVICE_ROLE_KEY/);
  });

  it("replaces production Supabase and strips paid provider credentials", () => {
    const env = buildGoldenStudyRuntimeEnv(
      {
        NODE_ENV: "production",
        CI: "true",
        NEXT_PUBLIC_SUPABASE_URL: "https://production.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "production-anon",
        SUPABASE_SECRET_KEY: "production-secret",
        SUPABASE_SERVICE_ROLE_KEY: "production-service",
        SUPABASE_URL: "https://production.supabase.co",
        SUPABASE_ANON_KEY: "another-production-anon",
        DATABASE_URL: "postgresql://production",
        POSTGRES_URL: "postgresql://production-pooled",
        GEMINI_API_KEY: "paid-gemini-key",
        SUPADATA_API_KEY: "paid-supadata-key",
        YOUTUBE_DATA_API_KEY: "paid-youtube-key",
        UNRELATED_SAFE_VALUE: "keep-me",
      },
      local,
    );

    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe(local.API_URL);
    expect(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).toBe(local.ANON_KEY);
    expect(env.SUPABASE_SECRET_KEY).toBe(local.SERVICE_ROLE_KEY);
    expect(env.SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
    expect(env.SUPABASE_URL).toBeUndefined();
    expect(env.SUPABASE_ANON_KEY).toBeUndefined();
    expect(env.DATABASE_URL).toBeUndefined();
    expect(env.POSTGRES_URL).toBeUndefined();
    expect(env.GEMINI_API_KEY).toBeUndefined();
    expect(env.SUPADATA_API_KEY).toBeUndefined();
    expect(env.YOUTUBE_DATA_API_KEY).toBeUndefined();
    expect(env.NODE_ENV).toBeUndefined();
    expect(env.CI).toBeUndefined();
    expect(env.UNRELATED_SAFE_VALUE).toBe("keep-me");
  });

  it("forces the proven local durable fixture selectors", () => {
    const env = buildGoldenStudyRuntimeEnv(
      {
        AUTH_ADAPTER: "supabase",
        VIDEO_METADATA_ADAPTER: "youtube",
        TRANSCRIPT_NATIVE_ADAPTER: "supadata",
        LESSON_PROVIDER: "gemini",
        LEARNING_AUTHORING_PROVIDER: "gemini",
        LEARNING_SESSION_REPOSITORY: "fake",
        GENERATION_REPOSITORY: "fake",
        TRANSCRIPT_REPOSITORY: "fake",
      },
      local,
    );

    expect(env.AUTH_ADAPTER).toBe("fake");
    expect(env.AUTH_FAKE_CODE).toBe(GOLDEN_STUDY_CODE);
    expect(env.TEST_BETA_EMAILS).toBe(GOLDEN_STUDY_EMAIL);
    expect(env.LEARNING_SESSION_REPOSITORY).toBe("supabase");
    expect(env.GENERATION_REPOSITORY).toBe("supabase");
    expect(env.TRANSCRIPT_REPOSITORY).toBe("supabase");
    expect(env.LEARNING_LAB_V2_LESSON_VERSION_ID).toBe(
      GOLDEN_STUDY_LESSON_VERSION_ID,
    );
    expect(env.VIDEO_METADATA_ADAPTER).toBe("fixture");
    expect(env.TRANSCRIPT_NATIVE_ADAPTER).toBe("fixture");
    expect(env.LESSON_PROVIDER).toBe("fixture");
    expect(env.LEARNING_AUTHORING_PROVIDER).toBe("off");
  });
});
