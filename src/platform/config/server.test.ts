import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Production must refuse a configuration that would serve stand-in content.
 *
 * These adapters are indistinguishable downstream: the fixture authoring
 * provider writes a lesson with the same schema, the same runtime and the same
 * session as a real one. A learner would study a demo believing it came from
 * their video, and nothing later in the stack could tell them otherwise. The
 * only place that difference is visible is here, at startup.
 */

const PRODUCTION_ENV: Record<string, string> = {
  NODE_ENV: "production",
  AUTH_ADAPTER: "supabase",
  SUPABASE_SECRET_KEY: "x".repeat(40),
  VIDEO_METADATA_ADAPTER: "youtube",
  YOUTUBE_DATA_API_KEY: "y".repeat(30),
  GENERATION_REPOSITORY: "supabase",
  GENERATION_DISPATCHER: "workflow",
  TRANSCRIPT_REPOSITORY: "supabase",
  TRANSCRIPT_NATIVE_ADAPTER: "supadata",
  SUPADATA_API_KEY: "z".repeat(30),
  LESSON_PROVIDER: "gemini",
  GEMINI_API_KEY: "g".repeat(30),
};

const saved = { ...process.env };

async function loadConfig(overrides: Record<string, string | undefined>) {
  vi.resetModules();
  for (const key of Object.keys(process.env)) {
    if (key in PRODUCTION_ENV || key === "CI") delete process.env[key];
  }
  Object.assign(process.env, PRODUCTION_ENV, overrides);
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete process.env[key];
  }
  const { getServerConfig } = await import("./server");
  return getServerConfig();
}

beforeEach(() => {
  delete process.env.CI;
});

afterEach(() => {
  process.env = { ...saved };
});

describe("server configuration in production", () => {
  it("accepts the real adapters", async () => {
    await expect(
      loadConfig({ LEARNING_AUTHORING_PROVIDER: "gemini" }),
    ).resolves.toBeTruthy();
  });

  it("accepts v2 authoring being switched off", async () => {
    // Off is an honest production state: no v2 lesson is published at all.
    await expect(
      loadConfig({ LEARNING_AUTHORING_PROVIDER: "off" }),
    ).resolves.toBeTruthy();
  });

  it("refuses the fixture authoring provider", async () => {
    // VLR-006. A stand-in lesson is indistinguishable from a real one once it
    // is published, so this has to fail before the process serves anything.
    await expect(
      loadConfig({ LEARNING_AUTHORING_PROVIDER: "fixture" }),
    ).rejects.toThrow(/learning authoring provider cannot run in production/i);
  });

  it("refuses the fixture lesson provider", async () => {
    await expect(
      loadConfig({ LESSON_PROVIDER: "fixture" }),
    ).rejects.toThrow(/lesson provider cannot run in production/i);
  });

  it("still allows fixtures under CI", async () => {
    // CI runs the whole product against fixtures on purpose; the guard is about
    // real deployments, not about the test environment.
    process.env.CI = "true";
    await expect(
      loadConfig({ LEARNING_AUTHORING_PROVIDER: "fixture", CI: "true" }),
    ).resolves.toBeTruthy();
  });
});

describe("the lesson model", () => {
  /**
   * Production kept returning schema-adherence failures — a draft rejected at
   * one field *after both model calls had been paid for*. A rejected lesson
   * costs its whole generation, so the cheapest model per token is not the
   * cheapest per accepted lesson. That trade is what this default encodes, and
   * a silent downgrade would undo it without anyone noticing.
   */
  it("defaults to a tier that is not the cheapest and weakest", async () => {
    const config = await loadConfig({ LESSON_MODEL_ID: undefined });
    expect(config.LESSON_MODEL_ID).toBe("gemini-3.7-flash");
  });

  it("still allows a newer model without a code change", async () => {
    const config = await loadConfig({ LESSON_MODEL_ID: "gemini-4.0-flash" });
    expect(config.LESSON_MODEL_ID).toBe("gemini-4.0-flash");
  });

  it("refuses an empty model id rather than falling back silently", async () => {
    // Defaulting past a misconfiguration would run production on a model
    // nobody chose.
    await expect(loadConfig({ LESSON_MODEL_ID: "" })).rejects.toThrow();
  });
});
