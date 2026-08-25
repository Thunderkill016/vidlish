import Link from "next/link";
import { redirect } from "next/navigation";

import { readingShelf, shelfWordCount } from "@/adapters/reading/shelf";
import { coverageOf, readPassage } from "@/modules/reading/application/read-passage";
import { createIdentityService } from "@/platform/identity/create-identity-service";
import { createBeginnerProgressRepository } from "@/platform/learning/create-beginner-progress-repository";
import { Card } from "@/shared/ui/card";

export const dynamic = "force-dynamic";

/** Where patterns start recurring often enough to be learned from reading alone. */
const WORDS_WHERE_PATTERNS_RECUR = 60_000;

export default async function ReadPage() {
  const access = await (await createIdentityService()).resolveCurrentAccess();
  if (!access) redirect("/sign-in");

  const known = new Set(
    await (await createBeginnerProgressRepository()).knownWords(access.userId),
  );
  const sets = { known, learning: new Set<string>() };
  const shelf = readingShelf();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-semibold text-[var(--accent)]">Đọc</p>
        <h1 className="text-3xl font-bold tracking-tight">Tiếng Anh thật, có phao</h1>
        <p className="max-w-2xl text-[var(--muted-foreground)]">
          Đây không phải câu viết cho bài học. Đây là những bài người ta viết cho người
          đọc. Từ nào bạn chưa biết thì chạm một cái là ra nghĩa và ra tiếng — nên bạn
          không cần biết hết mới đọc được.
        </p>
      </div>

      {shelf.map((topic) => (
        <section key={topic.topic} className="space-y-3">
          <h2 className="text-lg font-bold">{topic.topic}</h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            Các bài cùng chủ đề đặt cạnh nhau là cố ý: cùng một chủ đề thì từ lặp lại
            nhiều hơn, và lặp lại mới là thứ hiếm — một từ cần hơn tám lần gặp mới nhớ
            nổi mặt chữ.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {topic.texts.map((text) => {
              const coverage = coverageOf(
                readPassage(text.paragraphs.join("\n")),
                sets,
              );
              return (
                <Card key={text.id} className="flex flex-col gap-3">
                  <div className="space-y-1">
                    <h3 className="text-base font-bold">{text.title}</h3>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {text.words.toLocaleString("vi-VN")} từ ·{" "}
                      {text.paragraphs.length} đoạn
                    </p>
                  </div>
                  <div className="flex h-[7px] overflow-hidden rounded-full bg-[var(--muted)]">
                    <span
                      className="h-full bg-[var(--solved)]"
                      style={{ width: `${100 * coverage.knownShare}%` }}
                    />
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Bạn đã biết {Math.round(100 * coverage.knownShare)}% số từ
                  </p>
                  <Link
                    href={`/read/${text.id}`}
                    className="inline-flex min-h-10 items-center text-sm font-semibold text-[var(--primary)]"
                  >
                    Đọc bài này →
                  </Link>
                </Card>
              );
            })}
          </div>
        </section>
      ))}

      <Card className="space-y-2">
        <h2 className="text-base font-bold">Vì sao kệ sách này nhỏ</h2>
        <p className="text-sm leading-6 text-[var(--muted-foreground)]">
          Hầu hết sản phẩm đọc cho bạn mang vào bất cứ thứ gì. Phân tích tổng hợp 2025
          trên 34 nghiên cứu và 3.942 người học lại thấy hiệu quả <em>lớn hơn</em> khi
          lựa chọn văn bản bị giới hạn và khi có kiểm tra. Nên đây là một kệ có giới
          hạn, không phải một ô tìm kiếm.
        </p>
        <p className="text-xs text-[var(--muted-foreground)]">
          Hiện có {shelfWordCount().toLocaleString("vi-VN")} từ. Mốc để các mẫu lặp lại
          đủ nhiều mà học được từ chính việc đọc là khoảng{" "}
          {WORDS_WHERE_PATTERNS_RECUR.toLocaleString("vi-VN")} từ — kệ này còn nhỏ, và
          sẽ nói thẳng như vậy cho tới khi đủ.
        </p>
      </Card>
    </div>
  );
}
