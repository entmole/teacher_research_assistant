"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteAssessment } from "./actions";

type Props = {
  assessmentId: string;
  title: string;
  /** 삭제 후 돌아갈 주소 */
  returnHref: string;
};

/** 평가 삭제 버튼 (확인 후 삭제) */
export function DeleteAssessmentButton({ assessmentId, title, returnHref }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    const confirmed = window.confirm(
      `"${title}" 평가를 삭제할까요?\n모든 학급의 등급과 코멘트가 함께 삭제됩니다.`,
    );
    if (!confirmed) return;

    setError(null);
    startTransition(async () => {
      const result = await deleteAssessment(assessmentId);
      if (result.ok) router.replace(returnHref);
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
        평가 삭제
      </button>
    </span>
  );
}
