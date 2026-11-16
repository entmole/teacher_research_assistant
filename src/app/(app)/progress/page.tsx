import type { Metadata } from "next";
import Link from "next/link";
import { ProgressBoard } from "@/features/progress/ProgressBoard";
import { loadProgressBoard, loadSubjects, pickSubject } from "@/features/progress/queries";
import { SubjectTabs } from "@/features/progress/SubjectTabs";
import { subjectLabel } from "@/features/progress/types";
import { todayKst } from "@/lib/date";
import { cardClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";

export const metadata: Metadata = { title: "진도 관리" };

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const firstValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export default async function ProgressPage({ searchParams }: Props) {
  const subjects = await loadSubjects();
  const subject = pickSubject(subjects, firstValue((await searchParams).subject));

  if (!subject) {
    return (
      <Notice
        title="진도를 기록하려면 과목이 필요합니다"
        description="가르치는 과목을 추가하고 단원과 차시를 입력해 주세요."
        href="/progress/curriculum"
        linkLabel="과목·단원 등록하기"
      />
    );
  }

  const board = await loadProgressBoard(subject);
  const curriculumHref = `/progress/curriculum?subject=${subject.id}`;
  const hasLessons = board.units.some((unit) => unit.lessons.length > 0);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold text-stone-900">{subjectLabel(subject)} 진도</h1>
        <Link href={curriculumHref} className={secondaryButtonClass}>
          과목·단원 편집
        </Link>
      </header>

      <SubjectTabs subjects={subjects} activeSubjectId={subject.id} basePath="/progress" />

      {!hasLessons ? (
        <Notice
          title="등록된 차시가 없습니다"
          description="단원과 차시를 입력하면 학급별 진도표가 만들어집니다."
          href={curriculumHref}
          linkLabel="단원·차시 입력하기"
        />
      ) : board.classrooms.length === 0 ? (
        <Notice
          title={`${subject.grade}학년 담당 학급이 없습니다`}
          description="설정에서 이 학년의 담당 학급을 추가해 주세요."
          href="/settings/school"
          linkLabel="설정으로 이동"
        />
      ) : (
        <ProgressBoard
          units={board.units}
          classrooms={board.classrooms}
          records={board.records}
          today={todayKst()}
        />
      )}
    </div>
  );
}

function Notice(props: { title: string; description: string; href: string; linkLabel: string }) {
  return (
    <section className={`${cardClass} mx-auto max-w-lg text-center`}>
      <h2 className="text-lg font-bold text-stone-900">{props.title}</h2>
      <p className="mt-2 text-sm text-stone-600">{props.description}</p>
      <Link href={props.href} className={`${primaryButtonClass} mt-5`}>
        {props.linkLabel}
      </Link>
    </section>
  );
}
