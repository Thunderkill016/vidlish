import { redirect } from "next/navigation";

import { allBeginnerSentences } from "@/adapters/vocabulary/beginner-sentence-catalogue";
import { selectClozeItems } from "@/modules/production/application/build-cloze-item";
import { createIdentityService } from "@/platform/identity/create-identity-service";
import { createBeginnerProgressRepository } from "@/platform/learning/create-beginner-progress-repository";
import { Card } from "@/shared/ui/card";

import { SentenceBuilder } from "./_components/sentence-builder";

export const dynamic = "force-dynamic";

/** Sized to the thirty minutes a day the product owner said he actually has. */
const SENTENCES_PER_SITTING = 12;

export default async function BuildPage() {
  const access = await (await createIdentityService()).resolveCurrentAccess();
  if (!access) redirect("/sign-in");

  const known = new Set(
    await (await createBeginnerProgressRepository()).knownWords(access.userId),
  );
  const items = selectClozeItems({
    sentences: allBeginnerSentences(),
    known,
    wanted: SENTENCES_PER_SITTING,
  });

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-[var(--accent)]">Ghép câu</p>
        <h1 className="text-2xl font-semibold">Một từ bị lấy đi. Bạn điền vào.</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Bạn nói mình biết từ nhưng không ghép thành câu. Phần này nhắm đúng chỗ
          đó: mọi thứ khác trong sản phẩm đo xem bạn <em>nhận ra</em> được gì —
          phần này bắt bạn <em>tự bật ra</em>.
        </p>
      </header>

      <SentenceBuilder items={items} />

      <Card className="flex flex-col gap-2">
        <h2 className="text-base font-bold">Vì sao gõ chứ không chọn đáp án</h2>
        <p className="text-sm leading-6 text-[var(--muted-foreground)]">
          Chọn từ một danh sách là nhận ra — thứ bạn đã làm được. Trong nghiên
          cứu, học để nhận ra có hệ số cao hơn học để tự bật ra, nhưng nhận ra
          rơi mất nhanh: từ 18% xuống 6% ở lần đo sau, trong khi tự nhớ nghĩa
          bắt đầu thấp hơn rồi <em>tăng</em> lên. Số của phần này sẽ trông xấu
          hơn, và đó là dấu hiệu đúng.
        </p>
        <p className="text-xs text-[var(--muted-foreground)]">
          Không cần nói ra tiếng, nên dùng được cả khi bạn đang ở chỗ đông người.
        </p>
      </Card>
    </div>
  );
}
