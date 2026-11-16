"use client";

import { useState, useTransition, type FormEvent } from "react";
import { inputClass, secondaryButtonClass } from "@/lib/ui";
import { setExcludedNumbers } from "./actions";

type Props = {
  classroomId: string;
  /** 현재 결번으로 표시한 번호 */
  excludedNumbers: number[];
};

/** 결번(전출 등) 번호 설정 */
export function ExcludedNumbersForm({ classroomId, excludedNumbers }: Props) {
  const [numbersText, setNumbersText] = useState(excludedNumbers.join(", "));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await setExcludedNumbers({ classroomId, numbersText });
      if (!result.ok) setError(result.error);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
      <label htmlFor="excluded-numbers" className="text-sm font-medium text-stone-700">
        결번
      </label>
      <input
        id="excluded-numbers"
        value={numbersText}
        onChange={(event) => setNumbersText(event.target.value)}
        inputMode="numeric"
        placeholder="예: 7, 15"
        className={`${inputClass} w-40!`}
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
