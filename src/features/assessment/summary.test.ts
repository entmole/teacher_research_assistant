import assert from "node:assert/strict";
import { test } from "node:test";
import { countGrades, isGrade, toClipboardText } from "./summary";
import type { StudentResult } from "./types";

const result = (partial: Partial<StudentResult>): StudentResult => ({
  studentId: "s",
  studentNumber: 1,
  grade: null,
  comment: "",
  ...partial,
});

test("등급별 인원과 미입력 인원을 센다", () => {
  const counts = countGrades([
    result({ grade: "A" }),
    result({ grade: "A" }),
    result({ grade: "C" }),
    result({ grade: null }),
  ]);
  assert.deepEqual(counts, { A: 2, B: 0, C: 1, ungraded: 1 });
});

test("붙여넣기용 텍스트는 번호·등급·코멘트를 탭으로 구분한다", () => {
  const text = toClipboardText([
    result({ studentNumber: 1, grade: "A", comment: "길을 묻고 답하는 말을 정확히 함." }),
    result({ studentNumber: 2 }),
  ]);
  assert.equal(text, "1\tA\t길을 묻고 답하는 말을 정확히 함.\n2\t\t");
});

test("코멘트의 줄바꿈과 탭은 공백으로 바꾼다", () => {
  const text = toClipboardText([result({ grade: "B", comment: "첫 줄\n둘째\t줄 " })]);
  assert.equal(text, "1\tB\t첫 줄 둘째 줄");
});

test("A/B/C 만 등급으로 인정한다", () => {
  assert.equal(isGrade("A"), true);
  assert.equal(isGrade("D"), false);
  assert.equal(isGrade(null), false);
});
