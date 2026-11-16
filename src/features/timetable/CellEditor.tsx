"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import type { ActionResult } from "@/lib/action-result";
import { shortDate, weekdayLabel, type IsoDate } from "@/lib/date";
import { inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";
import { setLessonProgress } from "@/features/progress/actions";
import type { ProgressLink } from "@/features/progress/timetable-link";
import { resetTimetableOverride, saveTimetableOverride } from "./actions";
import { COMMON_SUBJECTS } from "./subject-color";
import { classroomLabel, type ClassroomRef, type TimetableCell } from "./types";

export type EditTarget = {
  date: IsoDate;
  period: number;
  /** 기존 수업을 수정하면 그 칸, 빈 칸에 추가하면 null */
  cell: TimetableCell | null;
};

type Props = {
  target: EditTarget;
  classrooms: ClassroomRef[];
  /** 이 칸의 학급·과목에 연결된 진도 정보. 등록한 과목이 없으면 null */
  progressLink: ProgressLink | null;
  fixedClassroomId: string | null;
  onClose: () => void;
};

/** 시간표 칸 수정 창 */
export function CellEditor({
  target,
  classrooms,
  progressLink,
  fixedClassroomId,
  onClose,
}: Props) {
  const { date, period, cell } = target;
  const [classroomId, setClassroomId] = useState(
    cell?.classroomId ?? fixedClassroomId ?? classrooms[0]?.id ?? "",
  );
  const [subject, setSubject] = useState(cell?.subject ?? "");
  const [memo, setMemo] = useState(cell?.memo ?? "");
  const [isCancelled, setIsCancelled] = useState(cell?.isCancelled ?? false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Esc 키로 닫기
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const run = (action: () => Promise<ActionResult>, closeOnSuccess = true) => {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.error);
      else if (closeOnSuccess) onClose();
    });
  };

  /** 이 칸의 날짜로 차시 진도를 기록하거나 지운다. 창은 닫지 않는다. */
  const recordProgress = (lessonId: string, done: boolean) => {
    if (!cell) return;
    run(() => setLessonProgress({ classroomId: cell.classroomId, lessonId, done, date }), false);
  };
  const taughtToday = progressLink?.taught.filter((lesson) => lesson.date === date) ?? [];

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    run(() => saveTimetableOverride({ classroomId, date, period, subject, memo, isCancelled }));
  };

  const canChooseClassroom = cell === null && fixedClassroomId === null;
  const selectedClassroom = classrooms.find((classroom) => classroom.id === classroomId);
  const title = `${weekdayLabel(date)}요일(${shortDate(date)}) ${period}교시`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${title} 수정`}
        className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-stone-900">{title}</h2>
        <p className="mt-1 text-sm text-stone-500">
          {cell?.neisSubject
            ? `NEIS 원본: ${cell.neisSubject}`
            : "NEIS 시간표에 없는 칸입니다. 직접 추가할 수 있습니다."}
        </p>

        {cell && progressLink && !cell.isCancelled && (
          <section
            aria-label="진도"
            className="mt-4 space-y-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3"
          >
            <h3 className="text-sm font-semibold text-emerald-900">
              {progressLink.subjectName} 진도
            </h3>
            {taughtToday.map((lesson) => (
              <p key={lesson.lessonId} className="flex items-start justify-between gap-2 text-sm">
                <span className="text-stone-900">✓ {lesson.label}</span>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => recordProgress(lesson.lessonId, false)}
                  className="shrink-0 text-xs font-medium text-stone-600 underline-offset-2 hover:underline disabled:opacity-50"
                >
                  기록 취소
                </button>
              </p>
            ))}
            {progressLink.nextLesson ? (
              <p className="flex items-start justify-between gap-2 text-sm">
                <span className="text-stone-700">다음: {progressLink.nextLesson.label}</span>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => recordProgress(progressLink.nextLesson!.lessonId, true)}
                  className="shrink-0 rounded-lg bg-emerald-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                >
                  수업함으로 기록
                </button>
              </p>
            ) : (
              <p className="text-sm text-stone-600">모든 차시를 마쳤습니다.</p>
            )}
          </section>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="cell-classroom" className={labelClass}>
              학급
            </label>
            {canChooseClassroom ? (
              <select
                id="cell-classroom"
                value={classroomId}
                onChange={(event) => setClassroomId(event.target.value)}
                className={inputClass}
              >
                {classrooms.map((classroom) => (
                  <option key={classroom.id} value={classroom.id}>
                    {classroomLabel(classroom)}
                  </option>
                ))}
              </select>
            ) : (
              <p id="cell-classroom" className="text-sm font-medium text-stone-900">
                {selectedClassroom ? classroomLabel(selectedClassroom) : "-"}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="cell-subject" className={labelClass}>
              과목
            </label>
            <input
              id="cell-subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              list="subject-options"
              maxLength={30}
              required
              autoFocus
              placeholder="예: 영어"
              className={inputClass}
            />
            <datalist id="subject-options">
              {COMMON_SUBJECTS.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </div>

          <div>
            <label htmlFor="cell-memo" className={labelClass}>
              메모 (선택)
            </label>
            <input
              id="cell-memo"
              value={memo}
              onChange={(event) => setMemo(event.target.value)}
              maxLength={200}
              placeholder="예: 3반과 교환 수업"
              className={inputClass}
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              checked={isCancelled}
              onChange={(event) => setIsCancelled(event.target.checked)}
              className="h-4 w-4 accent-emerald-700"
            />
            이 시간은 수업 없음 (행사·결강 등)
          </label>

          {error && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button type="submit" disabled={isPending} className={primaryButtonClass}>
              {isPending ? "저장 중…" : "저장"}
            </button>
            <button type="button" onClick={onClose} className={secondaryButtonClass}>
              닫기
            </button>
            {cell?.overrideId && (
              <button
                type="button"
                disabled={isPending}
                onClick={() => run(() => resetTimetableOverride(cell.overrideId!))}
                className="ml-auto text-sm font-medium text-red-700 underline-offset-2 hover:underline disabled:opacity-50"
              >
                {cell.neisSubject ? "NEIS 원본으로 되돌리기" : "추가한 수업 삭제"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
