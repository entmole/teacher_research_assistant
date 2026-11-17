import type { Metadata } from "next";
import Link from "next/link";
import { HoursTable } from "@/features/hours/HoursTable";
import { loadHoursPage } from "@/features/hours/queries";
import type { PeriodKey } from "@/features/hours/summary";
import { classroomLabel } from "@/features/timetable/types";
import { cardClass, primaryButtonClass } from "@/lib/ui";

export const metadata: Metadata = { title: "시수·수업일수" };

/** 초·중등교육법 시행령 제45조의 연간 수업일수 기준 */
const LEGAL_SCHOOL_DAYS = 190;

const PERIOD_TABS: { key: PeriodKey; label: string }[] = [
  { key: "year", label: "학년도 전체" },
  { key: "first", label: "1학기" },
  { key: "second", label: "2학기" },
];

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const firstValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const tabClass = (isActive: boolean) =>
  `rounded-full px-3.5 py-1.5 text-sm font-medium ${
    isActive
      ? "bg-emerald-700 text-white"
      : "border border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
  }`;

export default async function HoursPage({ searchParams }: Props) {
  const params = await searchParams;
  const periodParam = firstValue(params.period);
  const period = PERIOD_TABS.find((tab) => tab.key === periodParam)?.key ?? "year";
  const data = await loadHoursPage(firstValue(params.class), period);

  if (!data.schoolName || !data.classroom) {
    return (
      <section className={`${cardClass} mx-auto max-w-lg text-center`}>
        <h1 className="text-xl font-bold text-stone-900">시수를 보려면 설정이 필요합니다</h1>
        <p className="mt-2 text-sm text-stone-600">학교와 담당 학급을 먼저 등록해 주세요.</p>
        <Link href="/settings/school" className={`${primaryButtonClass} mt-5`}>
          설정으로 이동
        </Link>
      </section>
    );
  }

  const { classroom, summary } = data;
  const hrefFor = (classId: string, periodKey: PeriodKey) =>
    `/hours?class=${classId}&period=${periodKey}`;
  const periodLabel = PERIOD_TABS.find((tab) => tab.key === period)?.label ?? "";

  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm text-stone-500">
          {data.schoolName} · {data.schoolYear}학년도
        </p>
        <h1 className="text-2xl font-bold text-stone-900">
          {classroomLabel(classroom)} 시수·수업일수
        </h1>
      </header>

      {data.classrooms.length > 1 && (
        <nav aria-label="학급 선택" className="flex flex-wrap gap-2">
          {data.classrooms.map((item) => (
            <Link
              key={item.id}
              href={hrefFor(item.id, period)}
              aria-current={item.id === classroom.id ? "page" : undefined}
              className={tabClass(item.id === classroom.id)}
            >
              {classroomLabel(item)}
            </Link>
          ))}
        </nav>
      )}

      <nav aria-label="기간 선택" className="flex flex-wrap gap-2">
        {PERIOD_TABS.map((tab) => (
          <Link
            key={tab.key}
            href={hrefFor(classroom.id, tab.key)}
            aria-current={tab.key === period ? "page" : undefined}
            className={tabClass(tab.key === period)}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {data.neisError && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          NEIS 시간표를 불러오지 못했습니다: {data.neisError} 직접 수정한 내용만 집계합니다.
        </p>
      )}
      {data.isSampleMode && (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
          NEIS 인증키(NEIS_API_KEY)가 설정되지 않아 일부 데이터(요청당 5건)만 집계됩니다.
        </p>
      )}
      {period !== "year" && !data.hasSecondSemester && !data.neisError && (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
          NEIS 에 2학기 시간표가 아직 없어 학기를 나눌 수 없습니다. 모든 수업을 1학기로 집계합니다.
        </p>
      )}

      <section aria-label="수업일수" className="grid gap-3 sm:grid-cols-3">
        <DayCard label="오늘까지 수업한 날" value={summary.doneDays} hint="수업이 한 시간이라도 있었던 날" />
        <DayCard
          label="NEIS 에 시간표가 입력된 날"
          value={summary.enteredDays}
          hint="앞으로 할 수업 포함"
        />
        <DayCard
          label={`${periodLabel} 예정 수업일수`}
          value={data.plannedDays}
          hint={
            period === "year"
              ? `평일에서 휴업일·공휴일을 뺀 날 수 (법정 기준 ${LEGAL_SCHOOL_DAYS}일 이상)`
              : "평일에서 휴업일·공휴일을 뺀 날 수"
          }
          isBelowStandard={
            period === "year" && data.plannedDays !== null && data.plannedDays < LEGAL_SCHOOL_DAYS
          }
        />
      </section>

      <section aria-labelledby="hours-table-title" className="space-y-3">
        <div>
          <h2 id="hours-table-title" className="text-lg font-bold text-stone-900">
            과목별 시수
          </h2>
          <p className="mt-1 text-sm text-stone-600">
            NEIS 시간표에 직접 수정한 내용을 반영해 셉니다. &quot;수업 없음&quot;으로 표시한 칸은
            빼고, 연간 기준 시수는 {classroom.grade}학년 전체에 공통으로 적용됩니다.
          </p>
        </div>
        <HoursTable
          grade={classroom.grade}
          subjects={summary.subjects}
          targets={data.targets}
          showProgress={period === "year"}
        />
      </section>
    </div>
  );
}

function DayCard(props: {
  label: string;
  value: number | null;
  hint: string;
  isBelowStandard?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4">
      <p className="text-sm text-stone-600">{props.label}</p>
      <p
        className={`mt-1 text-2xl font-bold ${
          props.isBelowStandard ? "text-red-700" : "text-stone-900"
        }`}
      >
        {props.value === null ? "–" : `${props.value}일`}
      </p>
      <p className="mt-1 text-xs text-stone-500">{props.hint}</p>
    </div>
  );
}
