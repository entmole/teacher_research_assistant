"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { createClient } from "@/lib/supabase/server";

const MIN_PASSWORD_LENGTH = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 로그인·회원가입 (useActionState 용). 버튼의 intent 값으로 구분한다. */
export async function authenticate(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
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
      options: { emailRedirectTo: `${origin}/auth/callback` },
    });
    if (error) return fail("회원가입에 실패했습니다. 입력 내용을 확인해 주세요.");
    // 이메일 확인이 켜져 있으면 세션이 바로 생기지 않는다.
    if (!data.session) return ok("확인 메일을 보냈습니다. 메일의 링크를 누른 뒤 로그인해 주세요.");
  } else {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return fail("이메일 또는 비밀번호가 올바르지 않습니다.");
  }

  redirect("/timetable");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
