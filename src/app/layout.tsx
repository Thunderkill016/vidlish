import type { Metadata } from "next";
import { Be_Vietnam_Pro, Geist_Mono } from "next/font/google";

import "./globals.css";

// The interface is Vietnamese and the taught content is English, so the face has
// to draw ế ộ ữ ằ ỉ ợ at every weight it ships. Be Vietnam Pro is designed for
// Vietnamese; the `vietnamese` subset is what actually carries those marks, and
// omitting it silently falls back to a system font mid-sentence.
const sans = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  // Three weights, not four. Every weight is a separate file per subset, and the
  // UI only ever asks for body, semibold and bold.
  weight: ["400", "600", "700"],
  display: "swap",
  variable: "--font-app-sans",
});

// Timestamps, segment ids and counts only — ASCII, so latin alone is honest here.
const mono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-app-mono",
});

export const metadata: Metadata = {
  title: "Vidlish",
  description: "Any English video. Your English lesson.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body className={`${sans.variable} ${mono.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
