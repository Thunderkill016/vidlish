import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { createLearnerBlueprintView } from "@/modules/learning/application/create-learner-blueprint-view";
import { deriveLearningMedia } from "@/modules/learning/application/derive-learning-media";
import { deriveLearningRuntimePolicy } from "@/modules/learning/application/derive-learning-runtime-policy";
import { deriveLearningSupportCopy } from "@/modules/learning/application/derive-learning-support-copy";
import { createIdentityService } from "@/platform/identity/create-identity-service";
import { resolveLearnerLessonRoute } from "@/platform/learning/resolve-learner-lesson-route";
import { validateLearningRuntimePolicyAgainstBlueprint } from "@/shared/contracts/learning-policy-v2";
import { LearningSessionLab } from "../../../learning-lab/v2/_components/learning-session-lab";
import { SpeakingCompletionHandoff } from "../../../learning-lab/v2/_components/speaking-completion-handoff";

export const dynamic = "force-dynamic";

/**
 * The learner's own v2 lesson.
 *
 * The learning lab has been playing one hand-written fixture for everybody.
 * This is the same runtime driven by the blueprint a learner's own video
 * produced: their video, their timings, their language items.
 */
export default async function LearnerSessionPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const access = await (await createIdentityService()).resolveCurrentAccess();
  if (!access) redirect("/sign-in");

  const { jobId: rawJobId } = await params;
  const jobId = z.string().uuid().safeParse(rawJobId);
  if (!jobId.success) notFound();

  // Asked, not decided here. The v1 page forwards to this one when a blueprint
  // exists; if the two disagreed about what "renderable" means the learner
  // would bounce between them.
  const route = await resolveLearnerLessonRoute({
    ownerUserId: access.userId,
    jobId: jobId.data,
  });
  if (route.kind !== "v2") redirect(`/lessons/${jobId.data}`);

  const { blueprint, transcript } = route;
  const media = deriveLearningMedia(
    blueprint,
    transcript,
    new Date().toISOString(),
  );
  const policy = deriveLearningRuntimePolicy(blueprint);

  // The runtime refuses to run a policy that does not match its blueprint, and
  // that check is worth keeping even though both were derived here: a mismatch
  // means one of the two derivations drifted.
  const policyIssues = validateLearningRuntimePolicyAgainstBlueprint(
    policy,
    blueprint,
  );
  if (policyIssues.length > 0) {
    throw new Error(
      `Learning runtime policy is invalid: ${policyIssues
        .map((issue) => `${issue.path}: ${issue.message}`)
        .join("; ")}`,
    );
  }

  const learnerView = createLearnerBlueprintView(blueprint);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      {/*
        The reference lesson is no longer the default landing page, so this is
        the only way back to it. Without the query flag the v1 page would send
        the learner straight here again.
      */}
      <a
        className="mb-4 inline-block text-sm text-[var(--muted-foreground)] underline"
        href={`/lessons/${jobId.data}?view=reference`}
      >
        Xem bản tra cứu của bài học này
      </a>
      <LearningSessionLab
        blueprint={learnerView}
        media={media}
        policy={policy}
        supportCopy={deriveLearningSupportCopy(blueprint)}
        jobId={jobId.data}
      />
      <SpeakingCompletionHandoff blueprintId={learnerView.blueprintId} />
    </div>
  );
}
