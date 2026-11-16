"use client";

import { useActionState, useState } from "react";
import { inputClass, labelClass, primaryButtonClass } from "@/lib/ui";
import type { TeacherType } from "@/types/database";
import { saveProfile } from "./actions";

const TEACHER_TYPE_OPTIONS: { value: TeacherType; label: string; hint: string }[] = [
  { value: "homeroom", label: "담임", hint: "우리 반 전체 시간표를 봅니다." },
  { value: "specialist", label: "전담", hint: "여러 학급 중 내 과목 수업만 모아 봅니다." },
];

type Props = {
  teacherType: TeacherType;
  subjects: string[];
};

/** 담임/전담 선택과 전담 과목 입력 */
export function ProfileForm({ teacherType, subjects }: Props) {
  const [selectedType, setSelectedType] = useState<TeacherType>(teacherType);
  const [state, formAction, isPending] = useActionState(saveProfile, null);

  return (
    <form action={formAction} className="space-y-4">
      <fieldset>
        <legend className="sr-only">교사 유형</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {TEACHER_TYPE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${
                selectedType === option.value
                  ? "border-emerald-600 bg-emerald-50"
                  : "border-stone-300 bg-white"
              }`}
            >
              <input
                type="radio"
                name="teacherType"
                value={option.value}
                checked={selectedType === option.value}
                onChange={() => setSelectedType(option.value)}
                className="mt-1 h-4 w-4 accent-emerald-700"
              />
              <span>
                <span className="block text-sm font-semibold text-stone-900">{option.label}</span>
                <span className="block text-xs text-stone-600">{option.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {selectedType === "specialist" && (
        <div>
          <label htmlFor="profile-subjects" className={labelClass}>
            전담 과목 (여러 개면 쉼표로 구분)
          </label>
          <input
            id="profile-subjects"
            name="subjects"
            defaultValue={subjects.join(", ")}
            placeholder="예: 영어"
            className={inputClass}
          />
          <p className="mt-1 text-xs text-stone-500">
            NEIS 시간표의 과목명과 같게 입력해야 수업이 표시됩니다.
          </p>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={isPending} className={primaryButtonClass}>
          {isPending ? "저장 중…" : "저장"}
        </button>
        {state && (
          <p
            role={state.ok ? "status" : "alert"}
            className={`text-sm ${state.ok ? "text-emerald-700" : "text-red-700"}`}
          >
            {state.ok ? state.message : state.error}
          </p>
        )}
      </div>
    </form>
  );
}
