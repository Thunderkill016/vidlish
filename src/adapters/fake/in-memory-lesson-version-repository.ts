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

  /** Job → lesson, so a lookup by job can find what publish stored by lesson. */
  private readonly lessonByJob = new Map<string, string>();

  /** Test seam: the fake has no jobs table to join through. */
  linkJobToLesson(jobId: string, lessonId: string): void {
    this.lessonByJob.set(jobId, lessonId);
  }

  async findForJob(input: { ownerUserId: string; jobId: string }) {
    const lessonId = this.lessonByJob.get(input.jobId);
    if (!lessonId) return null;
    const entry = this.published.get(lessonId);
    if (!entry || entry.ownerUserId !== input.ownerUserId) return null;
    return {
      lessonVersionId: entry.lessonVersionId,
      blueprint: entry.blueprint,
    };
  }

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
      blueprint: input.blueprint,
    });
    return { lessonVersionId, created: true };
  }
}
