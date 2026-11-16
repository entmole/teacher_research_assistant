"use server";

import { revalidatePath } from "next/cache";
import { fail, isUuid, ok, type ActionResult } from "@/lib/action-result";
import { schoolYearOf, todayKst } from "@/lib/date";
import { findElementarySchool } from "@/lib/neis/api";
import { NeisError } from "@/lib/neis/client";
import type { SchoolKey } from "@/lib/neis/types";
import { createClient, requireUser } from "@/lib/supabase/server";
import type { TeacherType } from "@/types/database";

const MAX_SUBJECTS = 5;
const MAX_SUBJECT_LENGTH = 20;
const MAX_CLASS_NAME_LENGTH = 10;
const UNIQUE_VIOLATION = "23505";
const CODE_PATTERN = /^[A-Za-z0-9]{1,20}$/;

function revalidateSchoolPages() {
  revalidatePath("/settings/school");
  revalidatePath("/timetable");
}

/** 학교 저장. 브라우저가 보낸 값을 믿지 않고 NEIS 에서 다시 조회해 저장한다. */
export async function saveSchool(key: SchoolKey): Promise<ActionResult> {
  const user = await requireUser();
  if (!CODE_PATTERN.test(key.atptCode ?? "") || !CODE_PATTERN.test(key.schoolCode ?? "")) {
    return fail("학교 정보가 올바르지 않습니다.");
  }

  let school;
  try {
    school = await findElementarySchool({ atptCode: key.atptCode, schoolCode: key.schoolCode });
  } catch (error) {
    if (error instanceof NeisError) return fail(`NEIS 조회에 실패했습니다: ${error.message}`);
    throw error;
  }
  if (!school) return fail("NEIS 에서 해당 초등학교를 찾지 못했습니다.");

  const supabase = await createClient();
  const { error } = await supabase.from("school_settings").upsert({
    owner_id: user.id,
    atpt_code: school.atptCode,
    atpt_name: school.atptName,
    school_code: school.schoolCode,
    school_name: school.name,
  });
  if (error) return fail("학교를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");

  revalidateSchoolPages();
  return ok(`${school.name}(으)로 설정했습니다.`);
}

/** 교사 유형(담임/전담)과 전담 과목 저장 (useActionState 용) */
export async function saveProfile(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  const teacherType: TeacherType =
    formData.get("teacherType") === "specialist" ? "specialist" : "homeroom";

  // "영어, 체육" → ["영어", "체육"]
  const subjects = [
    ...new Set(
      String(formData.get("subjects") ?? "")
        .split(",")
        .map((subject) => subject.trim())
        .filter(Boolean),
    ),
  ];

  if (teacherType === "specialist" && subjects.length === 0) {
    return fail("전담 과목을 한 개 이상 입력해 주세요. (예: 영어)");
  }
  if (subjects.length > MAX_SUBJECTS || subjects.some((s) => s.length > MAX_SUBJECT_LENGTH)) {
    return fail(`과목은 ${MAX_SUBJECTS}개 이내, 각 ${MAX_SUBJECT_LENGTH}자 이내로 입력해 주세요.`);
  }

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    teacher_type: teacherType,
    specialist_subjects: teacherType === "specialist" ? subjects : [],
  });
  if (error) return fail("저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");

  revalidateSchoolPages();
  return ok("저장했습니다.");
}

/** 올해 학년도의 담당 학급 추가 */
export async function addClassroom(input: {
  grade: number;
  classNm: string;
}): Promise<ActionResult> {
  const user = await requireUser();
  const classNm = String(input.classNm ?? "").trim();

  if (!Number.isInteger(input.grade) || input.grade < 1 || input.grade > 6) {
    return fail("학년을 선택해 주세요.");
  }
  if (classNm.length === 0 || classNm.length > MAX_CLASS_NAME_LENGTH) {
    return fail("반을 입력해 주세요. (예: 1)");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("classrooms").insert({
    owner_id: user.id,
    school_year: schoolYearOf(todayKst()),
    grade: input.grade,
    class_nm: classNm,
  });
  if (error?.code === UNIQUE_VIOLATION) return fail("이미 등록한 학급입니다.");
  if (error) return fail("학급을 추가하지 못했습니다. 잠시 후 다시 시도해 주세요.");

  revalidateSchoolPages();
  return ok();
}

/** 담당 학급 삭제 (해당 학급의 시간표 수정분도 함께 삭제된다) */
export async function removeClassroom(classroomId: string): Promise<ActionResult> {
  await requireUser();
  if (!isUuid(classroomId)) return fail("잘못된 요청입니다.");

  const supabase = await createClient();
  const { error } = await supabase.from("classrooms").delete().eq("id", classroomId);
  if (error) return fail("학급을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.");

  revalidateSchoolPages();
  return ok();
}
