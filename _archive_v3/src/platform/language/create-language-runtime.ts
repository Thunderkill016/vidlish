import "server-only";

import { getInMemoryLanguageEligibilityRepository } from "@/adapters/fake/in-memory-language-eligibility-repository";
import { FrancLanguageAnalysisAdapter } from "@/adapters/franc/franc-language-analysis-adapter";
import { getAdminSupabaseClient } from "@/adapters/supabase/admin-client";
import { SupabaseLanguageEligibilityRepository } from "@/adapters/supabase/language-eligibility-repository";
import type { LanguageEligibilityRepository } from "@/modules/language/ports/language-eligibility-repository";
import type { GenerationJobRepository } from "@/modules/generation/ports/generation-job-repository";
import { CheckOriginalEnglish } from "@/modules/language/application/check-original-english";
import { defaultLanguageEligibilityPolicy } from "@/modules/language/application/default-language-policy";
import type { TranscriptRepository } from "@/modules/transcript/ports/transcript-repository";
import { getServerConfig } from "@/platform/config/server";

/**
 * The same repository the gate writes to, exposed for readers.
 *
 * The v2 authoring chain needs the decision back to know which segments it may
 * quote, and building a second instance would risk the two disagreeing about
 * which store they are talking to.
 */
export function createLanguageEligibilityRepository(
  generationRepository: GenerationJobRepository,
): LanguageEligibilityRepository {
  const config = getServerConfig();
  return config.TRANSCRIPT_REPOSITORY === "fake"
    ? getInMemoryLanguageEligibilityRepository(generationRepository)
    : new SupabaseLanguageEligibilityRepository(getAdminSupabaseClient());
}

export function createOriginalEnglishGate(
  generationRepository: GenerationJobRepository,
  transcriptRepository: TranscriptRepository,
): CheckOriginalEnglish {
  const config = getServerConfig();
  const analyzer = new FrancLanguageAnalysisAdapter({
    minWindowWords: defaultLanguageEligibilityPolicy.minWindowWords,
  });
  const repository = createLanguageEligibilityRepository(generationRepository);

  return new CheckOriginalEnglish(
    transcriptRepository,
    analyzer,
    repository,
    defaultLanguageEligibilityPolicy,
  );
}
