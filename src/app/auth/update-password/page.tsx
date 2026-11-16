import type { Metadata } from "next";
import Link from "next/link";
import { UpdatePasswordForm } from "@/features/auth/PasswordForms";
import { requireUser } from "@/lib/supabase/server";
import { cardClass } from "@/lib/ui";

export const metadata: Metadata = { title: "비밀번호 변경" };

export default async function UpdatePasswordPage() {
  const user = await requireUser();

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <h1 className="text-center text-2xl font-bold text-stone-900">비밀번호 변경</h1>
        <p className="mt-1 text-center text-sm text-stone-600">{user.email}</p>
        <div className={`${cardClass} mt-6`}>
          <UpdatePasswordForm />
        </div>
        <p className="mt-4 text-center text-sm">
          <Link href="/timetable" className="text-stone-600 underline-offset-2 hover:underline">
            ← 시간표로 이동
          </Link>
        </p>
      </div>
    </main>
  );
}
