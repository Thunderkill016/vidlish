import {
  LANGUAGE_POLICY_VERSION,
  languageEligibilityPolicySchema,
} from "@/shared/contracts/language-eligibility";

export const defaultLanguageEligibilityPolicy =
  languageEligibilityPolicySchema.parse({
    policyVersion: LANGUAGE_POLICY_VERSION,
    minWindowWords: 8,
    targetWindowWords: 45,
    maxWindowDurationMs: 30_000,
    maxWindowGapMs: 4_000,
    evidenceMinReliableCoverage: 0.4,
    evidenceMinReliableWords: 100,
    evidenceMinWindows: 2,
    mainMinEnglishShare: 0.55,
    mainMinCoherentDurationMs: 60_000,
    mainMinEnglishWords: 120,
    mixedMinEnglishShare: 0.25,
    mixedMinCoherentDurationMs: 180_000,
    mixedMinEnglishWords: 300,
  });
