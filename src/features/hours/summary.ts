import type { IsoDate } from "@/lib/date";

/** 시수 집계에 쓰는 수업 1건 */
export type HourLesson = {
  date: IsoDate;
  subject: string;
  isCancelled: boolean;
};

export type PeriodKey = "year" | "first" | "second";

/** 과목별 시수 */
export type SubjectHours = {
  subject: string;
  /** 오늘까지 실제로 한 시수 */
  done: number;
  /** NEIS 에 입력된 전체 시수 (앞으로 할 수업 포함) */
  entered: number;
};

export type HoursSummary = {
  subjects: SubjectHours[];
  totalDone: number;
  totalEntered: number;
  /** 오늘까지 수업한 날 수 */
  doneDays: number;
  /** NEIS 에 시간표가 입력된 날 수 */
  enteredDays: number;
};

/** 학기 구분에 맞는 수업만 남긴다. 2학기 시작일을 모르면 모두 1학기로 본다. */
export function filterByPeriod<T extends { date: IsoDate }>(
  items: T[],
  period: PeriodKey,
  secondSemesterStart: IsoDate | null,
): T[] {
  if (period === "year") return items;
  const isSecond = (date: IsoDate) => secondSemesterStart !== null && date >= secondSemesterStart;
  return items.filter((item) => (period === "second" ? isSecond(item.date) : !isSecond(item.date)));
}

/** 과목별 시수와 수업일수를 센다. "수업 없음"으로 표시한 칸은 세지 않는다. */
export function summarizeHours(lessons: HourLesson[], today: IsoDate): HoursSummary {
  const bySubject = new Map<string, SubjectHours>();
  const enteredDates = new Set<IsoDate>();
  const doneDates = new Set<IsoDate>();

  for (const lesson of lessons) {
    if (lesson.isCancelled) continue;
    const hours = bySubject.get(lesson.subject) ?? { subject: lesson.subject, done: 0, entered: 0 };
    hours.entered += 1;
    enteredDates.add(lesson.date);
    if (lesson.date <= today) {
      hours.done += 1;
      doneDates.add(lesson.date);
    }
    bySubject.set(lesson.subject, hours);
  }

  const subjects = [...bySubject.values()].sort(
    (a, b) => b.entered - a.entered || a.subject.localeCompare(b.subject, "ko"),
  );
  return {
    subjects,
    totalDone: subjects.reduce((sum, item) => sum + item.done, 0),
    totalEntered: subjects.reduce((sum, item) => sum + item.entered, 0),
    doneDays: doneDates.size,
    enteredDays: enteredDates.size,
  };
}

/** 달력 기준 수업일수: 평일 중 휴업일·공휴일이 아닌 날 수 */
export function countPlannedSchoolDays(weekdays: IsoDate[], dayOffDates: Iterable<IsoDate>): number {
  const dayOffs = new Set(dayOffDates);
  return weekdays.filter((day) => !dayOffs.has(day)).length;
}
