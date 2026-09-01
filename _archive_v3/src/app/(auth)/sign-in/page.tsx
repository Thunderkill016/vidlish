import { redirect } from "next/navigation";

import { createIdentityService } from "@/platform/identity/create-identity-service";
import { getServerConfig } from "@/platform/config/server";
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
  const identityService = await createIdentityService();
  const access = await identityService.resolveCurrentAccess();
  if (access) redirect("/start");

  const params = await searchParams;
  const nextValue = Array.isArray(params.next) ? params.next[0] : params.next;
  const errorValue = Array.isArray(params.error) ? params.error[0] : params.error;
  const intendedPath = sanitizeIntendedPath(nextValue);
  const initialError =
    errorValue === "authentication_failed" ? "Xác thực tài khoản chưa hoàn tất. Hãy thử lại." : "";
  let initialMfaRequired = errorValue === "mfa_required";
  if (!initialMfaRequired) {
    try {
      initialMfaRequired = await identityService.requiresMfaChallenge();
    } catch {
      // A visitor without a session has nothing to challenge. Protected routes
      // still fail closed because resolveCurrentAccess only calls this after a
      // verified current user was found.
      initialMfaRequired = false;
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_var(--primary-wash),_transparent_38%),var(--background)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(380px,0.75fr)] lg:gap-20">
        <section className="space-y-8 lg:py-12">
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
              Nếp học tiếng Anh
            </p>
            <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
              Bắt đầu từ số 0. Tiến bộ bằng một nếp học thật.
            </h1>
            <p className="max-w-xl text-base leading-7 text-[var(--muted-foreground)] sm:text-lg">
              Một vòng học ngắn, có mục tiêu rõ ràng để bạn nghe, nói, đọc và viết tiếng Anh
              từng bước — thay vì chỉ sưu tầm thêm bài học.
            </p>
          </div>

          <div className="grid gap-3 text-sm sm:grid-cols-3">
            {[
              ["01", "Học đúng sức", "Bắt đầu bằng mức hiện tại của bạn."],
              ["02", "Nhớ đúng lúc", "Ôn lại trước khi kiến thức bị quên."],
              ["03", "Dùng được", "Biến từ mới thành câu bạn có thể nói."],
            ].map(([number, title, description]) => (
              <div
                key={number}
                className="rounded-[var(--radius)] border border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_88%,transparent)] p-4 shadow-sm"
              >
                <p className="font-mono text-xs font-semibold text-[var(--accent)]">{number}</p>
                <p className="mt-3 font-semibold">{title}</p>
                <p className="mt-1 leading-5 text-[var(--muted-foreground)]">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <Card className="mx-auto w-full max-w-md p-6 sm:p-8">
          <header className="mb-7 space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">Vào nếp học của bạn</h2>
            <p className="leading-6 text-[var(--muted-foreground)]">
              Tiếp tục với Google, hoặc dùng email và mật khẩu để tạo tài khoản mới.
            </p>
          </header>
          <SignInFlow
            intendedPath={intendedPath}
            initialError={initialError}
            initialMfaRequired={initialMfaRequired}
            useFakeAuth={getServerConfig().AUTH_ADAPTER === "fake"}
          />
          <p className="mt-6 text-center text-xs leading-5 text-[var(--muted-foreground)]">
            Chỉ dùng tài khoản của bạn. Không chia sẻ mật khẩu hoặc liên kết khôi phục cho người khác.
          </p>
        </Card>
      </div>
    </main>
  );
}
