import { Card } from "@/shared/ui/card";
import type { CourseMap, UnitStatus } from "@/modules/curriculum/application/course-map";

/**
 * The course, visible.
 *
 * The page was called "Lộ trình" — a route — and showed no route: a heading,
 * two counters, and a single exercise chosen by the scheduler. Thirty units
 * were authored and covered A1 63/63 and A2 31/31, and the learner could not
 * see one of them, could not tell where they were, and could not tell progress
 * from repetition.
 *
 * What each unit shows is its **can-do statement**, not its grammar: a unit is
 * defined by what it makes the learner able to do, and the language it teaches
 * hangs off that rather than the other way round. "Nói được mình làm nghề gì"
 * is a reason to open a lesson; "thì hiện tại đơn" is not.
 *
 * And status comes from evidence, never attendance. A unit closes when the
 * learner produces its language unaided — not when they have clicked through
 * its screens.
 */

const STATUS_LABEL: Record<UnitStatus, string> = {
  done: "Xong",
  current: "Đang ở đây",
  available: "Mở",
  locked: "Chưa mở",
};

const STATUS_STYLE: Record<UnitStatus, string> = {
  done: "bg-[var(--solved-wash)] text-[var(--solved)]",
  current: "bg-[var(--primary-wash)] text-[var(--primary)]",
  available: "bg-[var(--muted)] text-[var(--muted-foreground)]",
  locked: "bg-[var(--muted)] text-[var(--faint-foreground)]",
};

export function CourseRoadmap({ map }: { map: CourseMap }) {
  return (
    <section className="flex flex-col gap-4" aria-labelledby="roadmap-heading">
      <div className="flex flex-col gap-1">
        <h2 id="roadmap-heading" className="text-xl font-bold">
          Cả chương trình, {map.units.length} bài
        </h2>
        <p className="text-sm text-[var(--muted-foreground)]">
          Xong {map.unitsDone}/{map.units.length} bài · {map.activitiesDone}/
          {map.activities} phần. Một bài chỉ được tính là xong khi bạn tự nói ra
          được ngôn ngữ của nó mà không mở trợ giúp — không phải khi bạn bấm hết
          màn hình của nó.
        </p>
      </div>

      <ol className="flex flex-col gap-2" data-testid="course-roadmap">
        {map.units.map((item) => (
          <li key={item.unit.id}>
            <Card
              className={`flex flex-col gap-2 ${
                item.status === "current"
                  ? "border-[var(--primary)]"
                  : item.status === "locked"
                    ? "opacity-70"
                    : ""
              }`}
              data-testid={`roadmap-unit-${item.status}`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--faint-foreground)]">
                  Bài {item.position} · {item.unit.cefr}
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[item.status]}`}
                >
                  {STATUS_LABEL[item.status]}
                </span>
              </div>

              <p className="text-base font-semibold">{item.unit.canDo.vi}</p>

              <div className="flex h-[6px] overflow-hidden rounded-full bg-[var(--muted)]">
                <span
                  className="h-full bg-[var(--solved)]"
                  style={{
                    width: `${item.activities === 0 ? 0 : (100 * item.activitiesDone) / item.activities}%`,
                  }}
                />
              </div>

              <p className="text-xs text-[var(--muted-foreground)]">
                {item.activitiesDone}/{item.activities} phần
                {item.blockedBy.length > 0 ? (
                  <>
                    {" · "}
                    {/* Naming what is still owed rather than showing a bare
                        padlock: a learner can act on the first, not the second. */}
                    cần xong trước: {item.blockedBy.join(", ")}
                  </>
                ) : null}
              </p>
            </Card>
          </li>
        ))}
      </ol>
    </section>
  );
}
