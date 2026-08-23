import { redirect } from "next/navigation";

import { createGoldenSessionLearningBlueprint } from "@/adapters/fake/fixture-golden-learning-blueprint";
import { createFixtureLearningMedia } from "@/adapters/fake/fixture-learning-media";
import { fixtureLearningSupportCopy } from "@/adapters/fake/fixture-learning-runtime-policy";
import { createLearnerBlueprintView } from "@/modules/learning/application/create-learner-blueprint-view";
import { deriveLearningRuntimePolicy } from "@/modules/learning/application/derive-learning-runtime-policy";
import { createIdentityService } from "@/platform/identity/create-identity-service";
import { bindVerifiedLearningMedia } from "@/shared/contracts/learning-media";
import { validateLearningRuntimePolicyAgainstBlueprint } from "@/shared/contracts/learning-policy-v2";
import { LearningSessionLab } from "./_components/learning-session-lab";
import { SpeakingCompletionHandoff } from "./_components/speaking-completion-handoff";

export const dynamic = "force-dynamic";

export default async function LearningModelV2LabPage() {
  const access = await (await createIdentityService()).resolveCurrentAccess();
  if (!access) redirect("/sign-in?next=/learning-lab/v2");

  const blueprint = createGoldenSessionLearningBlueprint();
  // The same derivation the support route uses. Passing a hand-written policy
  // here while the server derived its own is how a button appears that the
  // server then refuses — the same client/server split VLR-005 was about.
  const policy = deriveLearningRuntimePolicy(blueprint);
  const policyIssues = validateLearningRuntimePolicyAgainstBlueprint(
    policy,
    blueprint,
  );
  if (policyIssues.length > 0) {
    throw new Error(
      `Fixture learning policy is invalid: ${policyIssues
        .map((issue) => `${issue.path}: ${issue.message}`)
        .join("; ")}`,
    );
  }

  const media = bindVerifiedLearningMedia(
    blueprint,
    createFixtureLearningMedia(),
  );
  const learnerView = createLearnerBlueprintView(blueprint);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <LearningSessionLab
        blueprint={learnerView}
        media={media}
        policy={policy}
        supportCopy={fixtureLearningSupportCopy}
      />
      <SpeakingCompletionHandoff blueprintId={learnerView.blueprintId} />
    </div>
  );
}
