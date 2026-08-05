import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { SupabaseLessonRepository } from "./lesson-repository";

const JOB_ID = "11111111-1111-4111-8111-111111111111";
const OWNER_ID = "22222222-2222-4222-8222-222222222222";
const TRANSCRIPT_ID = "33333333-3333-4333-8333-333333333333";
const ELIGIBLE_SEGMENT_ID = "seg_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

type QueryResult = { data: unknown; error: null };
type Filter = { column: string; value: unknown };

class FakeQuery implements PromiseLike<QueryResult> {
  readonly filters: Filter[] = [];
  selected = "";

  constructor(readonly table: string) {}

  select(columns: string) {
    this.selected = columns;
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ column, value });
    return this;
  }

  order() {
    return this;
  }

  maybeSingle(): Promise<QueryResult> {
    return Promise.resolve(this.result());
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?:
      | ((value: QueryResult) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?:
      | ((reason: unknown) => TResult2 | PromiseLike<TResult2>)
      | null,
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.result()).then(onfulfilled, onrejected);
  }

  private result(): QueryResult {
    if (this.table === "lesson_jobs") {
      return { data: { canonical_transcript_id: TRANSCRIPT_ID }, error: null };
    }

    if (this.table === "language_eligible_segments") {
      const isScopedToTranscript = this.filters.some(
        (filter) =>
          filter.column === "transcript_id" && filter.value === TRANSCRIPT_ID,
      );

      // Reproduce the production failure mode: an unscoped owner-wide select
      // fills the Data API's first 1,000 rows with older transcripts, so the
      // current job's allowlist is absent even though it exists in Postgres.
      return {
        data: isScopedToTranscript
          ? [{ segment_id: ELIGIBLE_SEGMENT_ID }]
          : Array.from({ length: 1_000 }, (_, index) => ({
              segment_id: `seg_old_${index}`,
              transcript_id: `old-transcript-${index}`,
            })),
        error: null,
      };
    }

    if (this.table === "transcript_segments") {
      return {
        data: [
          {
            id: ELIGIBLE_SEGMENT_ID,
            start_ms: 100,
            end_ms: 900,
            text: "This segment is permitted.",
          },
          {
            id: "seg_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
            start_ms: 1_000,
            end_ms: 1_800,
            text: "This segment was excluded by the language gate.",
          },
        ],
        error: null,
      };
    }

    throw new Error(`Unexpected table: ${this.table}`);
  }
}

describe("SupabaseLessonRepository.listPermittedSegments", () => {
  it("filters the allowlist by transcript before the Data API row cap", async () => {
    const queries: FakeQuery[] = [];
    const client = {
      from: vi.fn((table: string) => {
        const query = new FakeQuery(table);
        queries.push(query);
        return query;
      }),
    } as unknown as SupabaseClient;

    const repository = new SupabaseLessonRepository(client);
    const result = await repository.listPermittedSegments(JOB_ID, OWNER_ID);

    expect(result).toEqual([
      {
        id: ELIGIBLE_SEGMENT_ID,
        startMs: 100,
        endMs: 900,
        text: "This segment is permitted.",
      },
    ]);

    const allowlistQuery = queries.find(
      (query) => query.table === "language_eligible_segments",
    );
    expect(allowlistQuery?.filters).toEqual(
      expect.arrayContaining([
        { column: "owner_user_id", value: OWNER_ID },
        { column: "transcript_id", value: TRANSCRIPT_ID },
      ]),
    );
    expect(allowlistQuery?.selected).toBe("segment_id");
  });
});
