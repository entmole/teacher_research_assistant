import "server-only";

import { fromNeisYmd, toNeisYmd, type IsoDate } from "@/lib/date";
import { fetchNeisRows } from "./client";
import type {
  NeisClass,
  NeisLesson,
  NeisSchool,
  NeisSchoolEvent,
  RawClassInfoRow,
  RawScheduleRow,
  RawSchoolInfoRow,
  RawTimetableRow,
  SchoolKey,
} from "./types";

const ONE_DAY = 60 * 60 * 24;
const TEN_MINUTES = 60 * 10;
const ONE_HOUR = 60 * 60;
const ELEMENTARY = "초등학교";

function schoolParams(school: SchoolKey): Record<string, string> {
  return { ATPT_OFCDC_SC_CODE: school.atptCode, SD_SCHUL_CODE: school.schoolCode };
}

function toSchool(row: RawSchoolInfoRow): NeisSchool {
  return {
    atptCode: row.ATPT_OFCDC_SC_CODE,
    atptName: row.ATPT_OFCDC_SC_NM,
    schoolCode: row.SD_SCHUL_CODE,
    name: row.SCHUL_NM,
    address: row.ORG_RDNMA ?? "",
  };
}

/** 학교명으로 초등학교 검색 */
export async function searchElementarySchools(name: string): Promise<NeisSchool[]> {
  const rows = await fetchNeisRows<RawSchoolInfoRow>(
    "schoolInfo",
    { SCHUL_NM: name, SCHUL_KND_SC_NM: ELEMENTARY },
    { revalidate: ONE_DAY },
  );
  return rows.map(toSchool);
}

/** 학교코드로 초등학교 1곳 조회 (저장 전 검증용) */
export async function findElementarySchool(school: SchoolKey): Promise<NeisSchool | null> {
  const rows = await fetchNeisRows<RawSchoolInfoRow>(
    "schoolInfo",
    { ...schoolParams(school), SCHUL_KND_SC_NM: ELEMENTARY },
    { revalidate: ONE_DAY },
  );
  return rows.length > 0 ? toSchool(rows[0]) : null;
}

/** 해당 학년도의 학급 목록 */
export async function fetchClasses(school: SchoolKey, schoolYear: number): Promise<NeisClass[]> {
  const rows = await fetchNeisRows<RawClassInfoRow>(
    "classInfo",
    { ...schoolParams(school), AY: String(schoolYear) },
    { revalidate: ONE_DAY },
  );
  return rows
    .map((row) => ({ grade: Number(row.GRADE), classNm: row.CLASS_NM }))
    .filter((item) => Number.isInteger(item.grade) && item.grade >= 1 && item.grade <= 6);
}

/** 기간 내 학교 전체 시간표 (학급 구분 없이 한 번에 조회해 캐시 효율을 높인다) */
export async function fetchTimetable(
  school: SchoolKey,
  from: IsoDate,
  to: IsoDate,
): Promise<NeisLesson[]> {
  const rows = await fetchNeisRows<RawTimetableRow>(
    "elsTimetable",
    { ...schoolParams(school), TI_FROM_YMD: toNeisYmd(from), TI_TO_YMD: toNeisYmd(to) },
    { revalidate: TEN_MINUTES },
  );
  return rows
    .map((row) => ({
      grade: Number(row.GRADE),
      classNm: row.CLASS_NM,
      date: fromNeisYmd(row.ALL_TI_YMD),
      period: Number(row.PERIO),
      subject: (row.ITRT_CNTNT ?? "").trim(),
    }))
    .filter((lesson) => lesson.subject !== "" && Number.isInteger(lesson.period));
}

export type ClassYearTimetable = {
  lessons: NeisLesson[];
  /** 2학기 첫 수업일. NEIS 에 2학기 시간표가 아직 없으면 null */
  secondSemesterStart: IsoDate | null;
};

/**
 * 한 학급의 기간 전체 시간표 (시수 집계용). 학년도 전체처럼 긴 기간을 한 학급만 조회한다.
 * NEIS 는 방학·공휴일에도 내용이 빈 행을 주므로, 과목이 있는 행만 수업으로 센다.
 */
export async function fetchClassTimetable(
  school: SchoolKey,
  classroom: { grade: number; classNm: string },
  from: IsoDate,
  to: IsoDate,
): Promise<ClassYearTimetable> {
  const rows = await fetchNeisRows<RawTimetableRow>(
    "elsTimetable",
    {
      ...schoolParams(school),
      GRADE: String(classroom.grade),
      CLASS_NM: classroom.classNm,
      TI_FROM_YMD: toNeisYmd(from),
      TI_TO_YMD: toNeisYmd(to),
    },
    { revalidate: ONE_HOUR },
  );

  const lessonRows = rows.filter((row) => (row.ITRT_CNTNT ?? "").trim() !== "");
  const secondSemesterDates = lessonRows
    .filter((row) => row.SEM === "2")
    .map((row) => fromNeisYmd(row.ALL_TI_YMD))
    .sort();

  return {
    lessons: lessonRows
      .map((row) => ({
        grade: Number(row.GRADE),
        classNm: row.CLASS_NM,
        date: fromNeisYmd(row.ALL_TI_YMD),
        period: Number(row.PERIO),
        subject: (row.ITRT_CNTNT ?? "").trim(),
      }))
      .filter((lesson) => Number.isInteger(lesson.period)),
    secondSemesterStart: secondSemesterDates[0] ?? null,
  };
}

const GRADE_FLAG_KEYS = [
  "ONE_GRADE_EVENT_YN",
  "TW_GRADE_EVENT_YN",
  "THREE_GRADE_EVENT_YN",
  "FR_GRADE_EVENT_YN",
  "FIV_GRADE_EVENT_YN",
  "SIX_GRADE_EVENT_YN",
] as const;

/** 기간 내 학사일정 */
export async function fetchSchoolEvents(
  school: SchoolKey,
  from: IsoDate,
  to: IsoDate,
): Promise<NeisSchoolEvent[]> {
  const rows = await fetchNeisRows<RawScheduleRow>(
    "SchoolSchedule",
    { ...schoolParams(school), AA_FROM_YMD: toNeisYmd(from), AA_TO_YMD: toNeisYmd(to) },
    { revalidate: ONE_HOUR },
  );
  return rows.map((row) => ({
    date: fromNeisYmd(row.AA_YMD),
    title: row.EVENT_NM.trim(),
    // SBTR_DD_SC_NM: '휴업일' | '공휴일' | '해당없음'
    isDayOff: row.SBTR_DD_SC_NM === "휴업일" || row.SBTR_DD_SC_NM === "공휴일",
    grades: GRADE_FLAG_KEYS.flatMap((key, index) => (row[key] === "Y" ? [index + 1] : [])),
  }));
}
