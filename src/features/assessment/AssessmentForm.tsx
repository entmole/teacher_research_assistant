"use client";

import { useActionState } from "react";
import { inputClass, labelClass, primaryButtonClass } from "@/lib/ui";
import { saveAssessment } from "./actions";
import { GRADES, type Assessment, type Grade } from "./types";

const CRITERIA_FIELDS: Record<Grade, { name: string; placeholder: string }> = {
  A: { name: "criteriaA", placeholder: "예: 길을 묻고 답하는 말을 정확하고 유창하게 한다." },
  B: { name: "criteriaB", placeholder: "예: 길을 묻고 답하는 말을 대체로 정확하게 한다." },
  C: { name: "criteriaC", placeholder: "예: 도움을 받아 길을 묻고 답하는 말을 한다." },
};

type Props = {
  subjectId: string;
  units: { id: string; title: string }[];
  /** 수정할 평가. 새로 추가하면 null */
  assessment: Assessment | null;
};

/** 평가 추가·수정 폼 */
export function AssessmentForm({ subjectId, units, assessment }: Props) {
  const [state, formAction, isPending] = useActionState(saveAssessment, null);
  const fieldId = assessment?.id ?? "new";

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="subjectId" value={subjectId} />
      <input type="hidden" name="assessmentId" value={assessment?.id ?? ""} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`assessment-title-${fieldId}`} className={labelClass}>
            평가 이름
          </label>
          <input
            id={`assessment-title-${fieldId}`}
            name="title"
            defaultValue={assessment?.title ?? ""}
            required
            maxLength={60}
            placeholder="예: 길 묻고 답하기 말하기 평가"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor={`assessment-unit-${fieldId}`} className={labelClass}>
            단원 (선택)
          </label>
          <select
            id={`assessment-unit-${fieldId}`}
            name="unitId"
            defaultValue={assessment?.unitId ?? ""}
            className={inputClass}
          >
            <option value="">단원 연결 안 함</option>
            {units.map((unit, index) => (
              <option key={unit.id} value={unit.id}>
                {index + 1}단원 · {unit.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className={labelClass}>등급별 평가 기준 (선택)</legend>
        {GRADES.map((grade) => (
          <div key={grade} className="flex items-start gap-2">
            <label
              htmlFor={`assessment-${CRITERIA_FIELDS[grade].name}-${fieldId}`}
              className="mt-2 w-6 shrink-0 text-center text-sm font-bold text-stone-700"
            >
              {grade}
            </label>
            <textarea
              id={`assessment-${CRITERIA_FIELDS[grade].name}-${fieldId}`}
              name={CRITERIA_FIELDS[grade].name}
              defaultValue={assessment?.criteria[grade] ?? ""}
              rows={2}
              maxLength={300}
              placeholder={CRITERIA_FIELDS[grade].placeholder}
              className={inputClass}
            />
          </div>
        ))}
      </fieldset>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={isPending} className={primaryButtonClass}>
          {isPending ? "저장 중…" : assessment ? "저장" : "평가 추가"}
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
