import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { createLearnerBlueprintView } from "@/modules/learning/application/create-learner-blueprint-view";
import { deriveLearningMedia } from "@/modules/learning/application/derive-learning-media";
import { deriveLearningRuntimePolicy } from "@/modules/learning/application/derive-learning-runtime-policy";
import { deriveLearningSupportCopy } from "@/modules/learning/application/derive-learning-support-copy";
import { createGenerationRepository } from "@/platform/generation/create-generation-runtime";
import { createIdentityService } from "@/platform/identity/create-identity-service";
import { createLessonVersionRepository } from "@/platform/learning/create-learning-authoring-runtime";
import { createTranscriptRuntime } from "@/platform/transcript/create-transcript-runtime";
import { validateLearningRuntimePolicyAgainstBlueprint } from "@/shared/contracts/learning-policy-v2";
import { LearningSessionLab } from "../../../learning-lab/v2/_components/learning-session-lab";

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

  const published = await createLessonVersionRepository().findForJob({
    ownerUserId: access.userId,
    jobId: jobId.data,
  });
  // Not every lesson has a v2 blueprint: authoring is additive and can be off
  // or can have failed. Send the learner to the lesson they definitely have
  // rather than showing an empty shell.
  if (!published) redirect(`/lessons/${jobId.data}`);

  const generationRepository = createGenerationRepository();
  const transcriptRuntime = createTranscriptRuntime(generationRepository);
  const transcript = await transcriptRuntime.repository.findCanonicalForJob(
    access.userId,
    jobId.data,
  );
  if (!transcript) redirect(`/lessons/${jobId.data}`);

  const { blueprint } = published;
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

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <LearningSessionLab
        blueprint={createLearnerBlueprintView(blueprint)}
        media={media}
        policy={policy}
        supportCopy={deriveLearningSupportCopy(blueprint)}
        jobId={jobId.data}
      />
    </div>
  );
}
