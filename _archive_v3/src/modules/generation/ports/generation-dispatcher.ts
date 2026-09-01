import type { GenerationRequestedEvent } from "@/shared/contracts/generation";

export interface GenerationDispatcher {
  sendRequested(event: GenerationRequestedEvent): Promise<void>;
}
