import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { SupabaseStudyProgressRepository } from "./study-progress-repository";
import { STUDY_PROGRESS_VERSION } from "@/shared/contracts/study";

const OWNER_ID = "11111111-1111-4111-8111-111111111111";
const JOB_ID = "22222222-2222-4222-8222-222222222222";
const OTHER_JOB_ID = "33333333-3333-4333-8333-333333333333";

type Row = Record<string, unknown>;

function state(mastered: number[]) {
  return {
    version: STUDY_PROGRESS_VERSION,
    comprehensionAnswers: [],
    clozeAttempts: [],
    masteredVocabulary: mastered,
  };
}

/** Returns rows in the order the repository asked for them; the ordering itself
 *  is Postgres's job and is covered by the pgTAP suite. */
function fakeClient(rows: Row[]): SupabaseClient {
  const query = {
    select: () => query,
    eq: () => query,
    order: () => query,
    limit: () => query,
    maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
    then: (resolve: (value: { data: Row[]; error: null }) => unknown) =>
      Promise.resolve({ data: rows, error: null }).then(resolve),
  };
  return { from: () => query } as unknown as SupabaseClient;
}

describe("SupabaseStudyProgressRepository", () => {
  it("reads back the stored progress for one lesson", async () => {
    const repository = new SupabaseStudyProgressRepository(
      fakeClient([
        {
          job_id: JOB_ID,
          lesson_id: "44444444-4444-4444-8444-444444444444",
          state: state([1]),
          completed_at: null,
          updated_at: "2026-08-18T10:00:00+00:00",
        },
      ]),
    );

    await expect(
      repository.findOwnedByJobId(JOB_ID, OWNER_ID),
    ).resolves.toMatchObject({ jobId: JOB_ID, completedAt: null });
  });

  it("reports one summary per job even if a job ever holds two lessons", async () => {
    const repository = new SupabaseStudyProgressRepository(
      fakeClient([
        {
          job_id: JOB_ID,
          state: state([0, 1]),
          completed_at: "2026-08-18T10:00:00+00:00",
        },
        {
          job_id: JOB_ID,
          state: state([0]),
          completed_at: null,
        },
        {
          job_id: OTHER_JOB_ID,
          state: state([]),
          completed_at: null,
        },
      ]),
    );

    const summaries = await repository.listOwnedSummaries(OWNER_ID);
    expect(summaries).toEqual([
      {
        jobId: JOB_ID,
        answeredActivities: 0,
        masteredVocabularyCount: 2,
        completedAt: "2026-08-18T10:00:00+00:00",
      },
      {
        jobId: OTHER_JOB_ID,
        answeredActivities: 0,
        masteredVocabularyCount: 0,
        completedAt: null,
      },
    ]);
  });
});
