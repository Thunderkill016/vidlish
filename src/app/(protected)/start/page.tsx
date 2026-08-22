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
          chưa có independent evidence, còn các từ khác phải nằm trong tập đã
          biết. Đây là cách giữ input đầu vào dễ audit ở giai đoạn này, không
          phải định nghĩa duy nhất của “comprehensible input”.
        </p>
      </header>

      <Card className="flex flex-col gap-1">
        <span className="text-sm text-[var(--muted-foreground)]">
          Số từ bạn đã tự nói ra được, không mở trợ giúp
        </span>
        <span className="text-3xl font-semibold tabular-nums">
          {known.length}
        </span>
        <span className="text-xs text-[var(--muted-foreground)]">
          Đây là evidence set mà policy beginner hiện tại dùng để quyết định câu
          tiếp theo. Nó không phải toàn bộ những gì bạn có thể nhận ra hoặc hiểu.
        </span>
      </Card>

      <Card className="flex flex-col gap-1">
        <span className="text-sm text-[var(--muted-foreground)]">
          Số câu bạn đọc được trọn vẹn theo evidence set hiện tại
        </span>
        <span className="text-3xl font-semibold tabular-nums">
          {readable.toLocaleString("vi-VN")}
          <span className="text-base font-normal text-[var(--muted-foreground)]">
            {" / "}
            {corpus.toLocaleString("vi-VN")}
          </span>
        </span>
        <span className="text-xs text-[var(--muted-foreground)]">
          Đếm trên kho câu do người viết bằng policy hiện tại. Con số này chỉ
          tăng khi independent evidence tăng; nó không phải điểm trình độ chung.
        </span>
      </Card>

      <BeginnerSession />

      {/* Only once there is something real to ask about: a check made entirely
          of nonwords measures nothing. */}
      {known.length > 0 ? <CalibrationCheck /> : null}
    </main>
  );
}
