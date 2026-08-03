import "server-only";

import { FixtureNativeCaptionStrategy } from "@/adapters/fake/fixture-native-caption-strategy";
import { getInMemoryTranscriptRepository } from "@/adapters/fake/in-memory-transcript-repository";
import { getAdminSupabaseClient } from "@/adapters/supabase/admin-client";
import { SupabaseTranscriptRepository } from "@/adapters/supabase/transcript-repository";
import { SupadataNativeCaptionStrategy } from "@/adapters/supadata/supadata-native-caption-strategy";
import type { GenerationJobRepository } from "@/modules/generation/ports/generation-job-repository";
import type { TranscriptRepository } from "@/modules/transcript/ports/transcript-repository";
import type { TranscriptStrategy } from "@/modules/transcript/ports/transcript-strategy";
import { getServerConfig } from "@/platform/config/server";

export function createTranscriptRuntime(
  generationRepository: GenerationJobRepository,
): {
  strategy: TranscriptStrategy;
  repository: TranscriptRepository;
  enabled: boolean;
} {
  const config = getServerConfig();
  let strategy: TranscriptStrategy;

  if (config.TRANSCRIPT_NATIVE_ADAPTER === "fixture") {
    strategy = new FixtureNativeCaptionStrategy();
  } else {
    if (!config.SUPADATA_API_KEY) {
      throw new Error("Native transcript provider configuration is invalid.");
    }
    strategy = new SupadataNativeCaptionStrategy({
      apiKey: config.SUPADATA_API_KEY,
      timeoutMs: config.SUPADATA_NATIVE_TIMEOUT_MS,
    });
  }

  const repository =
    config.TRANSCRIPT_REPOSITORY === "fake"
      ? getInMemoryTranscriptRepository(generationRepository)
      : new SupabaseTranscriptRepository(getAdminSupabaseClient());

  return {
    strategy,
    repository,
    enabled: config.TRANSCRIPT_NATIVE_ENABLED,
  };
}
