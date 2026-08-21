import { AuthoringQualityError } from "@/modules/learning/application/review-authoring-draft";
import { LearningAuthoringFailure } from "@/modules/learning/ports/learning-authoring-provider";

/**
 * Names why the v2 authoring step lost, in a form safe to store.
 *
 * The step used to discard its error and report a hardcoded `provider_failure`,
 * so a draft the quality gate refused, a response the schema refused, and a
 * genuine provider outage were indistinguishable on the record. This project
 * has already paid for that once: a failure thrown without a kind cost five
 * wrong guesses before the real cause surfaced.
 *
 * A classification, never a message. Provider messages can carry model output
 * and model output can carry learner content, so nothing free-form goes into a
 * diagnostic field.
 */
export function classifyAuthoringFailure(error: unknown): string {
  if (error instanceof AuthoringQualityError) {
    // The gate's own code, which names the rule the draft broke — the single
    // most useful thing to know, because it says whether to fix the prompt or
    // the rule.
    return `quality_rejected:${error.reason}`;
  }
  if (error instanceof LearningAuthoringFailure) {
    return error.retryable ? "provider_failure" : "provider_rejected";
  }
  // Zod reports through its own class, but importing it here to name one branch
  // would tie this to a validation library. The constructor name is enough to
  // tell a schema rejection from an unexpected throw.
  const name = error instanceof Error ? error.name : "";
  if (name === "ZodError") return "schema_rejected";
  if (name) return `unexpected_error:${name.toUpperCase().replace(/[^A-Z_]/g, "_")}`;
  return "unexpected_error";
}
