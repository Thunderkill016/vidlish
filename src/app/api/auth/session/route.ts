import { NextResponse } from "next/server";

import { createIdentityService } from "@/platform/identity/create-identity-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const access = await (await createIdentityService()).resolveCurrentAccess();

  return new NextResponse(null, {
    status: access ? 204 : 401,
    headers: { "Cache-Control": "private, no-store" },
  });
}
