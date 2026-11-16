"use server";

import { revalidatePath } from "next/cache";
import { fail, isUuid, ok, type ActionResult } from "@/lib/action-result";
import { isIsoDate } from "@/lib/date";
import { createClient, requireUser } from "@/lib/supabase/server";

const MAX_PERIOD = 10;
const MAX_SUBJECT_LENGTH = 30;
const MAX_MEMO_LENGTH = 200;

export type SaveOverrideInput = {
  classroomId: string;
  date: string;
  period: number;
  subject: string;
  memo: string;
  isCancelled: boolean;
};

/** 시간표 칸을 직접 수정(또는 추가)한다. 같은 학급·날짜·교시의 기존 수정분은 덮어쓴다. */
export async function saveTimetableOverride(input: SaveOverrideInput): Promise<ActionResult> {
  const user = await requireUser();
  const subject = input.subject.trim();
  const memo = input.memo.trim();

  if (!isUuid(input.classroomId)) return fail("학급을 선택해 주세요.");
  if (!isIsoDate(input.date)) return fail("날짜가 올바르지 않습니다.");
  if (!Number.isInteger(input.period) || input.period < 1 || input.period > MAX_PERIOD) {
    return fail("교시가 올바르지 않습니다.");
  }
  if (subject.length === 0) return fail("과목을 입력해 주세요.");
  if (subject.length > MAX_SUBJECT_LENGTH) {
    return fail(`과목은 ${MAX_SUBJECT_LENGTH}자 이내로 입력해 주세요.`);
  }
  if (memo.length > MAX_MEMO_LENGTH) {
    return fail(`메모는 ${MAX_MEMO_LENGTH}자 이내로 입력해 주세요.`);
  }

  const supabase = await createClient();
  const { error } = await supabase.from("timetable_overrides").upsert(
    {
      owner_id: user.id,
      classroom_id: input.classroomId,
      date: input.date,
      period: input.period,
      subject,
      memo,
      is_cancelled: input.isCancelled === true,
    },
    { onConflict: "classroom_id,date,period" },
  );
  if (error) return fail("저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");

  revalidatePath("/timetable");
  return ok();
}

/** 수정분을 지워 NEIS 원본으로 되돌린다. */
export async function resetTimetableOverride(overrideId: string): Promise<ActionResult> {
  await requireUser();
  if (!isUuid(overrideId)) return fail("잘못된 요청입니다.");

  const supabase = await createClient();
  const { error } = await supabase.from("timetable_overrides").delete().eq("id", overrideId);
  if (error) return fail("되돌리지 못했습니다. 잠시 후 다시 시도해 주세요.");

  revalidatePath("/timetable");
  return ok();
}
