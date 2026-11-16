"use client";

import { useActionState } from "react";
import { inputClass, labelClass, primaryButtonClass } from "@/lib/ui";
import type { ActionResult } from "@/lib/action-result";
import { requestPasswordReset, updatePassword } from "./actions";

function ResultMessage({ state }: { state: ActionResult | null }) {
  if (!state) return null;
  return (
    <p
      role={state.ok ? "status" : "alert"}
      className={`rounded-lg px-3 py-2 text-sm ${
        state.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"
      }`}
    >
      {state.ok ? state.message : state.error}
    </p>
  );
}

/** 비밀번호 재설정 메일 요청 폼 */
export function ResetRequestForm() {
  const [state, formAction, isPending] = useActionState(requestPasswordReset, null);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="reset-email" className={labelClass}>
          가입한 이메일
        </label>
        <input
          id="reset-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className={inputClass}
        />
      </div>
      <ResultMessage state={state} />
      <button type="submit" disabled={isPending} className={`${primaryButtonClass} w-full`}>
        {isPending ? "보내는 중…" : "재설정 메일 보내기"}
      </button>
    </form>
  );
}

/** 새 비밀번호 입력 폼 (로그인 상태에서 사용) */
export function UpdatePasswordForm() {
  const [state, formAction, isPending] = useActionState(updatePassword, null);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="new-password" className={labelClass}>
          새 비밀번호 (8자 이상)
        </label>
        <input
          id="new-password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="confirm-password" className={labelClass}>
          새 비밀번호 확인
        </label>
        <input
          id="confirm-password"
          name="confirm"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className={inputClass}
        />
      </div>
      <ResultMessage state={state} />
      <button type="submit" disabled={isPending} className={`${primaryButtonClass} w-full`}>
        {isPending ? "바꾸는 중…" : "비밀번호 바꾸기"}
      </button>
    </form>
  );
}
