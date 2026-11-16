"use client";

import { useState, useTransition, type FormEvent } from "react";
import type { ActionResult } from "@/lib/action-result";
import type { NeisClass } from "@/lib/neis/types";
import { classroomLabel, type ClassroomRef } from "@/features/timetable/types";
import { inputClass, labelClass, secondaryButtonClass } from "@/lib/ui";
import { addClassroom, removeClassroom } from "./actions";

const GRADES = [1, 2, 3, 4, 5, 6];

type Props = {
  schoolYear: number;
  classrooms: ClassroomRef[];
  /** NEIS 학급정보에서 가져온, 아직 등록하지 않은 학급 */
  suggestions: NeisClass[];
};

/** 담당 학급 목록·추가·삭제 */
export function ClassroomManager({ schoolYear, classrooms, suggestions }: Props) {
  const [grade, setGrade] = useState(1);
  const [classNm, setClassNm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const run = (action: () => Promise<ActionResult>, onSuccess?: () => void) => {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) onSuccess?.();
      else setError(result.error);
    });
  };

  const handleManualAdd = (event: FormEvent) => {
    event.preventDefault();
    run(
      () => addClassroom({ grade, classNm }),
      () => setClassNm(""),
    );
  };

  const handleRemove = (classroom: ClassroomRef) => {
    const confirmed = window.confirm(
      `${classroomLabel(classroom)} 학급을 삭제할까요?\n이 학급에서 직접 수정한 시간표도 함께 삭제됩니다.`,
    );
    if (confirmed) run(() => removeClassroom(classroom.id));
  };

  const suggestionsByGrade = GRADES.map((g) => ({
    grade: g,
    items: suggestions.filter((item) => item.grade === g),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-medium text-stone-700">{schoolYear}학년도 담당 학급</h3>
        {classrooms.length === 0 ? (
          <p className="mt-2 text-sm text-stone-500">아직 등록한 학급이 없습니다.</p>
        ) : (
          <ul className="mt-2 flex flex-wrap gap-2">
            {classrooms.map((classroom) => (
              <li
                key={classroom.id}
                className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 py-1 pl-3 pr-1 text-sm font-semibold text-emerald-900"
              >
                {classroomLabel(classroom)}
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleRemove(classroom)}
                  aria-label={`${classroomLabel(classroom)} 학급 삭제`}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {suggestionsByGrade.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-stone-700">NEIS 학급에서 눌러서 추가</h3>
          <div className="mt-2 space-y-2">
            {suggestionsByGrade.map((group) => (
              <div key={group.grade} className="flex flex-wrap items-center gap-2">
                <span className="w-12 text-xs text-stone-500">{group.grade}학년</span>
                {group.items.map((item) => (
                  <button
                    key={`${item.grade}-${item.classNm}`}
                    type="button"
                    disabled={isPending}
                    onClick={() => run(() => addClassroom(item))}
                    className="rounded-full border border-stone-300 bg-white px-3 py-1 text-sm text-stone-700 hover:border-emerald-600 hover:text-emerald-800 disabled:opacity-50"
                  >
                    + {classroomLabel(item)}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleManualAdd} className="flex flex-wrap items-end gap-2">
        <div>
          <label htmlFor="classroom-grade" className={labelClass}>
            학년
          </label>
          <select
            id="classroom-grade"
            value={grade}
            onChange={(event) => setGrade(Number(event.target.value))}
            className={`${inputClass} w-24`}
          >
            {GRADES.map((g) => (
              <option key={g} value={g}>
                {g}학년
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="classroom-name" className={labelClass}>
            반
          </label>
          <input
            id="classroom-name"
            value={classNm}
            onChange={(event) => setClassNm(event.target.value)}
            maxLength={10}
            required
            placeholder="예: 1"
            className={`${inputClass} w-24`}
          />
        </div>
        <button type="submit" disabled={isPending} className={secondaryButtonClass}>
          직접 추가
        </button>
      </form>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
