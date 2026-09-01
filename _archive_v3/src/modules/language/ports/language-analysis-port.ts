import type {
  LanguageAnalysisResult,
  LanguageAnalysisWindow,
} from "@/shared/contracts/language-eligibility";

export interface LanguageAnalysisPort {
  analyze(windows: LanguageAnalysisWindow[]): Promise<LanguageAnalysisResult>;
}
