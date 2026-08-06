import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { SupabaseTranscriptRepository } from "./transcript-repository";

const JOB_ID = "11111111-1111-4111-8111-111111111111";
const OWNER_ID = "22222222-2222-4222-8222-222222222222";
const TRANSCRIPT_ID = "33333333-3333-4333-8333-333333333333";

type QueryResult = { data: unknown; error: null; count: number | null };

class FakeQuery implements PromiseLike<QueryResult> {
  rangeFrom = 0;
  rangeTo = Number.MAX_SAFE_INTEGER;

  constructor(
    readonly table: string,
    private readonly segments: Array<Record<string, unknown>>,
  ) {}

  select() {
    return this;
  }

  eq() {
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

    if (this.table === "transcripts") {
      return {
        data: {
          strategy_id: "supadata-native-caption",
          provider: "supadata",
          source_type: "native_caption",
          declared_language: "en",
          available_languages: ["en"],
          track_kind: "manual",
          translation_status: "original",
          normalized_hash: "a".repeat(64),
          normalization_version: "transcript-normalization:v1",
          duration_ms: 1_973_840,
          videos: { youtube_video_id: "video123" },
        },
        error: null,
        count: 1,
      };
    }

    if (this.table === "transcript_segments") {
      return {
        data: this.segments.slice(this.rangeFrom, this.rangeTo + 1),
        error: null,
        count: this.segments.length,
      };
    }

    throw new Error(`Unexpected table: ${this.table}`);
  }
}

describe("SupabaseTranscriptRepository.findCanonicalForJob", () => {
  it("returns all 1,149 ordered segments instead of a successful partial transcript", async () => {
    const segmentRows = Array.from({ length: 1_149 }, (_, index) => ({
      id: `seg_${index}`,
      position: index,
      start_ms: index * 1_000,
      end_ms: index * 1_000 + 900,
      text: `Segment ${index}`,
      confidence: null,
      detected_language: null,
    }));
    const queries: FakeQuery[] = [];
    const client = {
      from: vi.fn((table: string) => {
        const query = new FakeQuery(table, segmentRows);
        queries.push(query);
        return query;
      }),
    } as unknown as SupabaseClient;

    const repository = new SupabaseTranscriptRepository(client);
    const transcript = await repository.findCanonicalForJob(OWNER_ID, JOB_ID);

    expect(transcript?.segments).toHaveLength(1_149);
    expect(transcript?.segments.at(-1)).toEqual({
      id: "seg_1148",
      position: 1_148,
      startMs: 1_148_000,
      endMs: 1_148_900,
      text: "Segment 1148",
    });
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
