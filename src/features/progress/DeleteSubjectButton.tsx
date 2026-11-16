"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteSubject } from "./actions";
import { subjectLabel, type SubjectRef } from "./types";

/** 과목 삭제 버튼 (확인 후 삭제) */
export function DeleteSubjectButton({ subject }: { subject: SubjectRef }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    const confirmed = window.confirm(
      `${subjectLabel(subject)} 과목을 삭제할까요?\n단원·차시와 모든 학급의 진도 기록이 함께 삭제됩니다.`,
    );
    if (!confirmed) return;

    setError(null);
    startTransition(async () => {
      const result = await deleteSubject(subject.id);
      if (result.ok) router.replace("/progress/curriculum");
      else setError(result.error);
    });
  };

  return (
    <span className="inline-flex items-center gap-2">
      {error && (
        <span role="alert" className="text-sm text-red-700">
          {error}
        </span>
      )}
      <button
        type="button"
        disabled={isPending}
        onClick={handleClick}
        className="text-sm font-medium text-red-700 underline-offset-2 hover:underline disabled:opacity-50"
      >
        과목 삭제
      </button>
    </span>
  );
}
