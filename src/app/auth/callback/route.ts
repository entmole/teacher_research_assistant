import { NextResponse, type NextRequest } from "next/server";
import { POST_AUTH_REDIRECT_COOKIE, UPDATE_PASSWORD_PATH } from "@/features/auth/constants";
import { createClient } from "@/lib/supabase/server";

/**
 * 이메일 확인·비밀번호 재설정 링크가 돌아오는 주소. 인증 코드를 세션으로 교환한다.
 * 비밀번호 재설정을 요청한 경우(쿠키로 표시)에는 새 비밀번호 입력 화면으로 보낸다.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const destination = request.nextUrl.clone();
  destination.search = "";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const isPasswordReset =
        request.cookies.get(POST_AUTH_REDIRECT_COOKIE)?.value === UPDATE_PASSWORD_PATH;
      destination.pathname = isPasswordReset ? UPDATE_PASSWORD_PATH : "/timetable";
      const response = NextResponse.redirect(destination);
      response.cookies.delete(POST_AUTH_REDIRECT_COOKIE);
      return response;
    }
  }

  destination.pathname = "/login";
  destination.searchParams.set("error", "callback");
  return NextResponse.redirect(destination);
}
