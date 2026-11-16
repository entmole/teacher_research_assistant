"use client";

import { useRef, useState } from "react";
import { correctCommentStyle } from "@/features/ai/actions";
import { MAX_COMMENTS_PER_REQUEST } from "@/features/ai/types";
import { secondaryButtonClass } from "@/lib/ui";
import { saveResult } from "./actions";
import { countGrades, toClipboardText, toCsv } from "./summary";
import { GRADES, MAX_COMMENT_LENGTH, type Grade, type StudentResult } from "./types";

type SaveStatus = "saving" | "saved" | "error";
type Notice = { kind: "info" | "error"; text: string };

type Props = {
  assessmentId: string;
  initialResults: StudentResult[];
  /** 학급 이름 (예: 5-1). 내보내는 파일의 학급 칸에 들어간다. */
  classLabel: string;
  /** 내보내는 파일 이름 (확장자 제외) */
  exportFileName: string;
  /** 교사가 AI 모드를 켰는지. 꺼져 있으면 문체 교정 버튼을 보여 주지 않는다. */
  aiEnabled: boolean;
};

const GRADE_ACTIVE_CLASS: Record<Grade, string> = {
  A: "bg-emerald-600 text-white border-emerald-600",
  B: "bg-sky-600 text-white border-sky-600",
  C: "bg-amber-500 text-white border-amber-500",
};

const smallLinkButtonClass =
  "text-xs font-medium text-emerald-800 underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:text-stone-400 disabled:no-underline";

/**
 * 학생 번호별 등급·코멘트 입력표.
 * 등급은 누르는 즉시, 코멘트는 입력 칸을 벗어날 때 저장한다.
 * AI 모드가 켜져 있으면 코멘트의 문체 교정 제안을 받아 확인 후 적용할 수 있다.
 */
