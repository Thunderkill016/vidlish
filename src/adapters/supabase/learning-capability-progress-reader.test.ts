import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { createGoldenSessionLearningBlueprint } from "@/adapters/fake/fixture-golden-learning-blueprint";
import { SupabaseLearningCapabilityProgressReader } from "./learning-capability-progress-reader";

const OWNER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_OWNER_ID = "99999999-9999-4999-8999-999999999999";
const SESSION_ID = "22222222-2222-4222-8222-222222222222";
const VERSION_ID = "33333333-3333-4333-8333-333333333333";
const ATTEMPT_ID = "44444444-4444-4444-8444-444444444444";
const SUPPORT_ID = "55555555-5555-4555-8555-555555555555";
const REVIEW_SESSION_ID = "66666666-6666-4666-8666-666666666666";
const REVIEW_ATTEMPT_1 = "77777777-7777-4777-8777-777777777777";
const REVIEW_ATTEMPT_2 = "88888888-8888-4888-8888-888888888888";
const SPEAKING_ATTEMPT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const NOW = "2026-08-23T12:00:00.000Z";

type Filter =
  | { kind: "eq"; column: string; value: unknown }
  | { kind: "gt"; column: string; value: number };

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

  gt(column: string, value: number) {
    this.filters.push({ kind: "gt", column, value });
    return this;
  }

  order() {
    return this;
  }

  range(from: number, to: number) {
    const filtered = this.rows.filter((row) =>
      this.filters.every((filter) => {
        if (filter.kind === "eq") return row[filter.column] === filter.value;
        const candidate = row[filter.column];
        return typeof candidate === "number" && candidate > filter.value;
      }),
    );
    const selected = filtered.slice(from, to + 1).map((row) =>
      Object.fromEntries(
        this.selectedColumns.map((column) => [column, row[column]]),
      ),
    );
    return Promise.resolve({
      data: selected,
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
        id: SESSION_ID,
        lesson_version_id: VERSION_ID,
        owner_user_id: OWNER_ID,
      },
    ],
    lesson_versions: [
      { id: VERSION_ID, blueprint, owner_user_id: OWNER_ID },
    ],
    activity_attempts: [
      {
        id: ATTEMPT_ID,
        session_id: SESSION_ID,
        activity_id: "activity_meaning",
        attempt_number: 1,
        idempotency_key: ATTEMPT_ID,
        response: { kind: "choice", optionId: "option_affiliation" },
        evaluation: {
          verdict: "correct",
          goalVi: "Nhận ra nghĩa của cụm trong ngữ cảnh nguồn.",
          evidenceVi: "Đáp án khớp evidence nguồn đã hydrate.",
          nextStepVi: "Tiếp tục sang retrieval.",
          evidenceRefs: [],
        },
        submitted_at: NOW,
        owner_user_id: OWNER_ID,
      },
    ],
    learning_support_events: [
      {
        id: SUPPORT_ID,
        session_id: SESSION_ID,
        activity_id: "activity_meaning",
        idempotency_key: SUPPORT_ID,
        event_kind: "support_opened",
        support_step: "context_hint",
        playback_ordinal: null,
        occurred_at: "2026-08-23T11:59:00.000Z",
        owner_user_id: OWNER_ID,
      },
    ],
    learning_item_states: [
      {
        item_key: "water",
        successful_retrievals: 0,
        last_independent_at: null,
        successful_dictations: 1,
        last_successful_dictation_at: NOW,
        last_independent_dictation_at: NOW,
        owner_user_id: OWNER_ID,
      },
      {
        item_key: "private-other-owner-word",
        successful_retrievals: 0,
        last_independent_at: null,
        successful_dictations: 10,
        last_successful_dictation_at: NOW,
        last_independent_dictation_at: NOW,
        owner_user_id: OTHER_OWNER_ID,
      },
    ],
    learning_review_sessions: [
      {
        id: REVIEW_SESSION_ID,
        item_key: "a-member-of",
        owner_user_id: OWNER_ID,
      },
    ],
    learning_review_attempts: [
      {
        id: REVIEW_ATTEMPT_1,
        review_session_id: REVIEW_SESSION_ID,
        step: "recall",
        attempt_number: 1,
        idempotency_key: REVIEW_ATTEMPT_1,
        response: { kind: "text", submitted: true, characterCount: 9 },
        evaluation: { step: "recall", verdict: "incorrect" },
        submitted_at: "2026-08-23T12:10:00.000Z",
        owner_user_id: OWNER_ID,
      },
      {
        id: REVIEW_ATTEMPT_2,
        review_session_id: REVIEW_SESSION_ID,
        step: "recall",
        attempt_number: 2,
        idempotency_key: REVIEW_ATTEMPT_2,
        response: { kind: "text", submitted: true, characterCount: 11 },
        evaluation: { step: "recall", verdict: "correct" },
        submitted_at: "2026-08-23T12:11:00.000Z",
        owner_user_id: OWNER_ID,
      },
    ],
    learning_speaking_attempts: [
      {
        id: SPEAKING_ATTEMPT_ID,
        session_id: SESSION_ID,
        activity_id: "activity_transfer",
        idempotency_key: SPEAKING_ATTEMPT_ID,
        duration_ms: 2600,
        byte_count: 9000,
        mime_type: "audio/webm;codecs=opus",
        replayed: true,
        confirmed_audible_speech: true,
        created_at: "2026-08-23T12:20:00.000Z",
        owner_user_id: OWNER_ID,
      },
      {
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        session_id: SESSION_ID,
        activity_id: "activity_transfer",
        idempotency_key: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        duration_ms: 9999,
        byte_count: 9999,
        mime_type: "audio/webm",
        replayed: true,
        confirmed_audible_speech: true,
        created_at: "2026-08-23T12:21:00.000Z",
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

describe("SupabaseLearningCapabilityProgressReader", () => {
  it("combines beginner, lesson, review and speaking receipts without inflating objective skill", async () => {
    const { client } = createClient();
    const summary = await new SupabaseLearningCapabilityProgressReader(client).read(
      OWNER_ID,
    );

    expect(summary.totalObservations).toBe(5);
    expect(summary.skills.find((entry) => entry.skill === "listening")).toMatchObject({
      objectiveIndependentSuccesses: 1,
      objectiveSupportedSuccesses: 0,
    });
    expect(summary.skills.find((entry) => entry.skill === "reading")).toMatchObject({
      objectiveIndependentSuccesses: 0,
      objectiveSupportedSuccesses: 1,
    });
    expect(summary.skills.find((entry) => entry.skill === "writing")).toMatchObject({
      objectiveIndependentSuccesses: 0,
      objectiveSupportedSuccesses: 1,
      objectiveFailures: 1,
    });
    expect(summary.skills.find((entry) => entry.skill === "speaking")).toMatchObject({
      objectiveIndependentSuccesses: 0,
      objectiveSupportedSuccesses: 0,
      objectiveFailures: 0,
      unscoredObservations: 1,
    });
  });

  it("owner-scopes every durable evidence read even when using a service client", async () => {
    const { client, queries } = createClient();
    await new SupabaseLearningCapabilityProgressReader(client).read(OWNER_ID);

    for (const table of [
      "lesson_sessions",
      "lesson_versions",
      "activity_attempts",
      "learning_support_events",
      "learning_item_states",
      "learning_review_sessions",
      "learning_review_attempts",
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

  it("never lets another owner's beginner or speaking evidence leak into totals", async () => {
    const { client } = createClient();
    const summary = await new SupabaseLearningCapabilityProgressReader(client).read(
      OWNER_ID,
    );

    const listening = summary.skills.find((entry) => entry.skill === "listening");
    const speaking = summary.skills.find((entry) => entry.skill === "speaking");
    expect(listening?.objectiveIndependentSuccesses).toBe(1);
    expect(speaking?.unscoredObservations).toBe(1);
    expect(summary.totalObservations).toBe(5);
  });
});