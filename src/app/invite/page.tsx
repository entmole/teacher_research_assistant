import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { signOut } from "@/features/auth/actions";
import { InviteForm } from "@/features/auth/InviteForm";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { cardClass } from "@/lib/ui";

export const metadata: Metadata = { title: "초대 코드 입력" };

/** 카카오로 처음 로그인한 교사가 초대 코드를 입력하는 화면 */
export default async function InvitePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // 이미 초대가 확인된 교사는 바로 시간표로 보낸다.
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("invited_at")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.invited_at) redirect("/timetable");

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <h1 className="text-center text-2xl font-bold text-stone-900">초대 코드 입력</h1>
        <p className="mt-1 text-center text-sm text-stone-600">
          이 서비스는 초대받은 선생님만 사용할 수 있습니다. 관리자에게 받은 초대 코드를 입력해
          주세요.
        </p>
        <div className={`${cardClass} mt-6`}>
          <InviteForm />
        </div>
        <form action={signOut} className="mt-4 text-center">
          <button
            type="submit"
            className="text-sm text-stone-600 underline-offset-2 hover:underline"
          >
            다른 계정으로 로그인
          </button>
        </form>
      </div>
    </main>
  );
}
