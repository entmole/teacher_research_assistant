import type { NeisLesson } from "@/lib/neis/types";
import type { ClassroomRef, OverrideEntry, TimetableCell, TimetableView } from "./types";

const cellKey = (classroomId: string, date: string, period: number) =>
  `${classroomId}|${date}|${period}`;

/**
 * NEIS 원본 시간표에 교사의 수정분을 덮어써 화면용 칸 목록을 만든다.
 * - 담당 학급이 아닌 학급의 수업은 버린다.
 * - 같은 학급·날짜·교시에 수정분이 있으면 수정분이 우선한다.
 * - NEIS 에 없는 칸의 수정분은 "직접 추가한 수업"으로 포함한다.
 */
export function mergeTimetable(
  classrooms: ClassroomRef[],
  lessons: NeisLesson[],
  overrides: OverrideEntry[],
): TimetableCell[] {
  const classroomByName = new Map(classrooms.map((c) => [`${c.grade}|${c.classNm}`, c]));
  const classroomById = new Map(classrooms.map((c) => [c.id, c]));
  const cells = new Map<string, TimetableCell>();

  for (const lesson of lessons) {
    const classroom = classroomByName.get(`${lesson.grade}|${lesson.classNm}`);
    if (!classroom) continue;
    cells.set(cellKey(classroom.id, lesson.date, lesson.period), {
      classroomId: classroom.id,
      grade: classroom.grade,
      classNm: classroom.classNm,
      date: lesson.date,
      period: lesson.period,
      subject: lesson.subject,
      neisSubject: lesson.subject,
      overrideId: null,
      memo: "",
      isCancelled: false,
    });
  }

  for (const override of overrides) {
    const classroom = classroomById.get(override.classroomId);
    if (!classroom) continue;
    const key = cellKey(classroom.id, override.date, override.period);
    cells.set(key, {
      classroomId: classroom.id,
      grade: classroom.grade,
      classNm: classroom.classNm,
      date: override.date,
      period: override.period,
      subject: override.subject,
      neisSubject: cells.get(key)?.neisSubject ?? null,
      overrideId: override.id,
      memo: override.memo,
      isCancelled: override.isCancelled,
    });
  }

  return [...cells.values()].sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.period - b.period ||
      a.grade - b.grade ||
      a.classNm.localeCompare(b.classNm, "ko", { numeric: true }),
  );
}

/**
 * 보기 방식에 맞는 칸만 고른다.
 * - classroom: 해당 학급의 모든 수업
 * - mine: 담당 과목 수업 + 직접 수정·추가한 칸(교사가 의도적으로 넣은 것이므로 항상 표시)
 */
export function selectCellsForView(cells: TimetableCell[], view: TimetableView): TimetableCell[] {
  if (view.kind === "classroom") {
    return cells.filter((cell) => cell.classroomId === view.classroomId);
  }
  return cells.filter(
    (cell) =>
      cell.overrideId !== null || view.subjects.some((subject) => cell.subject.includes(subject)),
  );
}
