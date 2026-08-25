import { redirect } from "next/navigation";

import { createIdentityService } from "@/platform/identity/create-identity-service";

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
    </div>
  );
}
