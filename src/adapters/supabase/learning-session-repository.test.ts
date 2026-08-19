import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { SupabaseLearningSessionRepository } from "./learning-session-repository";

const OWNER_ID = "11111111-1111-4111-8111-111111111111";
const LESSON_VERSION_ID = "22222222-2222-4222-8222-222222222222";
const SESSION_ID = "33333333-3333-4333-8333-333333333333";
const ATTEMPT_ID = "44444444-4444-4444-8444-444444444444";
const IDEMPOTENCY_KEY = "55555555-5555-4555-8555-555555555555";
const NOW = "2026-08-06T12:00:00.000Z";

type QueryResult = { data: unknown; error: null };

class FakeQuery {
  private filters: Array<{ column: string; value: unknown }> = [];

  constructor(
    private readonly table: string,
    private readonly rows: Record<string, unknown>,
  ) {}

  select() {
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ column, value });
    return this;
  }

  maybeSingle(): Promise<QueryResult> {
    return Promise.resolve({
      data: this.rows[this.table] ?? null,
      error: null,
    });
  }

  single(): Promise<QueryResult> {
    const data = this.rows[this.table];
    if (!data) throw new Error(`Missing fake row for ${this.table}`);
    return Promise.resolve({ data, error: null });
  }
}

function createClient(input: {
  rpcRows: unknown[];
  tableRows?: Record<string, unknown>;
}) {
  const rpc = vi.fn(async () => ({
    data: input.rpcRows.shift(),
    error: null,
  }));
  const from = vi.fn(
    (table: string) => new FakeQuery(table, input.tableRows ?? {}),
  );

  return {
    client: { rpc, from } as unknown as SupabaseClient,
    rpc,
    from,
  };
}

const sessionRow = {
  id: SESSION_ID,
  lesson_version_id: LESSON_VERSION_ID,
  owner_user_id: OWNER_ID,
  status: "in_progress",
  current_phase: "gist",
  current_activity_id: "activity_gist",
  started_at: NOW,
  completed_at: null,
  updated_at: NOW,
};

const evaluation = {
  verdict: "correct" as const,
  goalVi: "Hiểu ý chính.",
  evidenceVi: "Bạn đã chọn đúng ý chính.",
  nextStepVi: "Tiếp tục.",
  evidenceRefs: [],
};

describe("SupabaseLearningSessionRepository", () => {
  it("starts or resumes an owned session through the transactional RPC", async () => {
    const { client, rpc } = createClient({
      rpcRows: [
        [
          {
            session_id: SESSION_ID,
            session_status: "in_progress",
            current_phase: "gist",
            current_activity_id: "activity_gist",
            started_at: NOW,
            completed_at: null,
            updated_at: NOW,
            created: true,
          },
        ],
      ],
    });
    const repository = new SupabaseLearningSessionRepository(client);

    await expect(
      repository.start({
        ownerUserId: OWNER_ID,
        lessonVersionId: LESSON_VERSION_ID,
        initialPhase: "gist",
        initialActivityId: "activity_gist",
      }),
    ).resolves.toEqual({
      created: true,
      session: {
        id: SESSION_ID,
        ownerUserId: OWNER_ID,
        lessonVersionId: LESSON_VERSION_ID,
        status: "in_progress",
        currentPhase: "gist",
        currentActivityId: "activity_gist",
        startedAt: NOW,
        completedAt: null,
        updatedAt: NOW,
      },
    });
    expect(rpc).toHaveBeenCalledWith("start_lesson_v2_session", {
      p_owner_user_id: OWNER_ID,
      p_lesson_version_id: LESSON_VERSION_ID,
      p_initial_phase: "gist",
      p_initial_activity_id: "activity_gist",
    });
  });

  it("returns null when the owned session does not exist", async () => {
    const { client } = createClient({ rpcRows: [], tableRows: {} });
    const repository = new SupabaseLearningSessionRepository(client);

    await expect(
      repository.findOwnedSession(SESSION_ID, OWNER_ID),
    ).resolves.toBeNull();
  });

  it("records only privacy-safe response evidence and hydrates canonical rows", async () => {
    const { client, rpc, from } = createClient({
      rpcRows: [
        [
          {
            attempt_id: ATTEMPT_ID,
            attempt_number: 1,
            session_status: "in_progress",
            current_phase: "practice",
            current_activity_id: "activity_meaning",
            completed_at: null,
            created: true,
          },
        ],
      ],
      tableRows: {
        activity_attempts: {
          id: ATTEMPT_ID,
          session_id: SESSION_ID,
          activity_id: "activity_gist",
          attempt_number: 1,
          idempotency_key: IDEMPOTENCY_KEY,
          response: {
            kind: "choice",
            optionId: "option_embedded_player",
          },
          evaluation,
          submitted_at: NOW,
        },
        lesson_sessions: {
          ...sessionRow,
          current_phase: "practice",
          current_activity_id: "activity_meaning",
        },
      },
    });
    const repository = new SupabaseLearningSessionRepository(client);

    const result = await repository.recordAttempt({
      ownerUserId: OWNER_ID,
      sessionId: SESSION_ID,
      activityId: "activity_gist",
      idempotencyKey: IDEMPOTENCY_KEY,
      responseEvidence: {
        kind: "choice",
        optionId: "option_embedded_player",
      },
      evaluation,
      nextPhase: "practice",
      nextActivityId: "activity_meaning",
      complete: false,
      reviewItemKeys: [],
    });

    expect(rpc).toHaveBeenCalledWith("record_lesson_v2_attempt", {
      p_owner_user_id: OWNER_ID,
      p_session_id: SESSION_ID,
      p_activity_id: "activity_gist",
      p_idempotency_key: IDEMPOTENCY_KEY,
      p_response: {
        kind: "choice",
        optionId: "option_embedded_player",
      },
      p_evaluation: evaluation,
      p_next_phase: "practice",
      p_next_activity_id: "activity_meaning",
      p_complete: false,
    });
    expect(from).toHaveBeenCalledWith("activity_attempts");
    expect(from).toHaveBeenCalledWith("lesson_sessions");
    expect(result.created).toBe(true);
    expect(result.attempt).toMatchObject({
      id: ATTEMPT_ID,
      sessionId: SESSION_ID,
      activityId: "activity_gist",
      responseEvidence: {
        kind: "choice",
        optionId: "option_embedded_player",
      },
      evaluation,
    });
    expect(result.session.currentActivityId).toBe("activity_meaning");
  });
});
