import Link from "next/link";
import { redirect } from "next/navigation";

import { createGoldenSessionLearningBlueprint } from "@/adapters/fake/fixture-golden-learning-blueprint";
import { createIdentityService } from "@/platform/identity/create-identity-service";
import { GoldenSessionParticipantCapture } from "./_components/golden-session-participant-capture";

export const dynamic = "force-dynamic";

export default async function GoldenSessionParticipantCapturePage() {
  const access = await (await createIdentityService()).resolveCurrentAccess();
  if (!access) {
    redirect("/sign-in?next=/learning-lab/v2/usability/capture");
  }

  const blueprint = createGoldenSessionLearningBlueprint();

  return (
    <div className="mx-auto max-w-4xl space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--accent)]">
            Gate 5 · Internal operator
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
            Capture một participant thật
          </h1>
        </div>
        <div className="flex flex-wrap gap-4 text-sm font-semibold text-[var(--primary)]">
          <Link href="/learning-lab/v2">← Golden Session</Link>
          <Link href="/learning-lab/v2/usability">Evaluator →</Link>
        </div>
      </div>

      <div className="space-y-2 text-sm leading-6 text-[var(--muted-foreground)]">
        <p>
          Dùng trang này sau khi một participant thật đã chạy Golden Session trong
          local study harness. Measurement được đọc từ session của chính tài khoản
          đang đăng nhập; moderator không nhập UUID bằng tay.
        </p>
        <p>
          Trang không tự suy ra learning gain và không lưu participant record lên
          server. Sau khi copy record, xóa Golden browser state rồi reset harness
          trước người tiếp theo.
        </p>
      </div>

      <GoldenSessionParticipantCapture blueprintId={blueprint.blueprintId} />
    </div>
  );
}
