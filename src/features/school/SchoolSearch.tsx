"use client";

import { useState, useTransition, type FormEvent } from "react";
import type { NeisSchool } from "@/lib/neis/types";
import { inputClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";
import { saveSchool } from "./actions";

type Message = { kind: "error" | "success"; text: string };

/** 학교명 검색 후 선택해 저장한다. */
export function SchoolSearch() {
  const [query, setQuery] = useState("");
  const [schools, setSchools] = useState<NeisSchool[] | null>(null);
  const [message, setMessage] = useState<Message | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, startSaving] = useTransition();

  const handleSearch = async (event: FormEvent) => {
    event.preventDefault();
    setMessage(null);
    setIsSearching(true);
    try {
      const response = await fetch(`/api/neis/schools?q=${encodeURIComponent(query.trim())}`);
      const body: { schools?: NeisSchool[]; error?: string } = await response.json();
      if (!response.ok) throw new Error(body.error ?? "검색에 실패했습니다.");
      setSchools(body.schools ?? []);
    } catch (error) {
      setSchools(null);
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "검색에 실패했습니다.",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelect = (school: NeisSchool) => {
    setMessage(null);
    startSaving(async () => {
      const result = await saveSchool({ atptCode: school.atptCode, schoolCode: school.schoolCode });
      if (result.ok) {
        setSchools(null);
        setQuery("");
        setMessage({ kind: "success", text: result.message ?? "저장했습니다." });
      } else {
        setMessage({ kind: "error", text: result.error });
      }
    });
  };

  return (
    <div>
      <form onSubmit={handleSearch} className="flex gap-2">
        <label htmlFor="school-query" className="sr-only">
          학교명
        </label>
        <input
          id="school-query"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          minLength={2}
          maxLength={30}
          required
          placeholder="학교명 (예: 영덕야성)"
          className={inputClass}
        />
        <button type="submit" disabled={isSearching} className={`${primaryButtonClass} shrink-0`}>
          {isSearching ? "검색 중…" : "검색"}
        </button>
      </form>

      {message && (
        <p
          role={message.kind === "error" ? "alert" : "status"}
          className={`mt-3 rounded-lg px-3 py-2 text-sm ${
            message.kind === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-800"
          }`}
        >
          {message.text}
        </p>
      )}

      {schools && schools.length === 0 && (
        <p className="mt-3 text-sm text-stone-500">
          검색 결과가 없습니다. 초등학교 이름의 일부만 입력해 보세요.
        </p>
      )}

      {schools && schools.length > 0 && (
        <ul className="mt-3 divide-y divide-stone-100 rounded-lg border border-stone-200">
          {schools.map((school) => (
            <li
              key={`${school.atptCode}-${school.schoolCode}`}
              className="flex items-center gap-3 px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-stone-900">{school.name}</p>
                <p className="truncate text-xs text-stone-500">
                  {school.atptName} · {school.address}
                </p>
              </div>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleSelect(school)}
                className={`${secondaryButtonClass} shrink-0`}
              >
                선택
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
