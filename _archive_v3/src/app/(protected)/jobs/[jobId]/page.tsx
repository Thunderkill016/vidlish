import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { createGenerationRepository } from "@/platform/generation/create-generation-runtime";
import { createIdentityService } from "@/platform/identity/create-identity-service";
import {
  publicGenerationJobSchema,
  toLearnerGenerationPhase,
} from "@/shared/contracts/generation";
import { JobProgress } from "./_components/job-progress";

export const dynamic = "force-dynamic";

export default async function JobPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const access = await (await createIdentityService()).resolveCurrentAccess();
  if (!access) redirect("/sign-in");

  const { jobId: rawJobId } = await params;
  const jobId = z.string().uuid().safeParse(rawJobId);
  if (!jobId.success) notFound();

  const job = await createGenerationRepository().findOwnedById(
    jobId.data,
    access.userId,
  );
  if (!job) notFound();

  const { ownerUserId, ...publicJob } = job;
  void ownerUserId;
  return (
    <div className="mx-auto max-w-[720px]">
      <JobProgress
        initialJob={publicGenerationJobSchema.parse(publicJob)}
        initialPhase={toLearnerGenerationPhase(job.status)}
      />
    </div>
  );
}
