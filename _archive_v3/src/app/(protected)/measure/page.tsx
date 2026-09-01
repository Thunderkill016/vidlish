import { redirect } from "next/navigation";

import { grammarCoverageFor } from "@/modules/curriculum/application/grammar-coverage";
import { FOUNDATION_UNITS } from "@/modules/curriculum/content";
import { createIdentityService } from "@/platform/identity/create-identity-service";
import { Card } from "@/shared/ui/card";

import { ImitationSitting } from "./_components/imitation-sitting";

export const dynamic = "force-dynamic";

export default async function MeasurePage() {
  const access = await (await createIdentityService()).resolveCurrentAccess();
  if (!access) redirect("/sign-in");

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-semibold text-[var(--accent)]">Đo tiến bộ</p>
        <h1 className="text-3xl font-bold tracking-tight">Bạn đang ở đâu?</h1>
        <p className="max-w-2xl text-[var(--muted-foreground)]">
          Một phép đo mà sản phẩm này không hề dạy tới. Bài do chính người dạy ra
          đề thì bao giờ cũng dễ hơn thực tế — cái này thì không.
        </p>
      </div>
      <ImitationSitting />

      <Card className="flex flex-col gap-3" data-testid="course-coverage">
        <h2 className="text-lg font-bold">Khoá học này dạy được bao nhiêu phần của A1</h2>
        <p className="text-sm leading-6 text-[var(--muted-foreground)]">
          Đo theo CEFR-J Grammar Profile — danh mục công bố nói A1 gồm những mục
          ngữ pháp nào. Con số này là của khoá học, không phải của bạn, và nó ở
          đây vì bạn có quyền biết mình đang học một thứ chưa hoàn chỉnh tới đâu.
        </p>
        <ul className="flex flex-col gap-1 text-sm">
          {["A1.1", "A1.2", "A1.3"].map((level) => {
            const coverage = grammarCoverageFor(FOUNDATION_UNITS, level);
            const percent = Math.round((coverage.covered / coverage.total) * 100);
            return (
              <li key={level} className="flex items-baseline gap-3">
                <span className="w-14 font-mono text-xs text-[var(--muted-foreground)]">
                  {level}
                </span>
                <span className="font-semibold tabular-nums">
                  {coverage.covered}/{coverage.total}
                </span>
                <span className="text-[var(--muted-foreground)]">{percent}%</span>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
