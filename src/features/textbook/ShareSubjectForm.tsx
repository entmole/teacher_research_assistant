"use client";

import { useState, useTransition, type FormEvent } from "react";
import { inputClass, labelClass, secondaryButtonClass } from "@/lib/ui";
import { shareSubject } from "./actions";
import { COMMON_PUBLISHERS, SEMESTER_OPTIONS } from "./types";

type Props = {
  subjectId: string;
  /** 이 과목을 자료실에서 불러왔다면 그 교과서의 학기·출판사 */
  defaultSemester: number;
  defaultPublisher: string;
};

type Message = { kind: "error" | "success"; text: string };

/** 내 과목의 단원·차시를 자료실에 공유한다. */
export function ShareSubjectForm({ subjectId, defaultSemester, defaultPublisher }: Props) {
  const [semester, setSemester] = useState(defaultSemester);
  const [publisher, setPublisher] = useState(defaultPublisher);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<Message | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await shareSubject({ subjectId, semester, publisher, note });
      if (result.ok) {
        setNote("");
        setMessage({ kind: "success", text: result.message ?? "공유했습니다." });
      } else {
        setMessage({ kind: "error", text: result.error });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-xs text-stone-600">
        이 과목의 단원·차시 전체가 같은 학년·과목·출판사를 쓰는 다른 선생님에게 공유됩니다. 진도
        기록, 평가, 이름·이메일은 공유되지 않습니다.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="share-semester" className={labelClass}>
            학기
          </label>
          <select
            id="share-semester"
            value={semester}
            onChange={(event) => setSemester(Number(event.target.value))}
            className={`${inputClass} w-32!`}
          >
            {SEMESTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="share-publisher" className={labelClass}>
            출판사
          </label>
          <input
            id="share-publisher"
            value={publisher}
            onChange={(event) => setPublisher(event.target.value)}
            list="publisher-options"
            required
            maxLength={30}
            placeholder="예: 천재교육"
            className={`${inputClass} w-44!`}
          />
          <datalist id="publisher-options">
            {COMMON_PUBLISHERS.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </div>
        <div className="min-w-40 flex-1">
          <label htmlFor="share-note" className={labelClass}>
            메모 (선택)
          </label>
          <input
            id="share-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={100}
            placeholder="예: 지도서 진도표 기준, 차시명 수정"
            className={inputClass}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={isPending} className={secondaryButtonClass}>
          {isPending ? "공유 중…" : "자료실에 공유"}
        </button>
        {message && (
          <p
            role={message.kind === "error" ? "alert" : "status"}
            className={`text-sm ${message.kind === "error" ? "text-red-700" : "text-emerald-700"}`}
          >
            {message.text}
          </p>
        )}
      </div>
    </form>
  );
}
