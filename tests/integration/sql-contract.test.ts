import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const betaMigration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260803170000_create_beta_access.sql"),
  "utf8",
);
const generationMigration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260804022000_create_generation_jobs.sql",
  ),
  "utf8",
);
const transcriptMigration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260804024500_create_canonical_transcripts.sql",
  ),
  "utf8",
);

describe("beta_access migration contract", () => {
  it("enables RLS and denies browser roles", () => {
    expect(betaMigration).toMatch(
      /alter table public\.beta_access enable row level security/i,
    );
    expect(betaMigration).toMatch(/revoke all privileges.*anon, authenticated/is);
    expect(betaMigration).not.toMatch(/create policy/i);
  });

  it("contains only private-beta support and no future product tables", () => {
    expect(betaMigration).toMatch(/create table public\.beta_access/i);
    expect(betaMigration).not.toMatch(/lesson_jobs|transcripts|lessons|activities/i);
  });
});

describe("generation job migration contract", () => {
  it("contains the canonical language gate and no future lesson entities", () => {
    expect(generationMigration).toMatch(
      /normalizing_transcript[\s\S]*checking_language[\s\S]*analyzing_video/i,
    );
    expect(generationMigration).not.toMatch(
      /create table public\.(transcripts|lessons|activities)/i,
    );
  });

  it("uses database idempotency and blocks browser workflow mutations", () => {
    expect(generationMigration).toMatch(
      /create unique index lesson_jobs_one_active_generation/i,
    );
    expect(generationMigration).toMatch(
      /grant select on table public\.lesson_jobs to authenticated/i,
    );
    expect(generationMigration).not.toMatch(
      /grant (insert|update|delete).*lesson_jobs to authenticated/i,
    );
    expect(generationMigration).toMatch(
      /revoke all on function public\.create_or_reuse_lesson_job[\s\S]*authenticated/i,
    );
  });
});

describe("canonical transcript migration contract", () => {
  it("persists transcript, segments and safe acquisition attempts", () => {
    expect(transcriptMigration).toMatch(/create table public\.transcripts/i);
    expect(transcriptMigration).toMatch(
      /create table public\.transcript_segments/i,
    );
    expect(transcriptMigration).toMatch(
      /create table public\.transcript_acquisition_attempts/i,
    );
    expect(transcriptMigration).not.toMatch(
      /create table public\.(lessons|activities)/i,
    );
  });

  it("keeps language eligibility downstream and commits state atomically", () => {
    const transcriptsTable = transcriptMigration.slice(
      transcriptMigration.indexOf("create table public.transcripts"),
      transcriptMigration.indexOf("create table public.transcript_segments"),
    );
    expect(transcriptsTable).not.toMatch(/\blanguage\s+text/i);
    expect(transcriptMigration).toMatch(
      /insert into public\.transcripts[\s\S]*insert into public\.transcript_segments[\s\S]*update public\.lesson_jobs[\s\S]*status = 'checking_language'/i,
    );
    expect(transcriptMigration).toMatch(
      /unique \(job_id, normalized_hash, normalization_version\)/i,
    );
    expect(transcriptMigration).toMatch(
      /translation_status in \('unknown', 'original'\)/i,
    );
  });

  it("allows owner reads but denies browser writes and RPC execution", () => {
    for (const table of [
      "transcripts",
      "transcript_segments",
      "transcript_acquisition_attempts",
    ]) {
      expect(transcriptMigration).toMatch(
        new RegExp(`alter table public\\.${table} enable row level security`, "i"),
      );
    }
    expect(transcriptMigration).not.toMatch(
      /grant (insert|update|delete).*transcripts to authenticated/i,
    );
    expect(transcriptMigration).toMatch(
      /revoke all on function public\.persist_canonical_transcript[\s\S]*authenticated/i,
    );
  });
});
