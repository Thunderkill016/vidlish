import { redirect } from "next/navigation";

import { createIdentityService } from "@/platform/identity/create-identity-service";
import { SecurityCenter } from "./_components/security-center";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const access = await (await createIdentityService()).resolveCurrentAccess();
  if (!access) redirect("/sign-in?next=/account");
  return <SecurityCenter email={access.email} />;
}
