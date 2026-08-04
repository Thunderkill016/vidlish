import "server-only";

import { FixtureGeneratedTranscriptStrategy } from "@/adapters/fake/fixture-generated-transcript-strategy";
import { FixtureNativeCaptionStrategy } from "@/adapters/fake/fixture-native-caption-strategy";
import { getInMemoryTranscriptRepository } from "@/adapters/fake/in-memory-transcript-repository";
import { getAdminSupabaseClient } from "@/adapters/supabase/admin-client";
import { SupabaseTranscriptRepository } from "@/adapters/supabase/transcript-repository";
import { SupadataGeneratedTranscriptStrategy } from "@/adapters/supadata/supadata-generated-transcript-strategy";
import { SupadataNativeCaptionStrategy } from "@/adapters/supadata/supadata-native-caption-strategy";
import type { GenerationJobRepository } from "@/modules/generation/ports/generation-job-repository";
import { HostedGeneratedTranscriptPolicy } from "@/modules/transcript/application/hosted-generated-transcript-policy";
import type { TranscriptRepository } from "@/modules/transcript/ports/transcript-repository";
import {
  TranscriptStrategyRegistry,
  type PollableTranscriptStrategy,
  type TranscriptStrategy,
} from "@/modules/transcript/ports/transcript-strategy";
import { getServerConfig } from "@/platform/config/server";

export type TranscriptRuntime = {
  registry: TranscriptStrategyRegistry;
  nativeStrategy: TranscriptStrategy;
  nativeEnabled: boolean;
  generatedStrategy?: PollableTranscriptStrategy;
  generatedPolicy: HostedGeneratedTranscriptPolicy;
  generatedPollIntervalMs: number;
  generatedMaxPolls: number;
  repository: TranscriptRepository;
};

function createNativeStrategy(): TranscriptStrategy {
  const config = getServerConfig();
  if (config.TRANSCRIPT_NATIVE_ADAPTER === "fixture") {
    return new FixtureNativeCaptionStrategy();
  }
  if (!config.SUPADATA_API_KEY) {
    throw new Error("Native transcript provider configuration is invalid.");
  }
  return new SupadataNativeCaptionStrategy({
    apiKey: config.SUPADATA_API_KEY,
    timeoutMs: config.SUPADATA_NATIVE_TIMEOUT_MS,
  });
}

function createGeneratedStrategy(): PollableTranscriptStrategy | undefined {
  const config = getServerConfig();
  if (!config.TRANSCRIPT_GENERATED_ENABLED) return undefined;
  if (config.TRANSCRIPT_GENERATED_ADAPTER === "fixture") {
    return new FixtureGeneratedTranscriptStrategy();
  }
  if (!config.SUPADATA_API_KEY) return undefined;
  return new SupadataGeneratedTranscriptStrategy({
    apiKey: config.SUPADATA_API_KEY,
    timeoutMs: config.SUPADATA_GENERATED_TIMEOUT_MS,
  });
}

export function createTranscriptRuntime(
  generationRepository: GenerationJobRepository,
): TranscriptRuntime {
  const config = getServerConfig();
  const nativeStrategy = createNativeStrategy();
  const generatedStrategy = createGeneratedStrategy();
  const registry = new TranscriptStrategyRegistry([
    ...(config.TRANSCRIPT_NATIVE_ENABLED
      ? [{ strategy: nativeStrategy, order: 10 }]
      : []),
    ...(generatedStrategy
      ? [{ strategy: generatedStrategy, order: 20 }]
      : []),
  ]);
  const repository =
    config.TRANSCRIPT_REPOSITORY === "fake"
      ? getInMemoryTranscriptRepository(generationRepository)
      : new SupabaseTranscriptRepository(getAdminSupabaseClient());

  return {
    registry,
    nativeStrategy,
    nativeEnabled: config.TRANSCRIPT_NATIVE_ENABLED,
    ...(generatedStrategy ? { generatedStrategy } : {}),
    generatedPolicy: new HostedGeneratedTranscriptPolicy({
      enabled: Boolean(generatedStrategy),
      maxVideoDurationMs: config.TRANSCRIPT_GENERATED_MAX_VIDEO_DURATION_MS,
    }),
    generatedPollIntervalMs: config.SUPADATA_GENERATED_POLL_INTERVAL_MS,
    generatedMaxPolls: config.SUPADATA_GENERATED_MAX_POLLS,
    repository,
  };
}
