"use client";

import Link from "next/link";
import { useActionState } from "react";
import { inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";
import { authenticate } from "./actions";

/** 이메일·비밀번호 로그인 / 회원가입 폼 */
export function LoginForm() {
  const [state, formAction, isPending] = useActionState(authenticate, null);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="login-email" className={labelClass}>
          이메일
        </label>
        <input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="login-password" className={labelClass}>
          비밀번호 (8자 이상)
        </label>
        <input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          minLength={8}
          required
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="login-invite" className={labelClass}>
          초대 코드 (회원가입할 때만)
        </label>
        <input id="login-invite" name="inviteCode" autoComplete="off" className={inputClass} />
      </div>

      {state && (
        <p
          role={state.ok ? "status" : "alert"}
          className={`rounded-lg px-3 py-2 text-sm ${
            state.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"
          }`}
        >
          {state.ok ? state.message : state.error}
        </p>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="submit"
          name="intent"
          value="signin"
          disabled={isPending}
          className={primaryButtonClass}
        >
          로그인
        </button>
        <button
          type="submit"
          name="intent"
          value="signup"
          disabled={isPending}
          className={secondaryButtonClass}
        >
          회원가입
        </button>
      </div>

      <p className="text-center text-sm">
        <Link href="/auth/reset" className="text-stone-600 underline-offset-2 hover:underline">
          비밀번호를 잊으셨나요?
        </Link>
      </p>
    </form>
  );
}
