import { describe, expect, it } from "vitest";

import { createFixtureLearningBlueprint } from "./fixture-learning-blueprint";
import { InMemoryLessonVersionRepository } from "./in-memory-lesson-version-repository";

const OWNER = "11111111-1111-4111-8111-111111111111";
const STRANGER = "22222222-2222-4222-8222-222222222222";
const LESSON = "66666666-6666-4666-8666-666666666666";

function publishInput(overrides: Partial<{ ownerUserId: string }> = {}) {
  return {
    ownerUserId: overrides.ownerUserId ?? OWNER,
    lessonId: LESSON,
    blueprint: createFixtureLearningBlueprint(),
  };
}

describe("InMemoryLessonVersionRepository", () => {
  it("publishes a lesson version", async () => {
    const repository = new InMemoryLessonVersionRepository();
    const result = await repository.publish(publishInput());
    expect(result.created).toBe(true);
    expect(result.lessonVersionId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("returns the existing version instead of publishing twice", async () => {
    // Publish-once, same as the database. A learner may already have a session
    // running on this blueprint, and replacing it changes the task under them.
    const repository = new InMemoryLessonVersionRepository();
    const first = await repository.publish(publishInput());
    const second = await repository.publish(publishInput());

    expect(second.created).toBe(false);
    expect(second.lessonVersionId).toBe(first.lessonVersionId);
  });

  it("refuses a lesson owned by someone else", async () => {
    const repository = new InMemoryLessonVersionRepository();
    await repository.publish(publishInput());
    await expect(
      repository.publish(publishInput({ ownerUserId: STRANGER })),
    ).rejects.toThrow(/owned lesson not found/);
  });

  it("rejects a blueprint that does not parse", async () => {
    // Catching this at publish time rather than at read time is the difference
    // between a failed job and a learner staring at a broken session.
    const repository = new InMemoryLessonVersionRepository();
    const broken = {
      ...createFixtureLearningBlueprint(),
      activities: [],
    };
    await expect(
      repository.publish({
        ownerUserId: OWNER,
        lessonId: LESSON,
        blueprint: broken,
      }),
    ).rejects.toThrow();
  });
});
