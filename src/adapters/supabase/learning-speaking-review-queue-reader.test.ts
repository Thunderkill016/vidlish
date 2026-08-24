import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { createGoldenSessionLearningBlueprint } from "@/adapters/fake/fixture-golden-learning-blueprint";
import { SupabaseLearningSpeakingReviewQueueReader } from "./learning-speaking-review-queue-reader";

const OWNER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_OWNER_ID = "99999999-9999-4999-8999-999999999999";
const DUE_SESSION = "22222222-2222-4222-8222-222222222222";
const UPCOMING_SESSION = "33333333-3333-4333-8333-333333333333";
const ATTEMPTED_SESSION = "44444444-4444-4444-8444-444444444444";
const VERSION_ID = "55555555-5555-4555-8555-555555555555";

type Filter =
  | { kind: "eq"; column: string; value: unknown }
  | { kind: "not-null"; column: string };
type Row = Record<string, unknown>;

class FakeQuery {
  readonly filters: Filter[] = [];
  private selectedColumns: string[] = [];
  private exactCount = false;

  constructor(
    readonly table: string,
    private readonly rows: Row[],
  ) {}

  select(columns: string, options?: { count?: string }) {
    this.selectedColumns = columns.split(",").map((column) => column.trim());
    this.exactCount = options?.count === "exact";
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ kind: "eq", column, value });
    return this;
  }

  not(column: string, operator: string, value: unknown) {
    if (operator === "is" && value === null) {
      this.filters.push({ kind: "not-null", column });
    }
    return this;
  }

  order() {
    return this;
  }

  range(from: number, to: number) {
    const filtered = this.rows.filter((row) =>
      this.filters.every((filter) =>
        filter.kind === "eq"
          ? row[filter.column] === filter.value
          : row[filter.column] !== null && row[filter.column] !== undefined,
      ),
    );
    const data = filtered.slice(from, to + 1).map((row) =>
      Object.fromEntries(
        this.selectedColumns.map((column) => [column, row[column]]),
      ),
    );
    return Promise.resolve({
      data,
      error: null,
      count: this.exactCount ? filtered.length : null,
    });
  }
}

function createClient() {
  const blueprint = createGoldenSessionLearningBlueprint();
  const rows: Record<string, Row[]> = {
    lesson_sessions: [
      {
        id: DUE_SESSION,
        lesson_version_id: VERSION_ID,
        completed_at: "2026-08-22T00:00:00.000Z",
        status: "completed",
        owner_user_id: OWNER_ID,
      },
      {
        id: UPCOMING_SESSION,
        lesson_version_id: VERSION_ID,
        completed_at: "2026-08-24T00:00:00.000Z",
        status: "completed",
        owner_user_id: OWNER_ID,
      },
      {
        id: ATTEMPTED_SESSION,
        lesson_version_id: VERSION_ID,
        completed_at: "2026-08-21T00:00:00.000Z",
        status: "completed",
        owner_user_id: OWNER_ID,
      },
      {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        lesson_version_id: VERSION_ID,
        completed_at: "2026-08-20T00:00:00.000Z",
        status: "completed",
        owner_user_id: OTHER_OWNER_ID,
      },
    ],
    lesson_versions: [
      { id: VERSION_ID, blueprint, owner_user_id: OWNER_ID },
      {
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        blueprint,
        owner_user_id: OTHER_OWNER_ID,
      },
    ],
    learning_speaking_attempts: [
      {
        id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        session_id: ATTEMPTED_SESSION,
        activity_id: "activity_transfer",
        created_at: "2026-08-23T00:00:00.000Z",
        owner_user_id: OWNER_ID,
      },
      {
        id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        session_id: DUE_SESSION,
        activity_id: "activity_transfer",
        created_at: "2026-08-23T00:00:00.000Z",
        owner_user_id: OTHER_OWNER_ID,
      },
    ],
  };
  const queries: FakeQuery[] = [];
  const from = vi.fn((table: string) => {
    const query = new FakeQuery(table, rows[table] ?? []);
    queries.push(query);
    return query;
  });
  return { client: { from } as unknown as SupabaseClient, queries };
}

describe("SupabaseLearningSpeakingReviewQueueReader", () => {
  it("derives due and upcoming speaking reviews while suppressing attempted sessions", async () => {
    const { client } = createClient();
    const queue = await new SupabaseLearningSpeakingReviewQueueReader(client).read(
      OWNER_ID,
      new Date("2026-08-24T02:00:00.000Z"),
    );

    expect(queue.due).toEqual([
      {
        sessionId: DUE_SESSION,
        activityId: "activity_transfer",
        dueAt: "2026-08-23T00:00:00.000Z",
      },
    ]);
    expect(queue.upcoming).toEqual({
      sessionId: UPCOMING_SESSION,
      activityId: "activity_transfer",
      dueAt: "2026-08-25T00:00:00.000Z",
    });
  });

  it("owner-scopes every durable read under the service-role client", async () => {
    const { client, queries } = createClient();
    await new SupabaseLearningSpeakingReviewQueueReader(client).read(OWNER_ID);

    for (const table of [
      "lesson_sessions",
      "lesson_versions",
      "learning_speaking_attempts",
    ]) {
      const query = queries.find((candidate) => candidate.table === table);
      expect(query, `${table} should be queried`).toBeDefined();
      expect(query?.filters).toContainEqual({
        kind: "eq",
        column: "owner_user_id",
        value: OWNER_ID,
      });
    }
  });
});
