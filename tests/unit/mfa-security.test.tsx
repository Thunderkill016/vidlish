// @vitest-environment jsdom

import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MfaChallenge } from "@/app/(auth)/sign-in/_components/mfa-challenge";
import { SecurityCenter } from "@/app/(protected)/account/_components/security-center";

const listFactors = vi.fn();
const enroll = vi.fn();
const challengeAndVerify = vi.fn();
const signOut = vi.fn();
const unenroll = vi.fn();

vi.mock("@/adapters/supabase/browser-client", () => ({
  createBrowserSupabaseClient: () => ({
    auth: {
      mfa: { challengeAndVerify, enroll, listFactors, unenroll },
      signOut,
    },
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  listFactors.mockResolvedValue({ data: { totp: [] }, error: null });
});

afterEach(() => vi.unstubAllGlobals());

describe("MFA account security", () => {
  it("shows a safe recovery message when factor lookup cannot reach Supabase", async () => {
    listFactors.mockRejectedValue(new Error("network unavailable"));

    render(createElement(MfaChallenge, { redirectTo: "/library" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Không thể kiểm tra ứng dụng xác thực. Hãy đăng nhập lại.",
    );
    expect(screen.getByRole("button", { name: "Xác thực và tiếp tục" })).toBeDisabled();
  });

  it("does not expose a provider error when a second-factor code is invalid", async () => {
    const user = userEvent.setup();
    listFactors.mockResolvedValue({
      data: { totp: [{ id: "factor-1", status: "verified" }] },
      error: null,
    });
    challengeAndVerify.mockResolvedValue({ error: { message: "provider-only detail" } });

    render(createElement(MfaChallenge, { redirectTo: "/library" }));
    await user.type(await screen.findByLabelText("Mã xác thực gồm 6 chữ số"), "123456");
    await user.click(screen.getByRole("button", { name: "Xác thực và tiếp tục" }));

    expect(challengeAndVerify).toHaveBeenCalledWith({ factorId: "factor-1", code: "123456" });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Mã xác thực không đúng hoặc đã hết hạn. Hãy thử lại.",
    );
    expect(screen.queryByText("provider-only detail")).not.toBeInTheDocument();
  });

  it("recovers from a failed authenticator enrollment without leaving the action locked", async () => {
    const user = userEvent.setup();
    enroll.mockRejectedValue(new Error("network unavailable"));

    render(createElement(SecurityCenter, { email: "learner@example.com" }));
    const enrollButton = await screen.findByRole("button", { name: "Bật ứng dụng xác thực" });
    await user.click(enrollButton);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Không thể bắt đầu thiết lập ứng dụng xác thực. Hãy thử lại.",
    );
    expect(enrollButton).toBeEnabled();
  });
});
