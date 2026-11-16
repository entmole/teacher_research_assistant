"use client";

import { useState } from "react";
import { shortDate, weekdayLabel, type IsoDate } from "@/lib/date";
import type { SchoolEvent } from "@/features/schedule/types";
import { CellEditor, type EditTarget } from "./CellEditor";
import { subjectColorClass } from "./subject-color";
import { classroomLabel, slotKey, type ClassroomRef, type TimetableCell } from "./types";

const MIN_PERIODS = 6;

type Props = {
  days: IsoDate[];
  today: IsoDate;
  cells: TimetableCell[];
  events: SchoolEvent[];
  classrooms: ClassroomRef[];
  /** 한 학급만 보는 중이면 그 학급 id, 여러 학급을 함께 보면 null */
  fixedClassroomId: string | null;
};

function groupBy<T>(items: T[], getKey: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = getKey(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return groups;
}

/** 주간 시간표 격자. 칸을 누르면 수정 창이 열린다. */
export function WeekGrid({ days, today, cells, events, classrooms, fixedClassroomId }: Props) {
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);

  const cellsBySlot = groupBy(cells, (cell) => slotKey(cell.date, cell.period));
  const eventsByDate = groupBy(events, (event) => event.date);
  const lastPeriod = Math.max(MIN_PERIODS, ...cells.map((cell) => cell.period));
  const periods = Array.from({ length: lastPeriod }, (_, index) => index + 1);
  const showClassLabel = fixedClassroomId === null;

  return (
    <>
      <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
        <table className="w-full min-w-[640px] table-fixed border-collapse text-sm">
          <thead>
            <tr>
              <th className="w-12 border-b border-stone-200 bg-stone-50 p-2 text-xs font-medium text-stone-500">
                교시
              </th>
              {days.map((date) => {
                const dayEvents = eventsByDate.get(date) ?? [];
                const isDayOff = dayEvents.some((event) => event.isDayOff);
                return (
                  <th
                    key={date}
                    className={`border-b border-l border-stone-200 p-2 align-top font-normal ${
                      isDayOff ? "bg-red-50" : "bg-stone-50"
                    }`}
                  >
                    <div className="flex items-baseline justify-center gap-1.5">
                      <span
                        className={`font-semibold ${isDayOff ? "text-red-700" : "text-stone-900"}`}
                      >
                        {weekdayLabel(date)}
                      </span>
                      <span
                        className={
                          date === today
                            ? "rounded-full bg-emerald-700 px-2 py-0.5 text-xs font-semibold text-white"
                            : "text-xs text-stone-500"
                        }
                      >
                        {shortDate(date)}
                      </span>
                    </div>
                    {dayEvents.length > 0 && (
                      <ul className="mt-1.5 space-y-1">
                        {dayEvents.map((event) => (
                          <li
                            key={event.key}
                            title={event.title}
                            className={`truncate rounded px-1.5 py-0.5 text-xs ${
                              event.isDayOff
                                ? "bg-red-100 text-red-800"
                                : event.customId
                                  ? "bg-emerald-100 text-emerald-900"
                                  : "bg-amber-100 text-amber-900"
                            }`}
                          >
                            {event.title}
                          </li>
                        ))}
                      </ul>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {periods.map((period) => (
              <tr key={period}>
                <th className="border-b border-stone-200 bg-stone-50 p-2 text-sm font-semibold text-stone-600">
                  {period}
                </th>
                {days.map((date) => {
                  const slotCells = cellsBySlot.get(slotKey(date, period)) ?? [];
                  return (
                    <td
                      key={date}
                      className="h-16 border-b border-l border-stone-200 p-1 align-top"
                    >
                      <div className="flex h-full flex-col gap-1">
                        {slotCells.map((cell) => (
                          <LessonButton
                            key={cell.classroomId}
                            cell={cell}
                            showClassLabel={showClassLabel}
                            onClick={() => setEditTarget({ date, period, cell })}
                          />
                        ))}
                        {slotCells.length === 0 && (
                          <button
                            type="button"
                            onClick={() => setEditTarget({ date, period, cell: null })}
                            aria-label={`${weekdayLabel(date)}요일 ${period}교시 수업 추가`}
                            className="h-full min-h-12 w-full rounded-lg text-lg text-transparent hover:bg-stone-50 hover:text-stone-400 focus-visible:text-stone-400 focus-visible:outline-2 focus-visible:outline-emerald-700"
                          >
                            +
                          </button>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editTarget && (
        <CellEditor
          // 다른 칸을 열면 입력 상태를 초기화한다.
          key={`${slotKey(editTarget.date, editTarget.period)}|${editTarget.cell?.classroomId ?? "new"}`}
          target={editTarget}
          classrooms={classrooms}
          fixedClassroomId={fixedClassroomId}
          onClose={() => setEditTarget(null)}
        />
      )}
    </>
  );
}

function LessonButton({
  cell,
  showClassLabel,
  onClick,
}: {
  cell: TimetableCell;
  showClassLabel: boolean;
  onClick: () => void;
}) {
  const colorClass = cell.isCancelled
    ? "bg-stone-100 text-stone-400 border-stone-200"
    : subjectColorClass(cell.subject);

  return (
    <button
      type="button"
      onClick={onClick}
      title={cell.subject}
      className={`relative w-full flex-1 rounded-lg border px-2 py-1.5 text-left hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-emerald-700 ${colorClass}`}
    >
      {cell.overrideId && (
        <span
          title="직접 수정한 칸"
          className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-emerald-600"
        />
      )}
      <span className="flex items-baseline gap-1.5">
        {showClassLabel && (
          <span className="shrink-0 text-xs font-semibold opacity-70">{classroomLabel(cell)}</span>
        )}
        <span className={`truncate font-semibold ${cell.isCancelled ? "line-through" : ""}`}>
          {cell.subject}
        </span>
      </span>
      {(cell.isCancelled || cell.memo) && (
        <span className="mt-0.5 block truncate text-xs opacity-80">
          {cell.isCancelled ? `수업 없음${cell.memo ? ` · ${cell.memo}` : ""}` : cell.memo}
        </span>
      )}
    </button>
  );
}
