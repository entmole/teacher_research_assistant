"use client";

import { Fragment, useOptimistic, useState, useTransition } from "react";
import { isIsoDate, shortDate, type IsoDate } from "@/lib/date";
import { classroomLabel, type ClassroomRef } from "@/features/timetable/types";
import { inputClass } from "@/lib/ui";
import { setLessonProgress } from "./actions";
import { summarizeProgress } from "./summary";
import { progressKey, type ProgressRecord, type Unit } from "./types";

type Props = {
  units: Unit[];
  classrooms: ClassroomRef[];
  records: ProgressRecord[];
  today: IsoDate;
};

type Toggle = { classroomId: string; lessonId: string; done: boolean; date: IsoDate };

function applyToggle(records: ProgressRecord[], toggle: Toggle): ProgressRecord[] {
  const others = records.filter(
    (r) => !(r.classroomId === toggle.classroomId && r.lessonId === toggle.lessonId),
  );
  return toggle.done
    ? [...others, { classroomId: toggle.classroomId, lessonId: toggle.lessonId, taughtOn: toggle.date }]
    : others;
}

/** 학급별 진도표. 칸을 누르면 해당 차시를 "수업함"으로 기록하거나 기록을 지운다. */
export function ProgressBoard({ units, classrooms, records, today }: Props) {
  const [recordDate, setRecordDate] = useState<IsoDate>(today);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  // 서버 응답을 기다리지 않고 화면에 바로 반영한다.
  const [optimisticRecords, addOptimisticToggle] = useOptimistic(records, applyToggle);

  const dateByKey = new Map(
    optimisticRecords.map((r) => [progressKey(r.classroomId, r.lessonId), r.taughtOn]),
  );
  const summaries = summarizeProgress(
    units,
    classrooms.map((classroom) => classroom.id),
    optimisticRecords,
  );

  const handleToggle = (classroomId: string, lessonId: string) => {
    if (!isIsoDate(recordDate)) {
      setError("기록 날짜를 선택해 주세요.");
      return;
    }
    const toggle: Toggle = {
      classroomId,
      lessonId,
      done: !dateByKey.has(progressKey(classroomId, lessonId)),
      date: recordDate,
    };
    setError(null);
    startTransition(async () => {
      addOptimisticToggle(toggle);
      const result = await setLessonProgress(toggle);
      if (!result.ok) setError(result.error);
    });
  };

  return (
    <div className="space-y-5">
      {/* 학급별 요약: 반별 진도 차이를 한눈에 비교한다. */}
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {summaries.map((summary, index) => {
          const percent =
            summary.totalCount === 0
              ? 0
              : Math.round((summary.doneCount / summary.totalCount) * 100);
          return (
            <li key={summary.classroomId} className="rounded-2xl border border-stone-200 bg-white p-4">
              <div className="flex items-baseline justify-between">
                <span className="text-base font-bold text-stone-900">
                  {classroomLabel(classrooms[index])}
                </span>
                <span className="text-sm text-stone-600">
                  {summary.doneCount} / {summary.totalCount}차시 ({percent}%)
                </span>
              </div>
              <div
                className="mt-2 h-2 overflow-hidden rounded-full bg-stone-100"
                role="progressbar"
                aria-valuenow={percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${classroomLabel(classrooms[index])} 진도율`}
              >
                <div className="h-full rounded-full bg-emerald-600" style={{ width: `${percent}%` }} />
              </div>
              <p className="mt-2 truncate text-xs text-stone-600">
                {summary.nextLesson
                  ? `다음: ${summary.nextLesson.unitNo}단원 ${summary.nextLesson.lessonNo}차시 · ${summary.nextLesson.title}`
                  : summary.totalCount > 0
                    ? "모든 차시를 마쳤습니다."
                    : "등록된 차시가 없습니다."}
              </p>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="record-date" className="text-sm font-medium text-stone-700">
          기록 날짜
        </label>
        <input
          id="record-date"
          type="date"
          value={recordDate}
          onChange={(event) => setRecordDate(event.target.value)}
          className={`${inputClass} w-44!`}
        />
        <p className="text-xs text-stone-500">칸을 누르면 이 날짜로 수업 완료를 기록합니다.</p>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 min-w-56 border-b border-stone-200 bg-stone-50 px-3 py-2 text-left text-xs font-medium text-stone-500">
                차시
              </th>
              {classrooms.map((classroom) => (
                <th
                  key={classroom.id}
                  className="w-20 min-w-20 border-b border-l border-stone-200 bg-stone-50 px-2 py-2 font-semibold text-stone-900"
                >
                  {classroomLabel(classroom)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {units.map((unit, unitIndex) => (
              <Fragment key={unit.id}>
                <tr>
                  <th
                    colSpan={classrooms.length + 1}
                    className="border-b border-stone-200 bg-emerald-50 px-3 py-2 text-left font-semibold text-emerald-900"
                  >
                    <span className="sticky left-3">
                      {unitIndex + 1}단원 · {unit.title}
                    </span>
                  </th>
                </tr>
                {unit.lessons.length === 0 && (
                  <tr>
                    <td
                      colSpan={classrooms.length + 1}
                      className="border-b border-stone-200 px-3 py-2 text-xs text-stone-500"
                    >
                      등록된 차시가 없습니다.
                    </td>
                  </tr>
                )}
                {unit.lessons.map((lesson, lessonIndex) => (
                  <tr key={lesson.id}>
                    <th className="sticky left-0 z-10 border-b border-stone-200 bg-white px-3 py-2 text-left font-normal text-stone-800">
                      <span className="mr-2 text-xs text-stone-500">{lessonIndex + 1}</span>
                      {lesson.title}
                    </th>
                    {classrooms.map((classroom) => {
                      const taughtOn = dateByKey.get(progressKey(classroom.id, lesson.id));
                      return (
                        <td key={classroom.id} className="border-b border-l border-stone-200 p-1">
                          <button
                            type="button"
                            onClick={() => handleToggle(classroom.id, lesson.id)}
                            aria-pressed={taughtOn !== undefined}
                            aria-label={`${classroomLabel(classroom)} ${unitIndex + 1}단원 ${lessonIndex + 1}차시 ${
                              taughtOn ? `수업함 (${shortDate(taughtOn)})` : "수업 전"
                            }`}
                            className={`flex h-9 w-full items-center justify-center rounded-lg text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-emerald-700 ${
                              taughtOn
                                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                                : "text-stone-300 hover:bg-stone-100 hover:text-stone-500"
                            }`}
                          >
                            {taughtOn ? `✓ ${shortDate(taughtOn)}` : "–"}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
