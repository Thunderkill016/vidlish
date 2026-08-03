import { redirect } from "next/navigation";

import { createIdentityService } from "@/platform/identity/create-identity-service";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const access = await (await createIdentityService()).resolveCurrentAccess();
  redirect(access ? "/create" : "/sign-in");
}
