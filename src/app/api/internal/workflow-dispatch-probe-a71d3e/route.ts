import { NextResponse } from "next/server";

import { WorkflowGenerationDispatcher } from "@/adapters/workflow/generation-dispatcher";
import { createGenerationRepository } from "@/platform/generation/create-generation-runtime";
import { GENERATION_PIPELINE_VERSION } from "@/shared/contracts/generation";

export const dynamic = "force-dynamic";

const JOB_ID = "f58435de-019d-439d-950e-d4bf5c5aabfb";

export async function GET() {
  try {
    await new WorkflowGenerationDispatcher().sendRequested({
      jobId: JOB_ID,
      pipelineVersion: GENERATION_PIPELINE_VERSION,
    });
    await createGenerationRepository().markDispatch(JOB_ID, "sent");
    console.info(
      JSON.stringify({
        event: "vidlish_workflow_dispatch_probe_a71d3e",
        ok: true,
        jobId: JOB_ID,
      }),
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "vidlish_workflow_dispatch_probe_a71d3e",
        ok: false,
        jobId: JOB_ID,
        name: error instanceof Error ? error.name : "UnknownError",
        message: error instanceof Error ? error.message : String(error),
      }),
    );
  }

  return NextResponse.json(
    { status: "completed" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
