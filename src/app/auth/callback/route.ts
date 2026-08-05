import { type NextRequest, NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/adapters/supabase/server-client";
import { createIdentityService } from "@/platform/identity/create-identity-service";
import { sanitizeIntendedPath } from "@/shared/contracts/auth";

function signInRedirect(
  request: NextRequest,
  error: "oauth_failed" | "not_invited",
  intendedPath: string,
): NextResponse {
  const target = new URL("/sign-in", request.url);
  target.searchParams.set("error", error);
  if (intendedPath !== "/create") target.searchParams.set("next", intendedPath);
  return NextResponse.redirect(target);
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const intendedPath = sanitizeIntendedPath(request.nextUrl.searchParams.get("next"));

  if (!code) return signInRedirect(request, "oauth_failed", intendedPath);

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return signInRedirect(request, "oauth_failed", intendedPath);

  const access = await (await createIdentityService()).resolveCurrentAccess();
  if (!access) return signInRedirect(request, "not_invited", intendedPath);

  return NextResponse.redirect(new URL(intendedPath, request.url));
}
