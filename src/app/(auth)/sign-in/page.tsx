import { redirect } from "next/navigation";

import { createIdentityService } from "@/platform/identity/create-identity-service";
import { getPublicConfig } from "@/platform/config/public";
import { sanitizeIntendedPath } from "@/shared/contracts/auth";
import { Card } from "@/shared/ui/card";
import { SignInFlow } from "./_components/sign-in-flow";

export const dynamic = "force-dynamic";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{
    next?: string | string[];
    error?: string | string[];
  }>;
}) {
  const access = await (await createIdentityService()).resolveCurrentAccess();
  if (access) redirect("/create");

  const params = await searchParams;
  const nextValue = Array.isArray(params.next) ? params.next[0] : params.next;
  const errorValue = Array.isArray(params.error) ? params.error[0] : params.error;
  const intendedPath = sanitizeIntendedPath(nextValue);
  const cooldownSeconds = getPublicConfig().NEXT_PUBLIC_AUTH_RESEND_COOLDOWN_SECONDS;
  const initialError =
    errorValue === "not_invited"
      ? "Tài khoản Google này chưa được mời vào Vidlish private beta."
      : errorValue === "oauth_failed"
        ? "Đăng nhập Google chưa hoàn tất. Hãy thử lại."
        : "";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl items-center px-4 py-10 sm:px-6">
      <div className="w-full space-y-8">
        <header className="space-y-3 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
            Vidlish private beta
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Đăng nhập để bắt đầu</h1>
          <p className="mx-auto max-w-md text-[var(--muted-foreground)]">
            Dùng tài khoản Google hoặc nhận mã đăng nhập qua email.
          </p>
          <p lang="en" className="text-sm font-medium text-[var(--primary)]">
            Any English video. Your English lesson.
          </p>
        </header>

        <Card>
          <SignInFlow
            intendedPath={intendedPath}
            cooldownSeconds={cooldownSeconds}
            initialError={initialError}
          />
        </Card>
      </div>
    </main>
  );
}
