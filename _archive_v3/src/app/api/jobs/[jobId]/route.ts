import { NextResponse } from "next/server";
import { z } from "zod";

import { createGenerationRepository } from "@/platform/generation/create-generation-runtime";
import { createIdentityService } from "@/platform/identity/create-identity-service";
import {
  generationJobResponseSchema,
  toLearnerGenerationPhase,
} from "@/shared/contracts/generation";
import { authErrors, generationErrors } from "@/shared/errors/product-error";
import { productErrorResponse } from "@/shared/http/product-error-response";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  try {
    const access = await (await createIdentityService()).resolveCurrentAccess();
    if (!access) throw authErrors.sessionRequired();

    const { jobId: rawJobId } = await context.params;
    const jobId = z.string().uuid().safeParse(rawJobId);
    if (!jobId.success) throw generationErrors.notFound();

    const job = await createGenerationRepository().findOwnedById(
      jobId.data,
      access.userId,
    );
    if (!job) throw generationErrors.notFound();

    const { ownerUserId, ...publicJob } = job;
    void ownerUserId;
    const payload = generationJobResponseSchema.parse({
      job: publicJob,
      phase: toLearnerGenerationPhase(job.status),
    });
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return productErrorResponse(error, generationErrors.statusFailed());
  }
}
