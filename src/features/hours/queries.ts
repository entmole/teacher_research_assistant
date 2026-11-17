import "server-only";

import { schoolYearOf, schoolYearRange, todayKst, weekdaysBetween, type IsoDate } from "@/lib/date";
import { fetchClassTimetable, fetchSchoolEvents } from "@/lib/neis/api";
import { isNeisSampleMode, NeisError } from "@/lib/neis/client";
import { fetchAllPages } from "@/lib/supabase/paginate";
import { createClient, requireUser } from "@/lib/supabase/server";
import { mergeTimetable } from "@/features/timetable/merge";
import type { ClassroomRef, OverrideEntry } from "@/features/timetable/types";
import {
  countPlannedSchoolDays,
  filterByPeriod,
  summarizeHours,
  type HoursSummary,
  type PeriodKey,
} from "./summary";

export type HoursPageData = {
  schoolName: string | null;
  schoolYear: number;
  classrooms: ClassroomRef[];
  classroom: ClassroomRef | null;
  summary: HoursSummary;
  /** 달력 기준 예정 수업일수 (평일 − 휴업일·공휴일). NEIS 조회에 실패하면 null */
  plannedDays: number | null;
  /** 과목 이름 → 연간 기준 시수 */
  targets: Record<string, number>;
  /** NEIS 에 2학기 시간표가 있는지 (없으면 학기 구분을 할 수 없다) */
  hasSecondSemester: boolean;
  neisError: string | null;
  isSampleMode: boolean;
};

/** 시수 화면에 필요한 모든 데이터: 학급의 학년도 시간표를 모아 과목별 시수와 수업일수를 계산한다. */
export async function loadHoursPage(
  classParam: string | undefined,
  period: PeriodKey,
): Promise<HoursPageData> {
  const user = await requireUser();
  const supabase = await createClient();
  const today = todayKst();
  const schoolYear = schoolYearOf(today);
  const range = schoolYearRange(schoolYear);

  const [settings, classroomRows] = await Promise.all([
    supabase.from("school_settings").select("*").eq("owner_id", user.id).maybeSingle(),
    supabase
      .from("classrooms")
      .select("id, grade, class_nm")
      .eq("school_year", schoolYear)
      .order("grade")
      .order("class_nm"),
  ]);
  const classrooms: ClassroomRef[] = (classroomRows.data ?? []).map((row) => ({
    id: row.id,
    grade: row.grade,
    classNm: row.class_nm,
  }));
  const classroom = classrooms.find((item) => item.id === classParam) ?? classrooms[0] ?? null;

  const empty: HoursPageData = {
    schoolName: settings.data?.school_name ?? null,
    schoolYear,
    classrooms,
    classroom,
    summary: { subjects: [], totalDone: 0, totalEntered: 0, doneDays: 0, enteredDays: 0 },
    plannedDays: null,
    targets: {},
    hasSecondSemester: false,
    neisError: null,
    isSampleMode: isNeisSampleMode(),
  };
  if (!settings.data || !classroom) return empty;

  const school = { atptCode: settings.data.atpt_code, schoolCode: settings.data.school_code };
  const [overrideRows, targetRows] = await Promise.all([
    fetchAllPages((from, to) =>
      supabase
        .from("timetable_overrides")
        .select("id, classroom_id, date, period, subject, memo, is_cancelled")
        .eq("classroom_id", classroom.id)
        .gte("date", range.from)
        .lte("date", range.to)
        .order("id")
        .range(from, to),
    ),
    supabase
      .from("hour_targets")
      .select("subject_name, hours")
      .eq("school_year", schoolYear)
      .eq("grade", classroom.grade),
  ]);
  const overrides: OverrideEntry[] = overrideRows.map((row) => ({
    id: row.id,
    classroomId: row.classroom_id,
    date: row.date,
    period: row.period,
    subject: row.subject,
    memo: row.memo,
    isCancelled: row.is_cancelled,
  }));
  const targets = Object.fromEntries(
    (targetRows.data ?? []).map((row) => [row.subject_name, row.hours]),
  );

  // NEIS 조회가 실패해도 직접 수정한 내용과 기준 시수는 보여 준다.
  let neisError: string | null = null;
  let secondSemesterStart: IsoDate | null = null;
  let plannedDays: number | null = null;
  let cells = mergeTimetable([classroom], [], overrides);
  try {
    const [timetable, events] = await Promise.all([
      fetchClassTimetable(school, classroom, range.from, range.to),
      fetchSchoolEvents(school, range.from, range.to),
    ]);
    secondSemesterStart = timetable.secondSemesterStart;
    cells = mergeTimetable([classroom], timetable.lessons, overrides);

    // 이 학년에 해당하는 휴업일·공휴일만 뺀다.
    const dayOffDates = events
      .filter((event) => event.isDayOff && event.grades.includes(classroom.grade))
      .map((event) => event.date);
    const weekdays = filterByPeriod(
      weekdaysBetween(range.from, range.to).map((date) => ({ date })),
      period,
      secondSemesterStart,
    ).map((item) => item.date);
    plannedDays = countPlannedSchoolDays(weekdays, dayOffDates);
  } catch (error) {
    if (!(error instanceof NeisError)) throw error;
    neisError = error.message;
  }

  return {
    ...empty,
    summary: summarizeHours(filterByPeriod(cells, period, secondSemesterStart), today),
    plannedDays,
    targets,
    hasSecondSemester: secondSemesterStart !== null,
    neisError,
  };
}
