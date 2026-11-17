import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { todayKst } from "@/lib/date";
import { fetchAllPages } from "@/lib/supabase/paginate";
import { createClient, getCurrentUser } from "@/lib/supabase/server";

/**
 * 내려받을 표와 정렬 기준. 모두 RLS 로 "내 행"만 조회된다.
 * (공용 자료실 textbooks 는 개인 데이터가 아니므로 제외)
 */
const EXPORT_TABLES = [
  { table: "profiles", orderBy: "id" },
  { table: "school_settings", orderBy: "owner_id" },
  { table: "classrooms", orderBy: "id" },
  { table: "timetable_overrides", orderBy: "id" },
  { table: "custom_events", orderBy: "id" },
  { table: "subjects", orderBy: "id" },
  { table: "units", orderBy: "id" },
  { table: "lessons", orderBy: "id" },
  { table: "progress_records", orderBy: "id" },
  { table: "students", orderBy: "id" },
  { table: "assessments", orderBy: "id" },
  { table: "assessment_results", orderBy: "id" },
] as const;

/** 내 데이터 전체를 JSON 파일로 내려받는다. (백업용, 로그인 필요) */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  // 표 이름을 변수로 넘기기 위해 타입 없는 클라이언트로 다룬다. 접근 범위는 RLS 가 제한한다.
  const supabase = (await createClient()) as unknown as SupabaseClient;
  const tables: Record<string, unknown[]> = {};
  for (const { table, orderBy } of EXPORT_TABLES) {
    tables[table] = await fetchAllPages<Record<string, unknown>>((from, to) =>
      supabase.from(table).select("*").order(orderBy).range(from, to),
    );
  }

  const today = todayKst();
  const body = JSON.stringify({ exportedAt: new Date().toISOString(), version: 1, tables }, null, 2);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="teacher-notebook-backup-${today}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
