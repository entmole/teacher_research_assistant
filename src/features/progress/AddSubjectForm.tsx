"use client";

import { useActionState } from "react";
import { COMMON_SUBJECTS } from "@/features/timetable/subject-color";
import { inputClass, labelClass, primaryButtonClass } from "@/lib/ui";
import { createSubject } from "./actions";

const GRADES = [1, 2, 3, 4, 5, 6];

/** 과목 추가 폼 */
export function AddSubjectForm({ defaultGrade }: { defaultGrade: number }) {
  const [state, formAction, isPending] = useActionState(createSubject, null);

  return (
    <form action={formAction}>
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label htmlFor="subject-grade" className={labelClass}>
            학년
          </label>
          <select
            id="subject-grade"
            name="grade"
            defaultValue={defaultGrade}
            className={`${inputClass} w-24!`}
          >
            {GRADES.map((grade) => (
              <option key={grade} value={grade}>
                {grade}학년
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-40 flex-1">
          <label htmlFor="subject-name" className={labelClass}>
            과목
          </label>
          <input
            id="subject-name"
            name="name"
            list="subject-name-options"
            required
            maxLength={20}
            placeholder="예: 영어"
            className={inputClass}
          />
          <datalist id="subject-name-options">
            {COMMON_SUBJECTS.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </div>
        <button type="submit" disabled={isPending} className={primaryButtonClass}>
          {isPending ? "추가 중…" : "과목 추가"}
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
