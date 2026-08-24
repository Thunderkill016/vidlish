import { describe, expect, it } from "vitest";

import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

/**
 * The harness has to actually fail on bad SQL, or it is a green light nobody
 * earned.
 *
 * Every fixture defect that cost a CI round-trip in this repo was one of these
 * four: a dropped quote, a column that does not exist, a check constraint, a
 * unique constraint. None needed pgTAP. They needed the schema.
 */
const HARNESS_TIMEOUT_MS = 60_000;

function runHarness(sql?: string, files: string[] = []): { ok: boolean; output: string } {
  const args = ["scripts/local-schema.mjs", ...files];
  if (sql !== undefined) {
    const file = path.join(mkdtempSync(path.join(tmpdir(), "schema-")), "case.sql");
    writeFileSync(file, sql, "utf8");
    args.push(file);
  }
  try {
    return { ok: true, output: execFileSync("node", args, { encoding: "utf8" }) };
  } catch (error) {
    const failure = error as { stdout?: string; stderr?: string };
    return { ok: false, output: `${failure.stdout ?? ""}${failure.stderr ?? ""}` };
  }
}

const SEED = `
insert into auth.users (id, email) values ('a1111111-1111-4111-8111-111111111111','x@e.com');
insert into public.videos (id, youtube_video_id, title, channel_name, metadata_version)
  values ('a3333333-3333-4333-8333-333333333333','M7lc1UVf-VE','t','c','fixture:v1');
`;

describe("local schema harness", () => {
  it("applies every migration", () => {
    const result = runHarness();
    expect(result.ok).toBe(true);
    expect(result.output).toMatch(/✓ \d+ migration applied/);
  }, HARNESS_TIMEOUT_MS);

  it("rejects SQL that does not parse", () => {
    const result = runHarness("insert into public.videos values (}");
    expect(result.ok).toBe(false);
    expect(result.output).toMatch(/syntax error/i);
  }, HARNESS_TIMEOUT_MS);

  it("rejects a column the schema does not have", () => {
    const result = runHarness(
      "insert into public.videos (id, normalised_hash) values (gen_random_uuid(), 'x');",
    );
    expect(result.ok).toBe(false);
    expect(result.output).toMatch(/does not exist/i);
  }, HARNESS_TIMEOUT_MS);

  it("rejects a value a check constraint forbids", () => {
    const result = runHarness(`${SEED}
      insert into public.lesson_jobs (id, owner_user_id, video_id, cefr_level,
        metadata_version, pipeline_version, status, current_stage, dispatch_status,
        learning_authoring_outcome)
      values ('a4444444-4444-4444-8444-444444444444','a1111111-1111-4111-8111-111111111111',
        'a3333333-3333-4333-8333-333333333333','B1','fixture:v1','generation-pipeline:v1',
        'completed','completed','sent','not_a_real_outcome');`);
    expect(result.ok).toBe(false);
    expect(result.output).toMatch(/check constraint/i);
  }, HARNESS_TIMEOUT_MS);

  it("rejects a duplicate the schema forbids", () => {
    const result = runHarness(`${SEED}
      insert into public.videos (id, youtube_video_id, title, channel_name, metadata_version)
        values ('b3333333-3333-4333-8333-333333333333','M7lc1UVf-VE','t2','c','fixture:v1');`);
    expect(result.ok).toBe(false);
    expect(result.output).toMatch(/duplicate key value/i);
  }, HARNESS_TIMEOUT_MS);

  it("passes the fixtures the durable journey loads, in the order it loads them", () => {
    // If a fixture stops applying, the durable CI job would have failed on it
    // anyway — three minutes later, in a log. Order matters: the arbitrary
    // fixture is not standalone, it builds on rows the durable one inserts.
    const result = runHarness(undefined, [
      "supabase/fixtures/learning_model_v2_durable.sql",
      "supabase/fixtures/learning_model_v2_arbitrary.sql",
    ]);
    expect(result.ok, result.output).toBe(true);
  }, HARNESS_TIMEOUT_MS);

  it("holds the guards on the beginner evidence mutation", () => {
    // These rules had pgTAP assertions and pgTAP only runs in CI here, so a
    // migration that rebuilt the function dropped three of them and nothing
    // local noticed until CI came back red. The SQL raises on failure, so
    // running clean is the assertion.
    const result = runHarness(undefined, [
      "scripts/checks/beginner-evidence-guards.sql",
    ]);
    expect(result.ok, result.output).toBe(true);
  }, HARNESS_TIMEOUT_MS);
});
