"use client";

import { useState, useTransition, type FormEvent } from "react";
import { inputClass, secondaryButtonClass } from "@/lib/ui";
import { setHourTarget } from "./actions";
import type { SubjectHours } from "./summary";

type Props = {
  grade: number;
  /** 시간표에 나온 과목별 시수 */
  subjects: SubjectHours[];
  /** 과목 이름 → 연간 기준 시수 */
  targets: Record<string, number>;
  /** 학년도 전체를 볼 때만 기준 대비 남은 시수를 보여 준다. (기준은 연간 값이므로) */
  showProgress: boolean;
};

type Row = SubjectHours & { target: number | null };

/** 과목별 시수 표. 기준 시수는 칸에 입력하고 벗어나면 저장된다. */
export function HoursTable({ grade, subjects, targets, showProgress }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [newSubject, setNewSubject] = useState("");
  const [newHours, setNewHours] = useState("");
  const [isPending, startTransition] = useTransition();

  // 시간표에는 아직 없지만 기준만 입력해 둔 과목도 함께 보여 준다.
  const timetableNames = new Set(subjects.map((item) => item.subject));
  const rows: Row[] = [
    ...subjects.map((item) => ({ ...item, target: targets[item.subject] ?? null })),
    ...Object.entries(targets)
      .filter(([name]) => !timetableNames.has(name))
      .map(([name, target]) => ({ subject: name, done: 0, entered: 0, target })),
  ];
  const totalDone = rows.reduce((sum, row) => sum + row.done, 0);
  const totalEntered = rows.reduce((sum, row) => sum + row.entered, 0);
  const totalTarget = rows.reduce((sum, row) => sum + (row.target ?? 0), 0);
  const hasAnyTarget = rows.some((row) => row.target !== null);
  // 남은 시수 합계는 기준을 입력한 과목만 더한다. (기준이 없는 과목까지 빼면 뜻이 없는 값이 된다)
  const totalRemaining = rows.reduce(
    (sum, row) => sum + (row.target === null ? 0 : row.target - row.done),
    0,
  );

  const saveTarget = (subjectName: string, value: string, onSuccess?: () => void) => {
    const trimmed = value.trim();
    const hours = trimmed === "" ? null : Number(trimmed);
    if (hours !== null && (targets[subjectName] ?? null) === hours) return;
    if (hours === null && targets[subjectName] === undefined) return;

    setError(null);
    startTransition(async () => {
      const result = await setHourTarget({ grade, subjectName, hours });
      if (result.ok) onSuccess?.();
      else setError(result.error);
    });
  };

  const handleAdd = (event: FormEvent) => {
    event.preventDefault();
    saveTarget(newSubject, newHours, () => {
      setNewSubject("");
      setNewHours("");
    });
  };

  return (
    <div className="space-y-4">
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-stone-50 text-xs font-medium text-stone-600">
              <th className="border-b border-stone-200 px-3 py-2 text-left">과목</th>
              <th className="w-24 border-b border-l border-stone-200 px-2 py-2">연간 기준</th>
              <th className="w-24 border-b border-l border-stone-200 px-2 py-2">오늘까지</th>
              <th className="w-24 border-b border-l border-stone-200 px-2 py-2">NEIS 입력분</th>
              {showProgress && (
                <>
                  <th className="w-20 border-b border-l border-stone-200 px-2 py-2">남은 시수</th>
                  <th className="w-40 border-b border-l border-stone-200 px-2 py-2">진행</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const remaining = row.target === null ? null : row.target - row.done;
              const percent =
                row.target && row.target > 0
                  ? Math.min(100, Math.round((row.done / row.target) * 100))
                  : null;
              return (
                <tr key={row.subject}>
                  <th className="border-b border-stone-200 px-3 py-2 text-left font-medium text-stone-900">
                    {row.subject}
                  </th>
                  <td className="border-b border-l border-stone-200 p-1">
                    <input
                      // 저장 후 서버 값이 바뀌면 입력 칸도 새 값으로 다시 만든다.
                      key={`${row.subject}-${row.target ?? ""}`}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={999}
                      defaultValue={row.target ?? ""}
                      onBlur={(event) => saveTarget(row.subject, event.target.value)}
                      aria-label={`${row.subject} 연간 기준 시수`}
                      className="h-9 w-full rounded-lg border border-transparent px-2 text-center text-sm text-stone-900 hover:border-stone-200 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                    />
                  </td>
                  <td className="border-b border-l border-stone-200 px-2 py-2 text-center font-semibold text-stone-900">
                    {row.done}
                  </td>
                  <td className="border-b border-l border-stone-200 px-2 py-2 text-center text-stone-600">
                    {row.entered}
                  </td>
                  {showProgress && (
                    <>
                      <td
                        className={`border-b border-l border-stone-200 px-2 py-2 text-center ${
                          remaining !== null && remaining < 0 ? "font-semibold text-red-700" : "text-stone-700"
                        }`}
                      >
                        {remaining === null ? "–" : remaining < 0 ? `+${-remaining} 초과` : remaining}
                      </td>
                      <td className="border-b border-l border-stone-200 px-3 py-2">
                        {percent === null ? (
                          <span className="block text-center text-stone-300">–</span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <span className="h-2 flex-1 overflow-hidden rounded-full bg-stone-100">
                              <span
                                className="block h-full rounded-full bg-emerald-600"
                                style={{ width: `${percent}%` }}
                              />
                            </span>
                            <span className="w-9 text-right text-xs text-stone-600">{percent}%</span>
                          </span>
                        )}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={showProgress ? 6 : 4} className="px-3 py-6 text-center text-sm text-stone-500">
                  이 기간에 표시할 수업이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="bg-stone-50 font-semibold text-stone-900">
                <th className="px-3 py-2 text-left">합계</th>
                <td className="border-l border-stone-200 px-2 py-2 text-center">
                  {hasAnyTarget ? totalTarget : "–"}
                </td>
                <td className="border-l border-stone-200 px-2 py-2 text-center">{totalDone}</td>
                <td className="border-l border-stone-200 px-2 py-2 text-center">{totalEntered}</td>
                {showProgress && (
                  <>
                    <td className="border-l border-stone-200 px-2 py-2 text-center">
                      {hasAnyTarget ? totalRemaining : "–"}
                    </td>
                    <td className="border-l border-stone-200" />
                  </>
                )}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <form onSubmit={handleAdd} className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-stone-700">표에 없는 과목 기준 추가</span>
        <label htmlFor="new-target-subject" className="sr-only">
          과목 이름
        </label>
        <input
          id="new-target-subject"
          value={newSubject}
          onChange={(event) => setNewSubject(event.target.value)}
          required
          maxLength={30}
          placeholder="과목 이름"
          className={`${inputClass} w-40!`}
        />
        <label htmlFor="new-target-hours" className="sr-only">
          연간 기준 시수
        </label>
        <input
          id="new-target-hours"
          type="number"
          inputMode="numeric"
          min={0}
          max={999}
          required
          value={newHours}
          onChange={(event) => setNewHours(event.target.value)}
          placeholder="시수"
          className={`${inputClass} w-24!`}
        />
        <button type="submit" disabled={isPending} className={secondaryButtonClass}>
          추가
        </button>
      </form>
    </div>
  );
}
