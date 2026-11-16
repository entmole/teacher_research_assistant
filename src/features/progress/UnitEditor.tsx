"use client";

import { useState, useTransition, type FormEvent } from "react";
import type { ActionResult } from "@/lib/action-result";
import { inputClass, labelClass, primaryButtonClass } from "@/lib/ui";
import { deleteUnit, saveUnit } from "./actions";
import { parseLessonLines } from "./summary";
import type { Unit } from "./types";

type Props = {
  subjectId: string;
  /** 기존 단원을 고치면 그 단원, 새 단원을 추가하면 null */
  unit: Unit | null;
  /** 화면에 표시할 단원 번호 */
  unitNo: number;
};

type Message = { kind: "error" | "success"; text: string };

/** 단원 이름과 차시 목록(한 줄에 하나)을 편집한다. */
export function UnitEditor({ subjectId, unit, unitNo }: Props) {
  const savedLessonCount = unit?.lessons.length ?? 0;
  const [title, setTitle] = useState(unit?.title ?? "");
  const [lessonsText, setLessonsText] = useState(
    unit?.lessons.map((lesson) => lesson.title).join("\n") ?? "",
  );
  const [message, setMessage] = useState<Message | null>(null);
  const [isPending, startTransition] = useTransition();

  const lessonCount = parseLessonLines(lessonsText).length;
  const removedCount = Math.max(0, savedLessonCount - lessonCount);
  const fieldId = unit?.id ?? "new";

  const run = (action: () => Promise<ActionResult>, onSuccess: (message?: string) => void) => {
    setMessage(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) onSuccess(result.message);
      else setMessage({ kind: "error", text: result.error });
    });
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (removedCount > 0) {
      const confirmed = window.confirm(
        `차시가 ${removedCount}개 줄어듭니다.\n뒤쪽 ${removedCount}개 차시와 그 진도 기록이 삭제됩니다. 계속할까요?`,
      );
      if (!confirmed) return;
    }
    run(
      () => saveUnit({ subjectId, unitId: unit?.id ?? null, title, lessonsText }),
      (text) => {
        if (unit) {
          setMessage({ kind: "success", text: text ?? "저장했습니다." });
        } else {
          // 새 단원은 목록에 추가되므로 입력 칸을 비운다.
          setTitle("");
          setLessonsText("");
        }
      },
    );
  };

  const handleDelete = () => {
    if (!unit) return;
    const confirmed = window.confirm(
      `${unitNo}단원 "${unit.title}"을(를) 삭제할까요?\n차시와 진도 기록도 함께 삭제됩니다.`,
    );
    if (confirmed) run(() => deleteUnit(unit.id), () => undefined);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label htmlFor={`unit-title-${fieldId}`} className={labelClass}>
          {unitNo}단원 이름
        </label>
        <input
          id={`unit-title-${fieldId}`}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
          maxLength={60}
          placeholder="예: Where Is the Post Office?"
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor={`unit-lessons-${fieldId}`} className={labelClass}>
          차시 (한 줄에 하나씩, 현재 {lessonCount}차시)
        </label>
        <textarea
          id={`unit-lessons-${fieldId}`}
          value={lessonsText}
          onChange={(event) => setLessonsText(event.target.value)}
          rows={Math.min(12, Math.max(4, lessonCount + 1))}
          placeholder={"예:\n길 묻고 답하는 말 듣기\n길 묻고 답하는 말 하기"}
          className={`${inputClass} font-normal leading-6`}
        />
        <p className="mt-1 text-xs text-stone-500">
          줄 순서가 차시 순서입니다. 같은 줄의 제목만 고치면 진도 기록은 유지됩니다.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={isPending} className={primaryButtonClass}>
          {isPending ? "저장 중…" : unit ? "저장" : "단원 추가"}
        </button>
        {message && (
          <p
            role={message.kind === "error" ? "alert" : "status"}
            className={`text-sm ${message.kind === "error" ? "text-red-700" : "text-emerald-700"}`}
          >
            {message.text}
          </p>
        )}
        {unit && (
          <button
            type="button"
            disabled={isPending}
            onClick={handleDelete}
            className="ml-auto text-sm font-medium text-red-700 underline-offset-2 hover:underline disabled:opacity-50"
          >
            단원 삭제
          </button>
        )}
      </div>
    </form>
  );
}
