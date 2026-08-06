import { redirect } from "next/navigation";

import { createFixtureLearningBlueprint } from "@/adapters/fake/fixture-learning-blueprint";
import { createLearnerBlueprintView } from "@/modules/learning/application/create-learner-blueprint-view";
import { createIdentityService } from "@/platform/identity/create-identity-service";
import { LearningSessionLab } from "./_components/learning-session-lab";

export const dynamic = "force-dynamic";

export default async function LearningModelV2LabPage() {
  const access = await (await createIdentityService()).resolveCurrentAccess();
  if (!access) redirect("/sign-in?next=/learning-lab/v2");

  const blueprint = createFixtureLearningBlueprint();
  const learnerView = createLearnerBlueprintView(blueprint);
  const evidenceById = new Map(
    blueprint.evidenceCatalog.map((evidence) => [
      evidence.segmentId,
      evidence.text,
    ]),
  );
  const audioByActivity = Object.fromEntries(
    blueprint.activities.map((activity) => [
      activity.id,
      activity.evidence
        .flatMap((reference) => reference.sourceSegmentIds)
        .map((segmentId) => evidenceById.get(segmentId))
        .filter((text): text is string => Boolean(text))
        .join(" "),
    ]),
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <LearningSessionLab
        blueprint={learnerView}
        audioByActivity={audioByActivity}
      />
    </div>
  );
}
