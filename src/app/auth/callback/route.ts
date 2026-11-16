import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** 이메일 확인 링크가 돌아오는 주소. 인증 코드를 세션으로 교환한다. */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const destination = request.nextUrl.clone();
  destination.search = "";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      destination.pathname = "/timetable";
      return NextResponse.redirect(destination);
    }
  }

  destination.pathname = "/login";
  destination.searchParams.set("error", "callback");
  return NextResponse.redirect(destination);
}
