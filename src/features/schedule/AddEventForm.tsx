"use client";

import { useActionState } from "react";
import { shortDate, weekdayLabel, type IsoDate } from "@/lib/date";
import { inputClass, secondaryButtonClass } from "@/lib/ui";
import { addCustomEvent } from "./actions";

/** 이번 주 일정 직접 추가 폼 */
export function AddEventForm({ days, defaultDate }: { days: IsoDate[]; defaultDate: IsoDate }) {
  const [state, formAction, isPending] = useActionState(addCustomEvent, null);

  return (
    <form action={formAction} className="mt-4 border-t border-stone-200 pt-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor="event-date">
          날짜
        </label>
        <select
          id="event-date"
          name="date"
          defaultValue={defaultDate}
          className={`${inputClass} sm:w-36`}
        >
          {days.map((date) => (
            <option key={date} value={date}>
              {weekdayLabel(date)} ({shortDate(date)})
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="event-title">
          일정 이름
        </label>
        <input
          id="event-title"
          name="title"
          required
          maxLength={50}
          placeholder="일정 이름 (예: 학년 협의회)"
          className={inputClass}
        />
        <button type="submit" disabled={isPending} className={`${secondaryButtonClass} shrink-0`}>
          {isPending ? "추가 중…" : "일정 추가"}
        </button>
      </div>
      {state && !state.ok && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
    </form>
  );
}
