"use client";

import { useState, useTransition } from "react";
import type { ActionResult } from "@/lib/action-result";
import { deleteTextbookVersion, importTextbookVersion } from "./actions";

type Props = {
  versionId: string;
  /** 내가 올린 공유본이면 삭제 버튼을 보여 준다. */
  canDelete: boolean;
};

/** 자료실 내용 1건의 "불러오기"·"삭제" 버튼 */
export function VersionButtons({ versionId, canDelete }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const run = (action: () => Promise<ActionResult>) => {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.error);
    });
  };

  const handleDelete = () => {
    if (window.confirm("내가 올린 공유본을 자료실에서 삭제할까요?\n이미 불러간 선생님의 과목에는 영향이 없습니다.")) {
      run(() => deleteTextbookVersion(versionId));
    }
  };

  return (
    <span className="flex shrink-0 items-center gap-3">
      {error && (
        <span role="alert" className="text-xs text-red-700">
          {error}
        </span>
      )}
      {canDelete && (
        <button
          type="button"
          disabled={isPending}
          onClick={handleDelete}
          className="text-xs font-medium text-stone-500 underline-offset-2 hover:text-red-700 hover:underline disabled:opacity-50"
        >
          삭제
        </button>
      )}
      <button
        type="button"
        disabled={isPending}
        onClick={() => run(() => importTextbookVersion(versionId))}
        className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
      >
        {isPending ? "불러오는 중…" : "불러오기"}
      </button>
    </span>
  );
}
