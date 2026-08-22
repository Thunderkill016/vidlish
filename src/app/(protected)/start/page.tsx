import { redirect } from "next/navigation";

import {
  beginnerSentenceCatalogueSize,
  readableSentenceCount,
} from "@/adapters/vocabulary/beginner-sentence-catalogue";
import { createIdentityService } from "@/platform/identity/create-identity-service";
import { createBeginnerProgressRepository } from "@/platform/learning/create-beginner-progress-repository";
import { Card } from "@/shared/ui/card";

import { BeginnerSession } from "./_components/beginner-session";
import { CalibrationCheck } from "./_components/calibration-check";

export const dynamic = "force-dynamic";

export default async function StartPage() {
  const access = await (await createIdentityService()).resolveCurrentAccess();
  if (!access) redirect("/sign-in");

  const known = await createBeginnerProgressRepository().knownWords(
    access.userId,
  );

  const knownSet = new Set(known);
  const readable = readableSentenceCount(knownSet);
  const corpus = beginnerSentenceCatalogueSize();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Bắt đầu từ số 0</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Vidlish hiện dùng một policy bảo thủ: câu beginner chỉ chứa một target
          ngoài lexical gate set, còn các từ khác phải nằm trong set đó. Đây là
          cách giữ input dễ audit ở giai đoạn này, không phải định nghĩa duy nhất
          của “comprehensible input”.
        </p>
      </header>

      <Card className="flex flex-col gap-1">
        <span className="text-sm text-[var(--muted-foreground)]">
          Số từ đang nằm trong beginner input gate
        </span>
        <span className="text-3xl font-semibold tabular-nums">
          {known.length}
        </span>
        <span className="text-xs text-[var(--muted-foreground)]">
          Set này dùng để chọn input tiếp theo. Bootstrap có thể gồm calibrated
          self-report, còn sentence dictation có thể được chấm trực tiếp, nên
          Vidlish không dùng riêng con số này để tuyên bố capability hay nhớ lâu.
        </span>
      </Card>

      <Card className="flex flex-col gap-1">
        <span className="text-sm text-[var(--muted-foreground)]">
          Số câu hợp lệ theo lexical gate set hiện tại
        </span>
        <span className="text-3xl font-semibold tabular-nums">
          {readable.toLocaleString("vi-VN")}
          <span className="text-base font-normal text-[var(--muted-foreground)]">
            {" / "}
            {corpus.toLocaleString("vi-VN")}
          </span>
        </span>
        <span className="text-xs text-[var(--muted-foreground)]">
          Đây là coverage của current input policy trên kho câu, không phải điểm
          trình độ hay số câu hệ thống đã chứng minh bạn hiểu độc lập.
        </span>
      </Card>

      <BeginnerSession />

      {/* Only once there is something real to ask about: a check made entirely
          of nonwords measures nothing. */}
      {known.length > 0 ? <CalibrationCheck /> : null}
    </main>
  );
}
