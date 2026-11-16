import type { IsoDate } from "@/lib/date";

/** 과목 (학년별) */
export type SubjectRef = {
  id: string;
  grade: number;
  name: string;
};

/** 차시 */
export type Lesson = {
  id: string;
  title: string;
};

/** 단원과 그 안의 차시 (순서대로 정렬된 상태) */
export type Unit = {
  id: string;
  title: string;
  lessons: Lesson[];
};

/** 학급별 진도 기록: 해당 학급이 해당 차시 수업을 마친 날짜 */
export type ProgressRecord = {
  classroomId: string;
  lessonId: string;
  taughtOn: IsoDate;
};

export function subjectLabel(subject: Pick<SubjectRef, "grade" | "name">): string {
  return `${subject.grade}학년 ${subject.name}`;
}

export function progressKey(classroomId: string, lessonId: string): string {
  return `${classroomId}|${lessonId}`;
}

export const MAX_LESSONS_PER_UNIT = 60;
export const MAX_LESSON_TITLE_LENGTH = 100;
export const MAX_UNIT_TITLE_LENGTH = 60;
