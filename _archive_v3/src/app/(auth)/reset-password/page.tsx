import { redirect } from "next/navigation";

import { createIdentityService } from "@/platform/identity/create-identity-service";
import { getServerConfig } from "@/platform/config/server";
import { Card } from "@/shared/ui/card";
import { ResetPasswordFlow } from "./_components/reset-password-flow";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage() {
  const identityService = await createIdentityService();
  const access = await identityService.resolveCurrentAccess();
  if (!access) redirect("/sign-in?error=authentication_failed");

  return (
    <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top_left,_var(--primary-wash),_transparent_38%),var(--background)] px-4 py-8 sm:px-6">
      <Card className="w-full max-w-md p-6 sm:p-8">
        <header className="mb-7 space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
            Nếp học tiếng Anh
          </p>
          <h1 className="text-2xl font-bold tracking-tight">Đặt mật khẩu mới</h1>
          <p className="leading-6 text-[var(--muted-foreground)]">
            Chọn một mật khẩu mới cho tài khoản {access.email}.
          </p>
        </header>
        <ResetPasswordFlow useFakeAuth={getServerConfig().AUTH_ADAPTER === "fake"} />
      </Card>
    </main>
  );
}
