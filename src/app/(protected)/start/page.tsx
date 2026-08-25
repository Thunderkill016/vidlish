import { redirect } from "next/navigation";

import {
  beginnerSentenceCatalogueSize,
  readableSentenceCount,
} from "@/adapters/vocabulary/beginner-sentence-catalogue";
import { createIdentityService } from "@/platform/identity/create-identity-service";
import { readPanel } from "@/platform/reliability/read-panel";
import { createBeginnerProgressRepository } from "@/platform/learning/create-beginner-progress-repository";
import { Card } from "@/shared/ui/card";

import { BeginnerSession } from "./_components/beginner-session";
import { CalibrationCheck } from "./_components/calibration-check";

export const dynamic = "force-dynamic";

export default async function StartPage() {
  const access = await (await createIdentityService()).resolveCurrentAccess();
  if (!access) redirect("/sign-in");

  // This one fails closed rather than degrading, and the difference matters.
  // The dashboard can show an empty list when a panel is unreadable; this page
  // cannot. Treating an unreadable evidence store as "knows nothing" would
  // start teaching words the learner already produced and bank a second round
  // of evidence for them — quietly corrupting the one record the whole product
  // is built on. Refusing, with the reason on screen, is the honest outcome.
  const knownRead = await readPanel("từ nền", async () =>
(await createBeginnerProgressRepository()).knownWords(access.userId),
  );

  if (knownRead.kind === "unavailable") {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10">
        <h1 className="text-2xl font-semibold">Chưa bắt đầu được lúc này</h1>
        <Card className="flex flex-col gap-2" data-testid="start-unavailable">
          <p className="text-sm">
            Chưa đọc được số từ bạn đã học, nên buổi học chưa thể bắt đầu.
          </p>
          <p className="text-sm text-[var(--muted-foreground)]">
            Sản phẩm không đoán bừa là bạn chưa biết gì: làm vậy sẽ dạy lại
            những từ bạn đã nói ra được, và ghi đè lên chính bằng chứng đó. Thà
            dừng lại còn hơn làm hỏng tiến độ của bạn.
          </p>
        </Card>
      </main>
    );
  }

  const known = knownRead.value;
  const knownSet = new Set(known);
  const readable = readableSentenceCount(knownSet);
  const corpus = beginnerSentenceCatalogueSize();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Bắt đầu từ số 0</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Mỗi câu ở đây chỉ có đúng một từ bạn chưa gặp. Không phải vì dễ hơn —
          mà vì một câu có hai từ mới thì bạn đoán, và đoán thì không để lại gì.
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
          Đây là con số quyết định câu tiếp theo bạn gặp. Không phải số buổi
          học, không phải chuỗi ngày liên tiếp.
        </span>
      </Card>

      <Card className="flex flex-col gap-1">
        <span className="text-sm text-[var(--muted-foreground)]">
          Số câu bạn đọc được trọn vẹn, không có chữ nào lạ
        </span>
        <span className="text-3xl font-semibold tabular-nums">
          {readable.toLocaleString("vi-VN")}
          <span className="text-base font-normal text-[var(--muted-foreground)]">
            {" / "}
            {corpus.toLocaleString("vi-VN")}
          </span>
        </span>
        <span className="text-xs text-[var(--muted-foreground)]">
          Đếm trên kho câu do người viết. Con số này chỉ nhúc nhích khi bạn học
          được thêm, nên nó không tự đẹp lên vì bạn mở ứng dụng nhiều hơn.
        </span>
      </Card>

      <BeginnerSession />

      {/* Only once there is something real to ask about: a check made entirely
          of nonwords measures nothing. */}
      {known.length > 0 ? <CalibrationCheck /> : null}
    </main>
  );
}
