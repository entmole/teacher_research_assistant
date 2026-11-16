import assert from "node:assert/strict";
import { test } from "node:test";
import { parseLessonLines, summarizeProgress } from "./summary";
import type { Unit } from "./types";

const units: Unit[] = [
  {
    id: "u1",
    title: "1단원",
    lessons: [
      { id: "l1", title: "첫 차시" },
      { id: "l2", title: "둘째 차시" },
    ],
  },
  { id: "u2", title: "2단원", lessons: [{ id: "l3", title: "셋째 차시" }] },
];

const record = (classroomId: string, lessonId: string) => ({
  classroomId,
  lessonId,
  taughtOn: "2026-11-16",
});

test("학급별 완료 수와 다음 차시를 계산한다", () => {
  const [a, b] = summarizeProgress(
    units,
    ["a", "b"],
    [record("a", "l1"), record("a", "l2"), record("b", "l1")],
  );
  assert.deepEqual(a, {
    classroomId: "a",
    doneCount: 2,
    totalCount: 3,
    nextLesson: { unitNo: 2, lessonNo: 1, title: "셋째 차시" },
  });
  assert.equal(b.doneCount, 1);
  assert.deepEqual(b.nextLesson, { unitNo: 1, lessonNo: 2, title: "둘째 차시" });
});

test("건너뛴 차시가 있으면 그 차시가 다음 차시다", () => {
  const [a] = summarizeProgress(units, ["a"], [record("a", "l2")]);
  assert.equal(a.nextLesson?.title, "첫 차시");
});

test("모두 마치면 다음 차시가 없다", () => {
  const [a] = summarizeProgress(
    units,
    ["a"],
    ["l1", "l2", "l3"].map((id) => record("a", id)),
  );
  assert.equal(a.doneCount, 3);
  assert.equal(a.nextLesson, null);
});

test("차시가 없어도 오류 없이 0건으로 요약한다", () => {
  const [a] = summarizeProgress([], ["a"], []);
  assert.deepEqual(a, { classroomId: "a", doneCount: 0, totalCount: 0, nextLesson: null });
});

test("여러 줄 입력에서 빈 줄과 공백을 제거한다", () => {
  assert.deepEqual(parseLessonLines("  인사하기 \r\n\n자기소개하기\n   \n"), [
    "인사하기",
    "자기소개하기",
  ]);
});
