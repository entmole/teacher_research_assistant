"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fail, isUuid, ok, type ActionResult } from "@/lib/action-result";
import { createClient, requireUser } from "@/lib/supabase/server";
import { isGrade } from "./summary";
import {
  MAX_COMMENT_LENGTH,
  MAX_CRITERIA_LENGTH,
  MAX_STUDENT_COUNT,
  MAX_TITLE_LENGTH,
  type Grade,
} from "./types";

const textOf = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim();

/**
 * 평가 추가·수정 (useActionState 용).
 * assessmentId 가 있으면 수정, 없으면 추가 후 결과 입력 화면으로 이동한다.
 */
export async function saveAssessment(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  const assessmentId = textOf(formData, "assessmentId");
  const subjectId = textOf(formData, "subjectId");
  const unitId = textOf(formData, "unitId");
  const title = textOf(formData, "title");
  const criteria = {
    criteria_a: textOf(formData, "criteriaA"),
    criteria_b: textOf(formData, "criteriaB"),
    criteria_c: textOf(formData, "criteriaC"),
  };

  if (!isUuid(subjectId)) return fail("과목을 선택해 주세요.");
  if (unitId !== "" && !isUuid(unitId)) return fail("단원을 다시 선택해 주세요.");
  if (assessmentId !== "" && !isUuid(assessmentId)) return fail("잘못된 요청입니다.");
  if (title.length === 0) return fail("평가 이름을 입력해 주세요.");
  if (title.length > MAX_TITLE_LENGTH) {
    return fail(`평가 이름은 ${MAX_TITLE_LENGTH}자 이내로 입력해 주세요.`);
  }
  if (Object.values(criteria).some((text) => text.length > MAX_CRITERIA_LENGTH)) {
    return fail(`평가 기준은 각 ${MAX_CRITERIA_LENGTH}자 이내로 입력해 주세요.`);
  }

  const supabase = await createClient();
  const values = { title, unit_id: unitId === "" ? null : unitId, ...criteria };

  if (assessmentId !== "") {
    const { error } = await supabase.from("assessments").update(values).eq("id", assessmentId);
    if (error) return fail("평가를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    revalidatePath(`/assessments/${assessmentId}`);
    revalidatePath("/assessments");
    return ok("저장했습니다.");
  }

  const { data, error } = await supabase
    .from("assessments")
    .insert({ owner_id: user.id, subject_id: subjectId, ...values })
    .select("id")
    .single();
  if (error || !data) return fail("평가를 추가하지 못했습니다. 잠시 후 다시 시도해 주세요.");

  revalidatePath("/assessments");
  redirect(`/assessments/${data.id}`);
}

/** 평가 삭제 (입력한 결과도 함께 삭제된다) */
export async function deleteAssessment(assessmentId: string): Promise<ActionResult> {
  await requireUser();
  if (!isUuid(assessmentId)) return fail("잘못된 요청입니다.");

  const supabase = await createClient();
  const { error } = await supabase.from("assessments").delete().eq("id", assessmentId);
  if (error) return fail("평가를 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.");

  revalidatePath("/assessments");
  return ok();
}

/** 학급의 학생 수 설정 (1번 ~ count 번) */
export async function setStudentCount(input: {
  classroomId: string;
  count: number;
}): Promise<ActionResult> {
  await requireUser();
  if (!isUuid(input.classroomId)) return fail("잘못된 요청입니다.");
  if (!Number.isInteger(input.count) || input.count < 1 || input.count > MAX_STUDENT_COUNT) {
    return fail(`학생 수는 1~${MAX_STUDENT_COUNT} 사이로 입력해 주세요.`);
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_student_count", {
    p_classroom_id: input.classroomId,
    p_count: input.count,
  });
  if (error) return fail("학생 수를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");

  revalidatePath("/assessments", "layout");
  return ok();
}

/**
 * 결번(전출 등) 번호 설정. "7, 15" 처럼 쉼표로 구분한 번호를 받는다.
 * 결번은 입력표와 집계에서 빠지지만, 이미 입력한 결과는 지워지지 않는다.
 */
export async function setExcludedNumbers(input: {
  classroomId: string;
  numbersText: string;
}): Promise<ActionResult> {
  await requireUser();
  if (!isUuid(input.classroomId)) return fail("잘못된 요청입니다.");

  const tokens = String(input.numbersText ?? "")
    .split(/[\s,]+/)
    .filter(Boolean);
  const numbers = [...new Set(tokens.map(Number))];
  const isValid = numbers.every(
    (number) => Number.isInteger(number) && number >= 1 && number <= MAX_STUDENT_COUNT,
  );
  if (!isValid) return fail("결번은 번호를 쉼표로 구분해 입력해 주세요. (예: 7, 15)");

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_excluded_students", {
    p_classroom_id: input.classroomId,
    p_numbers: numbers,
  });
  if (error) return fail("결번을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");

  revalidatePath("/assessments", "layout");
  return ok();
}

export type SaveResultInput = {
  assessmentId: string;
  studentId: string;
  grade: Grade | null;
  comment: string;
};

/** 학생 한 명의 등급·코멘트 저장. 둘 다 비어 있으면 기록을 지운다. */
export async function saveResult(input: SaveResultInput): Promise<ActionResult> {
  const user = await requireUser();
  const comment = String(input.comment ?? "").trim();

  if (!isUuid(input.assessmentId) || !isUuid(input.studentId)) return fail("잘못된 요청입니다.");
  if (input.grade !== null && !isGrade(input.grade)) return fail("등급이 올바르지 않습니다.");
  if (comment.length > MAX_COMMENT_LENGTH) {
    return fail(`코멘트는 ${MAX_COMMENT_LENGTH}자 이내로 입력해 주세요.`);
  }

  const supabase = await createClient();
  if (input.grade === null && comment === "") {
    const { error } = await supabase
      .from("assessment_results")
      .delete()
      .eq("assessment_id", input.assessmentId)
      .eq("student_id", input.studentId);
    return error ? fail("저장하지 못했습니다.") : ok();
  }

  // 입력 중 화면이 다시 그려지지 않도록 revalidatePath 는 호출하지 않는다.
  // (이 화면은 요청마다 새로 조회하므로 다음 방문 시 최신 값이 보인다.)
  const { error } = await supabase.from("assessment_results").upsert(
    {
      owner_id: user.id,
      assessment_id: input.assessmentId,
      student_id: input.studentId,
      grade: input.grade,
      comment,
    },
    { onConflict: "assessment_id,student_id" },
  );
  return error ? fail("저장하지 못했습니다.") : ok();
}
