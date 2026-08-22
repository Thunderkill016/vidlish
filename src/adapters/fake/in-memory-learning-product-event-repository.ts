import { randomUUID } from "node:crypto";

import type {
  LearningProductEventRepository,
  RecordLearningProductEventInput,
} from "@/modules/learning/ports/learning-product-event-repository";
import { privacySafeLearningProductEventSchema } from "@/shared/contracts/learning-product-events";

export class InMemoryLearningProductEventRepository
  implements LearningProductEventRepository
{
  private readonly events = new Map<
    string,
    ReturnType<typeof privacySafeLearningProductEventSchema.parse>
  >();
  private readonly eventIdsByIdempotency = new Map<string, string>();

  async record(input: RecordLearningProductEventInput) {
    const lookup = `${input.ownerUserId}:${input.idempotencyKey}`;
    const existingId = this.eventIdsByIdempotency.get(lookup);
    if (existingId) {
      const existing = this.events.get(existingId);
      if (
        !existing ||
        existing.sessionId !== input.sessionId ||
        existing.activityId !== input.activityId ||
        existing.eventKind !== input.eventKind ||
        existing.detailKind !==
          (input.eventKind === "runtime_error" ? input.detailKind : null)
      ) {
        throw new Error("Idempotency key belongs to another product event.");
      }
      return { event: existing, created: false };
    }

    const event = privacySafeLearningProductEventSchema.parse({
      id: randomUUID(),
      sessionId: input.sessionId,
      activityId: input.activityId,
      idempotencyKey: input.idempotencyKey,
      eventKind: input.eventKind,
      detailKind: input.eventKind === "runtime_error" ? input.detailKind : null,
      occurredAt: new Date().toISOString(),
    });
    this.events.set(event.id, event);
    this.eventIdsByIdempotency.set(lookup, event.id);
    return { event, created: true };
  }

  async listForSession(input: { ownerUserId: string; sessionId: string }) {
    return [...this.events.values()]
      .filter((event) => event.sessionId === input.sessionId)
      .sort((left, right) => left.occurredAt.localeCompare(right.occurredAt));
  }
}
