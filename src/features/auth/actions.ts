"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { createClient, requireUser } from "@/lib/supabase/server";
import { POST_AUTH_REDIRECT_COOKIE, UPDATE_PASSWORD_PATH } from "./constants";

const MIN_PASSWORD_LENGTH = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 회원가입 실패 원인별 안내 문구. 원인을 구분해야 사용자가 무엇을 고칠지 알 수 있다. */
function signUpErrorMessage(error: { code?: string; status?: number }): string {
  if (error.code === "over_email_send_rate_limit" || error.status === 429) {
    return "지금은 가입 확인 메일을 보낼 수 없습니다(메일 발송 한도 초과). 잠시 후 다시 시도하거나 관리자에게 알려 주세요.";
  }
  if (error.code === "user_already_exists") {
    return "이미 가입된 이메일입니다. 로그인하거나 비밀번호 재설정을 이용해 주세요.";
  }
  if (error.code === "weak_password") {
    return "비밀번호가 너무 단순합니다. 더 길고 복잡한 비밀번호를 사용해 주세요.";
  }
  if (error.code === "unexpected_failure") {
    // 초대 코드가 틀리면 DB 트리거가 가입을 막아 이 오류가 된다.
    return "회원가입에 실패했습니다. 초대 코드를 확인해 주세요.";
  }
  return "회원가입에 실패했습니다. 초대 코드와 입력 내용을 확인해 주세요.";
}

/** 로그인·회원가입 (useActionState 용). 버튼의 intent 값으로 구분한다. */
export async function authenticate(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const inviteCode = String(formData.get("inviteCode") ?? "").trim();
  const isSignUp = formData.get("intent") === "signup";

  if (!EMAIL_PATTERN.test(email)) return fail("이메일 주소를 확인해 주세요.");
  if (password.length < MIN_PASSWORD_LENGTH) {
    return fail(`비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`);
  }

  const supabase = await createClient();

  if (isSignUp) {
    const origin = (await headers()).get("origin") ?? "";
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      // 초대 코드는 DB 트리거(private.check_signup_invite)가 검사한다.
      options: { emailRedirectTo: `${origin}/auth/callback`, data: { invite_code: inviteCode } },
    });
    if (error) return fail(signUpErrorMessage(error));
    // 이메일 확인이 켜져 있으면 세션이 바로 생기지 않는다.
    if (!data.session) return ok("확인 메일을 보냈습니다. 메일의 링크를 누른 뒤 로그인해 주세요.");
  } else {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error?.code === "email_not_confirmed") {
      return fail("이메일 확인이 끝나지 않은 계정입니다. 받은 메일의 링크를 누르거나 관리자에게 알려 주세요.");
    }
    if (error) return fail("이메일 또는 비밀번호가 올바르지 않습니다.");
  }

  redirect("/timetable");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/** 비밀번호 재설정 메일 요청 (useActionState 용) */
export async function requestPasswordReset(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim();
  if (!EMAIL_PATTERN.test(email)) return fail("이메일 주소를 확인해 주세요.");

  // 메일의 링크를 누르면 /auth/callback 을 거쳐 새 비밀번호 입력 화면으로 보낸다.
  const cookieStore = await cookies();
  cookieStore.set(POST_AUTH_REDIRECT_COOKIE, UPDATE_PASSWORD_PATH, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60,
    path: "/",
  });

  const origin = (await headers()).get("origin") ?? "";
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/auth/callback` });

  // 가입 여부를 드러내지 않도록 결과와 관계없이 같은 안내를 보여 준다.
  return ok("가입된 이메일이라면 재설정 메일을 보냈습니다. 같은 브라우저에서 메일의 링크를 열어 주세요.");
}

/** 로그인한 사용자의 비밀번호 변경 (useActionState 용) */
export async function updatePassword(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireUser();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < MIN_PASSWORD_LENGTH) {
    return fail(`비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`);
  }
  if (password !== confirm) return fail("두 비밀번호가 서로 다릅니다.");

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return fail("비밀번호를 바꾸지 못했습니다. 다른 비밀번호로 다시 시도해 주세요.");

  return ok("비밀번호를 바꿨습니다.");
}
