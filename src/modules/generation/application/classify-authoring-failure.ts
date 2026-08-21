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
/** `activities.2.criteriaVi` → `ACTIVITIES_2_CRITERIAVI`, or null. */
function firstIssuePath(error: unknown): string | null {
  const issues = (error as { issues?: readonly { path?: readonly unknown[] }[] })
    .issues;
  const path = issues?.[0]?.path;
  if (!path?.length) return null;
  return path
    .map((segment) => String(segment))
    .join("_")
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, "_")
    .slice(0, 60);
}

/**
 * What the schema expected, when it is one of our own enum labels.
 *
 * Zod reports the accepted values for a literal mismatch, not the value that
 * arrived. On a discriminated union that is still the useful half: it names
 * which branch matched, so `ACTIVITIES_3_PHASE_WANTS_RETRIEVE` says the
 * discriminator picked `chunk_recall` and the phase beside it did not agree.
 *
 * Guarded to short lowercase identifiers so free text — which can carry model
 * output, which can carry learner content — never reaches a diagnostic column.
 */
function firstIssueLabel(error: unknown): string | null {
  const issues = (error as { issues?: readonly Record<string, unknown>[] }).issues;
  const values = issues?.[0]?.values;
  const expected = Array.isArray(values) && values.length === 1 ? values[0] : null;
  if (typeof expected !== "string") return null;
  if (!/^[a-z][a-z_]{0,31}$/.test(expected)) return null;
  return expected.toUpperCase();
}

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
  if (name === "ZodError") {
    // The failing path, not the value. `schema_rejected` alone says a draft was
    // malformed and leaves you to guess which of forty fields — production
    // returned exactly that and it named nothing actionable. A path is field
    // names the schema already defines, so it carries no model output.
    const path = firstIssuePath(error);
    if (!path) return "schema_rejected";
    // Plus what the schema wanted there. A path alone said which field, and
    // production showed a field whose bindings looked identical in both
    // schemas — the branch that matched is the piece that was missing.
    const label = firstIssueLabel(error);
    return label
      ? `schema_rejected:${path}_WANTS_${label}`
      : `schema_rejected:${path}`;
  }
  if (name) return `unexpected_error:${name.toUpperCase().replace(/[^A-Z_]/g, "_")}`;
  return "unexpected_error";
}
