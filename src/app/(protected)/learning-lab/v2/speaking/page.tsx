import Link from "next/link";
import { redirect } from "next/navigation";

import { getAdminSupabaseClient } from "@/adapters/supabase/admin-client";
import { createLearnerBlueprintView } from "@/modules/learning/application/create-learner-blueprint-view";
import { createIdentityService } from "@/platform/identity/create-identity-service";
import { lessonBlueprintV2Schema } from "@/shared/contracts/lesson-v2";
import { Card } from "@/shared/ui/card";
import { SpeakingCapturePanel } from "./_components/speaking-capture-panel";

export const dynamic = "force-dynamic";

export default async function SpeakingPracticePage() {
  const access = await (await createIdentityService()).resolveCurrentAccess();
  if (!access) redirect("/sign-in");

  const admin = getAdminSupabaseClient();
  const sessionsResult = await admin
    .from("lesson_sessions")
    .select("id,lesson_version_id,completed_at")
    .eq("owner_user_id", access.userId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(12);
  if (sessionsResult.error) throw sessionsResult.error;

  const sessions = sessionsResult.data ?? [];
  const versionIds = [...new Set(sessions.map((session) => session.lesson_version_id))];
  const versionsResult = versionIds.length
    ? await admin
        .from("lesson_versions")
        .select("id,blueprint")
        .eq("owner_user_id", access.userId)
        .in("id", versionIds)
    : { data: [], error: null };
  if (versionsResult.error) throw versionsResult.error;

  const blueprintsByVersion = new Map(
    (versionsResult.data ?? []).map((row) => [row.id, row.blueprint] as const),
  );

  let practice:
    | {
        sessionId: string;
        activity: Extract<
          ReturnType<typeof createLearnerBlueprintView>["activities"][number],
          { activityType: "guided_transfer" }
        >;
      }
    | null = null;

  for (const session of sessions) {
    const rawBlueprint = blueprintsByVersion.get(session.lesson_version_id);
    if (!rawBlueprint) continue;
    const parsed = lessonBlueprintV2Schema.safeParse(rawBlueprint);
    if (!parsed.success) continue;
    const learnerView = createLearnerBlueprintView(parsed.data);
    const activity = learnerView.activities.find(
      (candidate) => candidate.activityType === "guided_transfer",
    );
    if (activity?.activityType === "guided_transfer") {
      practice = { sessionId: session.id, activity };
      break;
    }
  }

  if (!practice) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-[var(--accent)]">Luyện nói</p>
          <h1 className="text-3xl font-bold">Chưa có tình huống đã học để nói lại</h1>
          <p className="text-[var(--muted-foreground)]">
            Speaking capture chỉ dùng prompt từ một lesson đã hoàn tất. Vidlish
            không tự bịa câu nói mới chỉ để tạo điểm speaking.
          </p>
        </div>
        <Link
          href="/learning-lab/v2"
          className="inline-flex min-h-11 items-center rounded-xl bg-[var(--primary)] px-4 py-2 font-semibold text-white"
        >
          Mở một lesson trước
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-semibold text-[var(--accent)]">Luyện nói</p>
        <h1 className="text-3xl font-bold">Dùng lại tình huống đã học bằng giọng nói</h1>
        <p className="text-[var(--muted-foreground)]">
          Đây là speaking self-check chưa chấm. Mục tiêu của slice này là tạo
          production bằng giọng thật và lưu evidence đúng mức, không giả một
          pronunciation score khi chưa có verifier.
        </p>
      </div>

      <Card className="space-y-3 p-5">
        <p className="text-sm font-semibold text-[var(--accent)]">Tình huống nguồn</p>
        <p>{practice.activity.scenarioVi}</p>
        <p className="font-semibold">{practice.activity.promptVi}</p>
        <p className="text-sm text-[var(--muted-foreground)]">
          Viết trong prompt là bài gốc; ở bước này hãy nói thành tiếng câu bạn
          muốn dùng trong tình huống đó.
        </p>
      </Card>

      <SpeakingCapturePanel
        sessionId={practice.sessionId}
        activityId={practice.activity.id}
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
