import "server-only";

import { schoolYearOf, todayKst } from "@/lib/date";
import { fetchAllPages } from "@/lib/supabase/paginate";
import { createClient, requireUser } from "@/lib/supabase/server";
import type { ClassroomRef } from "@/features/timetable/types";
import { buildProgressLinks, type ProgressLink, type SubjectWithUnits } from "./timetable-link";
import type { ProgressRecord, SubjectRef, Unit } from "./types";

/** 올해 학년도의 과목 목록 */
export async function loadSubjects(): Promise<SubjectRef[]> {
  await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("subjects")
    .select("id, grade, name")
    .eq("school_year", schoolYearOf(todayKst()))
    .order("grade")
    .order("name");
  return data ?? [];
}

/** 주소의 subject 값에 해당하는 과목, 없으면 첫 과목 */
export function pickSubject(subjects: SubjectRef[], subjectParam: string | undefined) {
  return subjects.find((subject) => subject.id === subjectParam) ?? subjects[0] ?? null;
}

/** 과목의 단원·차시를 순서대로 불러온다. */
export async function loadUnits(subjectId: string): Promise<Unit[]> {
  await requireUser();
  const supabase = await createClient();
  const { data: unitRows } = await supabase
    .from("units")
    .select("id, title")
    .eq("subject_id", subjectId)
    .order("order_no");
  const units = unitRows ?? [];
  if (units.length === 0) return [];

  const { data: lessonRows } = await supabase
    .from("lessons")
    .select("id, unit_id, title")
    .in(
      "unit_id",
      units.map((unit) => unit.id),
    )
    .order("order_no");

  return units.map((unit) => ({
    id: unit.id,
    title: unit.title,
    lessons: (lessonRows ?? [])
      .filter((lesson) => lesson.unit_id === unit.id)
      .map((lesson) => ({ id: lesson.id, title: lesson.title })),
  }));
}

export type ProgressBoardData = {
  units: Unit[];
  /** 과목과 같은 학년의 담당 학급 */
  classrooms: ClassroomRef[];
  records: ProgressRecord[];
};

/** 진도표에 필요한 단원·학급·진도 기록 */
export async function loadProgressBoard(subject: SubjectRef): Promise<ProgressBoardData> {
  await requireUser();
  const supabase = await createClient();

  const [units, classroomRows] = await Promise.all([
    loadUnits(subject.id),
    supabase
      .from("classrooms")
      .select("id, grade, class_nm")
      .eq("school_year", schoolYearOf(todayKst()))
      .eq("grade", subject.grade)
      .order("class_nm"),
  ]);

  const classrooms: ClassroomRef[] = (classroomRows.data ?? []).map((row) => ({
    id: row.id,
    grade: row.grade,
    classNm: row.class_nm,
  }));
  const lessonIds = units.flatMap((unit) => unit.lessons.map((lesson) => lesson.id));
  if (classrooms.length === 0 || lessonIds.length === 0) {
    return { units, classrooms, records: [] };
  }

  // 학급 수 × 차시 수만큼 행이 생기므로 1000행을 넘을 수 있다.
  const recordRows = await fetchAllPages((from, to) =>
    supabase
      .from("progress_records")
      .select("classroom_id, lesson_id, taught_on")
      .in(
        "classroom_id",
        classrooms.map((classroom) => classroom.id),
      )
      .in("lesson_id", lessonIds)
      .order("id")
      .range(from, to),
  );

  return {
    units,
    classrooms,
    records: recordRows.map((row) => ({
      classroomId: row.classroom_id,
      lessonId: row.lesson_id,
      taughtOn: row.taught_on,
    })),
  };
}

/** 시간표 화면용: 담당 학급마다 과목별 다음 차시와 기록한 차시 */
export async function loadProgressLinks(classrooms: ClassroomRef[]): Promise<ProgressLink[]> {
  if (classrooms.length === 0) return [];
  const grades = new Set(classrooms.map((classroom) => classroom.grade));
  const subjects = (await loadSubjects()).filter((subject) => grades.has(subject.grade));
  if (subjects.length === 0) return [];

  const supabase = await createClient();
  const [unitsBySubject, recordRows] = await Promise.all([
    Promise.all(subjects.map((subject) => loadUnits(subject.id))),
    fetchAllPages((from, to) =>
      supabase
        .from("progress_records")
        .select("classroom_id, lesson_id, taught_on")
        .in(
          "classroom_id",
          classrooms.map((classroom) => classroom.id),
        )
        .order("id")
        .range(from, to),
    ),
  ]);

  const subjectsWithUnits: SubjectWithUnits[] = subjects.map((subject, index) => ({
    ...subject,
    units: unitsBySubject[index],
  }));
  const records: ProgressRecord[] = recordRows.map((row) => ({
    classroomId: row.classroom_id,
    lessonId: row.lesson_id,
    taughtOn: row.taught_on,
  }));
  return buildProgressLinks(classrooms, subjectsWithUnits, records);
}

/** 지난 학년도 과목 중 올해 아직 없는 과목 (작년 과목 가져오기용) */
export async function loadImportableSubjects(currentSubjects: SubjectRef[]): Promise<SubjectRef[]> {
  await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("subjects")
    .select("id, grade, name")
    .eq("school_year", schoolYearOf(todayKst()) - 1)
    .order("grade")
    .order("name");

  const existing = new Set(currentSubjects.map((subject) => `${subject.grade}|${subject.name}`));
  return (data ?? []).filter((subject) => !existing.has(`${subject.grade}|${subject.name}`));
}
