"use client";

import { useRef, useState } from "react";
import { secondaryButtonClass } from "@/lib/ui";
import { saveResult } from "./actions";
import { countGrades, toClipboardText } from "./summary";
import { GRADES, MAX_COMMENT_LENGTH, type Grade, type StudentResult } from "./types";

type SaveStatus = "saving" | "saved" | "error";

type Props = {
  assessmentId: string;
  initialResults: StudentResult[];
};

const GRADE_ACTIVE_CLASS: Record<Grade, string> = {
  A: "bg-emerald-600 text-white border-emerald-600",
  B: "bg-sky-600 text-white border-sky-600",
  C: "bg-amber-500 text-white border-amber-500",
};

/** 학생 번호별 등급·코멘트 입력표. 등급은 누르는 즉시, 코멘트는 입력 칸을 벗어날 때 저장한다. */
export function ResultsTable({ assessmentId, initialResults }: Props) {
  const [results, setResults] = useState(initialResults);
  const [statusByStudent, setStatusByStudent] = useState<Record<string, SaveStatus>>({});
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  // 마지막으로 저장된 값. 바뀐 내용이 없으면 저장 요청을 보내지 않는다.
  const savedRef = useRef(new Map(initialResults.map((result) => [result.studentId, result])));

  const counts = countGrades(results);

  const patchResult = (studentId: string, patch: Partial<StudentResult>) =>
    setResults((current) =>
      current.map((result) => (result.studentId === studentId ? { ...result, ...patch } : result)),
    );

  const persist = async (result: StudentResult) => {
    const saved = savedRef.current.get(result.studentId);
    if (saved && saved.grade === result.grade && saved.comment.trim() === result.comment.trim()) {
      return;
    }
    setStatusByStudent((current) => ({ ...current, [result.studentId]: "saving" }));
    const response = await saveResult({
      assessmentId,
      studentId: result.studentId,
      grade: result.grade,
      comment: result.comment,
    });
    if (response.ok) savedRef.current.set(result.studentId, result);
    setStatusByStudent((current) => ({
      ...current,
      [result.studentId]: response.ok ? "saved" : "error",
    }));
  };

  const handleGradeClick = (result: StudentResult, grade: Grade) => {
    // 같은 등급을 다시 누르면 선택을 해제한다.
    const next = { ...result, grade: result.grade === grade ? null : grade };
    patchResult(result.studentId, { grade: next.grade });
    void persist(next);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(toClipboardText(results));
      setCopyMessage("복사했습니다. 엑셀이나 나이스에 붙여넣으세요.");
    } catch {
      setCopyMessage("복사하지 못했습니다. 브라우저의 클립보드 권한을 확인해 주세요.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <dl className="flex flex-wrap gap-2 text-sm">
          {GRADES.map((grade) => (
            <div key={grade} className="rounded-lg border border-stone-200 bg-white px-3 py-1.5">
              <dt className="inline font-bold text-stone-900">{grade}</dt>
              <dd className="ml-1.5 inline text-stone-700">{counts[grade]}명</dd>
            </div>
          ))}
          <div className="rounded-lg border border-stone-200 bg-white px-3 py-1.5">
            <dt className="inline text-stone-600">미입력</dt>
            <dd className="ml-1.5 inline text-stone-700">{counts.ungraded}명</dd>
          </div>
        </dl>
        <div className="flex items-center gap-3">
          {copyMessage && (
            <p role="status" className="text-xs text-stone-600">
              {copyMessage}
            </p>
          )}
          <button type="button" onClick={handleCopy} className={secondaryButtonClass}>
            번호·등급·코멘트 복사
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-stone-50 text-xs font-medium text-stone-500">
              <th className="w-12 border-b border-stone-200 px-2 py-2">번호</th>
              <th className="w-32 border-b border-l border-stone-200 px-2 py-2">등급</th>
              <th className="border-b border-l border-stone-200 px-3 py-2 text-left">
                생기부 코멘트
              </th>
            </tr>
          </thead>
          <tbody>
            {results.map((result) => {
              const status = statusByStudent[result.studentId];
              return (
                <tr key={result.studentId}>
                  <th className="border-b border-stone-200 px-2 py-2 align-top font-semibold text-stone-700">
                    {result.studentNumber}
                  </th>
                  <td className="border-b border-l border-stone-200 px-2 py-2 align-top">
                    <div
                      role="group"
                      aria-label={`${result.studentNumber}번 등급`}
                      className="flex justify-center gap-1"
                    >
                      {GRADES.map((grade) => {
                        const isSelected = result.grade === grade;
                        return (
                          <button
                            key={grade}
                            type="button"
                            aria-pressed={isSelected}
                            onClick={() => handleGradeClick(result, grade)}
                            className={`h-9 w-9 rounded-lg border text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-emerald-700 ${
                              isSelected
                                ? GRADE_ACTIVE_CLASS[grade]
                                : "border-stone-300 bg-white text-stone-500 hover:bg-stone-50"
                            }`}
                          >
                            {grade}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                  <td className="border-b border-l border-stone-200 px-2 py-2">
                    <textarea
                      aria-label={`${result.studentNumber}번 생기부 코멘트`}
                      value={result.comment}
                      onChange={(event) =>
                        patchResult(result.studentId, { comment: event.target.value })
                      }
                      onBlur={() => void persist(result)}
                      rows={2}
                      maxLength={MAX_COMMENT_LENGTH}
                      className="w-full resize-y rounded-lg border border-transparent px-2 py-1 text-sm text-stone-900 hover:border-stone-200 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                    />
                    <p className="flex justify-between px-2 text-xs text-stone-400">
                      <span
                        role={status === "error" ? "alert" : undefined}
                        className={status === "error" ? "text-red-700" : ""}
                      >
                        {status === "saving" && "저장 중…"}
                        {status === "saved" && "저장됨"}
                        {status === "error" && "저장 실패 — 다시 입력해 주세요"}
                      </span>
                      <span>{result.comment.length}자</span>
                    </p>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
