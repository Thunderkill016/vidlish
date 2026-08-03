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
