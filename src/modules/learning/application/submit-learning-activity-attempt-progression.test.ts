import { describe, expect, it } from "vitest";

import { createFixtureLearningBlueprint } from "@/adapters/fake/fixture-learning-blueprint";
import { InMemoryLearningSessionRepository } from "@/adapters/fake/in-memory-learning-session-repository";
import { SubmitLearningActivityAttempt } from "@/modules/learning/application/submit-learning-activity-attempt";

const OWNER_ID = "11111111-1111-4111-8111-111111111111";
const LESSON_VERSION_ID = "22222222-2222-4222-8222-222222222222";

async function startedUseCase() {
  const repository = new InMemoryLearningSessionRepository();
  const { session } = await repository.start({
    ownerUserId: OWNER_ID,
    lessonVersionId: LESSON_VERSION_ID,
    initialPhase: "gist",
    initialActivityId: "activity_gist",
  });
  return {
    session,
    useCase: new SubmitLearningActivityAttempt(repository),
    blueprint: createFixtureLearningBlueprint(),
  };
}

async function reachTransfer() {
  const state = await startedUseCase();
  const attempts = [
    {
      activityId: "activity_gist",
      idempotencyKey: "31111111-1111-4111-8111-111111111111",
      response: {
        kind: "choice" as const,
        optionId: "option_embedded_player",
      },
    },
    {
      activityId: "activity_meaning",
      idempotencyKey: "32222222-2222-4222-8222-222222222222",
      response: { kind: "choice" as const, optionId: "option_affiliation" },
    },
    {
      activityId: "activity_recall",
      idempotencyKey: "33333333-3333-4333-8333-333333333333",
      response: { kind: "text" as const, text: "a member of" },
    },
  ];
  for (const attempt of attempts) {
    await state.useCase.execute({
      ownerUserId: OWNER_ID,
      sessionId: state.session.id,
      blueprint: state.blueprint,
      ...attempt,
    });
  }
  return state;
}

describe("SubmitLearningActivityAttempt progression", () => {
  it("keeps an incorrect activity current until a later retry succeeds", async () => {
    const { session, useCase, blueprint } = await startedUseCase();

    const wrong = await useCase.execute({
      ownerUserId: OWNER_ID,
      sessionId: session.id,
      blueprint,
      activityId: "activity_gist",
      idempotencyKey: "41111111-1111-4111-8111-111111111111",
      response: { kind: "choice", optionId: "option_unrelated_topic" },
    });

    expect(wrong.attempt.evaluation.verdict).toBe("incorrect");
    expect(wrong.session.currentActivityId).toBe("activity_gist");
    expect(wrong.session.currentPhase).toBe("gist");

    const retry = await useCase.execute({
      ownerUserId: OWNER_ID,
      sessionId: session.id,
      blueprint,
      activityId: "activity_gist",
      idempotencyKey: "42222222-2222-4222-8222-222222222222",
      response: { kind: "choice", optionId: "option_embedded_player" },
    });

    expect(retry.attempt.evaluation.verdict).toBe("correct");
    expect(retry.session.currentActivityId).toBe("activity_meaning");
    expect(retry.session.currentPhase).toBe("practice");
  });

  it("keeps transfer current until every bounded self-check criterion is confirmed", async () => {
    const { session, useCase, blueprint } = await reachTransfer();

    const first = await useCase.execute({
      ownerUserId: OWNER_ID,
      sessionId: session.id,
      blueprint,
      activityId: "activity_transfer",
      idempotencyKey: "43333333-3333-4333-8333-333333333333",
      response: {
        kind: "self_check",
        text: "I'm a member of the release team.",
        checkedCriteria: [],
      },
    });

    expect(first.attempt.evaluation.verdict).toBe("self_check");
    expect(first.session.currentActivityId).toBe("activity_transfer");

    const confirmed = await useCase.execute({
      ownerUserId: OWNER_ID,
      sessionId: session.id,
      blueprint,
      activityId: "activity_transfer",
      idempotencyKey: "44444444-4444-4444-8444-444444444444",
      response: {
        kind: "self_check",
        text: "I'm a member of the release team.",
        checkedCriteria: [0, 1, 2],
      },
    });

    expect(confirmed.session.currentActivityId).toBe("activity_exit");
    expect(confirmed.session.currentPhase).toBe("reflect");
  });

  it("does not accept duplicate criterion indexes as complete transfer evidence", async () => {
    const { session, useCase, blueprint } = await reachTransfer();

    const result = await useCase.execute({
      ownerUserId: OWNER_ID,
      sessionId: session.id,
      blueprint,
      activityId: "activity_transfer",
      idempotencyKey: "45555555-5555-4555-8555-555555555555",
      response: {
        kind: "self_check",
        text: "I'm a member of the release team.",
        checkedCriteria: [0, 0, 1],
      },
    });

    expect(result.session.currentActivityId).toBe("activity_transfer");
    expect(result.session.currentPhase).toBe("transfer");
  });
});
