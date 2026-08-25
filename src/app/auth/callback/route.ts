import { type NextRequest, NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/adapters/supabase/server-client";
import { createIdentityService } from "@/platform/identity/create-identity-service";
import { sanitizeIntendedPath } from "@/shared/contracts/auth";

function signInRedirect(
  request: NextRequest,
  error: "authentication_failed" | "mfa_required",
  intendedPath: string,
): NextResponse {
  const target = new URL("/sign-in", request.url);
  target.searchParams.set("error", error);
  if (intendedPath !== "/start") target.searchParams.set("next", intendedPath);
  return NextResponse.redirect(target);
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const intendedPath = sanitizeIntendedPath(request.nextUrl.searchParams.get("next"));

  if (!code) return signInRedirect(request, "authentication_failed", intendedPath);

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return signInRedirect(request, "authentication_failed", intendedPath);

  const identityService = await createIdentityService();
  if (await identityService.requiresMfaChallenge()) {
    return signInRedirect(request, "mfa_required", intendedPath);
  }
  const access = await identityService.resolveCurrentAccess();
  if (!access) return signInRedirect(request, "authentication_failed", intendedPath);

  return NextResponse.redirect(new URL(intendedPath, request.url));
}
