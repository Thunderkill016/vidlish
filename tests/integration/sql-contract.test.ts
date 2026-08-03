import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260803170000_create_beta_access.sql"),
  "utf8",
);

describe("beta_access migration contract", () => {
  it("enables RLS and denies browser roles", () => {
    expect(migration).toMatch(/alter table public\.beta_access enable row level security/i);
    expect(migration).toMatch(/revoke all privileges.*anon, authenticated/is);
    expect(migration).not.toMatch(/create policy/i);
  });

  it("contains only private-beta support and no future product tables", () => {
    expect(migration).toMatch(/create table public\.beta_access/i);
    expect(migration).not.toMatch(/lesson_jobs|transcripts|lessons|activities/i);
  });
});
