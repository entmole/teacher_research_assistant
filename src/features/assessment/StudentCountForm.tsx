"use client";

import { useState, useTransition, type FormEvent } from "react";
import { inputClass, secondaryButtonClass } from "@/lib/ui";
import { setStudentCount } from "./actions";
import { MAX_STUDENT_COUNT } from "./types";

type Props = {
  classroomId: string;
  classroomName: string;
  /** 현재 학생 수 (미설정이면 0) */
  currentCount: number;
};

/** 학급 학생 수 설정. 학생은 이름 없이 1번부터 번호로만 관리한다. */
export function StudentCountForm({ classroomId, classroomName, currentCount }: Props) {
  const [count, setCount] = useState(currentCount > 0 ? String(currentCount) : "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const nextCount = Number(count);
    if (nextCount < currentCount) {
      const confirmed = window.confirm(
        `${nextCount + 1}번부터 ${currentCount}번까지는 목록에서 숨겨집니다.\n입력한 결과는 지워지지 않으며, 학생 수를 다시 늘리면 보입니다. 계속할까요?`,
      );
      if (!confirmed) return;
    }
    setError(null);
    startTransition(async () => {
      const result = await setStudentCount({ classroomId, count: nextCount });
      if (!result.ok) setError(result.error);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
      <label htmlFor="student-count" className="text-sm font-medium text-stone-700">
        {classroomName} 학생 수
      </label>
      <input
        id="student-count"
        type="number"
        inputMode="numeric"
        min={1}
        max={MAX_STUDENT_COUNT}
        required
        value={count}
        onChange={(event) => setCount(event.target.value)}
        className={`${inputClass} w-24!`}
      />
      <button type="submit" disabled={isPending} className={secondaryButtonClass}>
        {isPending ? "저장 중…" : "적용"}
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </form>
  );
}
