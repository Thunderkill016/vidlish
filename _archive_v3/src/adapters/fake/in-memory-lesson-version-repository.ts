import type {
  LessonVersionRepository,
  PublishLessonVersionInput,
} from "@/modules/learning/ports/lesson-version-repository";
import {
  lessonBlueprintV2Schema,
  type LessonBlueprintV2,
} from "@/shared/contracts/lesson-v2";

/**
 * Mirrors the database's publish-once rule rather than inventing its own.
 *
 * A fake that quietly allows republishing would let tests agree with the fake
 * instead of with the product — the exact failure that let a hardcoded review
 * schedule survive in this repo unnoticed.
 */
export class InMemoryLessonVersionRepository implements LessonVersionRepository {
  private readonly published = new Map<
    string,
    {
      lessonVersionId: string;
      ownerUserId: string;
      blueprint: LessonBlueprintV2;
    }
  >();

  async findByIdForOwner(input: {
    ownerUserId: string;
    lessonVersionId: string;
  }) {
    for (const entry of this.published.values()) {
      if (
        entry.lessonVersionId === input.lessonVersionId &&
        entry.ownerUserId === input.ownerUserId
      ) {
        return {
          lessonVersionId: entry.lessonVersionId,
          blueprint: entry.blueprint,
        };
      }
    }
    return null;
  }

  async findForJob(input: { ownerUserId: string; jobId: string }) {
    // Keyed by job now, so there is nothing to join through. The mapping this
    // fake used to keep existed only because a blueprint hung off a v1 lesson.
    const entry = this.published.get(input.jobId);
    if (!entry || entry.ownerUserId !== input.ownerUserId) return null;
    return {
      lessonVersionId: entry.lessonVersionId,
      blueprint: entry.blueprint,
    };
  }

  async publish(input: PublishLessonVersionInput) {
    lessonBlueprintV2Schema.parse(input.blueprint);

    const existing = this.published.get(input.jobId);
    if (existing) {
      if (existing.ownerUserId !== input.ownerUserId) {
        throw new Error("owned job not found");
      }
      return { lessonVersionId: existing.lessonVersionId, created: false };
    }

    const lessonVersionId = crypto.randomUUID();
    this.published.set(input.jobId, {
      lessonVersionId,
      ownerUserId: input.ownerUserId,
      blueprint: input.blueprint,
    });
    return { lessonVersionId, created: true };
  }
}
