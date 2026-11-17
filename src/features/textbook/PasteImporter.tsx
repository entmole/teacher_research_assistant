"use client";

import { useMemo, useState, useTransition } from "react";
import { inputClass, labelClass, primaryButtonClass } from "@/lib/ui";
import { appendPastedUnits } from "./actions";
import {
  buildUnitsFromBlocks,
  buildUnitsFromColumns,
  columnCount,
  countLessons,
  guessColumns,
  isTabular,
  parseGrid,
} from "./parse";

const PREVIEW_UNIT_LIMIT = 4;
const PREVIEW_LESSON_LIMIT = 3;

type Message = { kind: "error" | "success"; text: string };

/** 진도표(엑셀 표 또는 텍스트)를 붙여넣어 단원·차시를 한꺼번에 추가한다. */
export function PasteImporter({ subjectId }: { subjectId: string }) {
  const [text, setText] = useState("");
  // 사용자가 직접 고른 열. 고르지 않았으면 자동 추측 값을 쓴다.
  const [chosenUnitColumn, setChosenUnitColumn] = useState<number | null>(null);
  const [chosenLessonColumn, setChosenLessonColumn] = useState<number | null>(null);
  const [skipFirstRow, setSkipFirstRow] = useState(true);
  const [message, setMessage] = useState<Message | null>(null);
  const [isPending, startTransition] = useTransition();

  const grid = useMemo(() => parseGrid(text), [text]);
  const tabular = isTabular(grid);
  const guessed = useMemo(() => guessColumns(grid), [grid]);
  const unitColumn = chosenUnitColumn ?? guessed.unitColumn;
  const lessonColumn = chosenLessonColumn ?? guessed.lessonColumn;

  const units = useMemo(
    () =>
      tabular
        ? buildUnitsFromColumns(grid, unitColumn, lessonColumn, skipFirstRow)
        : buildUnitsFromBlocks(text),
    [tabular, grid, unitColumn, lessonColumn, skipFirstRow, text],
  );

  // 열 선택 목록에 보여 줄 이름: 첫 줄(제목 줄)의 값
  const columnLabels = Array.from({ length: columnCount(grid) }, (_, index) => {
    const header = grid[0]?.[index] ?? "";
    return `${index + 1}열${header ? ` (${header.slice(0, 12)})` : ""}`;
  });

  const handleTextChange = (value: string) => {
    setText(value);
    setChosenUnitColumn(null);
    setChosenLessonColumn(null);
    setMessage(null);
  };

  const handleImport = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await appendPastedUnits({ subjectId, units });
      if (result.ok) {
        setText("");
        setMessage({ kind: "success", text: result.message ?? "추가했습니다." });
      } else {
        setMessage({ kind: "error", text: result.error });
      }
    });
  };

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="paste-schedule" className={labelClass}>
          진도표 붙여넣기
        </label>
        <textarea
          id="paste-schedule"
          value={text}
          onChange={(event) => handleTextChange(event.target.value)}
          rows={6}
          placeholder={
            "엑셀 진도표에서 단원과 차시가 들어 있는 칸을 복사해 붙여넣으세요.\n\n표가 아니라면: 단원 이름을 첫 줄에, 차시를 그 아래 한 줄씩 적고\n단원 사이에 빈 줄을 넣습니다."
          }
          className={`${inputClass} leading-6`}
        />
      </div>

      {tabular && (
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="paste-unit-column" className={labelClass}>
              단원 열
            </label>
            <select
              id="paste-unit-column"
              value={unitColumn}
              onChange={(event) => setChosenUnitColumn(Number(event.target.value))}
              className={`${inputClass} w-44!`}
            >
              {columnLabels.map((label, index) => (
                <option key={index} value={index}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="paste-lesson-column" className={labelClass}>
              차시 열
            </label>
            <select
              id="paste-lesson-column"
              value={lessonColumn}
              onChange={(event) => setChosenLessonColumn(Number(event.target.value))}
              className={`${inputClass} w-44!`}
            >
              {columnLabels.map((label, index) => (
                <option key={index} value={index}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 pb-2 text-sm text-stone-700">
            <input
              type="checkbox"
              checked={skipFirstRow}
              onChange={(event) => setSkipFirstRow(event.target.checked)}
              className="h-4 w-4 accent-emerald-700"
            />
            첫 줄은 제목 줄
          </label>
        </div>
      )}

      {units.length > 0 && (
        <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-3 text-sm">
          <p className="font-semibold text-stone-900">
            미리 보기: 단원 {units.length}개, 차시 {countLessons(units)}개
          </p>
          <ol className="mt-2 space-y-1.5">
            {units.slice(0, PREVIEW_UNIT_LIMIT).map((unit, index) => (
              <li key={index}>
                <span className="font-medium text-stone-900">{unit.title}</span>
                <span className="ml-2 text-xs text-stone-500">{unit.lessons.length}차시</span>
                <span className="block truncate text-xs text-stone-600">
                  {unit.lessons.slice(0, PREVIEW_LESSON_LIMIT).join(" · ")}
                  {unit.lessons.length > PREVIEW_LESSON_LIMIT ? " …" : ""}
                </span>
              </li>
            ))}
          </ol>
          {units.length > PREVIEW_UNIT_LIMIT && (
            <p className="mt-1.5 text-xs text-stone-500">
              … 외 단원 {units.length - PREVIEW_UNIT_LIMIT}개
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={isPending || units.length === 0}
          onClick={handleImport}
          className={primaryButtonClass}
        >
          {isPending ? "추가 중…" : "이 과목에 추가"}
        </button>
        {text.trim() !== "" && units.length === 0 && (
          <p className="text-sm text-stone-600">단원을 찾지 못했습니다. 열 선택을 확인해 주세요.</p>
        )}
        {message && (
          <p
            role={message.kind === "error" ? "alert" : "status"}
            className={`text-sm ${message.kind === "error" ? "text-red-700" : "text-emerald-700"}`}
          >
            {message.text}
          </p>
        )}
      </div>
    </div>
  );
}
