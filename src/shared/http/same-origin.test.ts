import { describe, expect, it } from "vitest";

import { isSameOriginRequest } from "@/shared/http/same-origin";

describe("same-origin request validation", () => {
  it("accepts a direct same-origin request even when framework URL normalization differs", () => {
    expect(
      isSameOriginRequest({
        origin: "http://127.0.0.1:3100",
        host: "127.0.0.1:3100",
        requestProtocol: "http:",
      }),
    ).toBe(true);
  });

  it("accepts a trusted reverse-proxy host and protocol", () => {
    expect(
      isSameOriginRequest({
        origin: "https://app.vidlish.example",
        host: "internal-runtime:3000",
        forwardedHost: "app.vidlish.example",
        forwardedProto: "https",
        requestProtocol: "http:",
      }),
    ).toBe(true);
  });

  it.each([
    {
      origin: "https://evil.example",
      host: "app.vidlish.example",
      requestProtocol: "https:",
    },
    {
      origin: "http://app.vidlish.example",
      host: "app.vidlish.example",
      requestProtocol: "https:",
    },
    {
      origin: null,
      host: "app.vidlish.example",
      requestProtocol: "https:",
    },
    {
      origin: "not a URL",
      host: "app.vidlish.example",
      requestProtocol: "https:",
    },
  ])("rejects mismatched or malformed request %#", (input) => {
    expect(isSameOriginRequest(input)).toBe(false);
  });
});
