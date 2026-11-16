import type { Metadata } from "next";
import Link from "next/link";
import { ResetRequestForm } from "@/features/auth/PasswordForms";
import { cardClass } from "@/lib/ui";

export const metadata: Metadata = { title: "비밀번호 재설정" };

export default function ResetRequestPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <h1 className="text-center text-2xl font-bold text-stone-900">비밀번호 재설정</h1>
        <p className="mt-1 text-center text-sm text-stone-600">
          이메일로 받은 링크를 누르면 새 비밀번호를 정할 수 있습니다.
        </p>
        <div className={`${cardClass} mt-6`}>
          <ResetRequestForm />
        </div>
        <p className="mt-4 text-center text-sm">
          <Link href="/login" className="text-stone-600 underline-offset-2 hover:underline">
            ← 로그인으로 돌아가기
          </Link>
        </p>
      </div>
    </main>
  );
}
