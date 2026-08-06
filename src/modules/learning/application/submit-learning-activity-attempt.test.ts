import { describe, expect, it } from "vitest";

import { createFixtureLearningBlueprint } from "@/adapters/fake/fixture-learning-blueprint";
import { InMemoryLearningSessionRepository } from "@/adapters/fake/in-memory-learning-session-repository";
import { SubmitLearningActivityAttempt } from "@/modules/learning/application/submit-learning-activity-attempt";

const ownerUserId = "11111111-1111-4111-8111-111111111111";
const lessonVersionId = "22222222-2222-4222-8222-222222222222";

async function startedRepository() {
  const repository = new InMemoryLearningSessionRepository();
  const started = await repository.start({
    ownerUserId,
    lessonVersionId,
    initialPhase: "gist",
    initialActivityId: "activity_gist",
  });
  return { repository, session: started.session };
}

describe("SubmitLearningActivityAttempt", () => {
  it("persists authoritative feedback and advances to the next phase", async () => {
    const { repository, session } = await startedRepository();
    const result = await new SubmitLearningActivityAttempt(repository).execute({
      ownerUserId,
      sessionId: session.id,
      blueprint: createFixtureLearningBlueprint(),
      activityId: "activity_gist",
      idempotencyKey: "33333333-3333-4333-8333-333333333333",
      response: { kind: "choice", optionId: "option_embedded_player" },
    });

    expect(result.created).toBe(true);
    expect(result.attempt.evaluation.verdict).toBe("correct");
    expect(result.attempt.responseEvidence).toEqual({
      kind: "choice",
      optionId: "option_embedded_player",
    });
    expect(result.session.currentActivityId).toBe("activity_meaning");
    expect(result.session.currentPhase).toBe("practice");
  });

  it("returns the original attempt when a retry arrives after phase advance", async () => {
    const { repository, session } = await startedRepository();
    const useCase = new SubmitLearningActivityAttempt(repository);
    const input = {
      ownerUserId,
      sessionId: session.id,
      blueprint: createFixtureLearningBlueprint(),
      activityId: "activity_gist",
      idempotencyKey: "44444444-4444-4444-8444-444444444444",
      response: {
        kind: "choice" as const,
        optionId: "option_embedded_player",
      },
    };

    const first = await useCase.execute(input);
    const retry = await useCase.execute(input);

    expect(retry.created).toBe(false);
    expect(retry.attempt.id).toBe(first.attempt.id);
    expect(retry.session.currentActivityId).toBe("activity_meaning");
  });

  it("refuses a new request that skips the current activity", async () => {
    const { repository, session } = await startedRepository();
    await expect(
      new SubmitLearningActivityAttempt(repository).execute({
        ownerUserId,
        sessionId: session.id,
        blueprint: createFixtureLearningBlueprint(),
        activityId: "activity_transfer",
        idempotencyKey: "55555555-5555-4555-8555-555555555555",
        response: {
          kind: "self_check",
          text: "I'm a member of the release team.",
          checkedCriteria: [],
        },
      }),
    ).rejects.toThrow(/not current/i);
  });

  it("stores only bounded metadata for productive free-text responses", async () => {
    const { repository, session } = await startedRepository();
    const useCase = new SubmitLearningActivityAttempt(repository);
    const blueprint = createFixtureLearningBlueprint();

    await useCase.execute({
      ownerUserId,
      sessionId: session.id,
      blueprint,
      activityId: "activity_gist",
      idempotencyKey: "56111111-1111-4111-8111-111111111111",
      response: { kind: "choice", optionId: "option_embedded_player" },
    });
    await useCase.execute({
      ownerUserId,
      sessionId: session.id,
      blueprint,
      activityId: "activity_meaning",
      idempotencyKey: "56222222-2222-4222-8222-222222222222",
      response: { kind: "choice", optionId: "option_affiliation" },
    });
    const rawAnswer = "a member of";
    const result = await useCase.execute({
      ownerUserId,
      sessionId: session.id,
      blueprint,
      activityId: "activity_recall",
      idempotencyKey: "56333333-3333-4333-8333-333333333333",
      response: { kind: "text", text: rawAnswer },
    });

    expect(result.attempt.responseEvidence).toEqual({
      kind: "text",
      submitted: true,
      characterCount: rawAnswer.length,
    });
    expect(result.attempt.responseEvidence).not.toHaveProperty("text");
    expect(result.attempt.evaluation).toHaveProperty("reveal.answer", rawAnswer);
  });

  it("marks the session completed only after the exit ticket attempt", async () => {
    const { repository, session } = await startedRepository();
    const useCase = new SubmitLearningActivityAttempt(repository);
    const blueprint = createFixtureLearningBlueprint();
    const attempts = [
      {
        activityId: "activity_gist",
        idempotencyKey: "61111111-1111-4111-8111-111111111111",
        response: {
          kind: "choice" as const,
          optionId: "option_embedded_player",
        },
      },
      {
        activityId: "activity_meaning",
        idempotencyKey: "62222222-2222-4222-8222-222222222222",
        response: { kind: "choice" as const, optionId: "option_affiliation" },
      },
      {
        activityId: "activity_recall",
        idempotencyKey: "63333333-3333-4333-8333-333333333333",
        response: { kind: "text" as const, text: "a member of" },
      },
      {
        activityId: "activity_transfer",
        idempotencyKey: "64444444-4444-4444-8444-444444444444",
        response: {
          kind: "self_check" as const,
          text: "I'm a member of the release team.",
          checkedCriteria: [0, 1, 2],
        },
      },
      {
        activityId: "activity_exit",
        idempotencyKey: "65555555-5555-4555-8555-555555555555",
        response: {
          kind: "reflection" as const,
          text: "Tôi muốn luyện lại chunk này ngày mai.",
        },
      },
    ];

    let last;
    for (const attempt of attempts) {
      last = await useCase.execute({
        ownerUserId,
        sessionId: session.id,
        blueprint,
        ...attempt,
      });
    }

    expect(last?.session.status).toBe("completed");
    expect(last?.session.currentPhase).toBe("completed");
    expect(last?.session.completedAt).not.toBeNull();
    expect(last?.attempt.responseEvidence).toEqual({
      kind: "reflection",
      submitted: true,
      characterCount: "Tôi muốn luyện lại chunk này ngày mai.".length,
    });
    expect(last?.attempt.responseEvidence).not.toHaveProperty("text");
  });
});
