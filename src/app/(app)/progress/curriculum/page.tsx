import type { Metadata } from "next";
import Link from "next/link";
import { AddSubjectForm } from "@/features/progress/AddSubjectForm";
import { DeleteSubjectButton } from "@/features/progress/DeleteSubjectButton";
import { ImportSubjectButton } from "@/features/progress/ImportSubjectButton";
import {
  loadImportableSubjects,
  loadSubjects,
  loadUnits,
  pickSubject,
} from "@/features/progress/queries";
import { SubjectTabs } from "@/features/progress/SubjectTabs";
import { subjectLabel } from "@/features/progress/types";
import { UnitEditor } from "@/features/progress/UnitEditor";
import { cardClass, secondaryButtonClass } from "@/lib/ui";

export const metadata: Metadata = { title: "과목·단원 편집" };

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const firstValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export default async function CurriculumPage({ searchParams }: Props) {
  const subjects = await loadSubjects();
  const subject = pickSubject(subjects, firstValue((await searchParams).subject));
  const [units, importableSubjects] = await Promise.all([
    subject ? loadUnits(subject.id) : Promise.resolve([]),
    loadImportableSubjects(subjects),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold text-stone-900">과목·단원 편집</h1>
        {subject && (
          <Link href={`/progress?subject=${subject.id}`} className={secondaryButtonClass}>
            ← 진도표로
          </Link>
        )}
      </header>

      <section className={cardClass} aria-labelledby="subject-section-title">
        <h2 id="subject-section-title" className="mb-3 text-base font-semibold text-stone-900">
          과목
        </h2>
        <SubjectTabs
          subjects={subjects}
          activeSubjectId={subject?.id ?? null}
          basePath="/progress/curriculum"
        />
        <div className={subjects.length > 0 ? "mt-4 border-t border-stone-200 pt-4" : ""}>
          <AddSubjectForm defaultGrade={subject?.grade ?? 1} />
        </div>
        {importableSubjects.length > 0 && (
          <div className="mt-4 border-t border-stone-200 pt-4">
            <h3 className="text-sm font-medium text-stone-700">작년 과목 가져오기</h3>
            <p className="mt-1 text-xs text-stone-500">
              단원과 차시를 그대로 복사합니다. 진도 기록과 평가는 복사하지 않습니다.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {importableSubjects.map((item) => (
                <ImportSubjectButton key={item.id} subject={item} />
              ))}
            </div>
          </div>
        )}
      </section>

      {subject && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-stone-900">{subjectLabel(subject)} 단원</h2>
            <DeleteSubjectButton subject={subject} />
          </div>

          {units.map((unit, index) => (
            <section key={unit.id} className={cardClass} aria-label={`${index + 1}단원`}>
              {/* 저장 후 서버 값이 바뀌면 입력 칸도 새 값으로 다시 만든다. */}
              <UnitEditor
                key={`${unit.title}|${unit.lessons.map((lesson) => lesson.title).join("|")}`}
                subjectId={subject.id}
                unit={unit}
                unitNo={index + 1}
                unitCount={units.length}
              />
            </section>
          ))}

          <section className={`${cardClass} border-dashed`} aria-label="새 단원 추가">
            <UnitEditor
              key={`new-${units.length}`}
              subjectId={subject.id}
              unit={null}
              unitNo={units.length + 1}
              unitCount={units.length}
            />
          </section>
        </>
      )}
    </div>
  );
}
