import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getAdminSupabaseClient } from "@/adapters/supabase/admin-client";
import { selectSpeakingPractice } from "@/modules/learning/application/select-speaking-practice";
import { createIdentityService } from "@/platform/identity/create-identity-service";
import { Card } from "@/shared/ui/card";
import { SpeakingCapturePanel } from "./_components/speaking-capture-panel";

export const dynamic = "force-dynamic";

type SpeakingSearchParams = Promise<{
  session?: string | string[];
}>;

function EmptySpeakingPractice({ explicitSession }: { explicitSession: boolean }) {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-semibold text-[var(--accent)]">Luyện nói</p>
        <h1 className="text-3xl font-bold">
          {explicitSession
            ? "Phiên này chưa có speaking practice hợp lệ"
            : "Chưa có tình huống đã học để nói lại"}
        </h1>
        <p className="text-[var(--muted-foreground)]">
          {explicitSession
            ? "Vidlish chỉ mở speaking capture khi chính phiên được yêu cầu thuộc tài khoản này, đã hoàn tất và có guided transfer trong immutable lesson blueprint. Hệ thống không âm thầm chuyển sang lesson khác."
            : "Speaking capture chỉ dùng prompt từ một lesson đã hoàn tất. Vidlish không tự bịa câu nói mới chỉ để tạo điểm speaking."}
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/learning-lab/v2"
          className="inline-flex min-h-11 items-center rounded-xl bg-[var(--primary)] px-4 py-2 font-semibold text-white"
        >
          Mở một lesson trước
        </Link>
        <Link
          href="/progress"
          className="inline-flex min-h-11 items-center rounded-xl border border-[var(--border)] px-4 py-2 font-semibold"
        >
          Xem evidence hiện có
        </Link>
      </div>
    </div>
  );
}

export default async function SpeakingPracticePage({
  searchParams,
}: {
  searchParams: SpeakingSearchParams;
}) {
  const access = await (await createIdentityService()).resolveCurrentAccess();
  if (!access) redirect("/sign-in");

  const params = await searchParams;
  const rawRequestedSession = Array.isArray(params.session)
    ? params.session[0]
    : params.session;
  const explicitSession = rawRequestedSession !== undefined;
  const requestedSession = explicitSession
    ? z.string().uuid().safeParse(rawRequestedSession)
    : null;
  if (requestedSession && !requestedSession.success) {
    return <EmptySpeakingPractice explicitSession />;
  }

  const admin = getAdminSupabaseClient();
  let sessionsQuery = admin
    .from("lesson_sessions")
    .select("id,lesson_version_id,completed_at")
    .eq("owner_user_id", access.userId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false });
  if (requestedSession?.success) {
    sessionsQuery = sessionsQuery.eq("id", requestedSession.data);
  }
  const sessionsResult = await sessionsQuery.limit(
    requestedSession?.success ? 1 : 12,
  );
  if (sessionsResult.error) throw sessionsResult.error;

  const sessions = sessionsResult.data ?? [];
  const versionIds = [
    ...new Set(sessions.map((session) => session.lesson_version_id)),
  ];
  const versionsResult = versionIds.length
    ? await admin
        .from("lesson_versions")
        .select("id,blueprint")
        .eq("owner_user_id", access.userId)
        .in("id", versionIds)
    : { data: [], error: null };
  if (versionsResult.error) throw versionsResult.error;

  const practice = selectSpeakingPractice({
    sessions: sessions.map((session) => ({
      id: session.id,
      lessonVersionId: session.lesson_version_id,
    })),
    blueprintsByVersion: new Map(
      (versionsResult.data ?? []).map((row) => [row.id, row.blueprint] as const),
    ),
    requestedSessionId: requestedSession?.success ? requestedSession.data : null,
  });

  if (!practice) {
    return <EmptySpeakingPractice explicitSession={explicitSession} />;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-semibold text-[var(--accent)]">Luyện nói</p>
        <h1 className="text-3xl font-bold">
          Dùng lại tình huống đã học bằng giọng nói
        </h1>
        <p className="text-[var(--muted-foreground)]">
          Đây là speaking self-check chưa chấm. Mục tiêu là tạo production bằng
          giọng thật và phân biệt đúng mức hỗ trợ; không giả một pronunciation
          score khi chưa có verifier.
        </p>
      </div>

      <Card className="space-y-3 p-5">
        <p className="text-sm font-semibold text-[var(--accent)]">
          Tình huống nguồn
        </p>
        <p>{practice.activity.scenarioVi}</p>
        <p className="font-semibold">{practice.activity.promptVi}</p>
        <p className="text-sm text-[var(--muted-foreground)]">
          Nói trước khi xem mẫu. Nếu lesson đã hoàn tất ít nhất 24 giờ và đây là
          speaking receipt đầu tiên của tình huống, server mới được phép ghi mức
          hỗ trợ independent.
        </p>
      </Card>

      <SpeakingCapturePanel
        sessionId={practice.sessionId}
        activityId={practice.activity.id}
        exemplarAfterAttempt={practice.exemplarAfterAttempt ?? undefined}
      />

      <Link
        href="/progress"
        className="inline-flex min-h-11 items-center rounded-xl border border-[var(--border)] px-4 py-2 font-semibold"
      >
        Xem four-skill evidence
      </Link>
    </div>
  );
}
