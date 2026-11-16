import type { IsoDate } from "@/lib/date";
import type { ClassroomRef } from "@/features/timetable/types";
import { progressKey, type ProgressRecord, type SubjectRef, type Unit } from "./types";

/** 차시를 가리키는 표시용 정보 */
export type LessonLabel = {
  lessonId: string;
  /** 예: "1-2" (1단원 2차시) */
  shortLabel: string;
  /** 예: "1단원 2차시 · 길 묻고 답하기" */
  label: string;
};

/** 시간표의 한 학급·과목과 진도를 잇는 정보 */
export type ProgressLink = {
  classroomId: string;
  subjectName: string;
  /** 아직 하지 않은 첫 차시. 모두 마쳤으면 null */
  nextLesson: LessonLabel | null;
  /** 이미 기록한 차시와 수업 날짜 */
  taught: (LessonLabel & { date: IsoDate })[];
};

export type SubjectWithUnits = SubjectRef & { units: Unit[] };

/** 학급마다, 같은 학년의 과목별로 "다음 차시"와 "기록한 차시"를 정리한다. */
export function buildProgressLinks(
  classrooms: ClassroomRef[],
  subjects: SubjectWithUnits[],
  records: ProgressRecord[],
): ProgressLink[] {
  const dateByKey = new Map(records.map((r) => [progressKey(r.classroomId, r.lessonId), r.taughtOn]));

  return classrooms.flatMap((classroom) =>
    subjects
      .filter((subject) => subject.grade === classroom.grade)
      .map((subject) => {
        const lessons: LessonLabel[] = subject.units.flatMap((unit, unitIndex) =>
          unit.lessons.map((lesson, lessonIndex) => ({
            lessonId: lesson.id,
            shortLabel: `${unitIndex + 1}-${lessonIndex + 1}`,
            label: `${unitIndex + 1}단원 ${lessonIndex + 1}차시 · ${lesson.title}`,
          })),
        );
        const dateOf = (lesson: LessonLabel) => dateByKey.get(progressKey(classroom.id, lesson.lessonId));

        return {
          classroomId: classroom.id,
          subjectName: subject.name,
          nextLesson: lessons.find((lesson) => dateOf(lesson) === undefined) ?? null,
          taught: lessons.flatMap((lesson) => {
            const date = dateOf(lesson);
            return date === undefined ? [] : [{ ...lesson, date }];
          }),
        };
      }),
  );
}

/** 시간표 칸(학급 + 과목명)에 해당하는 진도 정보를 찾는다. 과목명은 포함 관계로 맞춘다. */
export function findProgressLink(
  links: ProgressLink[],
  classroomId: string,
  timetableSubject: string,
): ProgressLink | null {
  return (
    links.find(
      (link) => link.classroomId === classroomId && timetableSubject.includes(link.subjectName),
    ) ?? null
  );
}
