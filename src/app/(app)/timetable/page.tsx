import type { Metadata } from "next";
import Link from "next/link";
import { EventPanel } from "@/features/schedule/EventPanel";
import { loadTimetableWeek } from "@/features/timetable/queries";
import { classroomLabel, MINE_VIEW_PARAM } from "@/features/timetable/types";
import { WeekGrid } from "@/features/timetable/WeekGrid";
import { addDays, isIsoDate, shortDate, startOfWeek, todayKst } from "@/lib/date";
import { cardClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";

export const metadata: Metadata = { title: "주간 시간표" };

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const firstValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export default async function TimetablePage({ searchParams }: Props) {
  const params = await searchParams;
  const today = todayKst();
  const weekParam = firstValue(params.week);
  const monday = startOfWeek(isIsoDate(weekParam) ? weekParam : today);
  const week = await loadTimetableWeek(monday, firstValue(params.view));

  if (!week.schoolName || week.classrooms.length === 0) {
    return <SetupNotice hasSchool={week.schoolName !== null} />;
  }

  const currentViewParam =
    week.view?.kind === "classroom" ? week.view.classroomId : MINE_VIEW_PARAM;
  const hrefFor = (weekStart: string, view: string = currentViewParam) =>
    `/timetable?week=${weekStart}&view=${view}`;

  const viewTabs = [
    ...(week.canUseMineView ? [{ param: MINE_VIEW_PARAM, label: "내 수업" }] : []),
    ...week.classrooms.map((classroom) => ({
      param: classroom.id,
      label: classroomLabel(classroom),
    })),
  ];

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-stone-500">{week.schoolName}</p>
          <h1 className="text-2xl font-bold text-stone-900">
            {shortDate(monday)} ~ {shortDate(addDays(monday, 4))} 시간표
          </h1>
        </div>
        <nav aria-label="주 이동" className="flex items-center gap-2">
          <Link href={hrefFor(addDays(monday, -7))} className={secondaryButtonClass}>
            ← 지난주
          </Link>
          <Link href={hrefFor(startOfWeek(today))} className={secondaryButtonClass}>
            이번 주
          </Link>
          <Link href={hrefFor(addDays(monday, 7))} className={secondaryButtonClass}>
            다음 주 →
          </Link>
        </nav>
      </header>

      {viewTabs.length > 1 && (
        <nav aria-label="보기 선택" className="flex flex-wrap gap-2">
          {viewTabs.map((tab) => {
            const isActive = tab.param === currentViewParam;
            return (
              <Link
                key={tab.param}
                href={hrefFor(monday, tab.param)}
                aria-current={isActive ? "page" : undefined}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${
                  isActive
                    ? "bg-emerald-700 text-white"
                    : "border border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      )}

      {week.neisError && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          NEIS 시간표를 불러오지 못했습니다: {week.neisError} 직접 수정한 내용만 표시합니다.
        </p>
      )}
      {week.isSampleMode && (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
          NEIS 인증키(NEIS_API_KEY)가 설정되지 않아 일부 데이터(요청당 5건)만 표시됩니다.
        </p>
      )}

      <WeekGrid
        days={week.days}
        today={today}
        cells={week.cells}
        events={week.events}
        classrooms={week.classrooms}
        fixedClassroomId={week.view?.kind === "classroom" ? week.view.classroomId : null}
      />
      <p className="text-xs text-stone-500">
        칸을 누르면 과목을 수정할 수 있습니다. 초록 점은 직접 수정한 칸입니다.
      </p>

      <EventPanel days={week.days} today={today} events={week.events} />
    </div>
  );
}

function SetupNotice({ hasSchool }: { hasSchool: boolean }) {
  return (
    <section className={`${cardClass} mx-auto max-w-lg text-center`}>
      <h1 className="text-xl font-bold text-stone-900">시간표를 보려면 설정이 필요합니다</h1>
      <p className="mt-2 text-sm text-stone-600">
        {hasSchool
          ? "담당 학급을 한 개 이상 등록해 주세요."
          : "먼저 학교를 검색해 등록하고, 담당 학급을 추가해 주세요."}
      </p>
      <Link href="/settings/school" className={`${primaryButtonClass} mt-5`}>
        설정으로 이동
      </Link>
    </section>
  );
}
