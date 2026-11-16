import { NextResponse, type NextRequest } from "next/server";
import { searchElementarySchools } from "@/lib/neis/api";
import { NeisError } from "@/lib/neis/client";
import { getCurrentUser } from "@/lib/supabase/server";

const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 30;

/** 학교명 검색. NEIS 인증키를 숨기기 위해 서버가 대신 호출한다. (로그인 필요) */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const query = (request.nextUrl.searchParams.get("q") ?? "").trim();
  if (query.length < MIN_QUERY_LENGTH || query.length > MAX_QUERY_LENGTH) {
    return NextResponse.json(
      { error: `학교명을 ${MIN_QUERY_LENGTH}자 이상 입력해 주세요.` },
      { status: 400 },
    );
  }

  try {
    const schools = await searchElementarySchools(query);
    return NextResponse.json({ schools });
  } catch (error) {
    if (error instanceof NeisError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    throw error;
  }
}
