import type { NextRequest } from "next/server";

import { authErrors } from "@/shared/errors/product-error";

type SameOriginInput = {
  origin: string | null;
  host: string | null;
  forwardedHost?: string | null;
  forwardedProto?: string | null;
  requestProtocol: string;
};

function firstForwardedValue(value: string | null | undefined): string | null {
  const first = value?.split(",", 1)[0]?.trim();
  return first || null;
}

export function isSameOriginRequest({
  origin,
  host,
  forwardedHost,
  forwardedProto,
  requestProtocol,
}: SameOriginInput): boolean {
  if (!origin) return false;

  const expectedHost = firstForwardedValue(forwardedHost) ?? host?.trim() ?? null;
  if (!expectedHost) return false;

  const expectedProtocol =
    firstForwardedValue(forwardedProto)?.replace(/:$/, "") ??
    requestProtocol.replace(/:$/, "");

  if (expectedProtocol !== "http" && expectedProtocol !== "https") return false;

  try {
    const originUrl = new URL(origin);
    return (
      originUrl.protocol === `${expectedProtocol}:` &&
      originUrl.host.toLowerCase() === expectedHost.toLowerCase()
    );
  } catch {
    return false;
  }
}

export function assertSameOrigin(request: NextRequest): void {
  const allowed = isSameOriginRequest({
    origin: request.headers.get("origin"),
    host: request.headers.get("host"),
    forwardedHost: request.headers.get("x-forwarded-host"),
    forwardedProto: request.headers.get("x-forwarded-proto"),
    requestProtocol: request.nextUrl.protocol,
  });

  if (!allowed) throw authErrors.rejected();
}
