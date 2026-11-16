import assert from "node:assert/strict";
import { test } from "node:test";
import { mergeTimetable, selectCellsForView } from "./merge";
import type { ClassroomRef, OverrideEntry } from "./types";

const class51: ClassroomRef = { id: "c51", grade: 5, classNm: "1" };
const class52: ClassroomRef = { id: "c52", grade: 5, classNm: "2" };
const date = "2026-11-16";

const lessons = [
  { grade: 5, classNm: "1", date, period: 1, subject: "체육" },
  { grade: 5, classNm: "1", date, period: 2, subject: "영어" },
  { grade: 5, classNm: "2", date, period: 1, subject: "영어" },
  { grade: 6, classNm: "1", date, period: 1, subject: "영어" }, // 담당 학급 아님
];

const override = (partial: Partial<OverrideEntry>): OverrideEntry => ({
  id: "o1",
  classroomId: "c51",
  date,
  period: 1,
  subject: "수학",
  memo: "",
  isCancelled: false,
  ...partial,
});

test("담당 학급의 NEIS 수업만 남긴다", () => {
  const cells = mergeTimetable([class51, class52], lessons, []);
  assert.equal(cells.length, 3);
  assert.ok(cells.every((cell) => cell.overrideId === null));
});

test("수정분이 NEIS 원본을 덮어쓰고 원본 과목을 기억한다", () => {
  const cells = mergeTimetable([class51], lessons, [override({ memo: "교환 수업" })]);
  const cell = cells.find((c) => c.period === 1);
  assert.equal(cell?.subject, "수학");
  assert.equal(cell?.neisSubject, "체육");
  assert.equal(cell?.overrideId, "o1");
  assert.equal(cell?.memo, "교환 수업");
});

test("NEIS 에 없는 교시의 수정분은 직접 추가한 수업이 된다", () => {
  const cells = mergeTimetable([class51], lessons, [override({ period: 6, subject: "동아리" })]);
  const cell = cells.find((c) => c.period === 6);
  assert.equal(cell?.subject, "동아리");
  assert.equal(cell?.neisSubject, null);
});

test("다른 교사 학급의 수정분은 무시한다", () => {
  const cells = mergeTimetable([class51], lessons, [override({ classroomId: "unknown" })]);
  assert.equal(cells.find((c) => c.period === 1)?.subject, "체육");
});

test("학급 보기는 해당 학급 수업만 고른다", () => {
  const cells = mergeTimetable([class51, class52], lessons, []);
  const selected = selectCellsForView(cells, { kind: "classroom", classroomId: "c52" });
  assert.deepEqual(
    selected.map((c) => c.subject),
    ["영어"],
  );
});

test("내 수업 보기는 담당 과목과 직접 수정한 칸을 고른다", () => {
  const cells = mergeTimetable([class51, class52], lessons, [
    override({ period: 3, subject: "보결" }),
  ]);
  const selected = selectCellsForView(cells, { kind: "mine", subjects: ["영어"] });
  assert.deepEqual(
    selected.map((c) => `${c.grade}-${c.classNm} ${c.period} ${c.subject}`),
    ["5-2 1 영어", "5-1 2 영어", "5-1 3 보결"],
  );
});
