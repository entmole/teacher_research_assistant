import type { Metadata } from "next";
import Link from "next/link";
import { buildStudentOverview } from "@/features/assessment/overview";
import { loadClassOverview } from "@/features/assessment/queries";
import { StudentOverviewTable } from "@/features/assessment/StudentOverviewTable";
import { classroomLabel, type ClassroomRef } from "@/features/timetable/types";
import { schoolYearOf, todayKst } from "@/lib/date";
import { createClient, requireUser } from "@/lib/supabase/server";
import { cardClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";

export const metadata: Metadata = { title: "학생별 종합 보기" };

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const firstValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

async function loadClassrooms(): Promise<ClassroomRef[]> {
  await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("classrooms")
    .select("id, grade, class_nm")
    .eq("school_year", schoolYearOf(todayKst()))
    .order("grade")
    .order("class_nm");
  return (data ?? []).map((row) => ({ id: row.id, grade: row.grade, classNm: row.class_nm }));
}

export default async function StudentOverviewPage({ searchParams }: Props) {
  const classrooms = await loadClassrooms();
  const classParam = firstValue((await searchParams).class);
  const classroom = classrooms.find((item) => item.id === classParam) ?? classrooms[0] ?? null;

  if (!classroom) {
    return (
      <section className={`${cardClass} mx-auto max-w-lg text-center`}>
        <h1 className="text-lg font-bold text-stone-900">담당 학급이 없습니다</h1>
        <p className="mt-2 text-sm text-stone-600">설정에서 담당 학급을 추가해 주세요.</p>
        <Link href="/settings/school" className={`${primaryButtonClass} mt-5`}>
          설정으로 이동
        </Link>
      </section>
    );
  }

  const overview = await loadClassOverview(classroom);
  const rows = buildStudentOverview(overview.students, overview.assessments, overview.results);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">
            {classroomLabel(classroom)} 학생별 종합 보기
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            이 학급의 모든 평가 등급과 코멘트를 학생 번호별로 모아 봅니다.
          </p>
        </div>
        <Link href="/assessments" className={secondaryButtonClass}>
          ← 평가 목록
        </Link>
      </header>

      {classrooms.length > 1 && (
        <nav aria-label="학급 선택" className="flex flex-wrap gap-2">
          {classrooms.map((item) => {
            const isActive = item.id === classroom.id;
            return (
              <Link
                key={item.id}
                href={`/assessments/overview?class=${item.id}`}
                aria-current={isActive ? "page" : undefined}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${
                  isActive
                    ? "bg-emerald-700 text-white"
                    : "border border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
                }`}
              >
                {classroomLabel(item)}
              </Link>
            );
          })}
        </nav>
      )}

      {overview.students.length === 0 ? (
        <p className={`${cardClass} text-sm text-stone-600`}>
          이 학급의 학생 수가 아직 설정되지 않았습니다. 평가 결과 입력 화면에서 학생 수를 먼저
          입력해 주세요.
        </p>
      ) : overview.assessments.length === 0 ? (
        <p className={`${cardClass} text-sm text-stone-600`}>
          {classroom.grade}학년 과목에 등록된 평가가 없습니다.
        </p>
      ) : (
        <StudentOverviewTable
          key={classroom.id}
          assessments={overview.assessments}
          rows={rows}
        />
      )}
    </div>
  );
}
