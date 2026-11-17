import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Database } from "@/types/database";
import { getSupabaseEnv } from "./env";

/** 서버 컴포넌트·서버 액션·라우트 핸들러용 Supabase 클라이언트 */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, key } = getSupabaseEnv();

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // 서버 컴포넌트에서는 쿠키를 쓸 수 없다. 세션 갱신은 proxy 가 담당하므로 무시한다.
        }
      },
    },
  });
}

/** 현재 로그인한 교사. 요청당 한 번만 조회한다. */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
});

/** 초대 코드를 확인받은 교사인지. 요청당 한 번만 조회한다. */
const isInvited = cache(async (userId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("invited_at")
    .eq("id", userId)
    .maybeSingle();
  return Boolean(data?.invited_at);
});

/** 초대 코드 입력 화면의 주소 */
export const INVITE_PATH = "/invite";

/**
 * 로그인이 필요한 화면·액션에서 사용.
 * 비로그인이면 로그인 화면으로, 초대 코드를 아직 확인받지 않았으면 초대 코드 화면으로 보낸다.
 */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!(await isInvited(user.id))) redirect(INVITE_PATH);
  return user;
}

/** API 라우트용: 로그인했고 초대도 확인된 교사면 돌려주고, 아니면 null */
export async function getApprovedUser() {
  const user = await getCurrentUser();
  if (!user || !(await isInvited(user.id))) return null;
  return user;
}
