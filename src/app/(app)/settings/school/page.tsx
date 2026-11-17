import type { Metadata } from "next";
import Link from "next/link";
import { AiSettingsForm } from "@/features/ai/AiSettingsForm";
import { ClassroomManager } from "@/features/school/ClassroomManager";
import { ProfileForm } from "@/features/school/ProfileForm";
import { SchoolSearch } from "@/features/school/SchoolSearch";
import type { ClassroomRef } from "@/features/timetable/types";
import { isAiConfigured } from "@/lib/ai";
import { schoolYearOf, todayKst } from "@/lib/date";
import { fetchClasses } from "@/lib/neis/api";
import { NeisError } from "@/lib/neis/client";
import type { NeisClass, SchoolKey } from "@/lib/neis/types";
import { createClient, requireUser } from "@/lib/supabase/server";
import { cardClass } from "@/lib/ui";

export const metadata: Metadata = { title: "설정" };

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
      <h1 className="text-2xl font-bold text-stone-900">설정</h1>

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

      <section className={cardClass} aria-labelledby="ai-section-title">
        <h2 id="ai-section-title" className="mb-3 text-base font-semibold text-stone-900">
          4. AI 문체 교정
        </h2>
        <AiSettingsForm
          aiEnabled={profile.data?.ai_enabled ?? false}
          styleRules={profile.data?.style_rules ?? ""}
          isServerConfigured={isAiConfigured()}
        />
      </section>

      <section className={cardClass} aria-labelledby="account-section-title">
        <h2 id="account-section-title" className="text-base font-semibold text-stone-900">
          5. 계정
        </h2>
        <p className="mt-2 text-sm text-stone-700">{user.email ?? "카카오 계정"}</p>
        {/* 비밀번호는 이메일로 가입한 계정에만 있다. */}
        {user.app_metadata.provider === "email" && (
          <Link
            href="/auth/update-password"
            className="mt-2 inline-block text-sm font-medium text-emerald-800 underline-offset-2 hover:underline"
          >
            비밀번호 변경
          </Link>
        )}
      </section>

      <section className={cardClass} aria-labelledby="backup-section-title">
        <h2 id="backup-section-title" className="text-base font-semibold text-stone-900">
          6. 데이터 백업
        </h2>
        <p className="mt-2 text-sm text-stone-600">
          내가 입력한 학급, 시간표 수정, 일정, 과목·단원·차시, 진도, 평가 결과를 파일 하나로
          내려받습니다. 학기말이나 큰 수정 전에 받아 두면 좋습니다.
        </p>
        {/* 파일 내려받기이므로 화면 이동용 Link 대신 일반 링크를 쓴다. */}
        <a
          href="/api/export"
          download
          className="mt-3 inline-flex items-center justify-center rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
        >
          내 데이터 내려받기 (JSON)
        </a>
      </section>
    </div>
  );
}
