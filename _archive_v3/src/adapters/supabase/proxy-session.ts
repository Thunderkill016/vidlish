import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { fakeSessionCookieName } from "@/adapters/fake/fake-identity-provider";
import { getProxyConfig } from "@/platform/config/proxy";

export async function refreshProxySession(request: NextRequest): Promise<{
  response: NextResponse;
  hasSession: boolean;
}> {
  const config = getProxyConfig();

  if (config.AUTH_ADAPTER === "fake") {
    return {
      response: NextResponse.next({ request }),
      hasSession: Boolean(request.cookies.get(fakeSessionCookieName)?.value),
    };
  }

  let response = NextResponse.next({ request });
  const client = createServerClient(
    config.NEXT_PUBLIC_SUPABASE_URL,
    config.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data, error } = await client.auth.getClaims();
  return { response, hasSession: !error && Boolean(data?.claims?.sub) };
}
