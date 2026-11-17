import "server-only";

import { createClient, requireUser } from "@/lib/supabase/server";
import type { TextbookEntry } from "./types";

/** 한 학년의 자료실 목록 (과목·학기·출판사 순). 내용(JSON)은 불러오지 않는다. */
export async function loadTextbooks(grade: number): Promise<TextbookEntry[]> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: textbookRows } = await supabase
    .from("textbooks")
    .select("id, grade, semester, subject, publisher")
    .eq("grade", grade)
    .order("subject")
    .order("semester")
    .order("publisher");
  const textbooks = textbookRows ?? [];
  if (textbooks.length === 0) return [];

  const { data: versionRows } = await supabase
    .from("textbook_versions")
    .select("id, textbook_id, owner_id, kind, note, unit_count, lesson_count, created_at")
    .in(
      "textbook_id",
      textbooks.map((textbook) => textbook.id),
    )
    .order("created_at", { ascending: false });

  return textbooks
    .map((textbook) => ({
      ...textbook,
      versions: (versionRows ?? [])
        .filter((version) => version.textbook_id === textbook.id)
        .map((version) => ({
          id: version.id,
          kind: version.kind,
          note: version.note,
          unitCount: version.unit_count,
          lessonCount: version.lesson_count,
          createdAt: version.created_at,
          isMine: version.owner_id === user.id,
        }))
        // 기본 자료를 맨 위에, 그다음 최근 공유본 순
        .sort((a, b) => Number(b.kind === "base") - Number(a.kind === "base")),
    }))
    .filter((textbook) => textbook.versions.length > 0);
}

/** 공유 폼에 미리 채울, 과목이 불러온 교과서의 학기·출판사 */
export async function loadSubjectTextbook(
  subjectId: string,
): Promise<{ semester: number; publisher: string } | null> {
  await requireUser();
  const supabase = await createClient();
  const { data: subject } = await supabase
    .from("subjects")
    .select("textbook_id")
    .eq("id", subjectId)
    .maybeSingle();
  if (!subject?.textbook_id) return null;

  const { data: textbook } = await supabase
    .from("textbooks")
    .select("semester, publisher")
    .eq("id", subject.textbook_id)
    .maybeSingle();
  return textbook ?? null;
}
