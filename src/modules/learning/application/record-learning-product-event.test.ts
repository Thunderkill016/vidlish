import { describe, expect, it } from "vitest";

import { createGoldenSessionLearningBlueprint } from "@/adapters/fake/fixture-golden-learning-blueprint";
import { InMemoryLearningProductEventRepository } from "@/adapters/fake/in-memory-learning-product-event-repository";
import { InMemoryLearningSessionRepository } from "@/adapters/fake/in-memory-learning-session-repository";
import { RecordLearningProductEvent } from "@/modules/learning/application/record-learning-product-event";
import { SubmitLearningActivityAttempt } from "@/modules/learning/application/submit-learning-activity-attempt";
import { deriveLearningRuntimePolicy } from "@/modules/learning/application/derive-learning-runtime-policy";
import {
  privacySafeLearningProductEventSchema,
  recordLearningProductEventRequestSchema,
} from "@/shared/contracts/learning-product-events";

const ownerUserId = "11111111-1111-4111-8111-111111111111";
const otherUserId = "99999999-9999-4999-8999-999999999999";
const lessonVersionId = "22222222-2222-4222-8222-222222222222";
const blueprint = createGoldenSessionLearningBlueprint();

async function started() {
  const sessions = new InMemoryLearningSessionRepository();
  const events = new InMemoryLearningProductEventRepository();
  const result = await sessions.start({
    ownerUserId,
    lessonVersionId,
    initialPhase: "gist",
    initialActivityId: "activity_gist",
  });
  return {
    sessions,
    events,
    session: result.session,
    record: new RecordLearningProductEvent(sessions, events),
  };
}

describe("learning product event contract", () => {
  it("rejects arbitrary fields and free-form runtime error details", () => {
    expect(
      recordLearningProductEventRequestSchema.safeParse({
        sessionId: "33333333-3333-4333-8333-333333333333",
        activityId: "activity_gist",
        idempotencyKey: "44444444-4444-4444-8444-444444444444",
        eventKind: "runtime_error",
        detailKind: "youtube_player",
        message: "provider said something private",
      }).success,
    ).toBe(false);

    expect(
      recordLearningProductEventRequestSchema.safeParse({
        sessionId: "33333333-3333-4333-8333-333333333333",
        activityId: "activity_gist",
        idempotencyKey: "44444444-4444-4444-8444-444444444444",
        eventKind: "runtime_error",
        detailKind: "raw provider error text",
      }).success,
    ).toBe(false);
  });

  it("rejects detail data on non-error events", () => {
    const parsed = privacySafeLearningProductEventSchema.safeParse({
      id: "55555555-5555-4555-8555-555555555555",
      sessionId: "33333333-3333-4333-8333-333333333333",
      activityId: "activity_gist",
      idempotencyKey: "44444444-4444-4444-8444-444444444444",
      eventKind: "source_play_completed",
      detailKind: "youtube_player",
      occurredAt: "2026-08-22T08:00:00+00:00",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("RecordLearningProductEvent", () => {
  it("records confirmed source completion without changing learning progress", async () => {
    const { sessions, events, session, record } = await started();
    expect(
      await sessions.findSessionProgress({ ownerUserId, sessionId: session.id }),
    ).toEqual([]);

    const result = await record.execute({
      ownerUserId,
      sessionId: session.id,
      blueprint,
      activityId: "activity_gist",
      idempotencyKey: "61111111-1111-4111-8111-111111111111",
      eventKind: "source_play_completed",
    });

    expect(result.created).toBe(true);
    expect(result.event).toMatchObject({
      activityId: "activity_gist",
      eventKind: "source_play_completed",
      detailKind: null,
    });
    expect(
      await sessions.findSessionProgress({ ownerUserId, sessionId: session.id }),
    ).toEqual([]);
    expect(
      await events.listForSession({ ownerUserId, sessionId: session.id }),
    ).toHaveLength(1);
  });

  it("requires a persisted attempt before correction_shown", async () => {
    const { sessions, session, record } = await started();

    await expect(
      record.execute({
        ownerUserId,
        sessionId: session.id,
        blueprint,
        activityId: "activity_gist",
        idempotencyKey: "62222222-2222-4222-8222-222222222222",
        eventKind: "correction_shown",
      }),
    ).rejects.toThrow(/persisted attempt/i);

    await new SubmitLearningActivityAttempt(sessions).execute({
      ownerUserId,
      sessionId: session.id,
      blueprint,
      policy: deriveLearningRuntimePolicy(blueprint),
      activityId: "activity_gist",
      idempotencyKey: "63333333-3333-4333-8333-333333333333",
      response: { kind: "choice", optionId: "option_camera_hardware" },
    });

    const result = await record.execute({
      ownerUserId,
      sessionId: session.id,
      blueprint,
      activityId: "activity_gist",
      idempotencyKey: "64444444-4444-4444-8444-444444444444",
      eventKind: "correction_shown",
    });
    expect(result.event.eventKind).toBe("correction_shown");
  });

  it("rejects non-owned sessions and non-blueprint activities", async () => {
    const { session, record } = await started();

    await expect(
      record.execute({
        ownerUserId: otherUserId,
        sessionId: session.id,
        blueprint,
        activityId: "activity_gist",
        idempotencyKey: "65555555-5555-4555-8555-555555555555",
        eventKind: "runtime_error",
        detailKind: "youtube_player",
      }),
    ).rejects.toThrow(/session was not found/i);

    await expect(
      record.execute({
        ownerUserId,
        sessionId: session.id,
        blueprint,
        activityId: "activity_missing",
        idempotencyKey: "66666666-6666-4666-8666-666666666666",
        eventKind: "runtime_error",
        detailKind: "youtube_player",
      }),
    ).rejects.toThrow(/does not belong/i);
  });

  it("keeps fake event inspection owner-scoped", async () => {
    const { events, session, record } = await started();
    await record.execute({
      ownerUserId,
      sessionId: session.id,
      blueprint,
      activityId: "activity_gist",
      idempotencyKey: "67777777-7777-4777-8777-777777777777",
      eventKind: "runtime_error",
      detailKind: "youtube_api_load",
    });

    expect(
      await events.listForSession({ ownerUserId, sessionId: session.id }),
    ).toHaveLength(1);
    expect(
      await events.listForSession({ ownerUserId: otherUserId, sessionId: session.id }),
    ).toEqual([]);
  });
});
