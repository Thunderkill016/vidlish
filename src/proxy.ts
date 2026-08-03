import { type NextRequest, NextResponse } from "next/server";

import { refreshProxySession } from "@/adapters/supabase/proxy-session";

function copyResponseCookies(source: NextResponse, target: NextResponse): void {
  source.cookies.getAll().forEach((cookie) => target.cookies.set(cookie));
}

export async function proxy(request: NextRequest) {
  const { response, hasSession } = await refreshProxySession(request);

  if (!hasSession) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set(
      "next",
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );
    const redirect = NextResponse.redirect(signInUrl);
    copyResponseCookies(response, redirect);
    redirect.headers.set("Cache-Control", "private, no-store");
    return redirect;
  }

  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: ["/create/:path*", "/library/:path*"],
};
