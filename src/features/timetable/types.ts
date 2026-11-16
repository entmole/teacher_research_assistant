import type { IsoDate } from "@/lib/date";

/** 담당 학급 */
export type ClassroomRef = {
  id: string;
  grade: number;
  classNm: string;
};

/** 교사가 직접 수정한 시간표 칸 */
export type OverrideEntry = {
  id: string;
  classroomId: string;
  date: IsoDate;
  period: number;
  subject: string;
  memo: string;
  isCancelled: boolean;
};

/** 화면에 표시되는 수업 1건 (NEIS 원본 + 수정분 병합 결과) */
export type TimetableCell = {
  classroomId: string;
  grade: number;
  classNm: string;
  date: IsoDate;
  period: number;
  subject: string;
  /** NEIS 원본 과목. NEIS 에 없는 칸을 직접 추가했다면 null */
  neisSubject: string | null;
  /** 수정분이 적용된 칸이면 해당 수정분 id */
  overrideId: string | null;
  memo: string;
  isCancelled: boolean;
};

/** 시간표 보기 방식 */
export type TimetableView =
  | { kind: "classroom"; classroomId: string } // 한 학급의 전체 시간표 (담임)
  | { kind: "mine"; subjects: string[] }; // 여러 학급 중 내 담당 과목만 (전담)

export const MINE_VIEW_PARAM = "mine";

export function classroomLabel(classroom: Pick<ClassroomRef, "grade" | "classNm">): string {
  return `${classroom.grade}-${classroom.classNm}`;
}

export function slotKey(date: IsoDate, period: number): string {
  return `${date}|${period}`;
}
