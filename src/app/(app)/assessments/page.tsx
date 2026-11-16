import type { Metadata } from "next";
import Link from "next/link";
import { AssessmentForm } from "@/features/assessment/AssessmentForm";
import { loadAssessments, loadUnitOptions } from "@/features/assessment/queries";
import { loadSubjects, pickSubject } from "@/features/progress/queries";
import { SubjectTabs } from "@/features/progress/SubjectTabs";
import { subjectLabel } from "@/features/progress/types";
import { cardClass, primaryButtonClass } from "@/lib/ui";

export const metadata: Metadata = { title: "평가 기록" };

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const firstValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export default async function AssessmentsPage({ searchParams }: Props) {
  const subjects = await loadSubjects();
  const subject = pickSubject(subjects, firstValue((await searchParams).subject));

  if (!subject) {
    return (
      <section className={`${cardClass} mx-auto max-w-lg text-center`}>
        <h1 className="text-lg font-bold text-stone-900">평가를 기록하려면 과목이 필요합니다</h1>
        <p className="mt-2 text-sm text-stone-600">먼저 진도 메뉴에서 과목을 추가해 주세요.</p>
        <Link href="/progress/curriculum" className={`${primaryButtonClass} mt-5`}>
          과목 등록하기
        </Link>
      </section>
    );
  }

  const [assessments, units] = await Promise.all([
    loadAssessments(subject.id),
    loadUnitOptions(subject.id),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <h1 className="text-2xl font-bold text-stone-900">{subjectLabel(subject)} 평가</h1>
      <SubjectTabs subjects={subjects} activeSubjectId={subject.id} basePath="/assessments" />

      <section className={cardClass} aria-labelledby="assessment-list-title">
        <h2 id="assessment-list-title" className="text-base font-semibold text-stone-900">
          평가 목록
        </h2>
        {assessments.length === 0 ? (
          <p className="mt-3 text-sm text-stone-500">
            아직 등록한 평가가 없습니다. 아래에서 추가해 주세요.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-stone-100">
            {assessments.map((assessment) => (
              <li key={assessment.id}>
                <Link
                  href={`/assessments/${assessment.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg px-2 py-3 hover:bg-stone-50"
                >
                  <span>
                    <span className="block font-medium text-stone-900">{assessment.title}</span>
                    {assessment.unitTitle && (
                      <span className="block text-xs text-stone-500">{assessment.unitTitle}</span>
                    )}
                  </span>
                  <span className="shrink-0 text-sm font-medium text-emerald-700">
                    결과 입력 →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={cardClass} aria-labelledby="assessment-add-title">
        <h2 id="assessment-add-title" className="mb-3 text-base font-semibold text-stone-900">
          새 평가 추가
        </h2>
        <AssessmentForm subjectId={subject.id} units={units} assessment={null} />
      </section>
    </div>
  );
}
