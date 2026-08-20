import { describe, expect, it } from "vitest";

import { createFixtureLearningBlueprint } from "@/adapters/fake/fixture-learning-blueprint";
import { InMemoryLearningSessionRepository } from "@/adapters/fake/in-memory-learning-session-repository";
import { deriveLearningReviewPlan } from "@/modules/learning/application/derive-learning-review-plan";
import { deriveLearningRuntimePolicy } from "@/modules/learning/application/derive-learning-runtime-policy";
import { RecordLearningSupportEvidence } from "@/modules/learning/application/record-learning-support-evidence";
import { SubmitLearningActivityAttempt } from "@/modules/learning/application/submit-learning-activity-attempt";
import type { LessonBlueprintV2 } from "@/shared/contracts/lesson-v2";

/**
 * VLR-004. The whole learner path, on a blueprint whose ids nothing recognises.
 *
 * Every existing journey runs on Golden-shaped data — `activity_gist`,
 * `a-member-of` — so a component that quietly depended on those names would
 * still pass. That is exactly the class of defect VLR-001 through VLR-003 turned
 * out to be: routes resolving a fixture regardless of the lesson in front of the
 * learner, agreeing often enough to look correct.
 *
 * Nothing here shares a single identifier with any fixture. If some layer still
 * needs the Golden names, this fails.
 */

const OWNER = "11111111-1111-4111-8111-111111111111";
const STRANGER = "22222222-2222-4222-8222-222222222222";

/** Ids deliberately unlike anything a fixture uses. */
function arbitraryBlueprint(): LessonBlueprintV2 {
  const base = createFixtureLearningBlueprint();
  const rename: Record<string, string> = {};
  base.activities.forEach((activity, index) => {
    rename[activity.id] = `step_zq${index}_${activity.activityType}`;
  });
  const itemRename: Record<string, string> = {};
  base.targetItems.forEach((item, index) => {
    itemRename[item.id] = `tgt_qx${index}`;
  });

  const renamed = JSON.parse(JSON.stringify(base)) as LessonBlueprintV2;
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (node === null || typeof node !== "object") return;
    const record = node as Record<string, unknown>;
    for (const [key, value] of Object.entries(record)) {
      if (typeof value === "string") {
        if (rename[value]) record[key] = rename[value];
        else if (itemRename[value]) record[key] = itemRename[value];
      } else if (Array.isArray(value)) {
        record[key] = value.map((entry) =>
          typeof entry === "string"
            ? (rename[entry] ?? itemRename[entry] ?? entry)
            : entry,
        );
        walk(record[key]);
      } else {
        walk(value);
      }
    }
  };
  walk(renamed);

  renamed.targetItems = renamed.targetItems.map((item, index) => ({
    ...item,
    itemKey: `arbitrary-key-${index}`,
  }));
  return renamed;
}

async function startedSession(blueprint: LessonBlueprintV2) {
  const repository = new InMemoryLearningSessionRepository();
  const first = blueprint.activities[0]!;
  const started = await repository.start({
    ownerUserId: OWNER,
    lessonVersionId: "33333333-3333-4333-8333-333333333333",
    initialPhase: first.phase,
    initialActivityId: first.id,
  });
  return { repository, session: started.session };
}

