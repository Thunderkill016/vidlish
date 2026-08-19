import type {
  LessonVersionRepository,
  PublishLessonVersionInput,
} from "@/modules/learning/ports/lesson-version-repository";
import { lessonBlueprintV2Schema } from "@/shared/contracts/lesson-v2";

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
    { lessonVersionId: string; ownerUserId: string }
  >();

  async publish(input: PublishLessonVersionInput) {
    lessonBlueprintV2Schema.parse(input.blueprint);

    const existing = this.published.get(input.lessonId);
    if (existing) {
      if (existing.ownerUserId !== input.ownerUserId) {
        throw new Error("owned lesson not found");
      }
      return { lessonVersionId: existing.lessonVersionId, created: false };
    }

    const lessonVersionId = crypto.randomUUID();
    this.published.set(input.lessonId, {
      lessonVersionId,
      ownerUserId: input.ownerUserId,
    });
    return { lessonVersionId, created: true };
  }
}
