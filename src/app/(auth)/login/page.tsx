import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/features/auth/LoginForm";
import { getCurrentUser } from "@/lib/supabase/server";
import { cardClass } from "@/lib/ui";

export const metadata: Metadata = { title: "로그인" };

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: Props) {
  if (await getCurrentUser()) redirect("/timetable");
  const errorParam = (await searchParams).error;
  const hasCallbackError = errorParam !== undefined;
  const errorMessage =
    errorParam === "kakao"
      ? "카카오 로그인을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요."
      : "로그인을 완료하지 못했습니다. 인증 링크가 만료되었거나 동의가 취소되었을 수 있습니다. 다시 시도해 주세요.";

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <h1 className="text-center text-2xl font-bold text-stone-900">교사 업무수첩</h1>
        <p className="mt-1 text-center text-sm text-stone-600">
          시간표와 학사일정을 한곳에서 관리합니다.
        </p>
        <div className={`${cardClass} mt-6`}>
          {hasCallbackError && (
            <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </p>
          )}
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
