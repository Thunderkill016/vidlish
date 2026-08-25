import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Headphones,
  MessageCircleMore,
  RefreshCcw,
  Volume2,
} from "lucide-react";

import { createIdentityService } from "@/platform/identity/create-identity-service";

export const dynamic = "force-dynamic";

const learningSteps = [
  {
    icon: Headphones,
    title: "Nghe trước",
    description: "Tai làm quen với một câu ngắn trước khi mắt nhìn thấy chữ.",
  },
  {
    icon: MessageCircleMore,
    title: "Tự thử nói",
    description: "Bạn thử nhớ và nói lại. Chữ, nghĩa luôn có khi thực sự cần.",
  },
  {
    icon: RefreshCcw,
    title: "Gặp lại đúng lúc",
    description: "Điều bạn đã gặp sẽ quay lại để thành thứ bạn dùng được.",
  },
];

export default async function HomePage() {
  const access = await (await createIdentityService()).resolveCurrentAccess();
  if (access) redirect("/dashboard");

  return (
    <main className="min-h-screen overflow-hidden bg-[var(--background)]">
      <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
        <header className="flex items-center justify-between py-5 sm:py-7">
          <Link href="/" className="inline-flex items-baseline gap-2" aria-label="Trang chủ Nếp">
            <span className="text-2xl font-bold tracking-[-0.08em] text-[var(--primary)]">nếp</span>
            <span className="hidden text-sm font-semibold text-[var(--muted-foreground)] sm:inline">
              học tiếng Anh
            </span>
          </Link>
          <Link
            href="/sign-in"
            className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          >
            Đăng nhập
          </Link>
        </header>

        <section className="grid gap-12 pb-20 pt-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(410px,0.95fr)] lg:items-center lg:py-24">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full bg-[var(--primary-wash)] px-3 py-1.5 text-sm font-semibold text-[var(--primary)]">
              <Headphones aria-hidden="true" size={16} />
              Tiếng Anh từ số 0 · bắt đầu trong 5 phút
            </p>
            <h1 className="mt-5 text-4xl font-bold tracking-[-0.045em] sm:text-5xl lg:text-6xl">
              Đừng học thuộc trước. Hãy nghe và nói được một câu.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-[var(--muted-foreground)] sm:text-lg">
              Nếp đưa bạn vào một câu tiếng Anh vừa sức: nghe trước, tự thử nói, rồi mới
              dùng chữ và nghĩa để gỡ đúng chỗ chưa hiểu. Không cần biết gì để bắt đầu.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/sign-in"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white shadow-[var(--shadow-card)] hover:bg-[var(--primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
              >
                Bắt đầu học miễn phí
                <ArrowRight aria-hidden="true" size={18} />
              </Link>
              <a
                href="#cach-hoc"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)] px-5 py-3 text-sm font-semibold hover:bg-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              >
                Xem cách học
              </a>
            </div>
            <p className="mt-4 text-sm text-[var(--muted-foreground)]">
              Dùng email và mật khẩu. Không cần cài ứng dụng.
            </p>
          </div>

          <section
            className="relative rounded-[28px] border border-[var(--border-strong)] bg-[var(--card)] p-4 shadow-[var(--shadow-card)] sm:p-6"
            aria-label="Xem trước buổi học đầu tiên"
          >
            <div className="rounded-2xl bg-[var(--primary-wash)] p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[var(--primary)]">BUỔI 01</p>
                  <h2 className="mt-1 text-xl font-bold">Nghe trước, rồi mới xem chữ</h2>
                </div>
                <span className="rounded-full bg-[var(--card)] px-3 py-1.5 text-sm font-semibold text-[var(--primary)]">
                  5 phút
                </span>
              </div>

              <div className="mt-7 rounded-2xl border border-white/80 bg-[var(--card)] p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[var(--primary)] text-white">
                    <Volume2 aria-hidden="true" size={22} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">Bấm nghe một câu ngắn</p>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                      Chưa cần nhìn chữ hay dịch ngay.
                    </p>
                  </div>
                </div>
                <div className="my-5 h-px bg-[var(--border)]" />
                <p className="text-sm font-semibold text-[var(--foreground)]">Sau khi nghe, bạn sẽ:</p>
                <ul className="mt-3 space-y-2.5 text-sm leading-6 text-[var(--muted-foreground)]">
                  <li className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 shrink-0 text-[var(--accent)]" aria-hidden="true" size={17} />
                    thử nói lại điều tai vừa nghe;
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 shrink-0 text-[var(--accent)]" aria-hidden="true" size={17} />
                    mở chữ và nghĩa nếu bị kẹt;
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 shrink-0 text-[var(--accent)]" aria-hidden="true" size={17} />
                    lưu lại đúng điều bạn tự làm được.
                  </li>
                </ul>
              </div>
            </div>
            <p className="px-2 pt-4 text-sm leading-6 text-[var(--muted-foreground)]">
              Không có điểm số giả. Nếp chỉ tính phần bạn thật sự nghe, nhớ và tự tạo ra.
            </p>
          </section>
        </section>

        <section id="cach-hoc" className="border-t border-[var(--border)] py-16 sm:py-20">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-[var(--accent)]">CÁCH NẾP GIÚP BẠN HỌC</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">Một vòng học nhỏ để dùng tiếng Anh thật</h2>
            <p className="mt-3 leading-7 text-[var(--muted-foreground)]">
              Bắt đầu với một việc vừa sức. Khi tai, miệng và trí nhớ cùng được dùng, bạn có
              bằng chứng rõ hơn về phần mình đang làm được.
            </p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {learningSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <article key={step.title} className="border-t border-[var(--border-strong)] pt-5">
                  <div className="flex items-center justify-between">
                    <span className="grid size-10 place-items-center rounded-xl bg-[var(--primary-wash)] text-[var(--primary)]">
                      <Icon aria-hidden="true" size={20} />
                    </span>
                    <span className="text-sm font-bold text-[var(--faint-foreground)]">0{index + 1}</span>
                  </div>
                  <h3 className="mt-4 text-lg font-bold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{step.description}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mb-10 rounded-3xl bg-[var(--foreground)] px-6 py-9 text-white sm:mb-16 sm:px-10 sm:py-12">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold text-[#c7cbff]">BƯỚC ĐẦU TIÊN</p>
              <h2 className="mt-2 text-2xl font-bold sm:text-3xl">Buổi học đầu tiên không đòi hỏi bạn phải giỏi sẵn.</h2>
              <p className="mt-3 leading-7 text-[#d6d9e5]">
                Chỉ cần nghe một câu và thử đáp lại. Phần còn lại sẽ được xây dần từ điều đó.
              </p>
            </div>
            <Link
              href="/sign-in"
              className="inline-flex min-h-12 w-fit items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[#eef0ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--foreground)]"
            >
              Vào buổi học đầu tiên
              <ArrowRight aria-hidden="true" size={18} />
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
