import type { Metadata } from "next";
import { ClassroomManager } from "@/features/school/ClassroomManager";
import { ProfileForm } from "@/features/school/ProfileForm";
import { SchoolSearch } from "@/features/school/SchoolSearch";
import type { ClassroomRef } from "@/features/timetable/types";
import { schoolYearOf, todayKst } from "@/lib/date";
import { fetchClasses } from "@/lib/neis/api";
import { NeisError } from "@/lib/neis/client";
import type { NeisClass, SchoolKey } from "@/lib/neis/types";
import { createClient, requireUser } from "@/lib/supabase/server";
import { cardClass } from "@/lib/ui";

export const metadata: Metadata = { title: "학교 설정" };

/** NEIS 학급 목록. 실패해도 직접 추가는 가능하므로 빈 목록으로 대체한다. */
async function loadNeisClasses(school: SchoolKey, schoolYear: number): Promise<NeisClass[]> {
  try {
    return await fetchClasses(school, schoolYear);
  } catch (error) {
    if (error instanceof NeisError) return [];
    throw error;
  }
}

export default async function SchoolSettingsPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const schoolYear = schoolYearOf(todayKst());

  const [settings, profile, classroomRows] = await Promise.all([
    supabase.from("school_settings").select("*").eq("owner_id", user.id).maybeSingle(),
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase
      .from("classrooms")
      .select("id, grade, class_nm")
      .eq("school_year", schoolYear)
      .order("grade")
      .order("class_nm"),
  ]);

  const school = settings.data;
  const classrooms: ClassroomRef[] = (classroomRows.data ?? []).map((row) => ({
    id: row.id,
    grade: row.grade,
    classNm: row.class_nm,
  }));

  const neisClasses = school
    ? await loadNeisClasses({ atptCode: school.atpt_code, schoolCode: school.school_code }, schoolYear)
    : [];
  const registered = new Set(classrooms.map((c) => `${c.grade}|${c.classNm}`));
  const suggestions = neisClasses.filter((c) => !registered.has(`${c.grade}|${c.classNm}`));

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-2xl font-bold text-stone-900">학교 설정</h1>

      <section className={cardClass} aria-labelledby="school-section-title">
        <h2 id="school-section-title" className="text-base font-semibold text-stone-900">
          1. 학교
        </h2>
        {school ? (
          <p className="mt-2 text-sm text-stone-700">
            현재 학교: <strong className="text-stone-900">{school.school_name}</strong>
            <span className="ml-2 text-xs text-stone-500">
              {school.atpt_name} · 학교코드 {school.school_code}
            </span>
          </p>
        ) : (
          <p className="mt-2 text-sm text-stone-600">
            학교명을 검색해 선택하면 NEIS 시간표와 학사일정을 불러옵니다.
          </p>
        )}
        <div className="mt-4">
          <SchoolSearch />
        </div>
      </section>

      <section className={cardClass} aria-labelledby="profile-section-title">
        <h2 id="profile-section-title" className="mb-3 text-base font-semibold text-stone-900">
          2. 담임 / 전담
        </h2>
        <ProfileForm
          teacherType={profile.data?.teacher_type ?? "homeroom"}
          subjects={profile.data?.specialist_subjects ?? []}
        />
      </section>

      <section className={cardClass} aria-labelledby="classroom-section-title">
        <h2 id="classroom-section-title" className="mb-3 text-base font-semibold text-stone-900">
          3. 담당 학급
        </h2>
        <ClassroomManager schoolYear={schoolYear} classrooms={classrooms} suggestions={suggestions} />
      </section>
    </div>
  );
}
