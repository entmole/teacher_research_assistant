"use client";

import { useState, useTransition } from "react";
import { importSubjectFromLastYear } from "./actions";
import { subjectLabel, type SubjectRef } from "./types";

/** 지난 학년도 과목을 올해로 가져오는 버튼 */
export function ImportSubjectButton({ subject }: { subject: SubjectRef }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    setError(null);
    startTransition(async () => {
      const result = await importSubjectFromLastYear(subject.id);
      if (!result.ok) setError(result.error);
    });
  };

  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        disabled={isPending}
        onClick={handleClick}
        className="rounded-full border border-stone-300 bg-white px-3 py-1 text-sm text-stone-700 hover:border-emerald-600 hover:text-emerald-800 disabled:opacity-50"
      >
        {isPending ? "가져오는 중…" : `+ ${subjectLabel(subject)}`}
      </button>
      {error && (
        <span role="alert" className="text-xs text-red-700">
          {error}
        </span>
      )}
    </span>
  );
}
