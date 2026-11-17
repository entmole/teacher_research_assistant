"use client";

import { useActionState } from "react";
import { inputClass, labelClass, primaryButtonClass } from "@/lib/ui";
import { redeemInvite } from "./actions";

/** 초대 코드 입력 폼 */
export function InviteForm() {
  const [state, formAction, isPending] = useActionState(redeemInvite, null);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="invite-code" className={labelClass}>
          초대 코드
        </label>
        <input
          id="invite-code"
          name="inviteCode"
          autoComplete="off"
          autoFocus
          required
          className={inputClass}
        />
      </div>
      {state && !state.ok && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={isPending} className={`${primaryButtonClass} w-full`}>
        {isPending ? "확인 중…" : "확인"}
      </button>
    </form>
  );
}
