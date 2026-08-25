import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { readAuthJsonBody } from "@/shared/http/json-body";

function request(body: string, contentType = "application/json") {
  return new NextRequest("https://app.vidlish.example/api/auth/sign-in", {
    method: "POST",
    headers: {
      "content-type": contentType,
      "content-length": String(Buffer.byteLength(body)),
    },
    body,
  });
}

describe("auth JSON body", () => {
  it("parses a small JSON object", async () => {
    await expect(readAuthJsonBody(request('{"email":"a@example.com"}'))).resolves.toEqual({
      email: "a@example.com",
    });
  });

  it("rejects malformed, wrong-content-type and oversized bodies", async () => {
    await expect(readAuthJsonBody(request("{"))).rejects.toMatchObject({
      code: "AUTH_REQUEST_REJECTED",
    });
    await expect(readAuthJsonBody(request("{}", "text/plain"))).rejects.toMatchObject({
      code: "AUTH_REQUEST_REJECTED",
    });
    await expect(
      readAuthJsonBody(request(JSON.stringify({ value: "x".repeat(9 * 1024) }))),
    ).rejects.toMatchObject({ code: "AUTH_REQUEST_REJECTED" });
  });
});
