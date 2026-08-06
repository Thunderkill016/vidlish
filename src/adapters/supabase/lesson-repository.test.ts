import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { SupabaseLessonRepository } from "./lesson-repository";

const JOB_ID = "11111111-1111-4111-8111-111111111111";
const OWNER_ID = "22222222-2222-4222-8222-222222222222";
const TRANSCRIPT_ID = "33333333-3333-4333-8333-333333333333";
const ELIGIBLE_SEGMENT_ID = "seg_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

type QueryResult = { data: unknown; error: null; count: number | null };
type Filter = { column: string; value: unknown };
type Row = Record<string, unknown>;
type Dataset = {
  allowed: Row[];
  segments: Row[];
};

class FakeQuery implements PromiseLike<QueryResult> {
  readonly filters: Filter[] = [];
  selected = "";
  rangeFrom = 0;
  rangeTo = Number.MAX_SAFE_INTEGER;

  constructor(
    readonly table: string,
    private readonly dataset: Dataset,
  ) {}

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

  range(from: number, to: number) {
    this.rangeFrom = from;
    this.rangeTo = to;
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
      return {
        data: { canonical_transcript_id: TRANSCRIPT_ID },
        error: null,
        count: 1,
      };
    }

    if (this.table === "language_eligible_segments") {
      const isScopedToTranscript = this.filters.some(
        (filter) =>
          filter.column === "transcript_id" && filter.value === TRANSCRIPT_ID,
      );
      const source = isScopedToTranscript
        ? this.dataset.allowed
        : Array.from({ length: 1_000 }, (_, index) => ({
            segment_id: `seg_old_${index}`,
            transcript_id: `old-transcript-${index}`,
          }));

      return {
        data: source.slice(this.rangeFrom, this.rangeTo + 1),
        error: null,
        count: source.length,
      };
    }

    if (this.table === "transcript_segments") {
      return {
        data: this.dataset.segments.slice(this.rangeFrom, this.rangeTo + 1),
        error: null,
        count: this.dataset.segments.length,
      };
    }

    throw new Error(`Unexpected table: ${this.table}`);
  }
}

function createClient(dataset: Dataset) {
  const queries: FakeQuery[] = [];
  const client = {
    from: vi.fn((table: string) => {
      const query = new FakeQuery(table, dataset);
      queries.push(query);
      return query;
    }),
  } as unknown as SupabaseClient;

  return { client, queries };
}

describe("SupabaseLessonRepository.listPermittedSegments", () => {
  it("filters the allowlist by transcript before the Data API row cap", async () => {
    const { client, queries } = createClient({
      allowed: [{ segment_id: ELIGIBLE_SEGMENT_ID }],
      segments: [
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
    });

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

  it("hydrates permitted segments after both tables cross 1,000 rows", async () => {
    const allowed = Array.from({ length: 1_001 }, (_, index) => ({
      segment_id: `seg_${index}`,
    }));
    const segments = Array.from({ length: 1_001 }, (_, index) => ({
      id: `seg_${index}`,
      start_ms: index * 1_000,
      end_ms: index * 1_000 + 900,
      text: `Segment ${index}`,
    }));
    const { client, queries } = createClient({ allowed, segments });

    const repository = new SupabaseLessonRepository(client);
    const result = await repository.listPermittedSegments(JOB_ID, OWNER_ID);

    expect(result).toHaveLength(1_001);
    expect(result.at(-1)).toEqual({
      id: "seg_1000",
      startMs: 1_000_000,
      endMs: 1_000_900,
      text: "Segment 1000",
    });

    expect(
      queries
        .filter((query) => query.table === "language_eligible_segments")
        .map((query) => [query.rangeFrom, query.rangeTo]),
    ).toEqual([
      [0, 999],
      [1_000, 1_999],
    ]);
    expect(
      queries
        .filter((query) => query.table === "transcript_segments")
        .map((query) => [query.rangeFrom, query.rangeTo]),
    ).toEqual([
      [0, 999],
      [1_000, 1_999],
    ]);
  });
});
