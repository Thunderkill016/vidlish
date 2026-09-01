import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Nếp Memory Engine V4 (Next.js Edition)',
  description: 'Evidence-Centered Adaptive Retrieval',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
