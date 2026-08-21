import { readdirSync, readFileSync } from "node:fs";
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
const languageMigration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260804031500_create_language_eligibility.sql",
  ),
  "utf8",
);
const studyProgressMigration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260818120000_create_lesson_progress.sql",
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

describe("original-English eligibility migration contract", () => {
  it("stores versioned reports and a transcript-bound downstream allowlist", () => {
    expect(languageMigration).toMatch(
      /create table public\.language_eligibility_reports/i,
    );
    expect(languageMigration).toMatch(
      /create table public\.language_eligible_segments/i,
    );
    expect(languageMigration).toMatch(
      /detector_version = 'franc-min:6\.2\.0'/i,
    );
    expect(languageMigration).toMatch(
      /policy_version = 'original-english:v1'/i,
    );
    expect(languageMigration).toMatch(
      /foreign key \(transcript_id, segment_id\)[\s\S]*references public\.transcript_segments\(transcript_id, id\)/i,
    );
    expect(languageMigration).not.toMatch(
      /create table public\.(lessons|activities)/i,
    );
  });

  it("commits each decision to one safe lifecycle outcome", () => {
    expect(languageMigration).toMatch(
      /v_effective_status = 'eligible'[\s\S]*status = 'analyzing_video'/i,
    );
    expect(languageMigration).toMatch(
      /v_effective_status = 'ineligible'[\s\S]*status = 'failed'[\s\S]*safe_error_code = 'VIDEO_LANGUAGE_UNSUPPORTED'/i,
    );
    expect(languageMigration).toMatch(
      /else[\s\S]*status = 'acquiring_transcript'[\s\S]*safe_error_code = null/i,
    );
    expect(languageMigration).toMatch(
      /select id, status, permitted_segment_ids[\s\S]*v_effective_status/i,
    );
  });

  it("allows owner reads but blocks browser decisions and writes", () => {
    for (const table of [
      "language_eligibility_reports",
      "language_eligible_segments",
    ]) {
      expect(languageMigration).toMatch(
        new RegExp(`alter table public\\.${table} enable row level security`, "i"),
      );
    }
    expect(languageMigration).not.toMatch(
      /grant (insert|update|delete).*language_eligibility_reports to authenticated/i,
    );
    expect(languageMigration).toMatch(
      /revoke all on function public\.persist_language_eligibility[\s\S]*authenticated/i,
    );
  });
});

describe("study progress migration contract", () => {
  it("keeps one progress row per lesson and lets the browser only read it", () => {
    expect(studyProgressMigration).toMatch(
      /create table public\.lesson_progress/i,
    );
    expect(studyProgressMigration).toMatch(/unique \(lesson_id\)/i);
    expect(studyProgressMigration).toMatch(
      /alter table public\.lesson_progress enable row level security/i,
    );
    expect(studyProgressMigration).toMatch(
      /grant select on table public\.lesson_progress to authenticated/i,
    );
    expect(studyProgressMigration).not.toMatch(
      /grant (insert|update|delete).*lesson_progress to authenticated/i,
    );
    expect(studyProgressMigration).toMatch(
      /revoke all on function public\.save_lesson_progress[\s\S]*authenticated/i,
    );
  });

  it("resolves the owner from the lesson rather than trusting the job ID", () => {
    expect(studyProgressMigration).toMatch(
      /from public\.lessons[\s\S]*lessons\.job_id = p_job_id[\s\S]*lessons\.owner_user_id = p_owner_user_id/i,
    );
    expect(studyProgressMigration).toMatch(
      /raise exception 'lesson not found for study progress'/i,
    );
  });

  it("does not let study progress reach the lesson artifact", () => {
    // Progress is the learner's side of a lesson. A migration that started
    // writing into `lessons` here would put learner input next to citations the
    // grounding gate is responsible for.
    expect(studyProgressMigration).not.toMatch(
      /(insert into|update) public\.lessons\b/i,
    );
  });
});

describe("learning model v2 content provenance", () => {
  /**
   * `lesson_versions` is what the whole v2 stack operates on — sessions,
   * attempts, support evidence, delayed review, FSRS scheduling. For a long
   * time nothing outside CI created a row, so none of it was reachable for a
   * real learner. `publish_lesson_version` is the one production path that
   * creates one.
   *
   * This guard keeps it the *only* one. An ad-hoc insert somewhere else would
   * skip the ownership check and the publish-once rule, and the first sign of
   * that would be a learner's lesson changing under them mid-session.
   */
  const migrationFiles = readdirSync(join(process.cwd(), "supabase/migrations"))
    .filter((file) => file.endsWith(".sql"))
    .map((file) => ({
      file,
      sql: readFileSync(
        join(process.cwd(), "supabase/migrations", file),
        "utf8",
      ),
    }));

  const WRITE_PATTERN =
    /(?:insert\s+into|update|copy)\s+(?:public\.)?lesson_versions\b/i;
  /**
   * Both publish functions, and nothing else.
   *
   * The lesson-scoped one came first; the job-scoped one exists because a v2
   * blueprint hanging off a v1 lesson meant v2 could not run when v1 failed.
   * Listing them by name keeps the guard's meaning — a blueprint is only ever
   * written by a function that checks ownership and refuses to republish — and
   * a third writer still fails here.
   */
  const PUBLISH_MIGRATIONS = [
    "20260819170000_publish_lesson_version.sql",
    "20260821080000_publish_lesson_version_for_job.sql",
  ];

  it("writes lesson versions only from the publish functions", () => {
    const writers = migrationFiles
      .filter(({ sql }) => WRITE_PATTERN.test(sql))
      .map(({ file }) => file);
    expect(writers.sort()).toEqual([...PUBLISH_MIGRATIONS].sort());
  });

  it("proves the pattern would catch a writer", () => {
    // Without this, a typo in the regex would make the assertion above pass
    // forever and quietly retire the guard.
    expect(WRITE_PATTERN.test("insert into public.lesson_versions (id)")).toBe(
      true,
    );
    expect(WRITE_PATTERN.test("update lesson_versions set blueprint = '{}'")).toBe(
      true,
    );
  });

  it("keeps every publish path owner-scoped and publish-once", () => {
    // Properties the pgTAP suite proves at runtime; asserted here too so a
    // future rewrite cannot drop them unnoticed — and asserted for *both*
    // functions, because a second publish path that skipped the ownership
    // check would let anyone signed in attach a blueprint to someone else's
    // job.
    for (const name of PUBLISH_MIGRATIONS) {
      const publishSql = migrationFiles.find(({ file }) => file === name)!.sql;
      expect(publishSql).toContain("security definer");
      expect(publishSql).toMatch(/owned (lesson|job) not found/);
      expect(publishSql).toContain("schemaVersion");
    }
  });
});