describe("a lesson whose ids nothing recognises", () => {
  it("uses no identifier any fixture would supply", () => {
    // Guards the guard: if the renaming stopped working, everything below would
    // silently be testing the Golden shape again.
    const blueprint = arbitraryBlueprint();
    const fixture = createFixtureLearningBlueprint();
    const fixtureIds = new Set([
      ...fixture.activities.map((activity) => activity.id),
      ...fixture.targetItems.map((item) => item.id),
      ...fixture.targetItems.map((item) => item.itemKey),
    ]);

    for (const activity of blueprint.activities) {
      expect(fixtureIds.has(activity.id)).toBe(false);
    }
    for (const item of blueprint.targetItems) {
      expect(fixtureIds.has(item.id)).toBe(false);
      expect(fixtureIds.has(item.itemKey)).toBe(false);
    }
  });

  it("derives a runtime policy the blueprint accepts", () => {
    const blueprint = arbitraryBlueprint();
    const policy = deriveLearningRuntimePolicy(blueprint);
    expect(policy.activityPolicies.map((entry) => entry.activityId)).toEqual(
      blueprint.activities.map((activity) => activity.id),
    );
  });

  it("walks the session in the blueprint's own order", async () => {
    // Progression must follow this lesson's activities, not a remembered
    // sequence of fixture names.
    const blueprint = arbitraryBlueprint();
    const policy = deriveLearningRuntimePolicy(blueprint);
    const { repository, session } = await startedSession(blueprint);
    const useCase = new SubmitLearningActivityAttempt(repository);
    const gist = blueprint.activities[0]!;
    if (gist.activityType !== "gist_choice") return;

    const correct = await useCase.execute({
      ownerUserId: OWNER,
      sessionId: session.id,
      blueprint,
      policy,
      activityId: gist.id,
      idempotencyKey: "44444444-4444-4444-8444-444444444444",
      response: {
        kind: "choice",
        optionId: gist.evaluation.correctOptionId,
      },
    });

    expect(correct.attempt.evaluation.verdict).toBe("correct");
    expect(correct.session.currentActivityId).toBe(
      blueprint.activities[1]!.id,
    );
  });

  it("refuses an activity id this lesson does not contain", async () => {
    // Including one borrowed from the fixture. Ownership of a session must not
    // imply the right to submit against arbitrary activities.
    const blueprint = arbitraryBlueprint();
    const { repository, session } = await startedSession(blueprint);

    await expect(
      new SubmitLearningActivityAttempt(repository).execute({
        ownerUserId: OWNER,
        sessionId: session.id,
        blueprint,
        policy: deriveLearningRuntimePolicy(blueprint),
        activityId: "activity_gist",
        idempotencyKey: "45444444-4444-4444-8444-444444444444",
        response: { kind: "choice", optionId: "whatever" },
      }),
    ).rejects.toThrow(/does not belong to this lesson blueprint/i);
  });

  it("returns the original attempt when a request is retried", async () => {
    // A network retry must not create a second attempt or advance twice.
    const blueprint = arbitraryBlueprint();
    const policy = deriveLearningRuntimePolicy(blueprint);
    const { repository, session } = await startedSession(blueprint);
    const useCase = new SubmitLearningActivityAttempt(repository);
    const gist = blueprint.activities[0]!;
    if (gist.activityType !== "gist_choice") return;

    const input = {
      ownerUserId: OWNER,
      sessionId: session.id,
      blueprint,
      policy,
      activityId: gist.id,
      idempotencyKey: "46444444-4444-4444-8444-444444444444",
      response: {
        kind: "choice" as const,
        optionId: gist.evaluation.correctOptionId,
      },
    };
    const first = await useCase.execute(input);
    const again = await useCase.execute(input);

    expect(again.created).toBe(false);
    expect(again.attempt.id).toBe(first.attempt.id);
  });

  it("refuses a session that belongs to somebody else", async () => {
    const blueprint = arbitraryBlueprint();
    const { repository, session } = await startedSession(blueprint);

    await expect(
      new SubmitLearningActivityAttempt(repository).execute({
        ownerUserId: STRANGER,
        sessionId: session.id,
        blueprint,
        policy: deriveLearningRuntimePolicy(blueprint),
        activityId: blueprint.activities[0]!.id,
        idempotencyKey: "47444444-4444-4444-8444-444444444444",
        response: { kind: "choice", optionId: "any" },
      }),
    ).rejects.toThrow(/session was not found/i);
  });

  it("keeps the answer behind the attempt boundary", async () => {
    // The support that reveals the answer must stay locked until an attempt
    // exists, whatever the activity is called.
    const blueprint = arbitraryBlueprint();
    const { repository, session } = await startedSession(blueprint);

    await expect(
      new RecordLearningSupportEvidence(repository).execute({
        ownerUserId: OWNER,
        blueprint,
        policy: deriveLearningRuntimePolicy(blueprint),
        sessionId: session.id,
        activityId: blueprint.activities[0]!.id,
        idempotencyKey: "48444444-4444-4444-8444-444444444444",
        eventKind: "support_opened",
        supportStep: "english_caption",
      }),
    ).rejects.toThrow(/attempt boundary/i);
  });

  it("builds a delayed review for an item nothing has heard of", () => {
    // The resolver this replaces knew one hard-coded key, so an arbitrary one
    // would have been scheduled and then produced nothing.
    const blueprint = arbitraryBlueprint();
    const item = blueprint.targetItems[0]!;
    const plan = deriveLearningReviewPlan(blueprint, item.itemKey);

    expect(plan).not.toBeNull();
    expect(plan!.recall.accepted).toContain(item.surfaceForm);
    expect(plan!.recall.promptVi).not.toContain(item.surfaceForm);
  });
});
