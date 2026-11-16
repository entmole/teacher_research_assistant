import type { IsoDate } from "@/lib/date";

/** NEIS 에서 학교를 식별하는 키 */
export type SchoolKey = {
  atptCode: string; // 시도교육청코드
  schoolCode: string; // 행정표준코드
};

// --- 앱에서 쓰는 정제된 형태 -------------------------------------------------

export type NeisSchool = SchoolKey & {
  atptName: string;
  name: string;
  address: string;
};

export type NeisClass = {
  grade: number;
  classNm: string;
};

export type NeisLesson = {
  grade: number;
  classNm: string;
  date: IsoDate;
  period: number;
  subject: string;
};

export type NeisSchoolEvent = {
  date: IsoDate;
  title: string;
  isDayOff: boolean;
  /** 해당 학년 목록 (1~6) */
  grades: number[];
};

// --- NEIS 원본 응답 행 (사용하는 필드만) ---------------------------------------

export type RawSchoolInfoRow = {
  ATPT_OFCDC_SC_CODE: string;
  ATPT_OFCDC_SC_NM: string;
  SD_SCHUL_CODE: string;
  SCHUL_NM: string;
  ORG_RDNMA: string | null;
};

export type RawClassInfoRow = {
  GRADE: string;
  CLASS_NM: string;
};

export type RawTimetableRow = {
  ALL_TI_YMD: string;
  GRADE: string;
  CLASS_NM: string;
  PERIO: string;
  ITRT_CNTNT: string | null;
};

export type RawScheduleRow = {
  AA_YMD: string;
  EVENT_NM: string;
  SBTR_DD_SC_NM: string | null;
  ONE_GRADE_EVENT_YN: string | null;
  TW_GRADE_EVENT_YN: string | null;
  THREE_GRADE_EVENT_YN: string | null;
  FR_GRADE_EVENT_YN: string | null;
  FIV_GRADE_EVENT_YN: string | null;
  SIX_GRADE_EVENT_YN: string | null;
};
