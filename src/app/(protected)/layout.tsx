import { redirect } from "next/navigation";

import { createIdentityService } from "@/platform/identity/create-identity-service";
import { AppShell } from "./_components/app-shell";
import { SessionRevalidator } from "./_components/session-revalidator";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const access = await (await createIdentityService()).resolveCurrentAccess();
  if (!access) redirect("/sign-in");

  return (
    <>
      <SessionRevalidator />
      <AppShell email={access.email}>{children}</AppShell>
    </>
  );
}
