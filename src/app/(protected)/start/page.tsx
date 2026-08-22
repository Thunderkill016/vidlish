import { redirect } from "next/navigation";

import { createIdentityService } from "@/platform/identity/create-identity-service";
import { createBeginnerProgressRepository } from "@/platform/learning/create-beginner-progress-repository";
import { Card } from "@/shared/ui/card";

import { BeginnerSession } from "./_components/beginner-session";

export const dynamic = "force-dynamic";

export default async function StartPage() {
  const access = await (await createIdentityService()).resolveCurrentAccess();
  if (!access) redirect("/sign-in");

  const known = await createBeginnerProgressRepository().knownWords(
    access.userId,
  );

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

      <BeginnerSession />
    </main>
  );
}
