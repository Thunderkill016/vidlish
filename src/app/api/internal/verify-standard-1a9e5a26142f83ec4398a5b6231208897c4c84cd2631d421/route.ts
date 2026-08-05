import "server-only";

import { NextResponse } from "next/server";

import { getAdminSupabaseClient } from "@/adapters/supabase/admin-client";
import { getServerConfig } from "@/platform/config/server";

export const dynamic = "force-dynamic";

const JOB_ID = "c1f4ac68-ff00-4c92-a9c5-010c9e5c0b9f";
const OWNER_USER_ID = "0764b1b5-0c98-49aa-9360-8149ce078209";

function keyKind(value: string): "secret" | "legacy_jwt" | "other" {
  if (value.startsWith("sb_secret_")) return "secret";
  if (value.startsWith("eyJ")) return "legacy_jwt";
  return "other";
}

export async function GET() {
  const client = getAdminSupabaseClient();
  const config = getServerConfig();

  const job = await client
    .from("lesson_jobs")
    .select("canonical_transcript_id")
    .eq("id", JOB_ID)
    .eq("owner_user_id", OWNER_USER_ID)
    .maybeSingle();

  const allowed = await client
    .from("language_eligible_segments")
    .select("segment_id,transcript_id")
    .eq("owner_user_id", OWNER_USER_ID);

  const transcriptId = job.data?.canonical_transcript_id ?? null;
  const matchingAllowed = (allowed.data ?? []).filter(
    (row) => row.transcript_id === transcriptId,
  );

  const segments = transcriptId
    ? await client
        .from("transcript_segments")
        .select("id", { count: "exact" })
        .eq("transcript_id", transcriptId)
        .eq("owner_user_id", OWNER_USER_ID)
    : null;

  return NextResponse.json({
    keyKind: keyKind(config.SUPABASE_SECRET_KEY),
    job: {
      visible: Boolean(job.data),
      errorCode: job.error?.code ?? null,
      hasTranscriptId: Boolean(transcriptId),
    },
    allowed: {
      visibleRows: allowed.data?.length ?? 0,
      matchingRows: matchingAllowed.length,
      errorCode: allowed.error?.code ?? null,
    },
    segments: {
      visibleRows: segments?.data?.length ?? 0,
      count: segments?.count ?? 0,
      errorCode: segments?.error?.code ?? null,
    },
  });
}
