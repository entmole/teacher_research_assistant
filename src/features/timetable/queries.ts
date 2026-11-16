import "server-only";

import { addDays, schoolWeekDays, schoolYearOf, type IsoDate } from "@/lib/date";
import { fetchSchoolEvents, fetchTimetable } from "@/lib/neis/api";
import { isNeisSampleMode, NeisError } from "@/lib/neis/client";
import type { NeisLesson, NeisSchoolEvent } from "@/lib/neis/types";
import { createClient, requireUser } from "@/lib/supabase/server";
import { loadProgressLinks } from "@/features/progress/queries";
import type { ProgressLink } from "@/features/progress/timetable-link";
import type { SchoolEvent } from "@/features/schedule/types";
import { mergeTimetable, selectCellsForView } from "./merge";
import {
  MINE_VIEW_PARAM,
  type ClassroomRef,
  type OverrideEntry,
  type TimetableCell,
  type TimetableView,
} from "./types";

const ALL_GRADES_COUNT = 6;

export type TimetableWeek = {
  schoolName: string | null;
  days: IsoDate[];
  classrooms: ClassroomRef[];
  /** 전담 교사의 "내 수업" 보기를 쓸 수 있는지 */
  canUseMineView: boolean;
  view: TimetableView | null;
  cells: TimetableCell[];
  events: SchoolEvent[];
  /** 시간표 칸에서 바로 진도를 기록하기 위한 정보 */
  progressLinks: ProgressLink[];
  /** NEIS 조회 실패 시 안내 문구 */
  neisError: string | null;
  isSampleMode: boolean;
};

function resolveView(
  viewParam: string | undefined,
  classrooms: ClassroomRef[],
  mineSubjects: string[],
): TimetableView | null {
  if (classrooms.length === 0) return null;
  const mineView: TimetableView | null =
    mineSubjects.length > 0 ? { kind: "mine", subjects: mineSubjects } : null;

  if (viewParam === MINE_VIEW_PARAM && mineView) return mineView;
  const requested = classrooms.find((classroom) => classroom.id === viewParam);
  if (requested) return { kind: "classroom", classroomId: requested.id };
  return mineView ?? { kind: "classroom", classroomId: classrooms[0].id };
}

function toSchoolEvents(
  neisEvents: NeisSchoolEvent[],
  customEvents: { id: string; date: string; title: string }[],
): SchoolEvent[] {
  const fromNeis = neisEvents.map((event, index) => ({
    key: `neis-${event.date}-${index}`,
    date: event.date,
    title: event.title,
    isDayOff: event.isDayOff,
    grades: event.grades.length === ALL_GRADES_COUNT ? [] : event.grades,
    customId: null,
  }));
  const fromCustom = customEvents.map((event) => ({
    key: `custom-${event.id}`,
    date: event.date,
    title: event.title,
    isDayOff: false,
    grades: [],
    customId: event.id,
  }));
  return [...fromNeis, ...fromCustom].sort((a, b) => a.date.localeCompare(b.date));
}

/** 한 주(월~금)의 시간표와 일정을 불러온다. */
export async function loadTimetableWeek(
  monday: IsoDate,
  viewParam: string | undefined,
): Promise<TimetableWeek> {
  const user = await requireUser();
  const supabase = await createClient();
  const days = schoolWeekDays(monday);
  const friday = addDays(monday, 4);

  const [settings, profile, classroomRows, overrideRows, customEventRows] = await Promise.all([
    supabase.from("school_settings").select("*").eq("owner_id", user.id).maybeSingle(),
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase
      .from("classrooms")
      .select("id, grade, class_nm")
      .eq("school_year", schoolYearOf(monday))
      .order("grade")
      .order("class_nm"),
    supabase
      .from("timetable_overrides")
      .select("id, classroom_id, date, period, subject, memo, is_cancelled")
      .gte("date", monday)
      .lte("date", friday),
    supabase
      .from("custom_events")
      .select("id, date, title")
      .gte("date", monday)
      .lte("date", friday),
  ]);

  const classrooms: ClassroomRef[] = (classroomRows.data ?? []).map((row) => ({
    id: row.id,
    grade: row.grade,
    classNm: row.class_nm,
  }));
  const overrides: OverrideEntry[] = (overrideRows.data ?? []).map((row) => ({
    id: row.id,
    classroomId: row.classroom_id,
    date: row.date,
    period: row.period,
    subject: row.subject,
    memo: row.memo,
    isCancelled: row.is_cancelled,
  }));

  const isSpecialist = profile.data?.teacher_type === "specialist";
  const mineSubjects = isSpecialist ? (profile.data?.specialist_subjects ?? []) : [];
  const view = resolveView(viewParam, classrooms, mineSubjects);

  // NEIS 조회가 실패해도 직접 수정한 내용은 보여 준다.
  let lessons: NeisLesson[] = [];
  let neisEvents: NeisSchoolEvent[] = [];
  let neisError: string | null = null;
  if (settings.data) {
    const school = { atptCode: settings.data.atpt_code, schoolCode: settings.data.school_code };
    try {
      [lessons, neisEvents] = await Promise.all([
        fetchTimetable(school, monday, friday),
        fetchSchoolEvents(school, monday, friday),
      ]);
    } catch (error) {
      if (!(error instanceof NeisError)) throw error;
      neisError = error.message;
    }
  }

  const merged = mergeTimetable(classrooms, lessons, overrides);
  const progressLinks = await loadProgressLinks(classrooms);

  return {
    schoolName: settings.data?.school_name ?? null,
    days,
    classrooms,
    canUseMineView: mineSubjects.length > 0,
    view,
    cells: view ? selectCellsForView(merged, view) : [],
    events: toSchoolEvents(neisEvents, customEventRows.data ?? []),
    progressLinks,
    neisError,
    isSampleMode: isNeisSampleMode(),
  };
}
