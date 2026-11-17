import Link from "next/link";
import { signOut } from "@/features/auth/actions";
import { requireUser } from "@/lib/supabase/server";
import { NavLinks } from "./NavLinks";

/** 로그인한 교사만 볼 수 있는 화면의 공통 틀 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="min-h-screen">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <Link href="/timetable" className="text-base font-bold text-emerald-800">
            교사 업무수첩
          </Link>
          <NavLinks />
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-xs text-stone-500 sm:inline">{user.email ?? "카카오 계정"}</span>
            <form action={signOut}>
              <button
                type="submit"
                className="text-sm font-medium text-stone-600 underline-offset-2 hover:underline"
              >
                로그아웃
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
