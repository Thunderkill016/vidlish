import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Vui lòng nhập email.")
  .max(254, "Email không hợp lệ.")
  .email("Email không hợp lệ.")
  .transform((value) => value.toLowerCase());

export const otpSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Mã đăng nhập phải gồm đúng 6 chữ số.");

export const requestLoginCodeSchema = z.object({
  email: emailSchema,
});

export const verifyLoginCodeSchema = z.object({
  email: emailSchema,
  code: otpSchema,
  intendedPath: z.string().optional(),
});

export type RequestLoginCodeCommand = z.input<typeof requestLoginCodeSchema>;
export type VerifyLoginCodeCommand = z.input<typeof verifyLoginCodeSchema>;

const blockedIntendedPrefixes = ["/sign-in", "/api/auth"];

export function sanitizeIntendedPath(value: string | null | undefined): string {
  if (!value) return "/create";

  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return "/create";
  }

  if (
    !decoded.startsWith("/") ||
    decoded.startsWith("//") ||
    decoded.includes("\\") ||
    blockedIntendedPrefixes.some((prefix) => decoded.startsWith(prefix))
  ) {
    return "/create";
  }

  try {
    const parsed = new URL(decoded, "https://vidlish.local");
    if (parsed.origin !== "https://vidlish.local") return "/create";
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/create";
  }
}
