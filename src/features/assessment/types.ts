import type { Grade } from "@/types/database";

export type { Grade };

export const GRADES: Grade[] = ["A", "B", "C"];

/** 등급별 평가 기준 */
export type Criteria = Record<Grade, string>;

/** 평가 목록의 한 줄 */
export type AssessmentSummary = {
  id: string;
  title: string;
  unitTitle: string | null;
};

/** 평가 상세 */
export type Assessment = {
  id: string;
  subjectId: string;
  unitId: string | null;
  title: string;
  criteria: Criteria;
};

/** 학생 한 명(번호)의 평가 결과. 입력 전이면 grade 는 null, comment 는 빈 문자열 */
export type StudentResult = {
  studentId: string;
  studentNumber: number;
  grade: Grade | null;
  comment: string;
};

export const MAX_STUDENT_COUNT = 60;
export const MAX_TITLE_LENGTH = 60;
export const MAX_CRITERIA_LENGTH = 300;
export const MAX_COMMENT_LENGTH = 500;
