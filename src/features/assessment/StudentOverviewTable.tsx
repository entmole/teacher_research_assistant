"use client";

import { useState } from "react";
import { secondaryButtonClass } from "@/lib/ui";
import {
  overviewToClipboardText,
  type OverviewAssessment,
  type StudentOverviewRow,
} from "./overview";
import type { Grade } from "./types";

type Props = {
  assessments: OverviewAssessment[];
  rows: StudentOverviewRow[];
};

const GRADE_CLASS: Record<Grade, string> = {
  A: "bg-emerald-100 text-emerald-900",
  B: "bg-sky-100 text-sky-900",
  C: "bg-amber-100 text-amber-900",
};

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** 학생 번호 × 평가 표. 학생을 누르면 그 학생의 코멘트를 모아 보여 준다. */
export function StudentOverviewTable({ assessments, rows }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const selected = rows.find((row) => row.studentId === selectedId) ?? null;

  const handleCopy = async (text: string, successMessage: string) => {
    const copied = await copyText(text);
    setMessage(
      copied ? successMessage : "복사하지 못했습니다. 브라우저의 클립보드 권한을 확인해 주세요.",
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-stone-600">번호를 누르면 그 학생의 코멘트를 모아 봅니다.</p>
        <button
          type="button"
          onClick={() =>
            handleCopy(
              overviewToClipboardText(rows),
              "복사했습니다. 엑셀이나 나이스에 붙여넣으세요.",
            )
          }
          className={secondaryButtonClass}
        >
          번호·종합 코멘트 전체 복사
        </button>
      </div>
      {message && (
        <p role="status" className="text-xs text-stone-600">
          {message}
        </p>
      )}

      <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-stone-50 text-xs font-medium text-stone-600">
              <th className="sticky left-0 z-10 w-14 border-b border-stone-200 bg-stone-50 px-2 py-2">
                번호
              </th>
              {assessments.map((assessment) => (
                <th
                  key={assessment.id}
                  className="min-w-24 border-b border-l border-stone-200 px-2 py-2 align-bottom font-medium"
                >
                  <span className="block text-stone-400">{assessment.subjectName}</span>
                  <span className="block text-stone-800">{assessment.title}</span>
                </th>
              ))}
              <th className="w-16 border-b border-l border-stone-200 px-2 py-2">코멘트</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isSelected = row.studentId === selectedId;
              return (
                <tr key={row.studentId} className={isSelected ? "bg-emerald-50" : undefined}>
                  <th
                    className={`sticky left-0 z-10 border-b border-stone-200 p-1 ${
                      isSelected ? "bg-emerald-50" : "bg-white"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedId(isSelected ? null : row.studentId)}
                      aria-expanded={isSelected}
                      aria-label={`${row.studentNumber}번 코멘트 모아 보기`}
                      className="h-8 w-full rounded-lg font-semibold text-stone-800 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-emerald-700"
                    >
                      {row.studentNumber}
                    </button>
                  </th>
                  {row.grades.map((grade, index) => (
                    <td
                      key={assessments[index].id}
                      className="border-b border-l border-stone-200 px-2 py-1 text-center"
                    >
                      {grade ? (
                        <span
                          className={`inline-flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${GRADE_CLASS[grade]}`}
                        >
                          {grade}
                        </span>
                      ) : (
                        <span className="text-stone-300">–</span>
                      )}
                    </td>
                  ))}
                  <td className="border-b border-l border-stone-200 px-2 py-1 text-center text-xs text-stone-600">
                    {row.comments.length > 0 ? `${row.comments.length}건` : "–"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selected && (
        <section
          aria-label={`${selected.studentNumber}번 코멘트`}
          className="rounded-2xl border border-emerald-200 bg-white p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-stone-900">
              {selected.studentNumber}번 코멘트 모음
            </h2>
            <button
              type="button"
              disabled={selected.comments.length === 0}
              onClick={() => handleCopy(selected.combinedComment, "이 학생의 코멘트를 복사했습니다.")}
              className={secondaryButtonClass}
            >
              이어 붙여 복사
            </button>
          </div>
          {selected.comments.length === 0 ? (
            <p className="mt-3 text-sm text-stone-500">입력한 코멘트가 없습니다.</p>
          ) : (
            <>
              <ul className="mt-3 space-y-2">
                {selected.comments.map((item, index) => (
                  <li key={index} className="text-sm">
                    <span className="block text-xs text-stone-500">
                      {item.subjectName} · {item.assessmentTitle}
                    </span>
                    <span className="text-stone-900">{item.comment}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-stone-500">
                이어 붙이면 {selected.combinedComment.length}자입니다.
              </p>
            </>
          )}
        </section>
      )}
    </div>
  );
}
