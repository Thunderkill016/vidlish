import { redirect } from "next/navigation";

import { createFixtureLearningBlueprint } from "@/adapters/fake/fixture-learning-blueprint";
import { createFixtureLearningMedia } from "@/adapters/fake/fixture-learning-media";
import { createLearnerBlueprintView } from "@/modules/learning/application/create-learner-blueprint-view";
import { createIdentityService } from "@/platform/identity/create-identity-service";
import { bindVerifiedLearningMedia } from "@/shared/contracts/learning-media";
import { LearningSessionLab } from "./_components/learning-session-lab";

export const dynamic = "force-dynamic";

export default async function LearningModelV2LabPage() {
  const access = await (await createIdentityService()).resolveCurrentAccess();
  if (!access) redirect("/sign-in?next=/learning-lab/v2");

  const blueprint = createFixtureLearningBlueprint();
  const media = bindVerifiedLearningMedia(
    blueprint,
    createFixtureLearningMedia(),
  );
  const learnerView = createLearnerBlueprintView(blueprint);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <LearningSessionLab blueprint={learnerView} media={media} />
    </div>
  );
}
