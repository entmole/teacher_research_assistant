import type { Metadata } from "next";
import Link from "next/link";
import { loadTextbooks } from "@/features/textbook/queries";
import { semesterLabel, type TextbookEntry } from "@/features/textbook/types";
import { VersionButtons } from "@/features/textbook/VersionButtons";
import { createClient, requireUser } from "@/lib/supabase/server";
import { schoolYearOf, todayKst } from "@/lib/date";
import { cardClass, secondaryButtonClass } from "@/lib/ui";

export const metadata: Metadata = { title: "교과서 자료실" };

const GRADES = [1, 2, 3, 4, 5, 6];

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** 주소에 학년이 없으면 담당 학급의 가장 낮은 학년을 기본으로 보여 준다. */
async function defaultGrade(): Promise<number> {
  await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("classrooms")
    .select("grade")
    .eq("school_year", schoolYearOf(todayKst()))
    .order("grade")
    .limit(1);
  return data?.[0]?.grade ?? 1;
}

function groupBySubject(textbooks: TextbookEntry[]): [subject: string, items: TextbookEntry[]][] {
  const groups = new Map<string, TextbookEntry[]>();
  for (const textbook of textbooks) {
    groups.set(textbook.subject, [...(groups.get(textbook.subject) ?? []), textbook]);
  }
  return [...groups.entries()];
}

const formatDate = (isoDateTime: string) => isoDateTime.slice(0, 10).replaceAll("-", ".");

export default async function TextbookLibraryPage({ searchParams }: Props) {
  const gradeParam = Number((await searchParams).grade);
  const grade = GRADES.includes(gradeParam) ? gradeParam : await defaultGrade();
  const textbooks = await loadTextbooks(grade);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">교과서 자료실</h1>
          <p className="mt-1 text-sm text-stone-600">
            교과서를 골라 단원과 차시를 내 과목으로 불러옵니다. 불러온 뒤에는 자유롭게 고칠 수
            있습니다.
          </p>
        </div>
        <Link href="/progress/curriculum" className={secondaryButtonClass}>
          ← 과목·단원 편집
        </Link>
      </header>

      <nav aria-label="학년 선택" className="flex flex-wrap gap-2">
        {GRADES.map((item) => (
          <Link
            key={item}
            href={`/progress/textbooks?grade=${item}`}
            aria-current={item === grade ? "page" : undefined}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${
              item === grade
                ? "bg-emerald-700 text-white"
                : "border border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
            }`}
          >
            {item}학년
          </Link>
        ))}
      </nav>

      {textbooks.length === 0 ? (
        <section className={cardClass}>
          <h2 className="text-base font-semibold text-stone-900">
            {grade}학년 자료가 아직 없습니다
          </h2>
          <p className="mt-2 text-sm text-stone-600">
            과목·단원 편집 화면에서 진도표를 붙여넣어 단원과 차시를 만든 뒤 &quot;자료실에
            공유&quot;를 누르면, 같은 교과서를 쓰는 선생님이 여기에서 불러올 수 있습니다.
          </p>
        </section>
      ) : (
        groupBySubject(textbooks).map(([subject, items]) => (
          <section key={subject} className={cardClass} aria-label={`${grade}학년 ${subject}`}>
            <h2 className="text-base font-semibold text-stone-900">{subject}</h2>
            <div className="mt-3 space-y-4">
              {items.map((textbook) => (
                <div key={textbook.id}>
                  <h3 className="text-sm font-semibold text-stone-800">
                    {textbook.publisher}
                    <span className="ml-2 font-normal text-stone-500">
                      {semesterLabel(textbook.semester)}
                    </span>
                  </h3>
                  <ul className="mt-1 divide-y divide-stone-100">
                    {textbook.versions.map((version) => (
                      <li key={version.id} className="flex items-center justify-between gap-3 py-2">
                        <span className="min-w-0 text-sm">
                          <span
                            className={`mr-2 rounded px-1.5 py-0.5 text-xs font-semibold ${
                              version.kind === "base"
                                ? "bg-amber-100 text-amber-900"
                                : "bg-emerald-100 text-emerald-900"
                            }`}
                          >
                            {version.kind === "base" ? "기본 자료" : "교사 공유"}
                          </span>
                          <span className="text-stone-800">
                            단원 {version.unitCount}개 · 차시 {version.lessonCount}개
                          </span>
                          <span className="ml-2 text-xs text-stone-500">
                            {formatDate(version.createdAt)}
                            {version.isMine ? " · 내가 공유" : ""}
                          </span>
                          {version.note && (
                            <span className="block truncate text-xs text-stone-600">
                              {version.note}
                            </span>
                          )}
                        </span>
                        <VersionButtons versionId={version.id} canDelete={version.isMine} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
