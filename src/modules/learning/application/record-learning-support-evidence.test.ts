import { deriveLearningRuntimePolicy } from "@/modules/learning/application/derive-learning-runtime-policy";
import { describe, expect, it } from "vitest";

import { createGoldenSessionLearningBlueprint } from "@/adapters/fake/fixture-golden-learning-blueprint";
import { createFixtureLearningRuntimePolicy } from "@/adapters/fake/fixture-learning-runtime-policy";
import { InMemoryLearningSessionRepository } from "@/adapters/fake/in-memory-learning-session-repository";
import { RecordLearningSupportEvidence } from "@/modules/learning/application/record-learning-support-evidence";
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

function useCase(repository: InMemoryLearningSessionRepository) {
  return new RecordLearningSupportEvidence(repository);
}

const blueprint = createGoldenSessionLearningBlueprint();
const policy = createFixtureLearningRuntimePolicy();

describe("RecordLearningSupportEvidence", () => {
  it("assigns playback ordinals on the server and makes request retries idempotent", async () => {
    const { repository, session } = await startedRepository();
    const record = useCase(repository);
    const firstInput = {
      ownerUserId,
      sessionId: session.id,
      blueprint,
      policy,
      activityId: "activity_gist",
      idempotencyKey: "71111111-1111-4111-8111-111111111111",
      eventKind: "playback" as const,
    };

    const first = await record.execute(firstInput);
    const retry = await record.execute(firstInput);
    const second = await record.execute({
      ...firstInput,
      idempotencyKey: "72222222-2222-4222-8222-222222222222",
    });

    expect(first.created).toBe(true);
    expect(first.event.playbackOrdinal).toBe(1);
    expect(first.event.supportStep).toBeNull();
    expect(retry.created).toBe(false);
    expect(retry.event.id).toBe(first.event.id);
    expect(second.event.playbackOrdinal).toBe(2);
  });

  it("stores a support level only once even when a new client key repeats it", async () => {
    const { repository, session } = await startedRepository();
    const record = useCase(repository);
    const first = await record.execute({
      ownerUserId,
      sessionId: session.id,
      blueprint,
      policy,
      activityId: "activity_gist",
      idempotencyKey: "73333333-3333-4333-8333-333333333333",
      eventKind: "support_opened",
      supportStep: "context_hint",
    });
    const duplicate = await record.execute({
      ownerUserId,
      sessionId: session.id,
      blueprint,
      policy,
      activityId: "activity_gist",
      idempotencyKey: "74444444-4444-4444-8444-444444444444",
      eventKind: "support_opened",
      supportStep: "context_hint",
    });

    expect(first.created).toBe(true);
    expect(first.event.supportStep).toBe("context_hint");
    expect(first.event.playbackOrdinal).toBeNull();
    expect(duplicate.created).toBe(false);
    expect(duplicate.event.id).toBe(first.event.id);
  });

  it("blocks full reveal before an attempt and permits it after the attempt boundary", async () => {
    const { repository, session } = await startedRepository();
    const record = useCase(repository);

    await expect(
      record.execute({
        ownerUserId,
        sessionId: session.id,
        blueprint,
        policy,
        activityId: "activity_gist",
        idempotencyKey: "75555555-5555-4555-8555-555555555555",
        eventKind: "support_opened",
        supportStep: "english_caption",
      }),
    ).rejects.toThrow(/attempt boundary/i);

    await new SubmitLearningActivityAttempt(repository).execute({
      ownerUserId,
      sessionId: session.id,
      blueprint,
      policy: deriveLearningRuntimePolicy(blueprint),
      activityId: "activity_gist",
      idempotencyKey: "76666666-6666-4666-8666-666666666666",
      response: { kind: "choice", optionId: "option_camera_hardware" },
    });

    const revealed = await record.execute({
      ownerUserId,
      sessionId: session.id,
      blueprint,
      policy,
      activityId: "activity_gist",
      idempotencyKey: "77777777-7777-4777-8777-777777777777",
      eventKind: "support_opened",
      supportStep: "english_caption",
    });

    expect(revealed.created).toBe(true);
    expect(revealed.event.supportStep).toBe("english_caption");
  });

  it("persists only bounded labels and ordinals, never support copy", async () => {
    const { repository, session } = await startedRepository();
    const result = await useCase(repository).execute({
      ownerUserId,
      sessionId: session.id,
      blueprint,
      policy,
      activityId: "activity_gist",
      idempotencyKey: "78888888-8888-4888-8888-888888888888",
      eventKind: "support_opened",
      supportStep: "keyword_hint",
    });

    expect(result.event).toMatchObject({
      activityId: "activity_gist",
      eventKind: "support_opened",
      supportStep: "keyword_hint",
      playbackOrdinal: null,
    });
    expect(result.event).not.toHaveProperty("text");
    expect(result.event).not.toHaveProperty("copy");
    expect(result.event).not.toHaveProperty("caption");
  });
});
