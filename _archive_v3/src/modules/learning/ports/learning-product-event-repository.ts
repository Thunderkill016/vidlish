import type {
  LearningProductEventKind,
  LearningRuntimeErrorKind,
  PrivacySafeLearningProductEvent,
} from "@/shared/contracts/learning-product-events";

export type RecordLearningProductEventInput = {
  ownerUserId: string;
  sessionId: string;
  activityId: string;
  idempotencyKey: string;
} & (
  | {
      eventKind: Exclude<LearningProductEventKind, "runtime_error">;
      detailKind?: never;
    }
  | {
      eventKind: "runtime_error";
      detailKind: LearningRuntimeErrorKind;
    }
);

export interface LearningProductEventRepository {
  record(
    input: RecordLearningProductEventInput,
  ): Promise<{
    event: PrivacySafeLearningProductEvent;
    created: boolean;
  }>;

  listForSession(input: {
    ownerUserId: string;
    sessionId: string;
  }): Promise<readonly PrivacySafeLearningProductEvent[]>;
}
