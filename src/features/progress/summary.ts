import { progressKey, type ProgressRecord, type Unit } from "./types";

/** 한 학급의 진도 요약 */
export type ClassProgressSummary = {
  classroomId: string;
  doneCount: number;
  totalCount: number;
  /** 아직 하지 않은 첫 차시. 모두 마쳤으면 null */
  nextLesson: { unitNo: number; lessonNo: number; title: string } | null;
};

/** 학급별로 완료 차시 수와 다음에 할 차시를 계산한다. */
export function summarizeProgress(
  units: Unit[],
  classroomIds: string[],
  records: ProgressRecord[],
): ClassProgressSummary[] {
  const doneKeys = new Set(records.map((r) => progressKey(r.classroomId, r.lessonId)));
  const orderedLessons = units.flatMap((unit, unitIndex) =>
    unit.lessons.map((lesson, lessonIndex) => ({
      id: lesson.id,
      title: lesson.title,
      unitNo: unitIndex + 1,
      lessonNo: lessonIndex + 1,
    })),
  );

  return classroomIds.map((classroomId) => {
    const isDone = (lessonId: string) => doneKeys.has(progressKey(classroomId, lessonId));
    const next = orderedLessons.find((lesson) => !isDone(lesson.id));
    return {
      classroomId,
      doneCount: orderedLessons.filter((lesson) => isDone(lesson.id)).length,
      totalCount: orderedLessons.length,
      nextLesson: next
        ? { unitNo: next.unitNo, lessonNo: next.lessonNo, title: next.title }
        : null,
    };
  });
}

/** 여러 줄 입력을 차시 제목 목록으로 바꾼다. (빈 줄 제거, 앞뒤 공백 제거) */
export function parseLessonLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}
