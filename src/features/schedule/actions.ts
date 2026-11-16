"use server";

import { revalidatePath } from "next/cache";
import { fail, isUuid, ok, type ActionResult } from "@/lib/action-result";
import { isIsoDate } from "@/lib/date";
import { createClient, requireUser } from "@/lib/supabase/server";

const MAX_TITLE_LENGTH = 50;

/** 일정 직접 추가 (useActionState 용) */
export async function addCustomEvent(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  const date = formData.get("date");
  const title = String(formData.get("title") ?? "").trim();

  if (!isIsoDate(date)) return fail("날짜를 선택해 주세요.");
  if (title.length === 0) return fail("일정 이름을 입력해 주세요.");
  if (title.length > MAX_TITLE_LENGTH) {
    return fail(`일정 이름은 ${MAX_TITLE_LENGTH}자 이내로 입력해 주세요.`);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("custom_events")
    .insert({ owner_id: user.id, date, title });
  if (error) return fail("일정을 추가하지 못했습니다. 잠시 후 다시 시도해 주세요.");

  revalidatePath("/timetable");
  return ok();
}

/** 직접 추가한 일정 삭제 */
export async function deleteCustomEvent(eventId: string): Promise<void> {
  await requireUser();
  if (!isUuid(eventId)) return;

  const supabase = await createClient();
  await supabase.from("custom_events").delete().eq("id", eventId);
  revalidatePath("/timetable");
}
