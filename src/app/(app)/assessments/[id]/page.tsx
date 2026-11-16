import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AssessmentForm } from "@/features/assessment/AssessmentForm";
import { DeleteAssessmentButton } from "@/features/assessment/DeleteAssessmentButton";
import {
  loadAssessmentDetail,
  loadClassResults,
  loadUnitOptions,
} from "@/features/assessment/queries";
import { ResultsTable } from "@/features/assessment/ResultsTable";
import { StudentCountForm } from "@/features/assessment/StudentCountForm";
import { GRADES } from "@/features/assessment/types";
import { subjectLabel } from "@/features/progress/types";
import { classroomLabel } from "@/features/timetable/types";
import { isUuid } from "@/lib/action-result";
import { createClient, requireUser } from "@/lib/supabase/server";
import { cardClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";

export const metadata: Metadata = { title: "평가 결과 입력" };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const firstValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export default async function AssessmentDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const detail = await loadAssessmentDetail(id);
  if (!detail) notFound();

  const { assessment, subject, classrooms } = detail;
  const listHref = `/assessments?subject=${subject.id}`;
  const classParam = firstValue((await searchParams).class);
  const classroom = classrooms.find((c) => c.id === classParam) ?? classrooms[0] ?? null;

  const user = await requireUser();
  const supabase = await createClient();
  const [units, results, profile] = await Promise.all([
    loadUnitOptions(subject.id),
    classroom ? loadClassResults(assessment.id, classroom.id) : Promise.resolve([]),
    supabase.from("profiles").select("ai_enabled").eq("id", user.id).maybeSingle(),
  ]);
  const hasCriteria = GRADES.some((grade) => assessment.criteria[grade] !== "");

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-stone-500">{subjectLabel(subject)} 평가</p>
          <h1 className="text-2xl font-bold text-stone-900">{assessment.title}</h1>
        </div>
        <Link href={listHref} className={secondaryButtonClass}>
          ← 평가 목록
        </Link>
      </header>

      {hasCriteria && (
        <dl className={`${cardClass} space-y-1.5 text-sm`}>
          {GRADES.map((grade) => (
            <div key={grade} className="flex gap-3">
              <dt className="w-5 shrink-0 font-bold text-stone-900">{grade}</dt>
              <dd className="text-stone-700">{assessment.criteria[grade] || "-"}</dd>
            </div>
          ))}
        </dl>
      )}

      {classroom === null ? (
        <section className={`${cardClass} text-center`}>
          <h2 className="text-lg font-bold text-stone-900">
            {subject.grade}학년 담당 학급이 없습니다
          </h2>
          <p className="mt-2 text-sm text-stone-600">
            설정에서 이 학년의 담당 학급을 추가해 주세요.
          </p>
          <Link href="/settings/school" className={`${primaryButtonClass} mt-5`}>
            설정으로 이동
          </Link>
        </section>
      ) : (
        <>
          {classrooms.length > 1 && (
            <nav aria-label="학급 선택" className="flex flex-wrap gap-2">
              {classrooms.map((item) => {
                const isActive = item.id === classroom.id;
                return (
                  <Link
                    key={item.id}
                    href={`/assessments/${assessment.id}?class=${item.id}`}
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

          {/* 학급이나 학생 수가 바뀌면 입력 상태를 새로 만든다. */}
          <StudentCountForm
            key={`count-${classroom.id}-${results.length}`}
            classroomId={classroom.id}
            classroomName={classroomLabel(classroom)}
            currentCount={results.length}
          />

          {results.length === 0 ? (
            <p className={`${cardClass} text-sm text-stone-600`}>
              학생 수를 입력하면 번호별 입력표가 만들어집니다. 학생 이름은 저장하지 않습니다.
            </p>
          ) : (
            <ResultsTable
              key={`results-${classroom.id}-${results.length}`}
              assessmentId={assessment.id}
              initialResults={results}
              aiEnabled={profile.data?.ai_enabled ?? false}
            />
          )}
        </>
      )}

      <details className={cardClass}>
        <summary className="cursor-pointer text-sm font-semibold text-stone-900">
          평가 정보 수정·삭제
        </summary>
        <div className="mt-4 space-y-4">
          <AssessmentForm subjectId={subject.id} units={units} assessment={assessment} />
          <div className="border-t border-stone-200 pt-4 text-right">
            <DeleteAssessmentButton
              assessmentId={assessment.id}
              title={assessment.title}
              returnHref={listHref}
            />
          </div>
        </div>
      </details>
    </div>
  );
}
