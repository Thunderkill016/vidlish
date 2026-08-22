import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { createGoldenSessionLearningBlueprint } from "@/adapters/fake/fixture-golden-learning-blueprint";
import { SupabaseLearningMeasurementReader } from "./learning-measurement-reader";

const OWNER_ID = "11111111-1111-4111-8111-111111111111";
const SESSION_ID = "22222222-2222-4222-8222-222222222222";
const VERSION_ID = "33333333-3333-4333-8333-333333333333";
const NOW = "2026-08-22T08:00:00.000Z";

type Filter = { column: string; value: unknown };
type QueryResult = { data: unknown; error: null };

class FakeQuery {
  readonly filters: Filter[] = [];

  constructor(
    readonly table: string,
    private readonly one: unknown,
    private readonly many: unknown[],
  ) {}

  select() {
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ column, value });
    return this;
  }

  maybeSingle(): Promise<QueryResult> {
    return Promise.resolve({ data: this.one ?? null, error: null });
  }

  single(): Promise<QueryResult> {
    return Promise.resolve({ data: this.one, error: null });
  }

  order(): Promise<QueryResult> {
    return Promise.resolve({ data: this.many, error: null });
  }
}

function createClient() {
  const queries: FakeQuery[] = [];
  const blueprint = createGoldenSessionLearningBlueprint();
  const singleRows: Record<string, unknown> = {
    lesson_sessions: {
      id: SESSION_ID,
      lesson_version_id: VERSION_ID,
      owner_user_id: OWNER_ID,
      status: "in_progress",
      current_phase: "gist",
      current_activity_id: "activity_gist",
      started_at: NOW,
      completed_at: null,
      updated_at: NOW,
    },
    lesson_versions: { blueprint },
  };
  const multiRows: Record<string, unknown[]> = {
    activity_attempts: [],
    learning_support_events: [],
    learning_product_events: [],
  };
  const from = vi.fn((table: string) => {
    const query = new FakeQuery(
      table,
      singleRows[table],
      multiRows[table] ?? [],
    );
    queries.push(query);
    return query;
  });

  return {
    client: { from } as unknown as SupabaseClient,
    queries,
  };
}

describe("SupabaseLearningMeasurementReader", () => {
  it("owner-scopes every service-role read instead of relying on RLS", async () => {
    const { client, queries } = createClient();
    const summary = await new SupabaseLearningMeasurementReader(client).read(
      OWNER_ID,
      SESSION_ID,
    );

    expect(summary).toMatchObject({
      sessionId: SESSION_ID,
      status: "in_progress",
      lastKnownActivityId: "activity_gist",
    });

    const queriedTables = [
      "lesson_sessions",
      "lesson_versions",
      "activity_attempts",
      "learning_support_events",
      "learning_product_events",
    ];
    for (const table of queriedTables) {
      const query = queries.find((candidate) => candidate.table === table);
      expect(query, `${table} should be queried`).toBeDefined();
      expect(query?.filters).toContainEqual({
        column: "owner_user_id",
        value: OWNER_ID,
      });
    }

    const sessionQuery = queries.find(
      (candidate) => candidate.table === "lesson_sessions",
    );
    expect(sessionQuery?.filters).toContainEqual({
      column: "id",
      value: SESSION_ID,
    });
  });
});
