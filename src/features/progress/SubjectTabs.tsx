import Link from "next/link";
import { subjectLabel, type SubjectRef } from "./types";

type Props = {
  subjects: SubjectRef[];
  activeSubjectId: string | null;
  /** 탭을 눌렀을 때 이동할 화면 경로 (예: /progress) */
  basePath: string;
};

/** 과목 선택 탭 */
export function SubjectTabs({ subjects, activeSubjectId, basePath }: Props) {
  if (subjects.length === 0) return null;

  return (
    <nav aria-label="과목 선택" className="flex flex-wrap gap-2">
      {subjects.map((subject) => {
        const isActive = subject.id === activeSubjectId;
        return (
          <Link
            key={subject.id}
            href={`${basePath}?subject=${subject.id}`}
            aria-current={isActive ? "page" : undefined}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${
              isActive
                ? "bg-emerald-700 text-white"
                : "border border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
            }`}
          >
            {subjectLabel(subject)}
          </Link>
        );
      })}
    </nav>
  );
}
