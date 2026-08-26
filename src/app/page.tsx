import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Ear,
  MessageSquareCheck,
  RotateCcw,
  Sparkles,
  Volume2,
  XCircle,
  Zap,
} from "lucide-react";

import { createIdentityService } from "@/platform/identity/create-identity-service";
import { Card } from "@/shared/ui/card";

export const dynamic = "force-dynamic";

const SCIENCE_PILLARS = [
  {
    icon: Ear,
    title: "1. Nghe trước, xem chữ sau",
    description:
      "Tai làm quen với âm thanh và nhịp điệu thực tế trước khi mắt nhìn thấy mặt chữ. Tránh thói quen dịch từng từ trong đầu.",
    tag: "Acoustic First",
  },
  {
    icon: Zap,
    title: "2. Cổng Input i+1 nghiêm ngặt",
    description:
      "Mỗi câu chỉ chứa tối đa 1 từ mới so với vốn từ bạn đã nắm vững. Không bao giờ đưa câu quá khó gây ngợp hay đoán mò.",
    tag: "Comprehensible Input",
  },
  {
    icon: MessageSquareCheck,
    title: "3. Tự sản sinh, không chọn trắc nghiệm",
    description:
      "Bắt buộc não bộ phải tự tìm và phát ra câu tiếng Anh hoàn chỉnh. Loại bỏ hoàn toàn bẫy “ảo tưởng tiến bộ” của bài tập chọn A/B/C/D.",
    tag: "Active Production",
  },
  {
    icon: RotateCcw,
    title: "4. Lặp lại ngắt quãng FSRS",
    description:
      "Thuật toán trí nhớ tối ưu tính toán chính xác ngày bạn sắp quên để nhắc ôn tập cả cụm từ, biến trí nhớ ngắn hạn thành phản xạ tự nhiên.",
    tag: "Spaced Retention",
  },
];

const COMPARISON_ROWS = [
  {
    feature: "Phương pháp học từ vựng",
    traditional: "Học từ đơn lẻ (apple, want) theo bảng chữ cái",
    nep: "Học theo cụm ngữ cảnh cố định (Chunks) bật ra ngay",
  },
  {
    feature: "Dạng bài tập chính",
    traditional: "Trắc nghiệm A/B/C/D, kéo thả từ có sẵn đáp án",
    nep: "Tự nhớ và bật ra câu trong 3-5 giây (Active Recall)",
  },
  {
    feature: "Luyện phát âm & Nghe",
    traditional: "Nghe giọng máy vô trùng, chấm điểm âm vị khắt khe",
    nep: "Nghe audio người thật bóc tách nối âm (Linking), nhại giọng (Shadowing)",
  },
  {
    feature: "Đo lường tiến bộ",
    traditional: "Đếm chuỗi ngày Streak ảo, cộng điểm XP giải trí",
    nep: "Bằng chứng năng lực 4 chiều (Hiểu · Nhớ · Dùng ngữ cảnh mới · Lưu giữ)",
  },
  {
    feature: "Thời gian mỗi ngày",
    traditional: "Ngồi lướt 45-60 phút dễ gây nản",
    nep: "30 phút cố định, kết thúc bằng câu bạn tự nói được",
  },
];

