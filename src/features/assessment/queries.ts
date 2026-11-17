import "server-only";

import { schoolYearOf, todayKst } from "@/lib/date";
import { fetchAllPages } from "@/lib/supabase/paginate";
import { createClient, requireUser } from "@/lib/supabase/server";
import type { SubjectRef } from "@/features/progress/types";
import type { ClassroomRef } from "@/features/timetable/types";
import type { OverviewAssessment, OverviewResult } from "./overview";
import type { Assessment, AssessmentSummary, StudentResult } from "./types";

/** 과목의 평가 목록 (최근에 만든 순) */
export async function loadAssessments(subjectId: string): Promise<AssessmentSummary[]> {
  await requireUser();
  const supabase = await createClient();
  const [assessmentRows, unitRows] = await Promise.all([
    supabase
      .from("assessments")
      .select("id, title, unit_id")
      .eq("subject_id", subjectId)
      .order("created_at", { ascending: false }),
    supabase.from("units").select("id, title").eq("subject_id", subjectId),
  ]);

  const unitTitleById = new Map((unitRows.data ?? []).map((unit) => [unit.id, unit.title]));
  return (assessmentRows.data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    unitTitle: row.unit_id ? (unitTitleById.get(row.unit_id) ?? null) : null,
  }));
}

/** 과목의 단원 목록 (평가를 단원에 연결할 때 사용) */
export async function loadUnitOptions(subjectId: string): Promise<{ id: string; title: string }[]> {
  await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("units")
    .select("id, title")
    .eq("subject_id", subjectId)
    .order("order_no");
  return data ?? [];
}

export type AssessmentDetail = {
  assessment: Assessment;
  subject: SubjectRef;
  /** 과목과 같은 학년의 담당 학급 */
  classrooms: ClassroomRef[];
};

/** 평가 상세와 그 과목·학급. 없거나 남의 평가면 null (RLS 로 걸러진다) */
export async function loadAssessmentDetail(assessmentId: string): Promise<AssessmentDetail | null> {
  await requireUser();
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("assessments")
    .select("id, subject_id, unit_id, title, criteria_a, criteria_b, criteria_c")
    .eq("id", assessmentId)
    .maybeSingle();
  if (!row) return null;

  const { data: subject } = await supabase
    .from("subjects")
    .select("id, grade, name")
    .eq("id", row.subject_id)
    .maybeSingle();
  if (!subject) return null;

  const { data: classroomRows } = await supabase
    .from("classrooms")
    .select("id, grade, class_nm")
    .eq("school_year", schoolYearOf(todayKst()))
    .eq("grade", subject.grade)
    .order("class_nm");

  return {
    assessment: {
      id: row.id,
      subjectId: row.subject_id,
      unitId: row.unit_id,
      title: row.title,
      criteria: { A: row.criteria_a, B: row.criteria_b, C: row.criteria_c },
    },
    subject,
    classrooms: (classroomRows ?? []).map((c) => ({
      id: c.id,
      grade: c.grade,
      classNm: c.class_nm,
    })),
  };
}

export type ClassResults = {
  /** 설정한 학생 수 (결번 포함) */
  studentCount: number;
  /** 결번(전출 등)으로 표시한 번호 */
  excludedNumbers: number[];
  /** 결번을 뺀 학생의 번호순 결과 */
  results: StudentResult[];
};

/** 한 학급의 학생 번호별 평가 결과 */
export async function loadClassResults(
  assessmentId: string,
  classroomId: string,
): Promise<ClassResults> {
  await requireUser();
  const supabase = await createClient();
  const { data: studentRows } = await supabase
    .from("students")
    .select("id, student_number, is_excluded")
    .eq("classroom_id", classroomId)
    .eq("is_active", true)
    .order("student_number");
  const allStudents = studentRows ?? [];
  const students = allStudents.filter((student) => !student.is_excluded);
  const excludedNumbers = allStudents
    .filter((student) => student.is_excluded)
    .map((student) => student.student_number);
  if (students.length === 0) {
    return { studentCount: allStudents.length, excludedNumbers, results: [] };
  }

  const { data: resultRows } = await supabase
    .from("assessment_results")
    .select("student_id, grade, comment")
    .eq("assessment_id", assessmentId)
    .in(
      "student_id",
      students.map((student) => student.id),
    );

  const resultByStudent = new Map((resultRows ?? []).map((r) => [r.student_id, r]));
  return {
    studentCount: allStudents.length,
    excludedNumbers,
    results: students.map((student) => ({
      studentId: student.id,
      studentNumber: student.student_number,
      grade: resultByStudent.get(student.id)?.grade ?? null,
      comment: resultByStudent.get(student.id)?.comment ?? "",
    })),
  };
}

export type ClassOverviewData = {
  students: { id: string; studentNumber: number }[];
  assessments: OverviewAssessment[];
  results: OverviewResult[];
};

/** 학생별 종합 보기용: 한 학급의 학생, 그 학년 과목의 모든 평가, 평가 결과 */
export async function loadClassOverview(classroom: ClassroomRef): Promise<ClassOverviewData> {
  await requireUser();
  const supabase = await createClient();

  const [studentRows, subjectRows] = await Promise.all([
    supabase
      .from("students")
      .select("id, student_number")
      .eq("classroom_id", classroom.id)
      .eq("is_active", true)
      .eq("is_excluded", false)
      .order("student_number"),
    supabase
      .from("subjects")
      .select("id, name")
      .eq("school_year", schoolYearOf(todayKst()))
      .eq("grade", classroom.grade)
      .order("name"),
  ]);
  const students = (studentRows.data ?? []).map((row) => ({
    id: row.id,
    studentNumber: row.student_number,
  }));
  const subjects = subjectRows.data ?? [];
  if (students.length === 0 || subjects.length === 0) {
    return { students, assessments: [], results: [] };
  }

  const { data: assessmentRows } = await supabase
    .from("assessments")
    .select("id, title, subject_id")
    .in(
      "subject_id",
      subjects.map((subject) => subject.id),
    )
    .order("created_at");
  const subjectNameById = new Map(subjects.map((subject) => [subject.id, subject.name]));
  // 과목 순서대로 묶고, 과목 안에서는 만든 순서대로 둔다.
  const assessments: OverviewAssessment[] = subjects.flatMap((subject) =>
    (assessmentRows ?? [])
      .filter((row) => row.subject_id === subject.id)
      .map((row) => ({
        id: row.id,
        title: row.title,
        subjectName: subjectNameById.get(row.subject_id) ?? "",
      })),
  );
  if (assessments.length === 0) return { students, assessments, results: [] };

  // 학생 수 × 평가 수만큼 행이 생기므로 1000행을 넘을 수 있다.
  const resultRows = await fetchAllPages((from, to) =>
    supabase
      .from("assessment_results")
      .select("student_id, assessment_id, grade, comment")
      .in(
        "student_id",
        students.map((student) => student.id),
      )
      .order("id")
      .range(from, to),
  );

  return {
    students,
    assessments,
    results: resultRows.map((row) => ({
      studentId: row.student_id,
      assessmentId: row.assessment_id,
      grade: row.grade,
      comment: row.comment,
    })),
  };
}
