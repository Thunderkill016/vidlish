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

type MultiRows = Record<string, unknown[]>;

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

function createClient(overrides: Partial<MultiRows> = {}) {
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
  const multiRows: MultiRows = {
    activity_attempts: [],
    learning_support_events: [],
    learning_product_events: [],
    ...overrides,
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
      capabilityObservations: [],
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

  it("projects privacy-safe capability observations from durable attempts", async () => {
    const attemptId = "44444444-4444-4444-8444-444444444444";
    const { client } = createClient({
      activity_attempts: [
        {
          id: attemptId,
          session_id: SESSION_ID,
          activity_id: "activity_meaning",
          attempt_number: 1,
          idempotency_key: attemptId,
          response: { kind: "choice", optionId: "option_affiliation" },
          evaluation: {
            verdict: "correct",
            goalVi: "Nhận ra chức năng giao tiếp của language chunk.",
            evidenceVi: "Đáp án đúng theo evaluator phía server.",
            nextStepVi: "Tiếp tục sang bước retrieval.",
            evidenceRefs: [],
          },
          submitted_at: "2026-08-22T08:00:00+00:00",
        },
      ],
    });

    const summary = await new SupabaseLearningMeasurementReader(client).read(
      OWNER_ID,
      SESSION_ID,
    );

    expect(summary?.capabilityObservations).toEqual([
      {
        subject: { kind: "activity", key: "activity_meaning" },
        targetSkill: "reading",
        support: "independent",
        responseMode: "selection",
        verification: "objective",
        outcome: "successful",
        evidenceKind: "lesson_activity",
        observedAt: "2026-08-22T08:00:00+00:00",
      },
    ]);
    expect(JSON.stringify(summary?.capabilityObservations)).not.toContain(
      "option_affiliation",
    );
  });
});