export default async function HomePage() {
  const access = await (await createIdentityService()).resolveCurrentAccess();
  if (access) redirect("/dashboard");

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] selection:bg-[var(--primary-wash)]">
      {/* Background ambient decorative glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden opacity-40 dark:opacity-20">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-gradient-to-tr from-indigo-500/20 to-teal-400/20 blur-[120px]" />
      </div>

      <div className="relative mx-auto w-full max-w-6xl px-5 sm:px-8">
        {/* Navigation Bar */}
        <header className="flex items-center justify-between py-6 sm:py-8 border-b border-[var(--border)]/60">
          <Link
            href="/"
            className="flex items-center gap-2.5 group"
            aria-label="Trang chủ Nếp"
          >
            <span className="flex size-9 items-center justify-center rounded-xl bg-[var(--primary)] text-lg font-bold text-white shadow-sm transition-transform group-hover:scale-105">
              N
            </span>
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight text-[var(--foreground)]">
                nếp
              </span>
              <span className="text-[11px] font-medium text-[var(--muted-foreground)] -mt-1">
                Tiếng Anh thực chiến
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/sign-in"
              className="inline-flex min-h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--muted)]"
            >
              Đăng nhập
            </Link>
            <Link
              href="/sign-in"
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[var(--primary-hover)] hover:shadow"
            >
              Bắt đầu ngay
              <ArrowRight size={15} />
            </Link>
          </div>
        </header>

        {/* Hero Section */}
        <section className="grid gap-12 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-24">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--primary)]/30 bg-[var(--primary-wash)] px-3.5 py-1.5 text-xs font-semibold text-[var(--primary)] shadow-sm">
              <Sparkles size={14} className="animate-pulse" />
              <span>Tiếng Anh từ số 0 cho người lớn · 30 phút mỗi ngày</span>
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl lg:leading-[1.12]">
              Đừng học vẹt từ vựng.{" "}
              <span className="gradient-text-primary">
                Hãy nghe và tự nói được câu hoàn chỉnh.
              </span>
            </h1>

            <p className="max-w-xl text-base leading-relaxed text-[var(--muted-foreground)] sm:text-lg">
              Nếp đưa bạn vào những câu tiếng Anh vừa sức: nghe âm thanh thực tế,
              tự thử nói trước, rồi gỡ đúng chỗ tắc. Không có bài tập trắc nghiệm
              đoán mò — mọi tiến bộ đều có bằng chứng đo lường được.
            </p>

            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              <Link
                href="/sign-in"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] px-6 text-base font-semibold text-white shadow-md transition-all hover:bg-[var(--primary-hover)] hover:shadow-lg hover:-translate-y-0.5"
              >
                Học thử buổi đầu tiên
                <ArrowRight size={18} />
              </Link>
              <a
                href="#so-sanh"
                className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--card)] px-5 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--muted)]"
              >
                Xem điểm khác biệt
              </a>
            </div>

            <div className="flex items-center gap-6 pt-2 text-xs font-medium text-[var(--muted-foreground)]">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={16} className="text-[var(--solved)]" />
                <span>Không cần cài ứng dụng</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={16} className="text-[var(--solved)]" />
                <span>Không trắc nghiệm ảo</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={16} className="text-[var(--solved)]" />
                <span>Đo năng lực thật</span>
              </div>
            </div>
          </div>

          {/* Interactive Simulation Hero Card */}
          <div className="relative">
            <div className="absolute -inset-1.5 rounded-3xl bg-gradient-to-r from-indigo-500/20 to-teal-500/20 blur-xl opacity-70" />
            <Card className="relative overflow-hidden border-[var(--border-strong)] p-6 sm:p-7 shadow-[var(--shadow-float)]">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-7 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-bold text-white">
                    1
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                    Buổi học thực chiến · 30 Phút
                  </span>
                </div>
                <span className="rounded-full bg-[var(--solved-wash)] px-2.5 py-1 text-xs font-semibold text-[var(--solved)]">
                  Active Recall
                </span>
              </div>

              <div className="space-y-4 py-5">
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                    Bước 1: Nghe âm thanh (Chưa mở chữ)
                  </p>
                  <div className="flex items-center justify-between rounded-xl bg-[var(--muted)] p-3.5 border border-[var(--border)]">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-full bg-[var(--primary)] text-white shadow-sm">
                        <Volume2 size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">&ldquo;Sorry, I don&apos;t understand.&rdquo;</p>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          Nối âm: /dōnt/ + /ˌʌndərˈstænd/
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-[var(--muted-foreground)]">
                      0:03
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                    Bước 2: Tự bật ra cả cụm từ tiếng Anh
                  </p>
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3.5 space-y-2">
                    <p className="text-xs text-[var(--muted-foreground)]">Nghĩa tiếng Việt:</p>
                    <p className="text-sm font-bold text-[var(--foreground)]">
                      &ldquo;Xin lỗi, bạn nói lại giúp tôi với.&rdquo;
                    </p>
                    <div className="flex items-center justify-between rounded-lg bg-[var(--primary-wash)]/60 px-3 py-2 text-xs font-semibold text-[var(--primary)]">
                      <span>Câu bạn tự nói: &ldquo;Again please.&rdquo;</span>
                      <CheckCircle2 size={16} className="text-[var(--solved)]" />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-[var(--accent)] uppercase tracking-wider">
                    Bước 3: Thử thách tình huống mới (Transfer Probe)
                  </p>
                  <div className="rounded-xl bg-[var(--accent-wash)] p-3.5 border border-[var(--accent)]/30 text-xs leading-relaxed text-[var(--foreground)]">
                    <p className="font-semibold text-[var(--accent)] mb-1">
                      Tình huống ngoài đời:
                    </p>
                    Bạn đang nghe một video nói quá nhanh. Bạn sẽ nói câu gì?
                    <p className="mt-1.5 font-bold text-[var(--foreground)]">
                      👉 &ldquo;Slowly please.&rdquo;
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-[var(--border)] pt-4 flex items-center justify-between text-xs text-[var(--muted-foreground)]">
                <span>Bằng chứng đã ghi nhận:</span>
                <span className="font-semibold text-[var(--solved)]">
                  ✓ Recalled · ✓ Transferred
                </span>
              </div>
            </Card>
          </div>
        </section>

        {/* 4 Pillars Section */}
        <section className="py-16 border-t border-[var(--border)]/60">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--accent)]">
              Khoa Học Tiếp Nhận Ngôn Ngữ
            </p>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              4 Trụ Cột Giúp Bạn Giao Tiếp Được Thật Sự
            </h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              Mọi tính năng trong Nếp đều dựa trên nghiên cứu SLA (Second Language Acquisition),
              không xây dựng tính năng chỉ để tạo cảm giác vui mắt.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {SCIENCE_PILLARS.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <Card
                  key={pillar.title}
                  variant="interactive"
                  className="flex flex-col justify-between p-6 space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex size-11 items-center justify-center rounded-xl bg-[var(--primary-wash)] text-[var(--primary)] shadow-sm">
                      <Icon size={22} />
                    </div>
                    <span className="inline-block rounded-md bg-[var(--muted)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                      {pillar.tag}
                    </span>
                    <h3 className="text-base font-bold text-[var(--foreground)]">
                      {pillar.title}
                    </h3>
                    <p className="text-xs leading-relaxed text-[var(--muted-foreground)]">
                      {pillar.description}
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Comparison Section */}
        <section id="so-sanh" className="py-16 border-t border-[var(--border)]/60">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--primary)]">
              Đối Chiếu Thực Tế
            </p>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              App Học Vẹt Thông Thường vs. Phương Pháp Nếp
            </h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              Tại sao bạn học app nhiều tháng mà khi gặp người nước ngoài vẫn không nói được?
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-card)]">
            <div className="grid grid-cols-[1.2fr_1fr_1fr] bg-[var(--muted)] p-4 text-xs font-bold uppercase tracking-wider border-b border-[var(--border)]">
              <span>Hạng mục so sánh</span>
              <span className="text-[var(--destructive)] flex items-center gap-1">
                <XCircle size={14} /> App thông thường
              </span>
              <span className="text-[var(--solved)] flex items-center gap-1">
                <CheckCircle2 size={14} /> Phương pháp Nếp
              </span>
            </div>

            <div className="divide-y divide-[var(--border)]">
              {COMPARISON_ROWS.map((row) => (
                <div
                  key={row.feature}
                  className="grid grid-cols-[1.2fr_1fr_1fr] p-4 text-xs sm:text-sm items-center gap-3 hover:bg-[var(--muted)]/40 transition-colors"
                >
                  <span className="font-semibold text-[var(--foreground)]">
                    {row.feature}
                  </span>
                  <span className="text-[var(--muted-foreground)] leading-relaxed">
                    {row.traditional}
                  </span>
                  <span className="font-semibold text-[var(--foreground)] leading-relaxed bg-[var(--solved-wash)]/50 p-2 rounded-lg border border-[var(--solved)]/20">
                    {row.nep}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA Banner */}
        <section className="py-16">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900 to-slate-900 p-8 sm:p-12 text-white shadow-2xl text-center space-y-6">
            <div className="max-w-2xl mx-auto space-y-3">
              <h2 className="text-3xl font-extrabold sm:text-4xl">
                Bắt đầu xây nếp học tiếng Anh thực chiến ngay hôm nay
              </h2>
              <p className="text-sm sm:text-base text-slate-300">
                15 đến 30 phút mỗi ngày. Không có chuỗi ngày ảo, không trắc nghiệm đoán mò.
                Chỉ có câu tiếng Anh bạn tự nói được.
              </p>
            </div>

            <div className="pt-2">
              <Link
                href="/sign-in"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white px-7 text-sm font-bold text-slate-900 shadow-lg transition-transform hover:scale-105 active:scale-95"
              >
                Bắt đầu miễn phí ngay
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-[var(--border)] py-8 text-center text-xs text-[var(--muted-foreground)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Nếp (Vidlish) · Tiếng Anh thành nếp. Hiểu thật · Nhớ lâu · Dùng được.</p>
          <div className="flex gap-4">
            <Link href="/sign-in" className="hover:text-[var(--foreground)]">
              Đăng nhập
            </Link>
            <a href="#so-sanh" className="hover:text-[var(--foreground)]">
              Phương pháp
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}
