"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fail, isUuid, ok, type ActionResult } from "@/lib/action-result";
import { isIsoDate, schoolYearOf, todayKst } from "@/lib/date";
import { createClient, requireUser } from "@/lib/supabase/server";
import { parseLessonLines } from "./summary";
import {
  MAX_LESSON_TITLE_LENGTH,
  MAX_LESSONS_PER_UNIT,
  MAX_UNIT_TITLE_LENGTH,
} from "./types";

const MAX_SUBJECT_NAME_LENGTH = 20;
const UNIQUE_VIOLATION = "23505";

function revalidateProgressPages() {
  revalidatePath("/progress");
  revalidatePath("/progress/curriculum");
}

/** 과목 추가 (useActionState 용). 성공하면 새 과목의 단원 편집 화면으로 이동한다. */
export async function createSubject(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  const grade = Number(formData.get("grade"));
  const name = String(formData.get("name") ?? "").trim();

  if (!Number.isInteger(grade) || grade < 1 || grade > 6) return fail("학년을 선택해 주세요.");
  if (name.length === 0) return fail("과목 이름을 입력해 주세요.");
  if (name.length > MAX_SUBJECT_NAME_LENGTH) {
    return fail(`과목 이름은 ${MAX_SUBJECT_NAME_LENGTH}자 이내로 입력해 주세요.`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subjects")
    .insert({ owner_id: user.id, school_year: schoolYearOf(todayKst()), grade, name })
    .select("id")
    .single();
  if (error?.code === UNIQUE_VIOLATION) return fail("이미 등록한 과목입니다.");
  if (error || !data) return fail("과목을 추가하지 못했습니다. 잠시 후 다시 시도해 주세요.");

  revalidateProgressPages();
  redirect(`/progress/curriculum?subject=${data.id}`);
}

/** 과목 삭제 (단원·차시·진도 기록도 함께 삭제된다) */
export async function deleteSubject(subjectId: string): Promise<ActionResult> {
  await requireUser();
  if (!isUuid(subjectId)) return fail("잘못된 요청입니다.");

  const supabase = await createClient();
  const { error } = await supabase.from("subjects").delete().eq("id", subjectId);
  if (error) return fail("과목을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.");

  revalidateProgressPages();
  return ok();
}

export type SaveUnitInput = {
  subjectId: string;
  /** 기존 단원을 고치면 그 id, 새 단원이면 null */
  unitId: string | null;
  title: string;
  /** 차시 제목을 한 줄에 하나씩 적은 텍스트 */
  lessonsText: string;
};

/** 단원 제목과 차시 목록을 한 번에 저장한다. 차시는 줄 순서로 맞춘다. */
export async function saveUnit(input: SaveUnitInput): Promise<ActionResult> {
  await requireUser();
  const title = String(input.title ?? "").trim();
  const lessons = parseLessonLines(String(input.lessonsText ?? ""));

  if (!isUuid(input.subjectId)) return fail("과목을 선택해 주세요.");
  if (input.unitId !== null && !isUuid(input.unitId)) return fail("잘못된 요청입니다.");
  if (title.length === 0) return fail("단원 이름을 입력해 주세요.");
  if (title.length > MAX_UNIT_TITLE_LENGTH) {
    return fail(`단원 이름은 ${MAX_UNIT_TITLE_LENGTH}자 이내로 입력해 주세요.`);
  }
  if (lessons.length > MAX_LESSONS_PER_UNIT) {
    return fail(`한 단원의 차시는 ${MAX_LESSONS_PER_UNIT}개까지 입력할 수 있습니다.`);
  }
  if (lessons.some((lesson) => lesson.length > MAX_LESSON_TITLE_LENGTH)) {
    return fail(`차시 제목은 ${MAX_LESSON_TITLE_LENGTH}자 이내로 입력해 주세요.`);
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("save_unit", {
    p_subject_id: input.subjectId,
    p_unit_id: input.unitId,
    p_title: title,
    p_lessons: lessons,
  });
  if (error) return fail("단원을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");

  revalidateProgressPages();
  return ok("저장했습니다.");
}

/** 단원 삭제 (차시·진도 기록도 함께 삭제된다) */
export async function deleteUnit(unitId: string): Promise<ActionResult> {
  await requireUser();
  if (!isUuid(unitId)) return fail("잘못된 요청입니다.");

  const supabase = await createClient();
  const { error } = await supabase.from("units").delete().eq("id", unitId);
  if (error) return fail("단원을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.");

  revalidateProgressPages();
  return ok();
}

export type SetProgressInput = {
  classroomId: string;
  lessonId: string;
  /** true 면 수업 완료로 기록, false 면 기록 삭제 */
  done: boolean;
  /** 수업한 날짜 (done 이 true 일 때 사용) */
  date: string;
};

/** 학급의 차시 진도를 기록하거나 지운다. */
export async function setLessonProgress(input: SetProgressInput): Promise<ActionResult> {
  const user = await requireUser();
  if (!isUuid(input.classroomId) || !isUuid(input.lessonId)) return fail("잘못된 요청입니다.");

  const supabase = await createClient();
  if (input.done) {
    if (!isIsoDate(input.date)) return fail("기록 날짜가 올바르지 않습니다.");
    const { error } = await supabase.from("progress_records").upsert(
      {
        owner_id: user.id,
        classroom_id: input.classroomId,
        lesson_id: input.lessonId,
        taught_on: input.date,
      },
      { onConflict: "classroom_id,lesson_id" },
    );
    if (error) return fail("진도를 기록하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  } else {
    const { error } = await supabase
      .from("progress_records")
      .delete()
      .eq("classroom_id", input.classroomId)
      .eq("lesson_id", input.lessonId);
    if (error) return fail("기록을 지우지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }

  revalidatePath("/progress");
  revalidatePath("/timetable");
  return ok();
}

/** 단원 순서를 한 칸 위(direction < 0) 또는 아래(direction > 0)로 옮긴다. */
export async function moveUnit(unitId: string, direction: -1 | 1): Promise<ActionResult> {
  await requireUser();
  if (!isUuid(unitId) || (direction !== -1 && direction !== 1)) return fail("잘못된 요청입니다.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("move_unit", { p_unit_id: unitId, p_direction: direction });
  if (error) return fail("순서를 바꾸지 못했습니다. 잠시 후 다시 시도해 주세요.");

  revalidateProgressPages();
  revalidatePath("/timetable");
  return ok();
}

/** 지난 학년도의 과목(단원·차시 포함)을 올해 학년도로 복사한다. 진도 기록은 복사하지 않는다. */
export async function importSubjectFromLastYear(subjectId: string): Promise<ActionResult> {
  await requireUser();
  if (!isUuid(subjectId)) return fail("잘못된 요청입니다.");

  const supabase = await createClient();
  const { data: newSubjectId, error } = await supabase.rpc("copy_subject_to_year", {
    p_subject_id: subjectId,
    p_school_year: schoolYearOf(todayKst()),
  });
  if (error?.code === UNIQUE_VIOLATION) return fail("올해 학년도에 이미 같은 과목이 있습니다.");
  if (error || !newSubjectId) return fail("과목을 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.");

  revalidateProgressPages();
  redirect(`/progress/curriculum?subject=${newSubjectId}`);
}
