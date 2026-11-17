"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fail, isUuid, ok, type ActionResult } from "@/lib/action-result";
import { schoolYearOf, todayKst } from "@/lib/date";
import { createClient, requireUser } from "@/lib/supabase/server";
import type { TextbookContent } from "@/types/database";
import { MAX_LESSONS_PER_UNIT, MAX_UNITS } from "./parse";
import { MAX_PUBLISHER_LENGTH, MAX_SHARE_NOTE_LENGTH } from "./types";

function revalidateCurriculum() {
  revalidatePath("/progress", "layout");
  revalidatePath("/timetable");
}

function isValidContent(units: unknown): units is TextbookContent {
  return (
    Array.isArray(units) &&
    units.length >= 1 &&
    units.length <= MAX_UNITS &&
    units.every(
      (unit) =>
        typeof unit?.title === "string" &&
        unit.title.trim() !== "" &&
        Array.isArray(unit.lessons) &&
        unit.lessons.length <= MAX_LESSONS_PER_UNIT &&
        unit.lessons.every((lesson: unknown) => typeof lesson === "string"),
    )
  );
}

/** 붙여넣은 진도표에서 해석한 단원·차시를 과목 끝에 추가한다. */
export async function appendPastedUnits(input: {
  subjectId: string;
  units: TextbookContent;
}): Promise<ActionResult> {
  await requireUser();
  if (!isUuid(input.subjectId)) return fail("과목을 선택해 주세요.");
  if (!isValidContent(input.units)) {
    return fail(`단원은 1~${MAX_UNITS}개, 단원마다 차시는 ${MAX_LESSONS_PER_UNIT}개까지 넣을 수 있습니다.`);
  }

  const supabase = await createClient();
  const { data: addedCount, error } = await supabase.rpc("append_units", {
    p_subject_id: input.subjectId,
    p_content: input.units,
  });
  if (error) return fail("단원을 추가하지 못했습니다. 잠시 후 다시 시도해 주세요.");

  revalidateCurriculum();
  return ok(`단원 ${addedCount}개를 추가했습니다.`);
}

/** 자료실의 내용을 내 과목으로 복사한다. 성공하면 그 과목의 단원 편집 화면으로 이동한다. */
export async function importTextbookVersion(versionId: string): Promise<ActionResult> {
  await requireUser();
  if (!isUuid(versionId)) return fail("잘못된 요청입니다.");

  const supabase = await createClient();
  const { data: subjectId, error } = await supabase.rpc("import_textbook_version", {
    p_version_id: versionId,
    p_school_year: schoolYearOf(todayKst()),
  });
  if (error || !subjectId) return fail("불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");

  revalidateCurriculum();
  redirect(`/progress/curriculum?subject=${subjectId}`);
}

/** 내 과목의 단원·차시 전체를 자료실에 공유한다. */
export async function shareSubject(input: {
  subjectId: string;
  semester: number;
  publisher: string;
  note: string;
}): Promise<ActionResult> {
  await requireUser();
  const publisher = String(input.publisher ?? "").trim();
  const note = String(input.note ?? "").trim();

  if (!isUuid(input.subjectId)) return fail("과목을 선택해 주세요.");
  if (![0, 1, 2].includes(input.semester)) return fail("학기를 선택해 주세요.");
  if (publisher.length === 0) return fail("출판사를 입력해 주세요. (국정 교과서는 '국정')");
  if (publisher.length > MAX_PUBLISHER_LENGTH) {
    return fail(`출판사는 ${MAX_PUBLISHER_LENGTH}자 이내로 입력해 주세요.`);
  }
  if (note.length > MAX_SHARE_NOTE_LENGTH) {
    return fail(`메모는 ${MAX_SHARE_NOTE_LENGTH}자 이내로 입력해 주세요.`);
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("share_subject", {
    p_subject_id: input.subjectId,
    p_semester: input.semester,
    p_publisher: publisher,
    p_note: note,
  });
  if (error?.message.includes("nothing to share")) return fail("공유할 단원이 없습니다.");
  if (error) return fail("공유하지 못했습니다. 잠시 후 다시 시도해 주세요.");

  revalidatePath("/progress", "layout");
  return ok("자료실에 공유했습니다.");
}

/** 내가 올린 공유본 삭제 */
export async function deleteTextbookVersion(versionId: string): Promise<ActionResult> {
  await requireUser();
  if (!isUuid(versionId)) return fail("잘못된 요청입니다.");

  const supabase = await createClient();
  const { error } = await supabase.from("textbook_versions").delete().eq("id", versionId);
  if (error) return fail("삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.");

  revalidatePath("/progress", "layout");
  return ok();
}