export function ResultsTable({
  assessmentId,
  initialResults,
  classLabel,
  exportFileName,
  aiEnabled,
}: Props) {
  const [results, setResults] = useState(initialResults);
  const [statusByStudent, setStatusByStudent] = useState<Record<string, SaveStatus>>({});
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  // AI 가 제안한 교정문 (학생별). 교사가 적용하기 전까지는 저장되지 않는다.
  const [suggestions, setSuggestions] = useState<Record<string, string>>({});
  const [isCorrecting, setIsCorrecting] = useState(false);
  const [aiNotice, setAiNotice] = useState<Notice | null>(null);
  // 마지막으로 저장된 값. 바뀐 내용이 없으면 저장 요청을 보내지 않는다.
  const savedRef = useRef(new Map(initialResults.map((result) => [result.studentId, result])));

  const counts = countGrades(results);
  const commentedResults = results.filter((result) => result.comment.trim() !== "");
  const suggestionCount = Object.keys(suggestions).length;

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

  /** 현재 화면의 결과를 엑셀에서 열 수 있는 CSV 파일로 내려받는다. */
  const handleDownload = () => {
    const blob = new Blob([toCsv(classLabel, results)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${exportFileName}.csv`;
    // 일부 브라우저는 문서에 붙어 있는 링크만 파일 이름을 인정한다.
    document.body.appendChild(link);
    link.click();
    link.remove();
    // 내려받기가 시작된 뒤에 주소를 해제한다.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  /** 선택한 코멘트들의 문체 교정 제안을 한 번의 요청으로 받아 온다. */
  const requestCorrections = async (targets: StudentResult[]) => {
    if (targets.length === 0 || isCorrecting) return;
    if (targets.length > MAX_COMMENTS_PER_REQUEST) {
      setAiNotice({
        kind: "error",
        text: `한 번에 ${MAX_COMMENTS_PER_REQUEST}개까지 교정할 수 있습니다.`,
      });
      return;
    }

    setIsCorrecting(true);
    setAiNotice(null);
    const response = await correctCommentStyle(targets.map((target) => target.comment));
    setIsCorrecting(false);

    if (!response.ok) {
      setAiNotice({ kind: "error", text: response.error });
      return;
    }
    // 원문과 달라진 것만 제안으로 보여 준다.
    const changed = targets.flatMap((target, index) =>
      response.comments[index] !== target.comment.trim()
        ? [[target.studentId, response.comments[index]] as const]
        : [],
    );
    setSuggestions((current) => ({ ...current, ...Object.fromEntries(changed) }));
    setAiNotice({
      kind: "info",
      text:
        changed.length === 0
          ? "작성 방법에 이미 맞아 고칠 부분이 없습니다."
          : `교정 제안 ${changed.length}건을 확인한 뒤 적용해 주세요.`,
    });
  };

  const dismissSuggestion = (studentId: string) =>
    setSuggestions((current) => {
      const next = { ...current };
      delete next[studentId];
      return next;
    });

  const applySuggestion = (result: StudentResult) => {
    const comment = suggestions[result.studentId];
    if (comment === undefined) return;
    patchResult(result.studentId, { comment });
    dismissSuggestion(result.studentId);
    void persist({ ...result, comment });
  };

  const applyAllSuggestions = () => {
    results.filter((result) => suggestions[result.studentId] !== undefined).forEach(applySuggestion);
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
        <div className="flex flex-wrap items-center gap-2">
          {aiEnabled && (
            <button
              type="button"
              disabled={isCorrecting || commentedResults.length === 0}
              onClick={() => void requestCorrections(commentedResults)}
              className={secondaryButtonClass}
            >
              {isCorrecting ? "교정 중…" : "전체 문체 교정"}
            </button>
          )}
          <button type="button" onClick={handleCopy} className={secondaryButtonClass}>
            번호·등급·코멘트 복사
          </button>
          <button type="button" onClick={handleDownload} className={secondaryButtonClass}>
            엑셀용 CSV 내려받기
          </button>
        </div>
      </div>

      {copyMessage && (
        <p role="status" className="text-xs text-stone-600">
          {copyMessage}
        </p>
      )}

      {aiNotice && (
        <div
          role={aiNotice.kind === "error" ? "alert" : "status"}
          className={`flex flex-wrap items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm ${
            aiNotice.kind === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-900"
          }`}
        >
          <span>{aiNotice.text}</span>
          {suggestionCount > 1 && (
            <button type="button" onClick={applyAllSuggestions} className={smallLinkButtonClass}>
              제안 {suggestionCount}건 모두 적용
            </button>
          )}
        </div>
      )}

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
              const suggestion = suggestions[result.studentId];
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

                    {suggestion !== undefined && (
                      <div className="mx-2 mb-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                        <p className="text-xs font-semibold text-emerald-900">AI 교정 제안</p>
                        <p className="mt-1 text-sm text-stone-900">{suggestion}</p>
                        <div className="mt-2 flex gap-3">
                          <button
                            type="button"
                            onClick={() => applySuggestion(result)}
                            className={smallLinkButtonClass}
                          >
                            적용
                          </button>
                          <button
                            type="button"
                            onClick={() => dismissSuggestion(result.studentId)}
                            className="text-xs font-medium text-stone-600 underline-offset-2 hover:underline"
                          >
                            닫기
                          </button>
                        </div>
                      </div>
                    )}

                    <p className="flex items-center justify-between gap-2 px-2 text-xs text-stone-400">
                      <span
                        role={status === "error" ? "alert" : undefined}
                        className={status === "error" ? "text-red-700" : ""}
                      >
                        {status === "saving" && "저장 중…"}
                        {status === "saved" && "저장됨"}
                        {status === "error" && "저장 실패 — 다시 입력해 주세요"}
                      </span>
                      <span className="flex items-center gap-3">
                        {aiEnabled && (
                          <button
                            type="button"
                            disabled={isCorrecting || result.comment.trim() === ""}
                            onClick={() => void requestCorrections([result])}
                            aria-label={`${result.studentNumber}번 코멘트 문체 교정`}
                            className={smallLinkButtonClass}
                          >
                            문체 교정
                          </button>
                        )}
                        <span>{result.comment.length}자</span>
                      </span>
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
