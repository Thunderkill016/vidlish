"use client";

import { cefrOptions, type CefrLevel } from "@/shared/contracts/lesson-draft";
import { Button } from "@/shared/ui/button";

export function CefrSelector({
  value,
  onChange,
}: {
  value?: CefrLevel;
  onChange: (level: CefrLevel) => void;
}) {
  return (
    <section className="min-w-0 space-y-3" aria-labelledby="cefr-heading">
      <div className="space-y-1">
        <h2 id="cefr-heading" className="text-lg font-semibold">
          Trình độ tiếng Anh của bạn
        </h2>
        <p id="cefr-help" className="text-sm text-[var(--muted-foreground)]">
          Chọn một mức để Nếp điều chỉnh độ khó của bài học.
        </p>
      </div>

      <div className="max-w-full min-w-0 overflow-x-auto overscroll-x-contain pb-1">
        <div
          role="group"
          aria-labelledby="cefr-heading"
          aria-describedby="cefr-help"
          className="flex min-w-max gap-2 sm:grid sm:min-w-0 sm:grid-cols-5"
        >
          {cefrOptions.map((option) => {
            const selected = option.level === value;
            return (
              <Button
                key={option.level}
                type="button"
                variant={selected ? "primary" : "secondary"}
                aria-label={`${option.level} ${option.descriptionVi}`}
                aria-pressed={selected}
                className="min-w-28 flex-col gap-0.5 px-4 py-3 sm:min-w-0"
                onClick={() => onChange(option.level)}
              >
                <span>{option.labelVi}</span>
                <span className="text-xs font-normal opacity-80">
                  {option.descriptionVi}
                </span>
              </Button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
