"use server";

import { revalidatePath } from "next/cache";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { schoolYearOf, todayKst } from "@/lib/date";
import { createClient, requireUser } from "@/lib/supabase/server";

const MAX_HOURS = 999;
const MAX_SUBJECT_LENGTH = 30;

/** 학년·과목의 연간 기준 시수 저장. hours 가 null 이면 기준을 지운다. */
export async function setHourTarget(input: {
  grade: number;
  subjectName: string;
  hours: number | null;
}): Promise<ActionResult> {
  const user = await requireUser();
  const subjectName = String(input.subjectName ?? "").trim();

  if (!Number.isInteger(input.grade) || input.grade < 1 || input.grade > 6) {
    return fail("학년이 올바르지 않습니다.");
  }
  if (subjectName.length === 0 || subjectName.length > MAX_SUBJECT_LENGTH) {
    return fail(`과목 이름은 1~${MAX_SUBJECT_LENGTH}자로 입력해 주세요.`);
  }
  if (
    input.hours !== null &&
    (!Number.isInteger(input.hours) || input.hours < 0 || input.hours > MAX_HOURS)
  ) {
    return fail(`기준 시수는 0~${MAX_HOURS} 사이의 정수로 입력해 주세요.`);
  }

  const supabase = await createClient();
  const schoolYear = schoolYearOf(todayKst());
  const { error } =
    input.hours === null
      ? await supabase
          .from("hour_targets")
          .delete()
          .eq("school_year", schoolYear)
          .eq("grade", input.grade)
          .eq("subject_name", subjectName)
      : await supabase.from("hour_targets").upsert({
          owner_id: user.id,
          school_year: schoolYear,
          grade: input.grade,
          subject_name: subjectName,
          hours: input.hours,
        });
  if (error) return fail("기준 시수를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");

  revalidatePath("/hours");
  return ok();
}
