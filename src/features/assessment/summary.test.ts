import assert from "node:assert/strict";
import { test } from "node:test";
import { countGrades, isGrade, toClipboardText, toCsv } from "./summary";
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

test("CSV 는 머리글과 BOM 을 포함하고 쉼표·따옴표·줄바꿈을 감싼다", () => {
  const csv = toCsv("5-1", [
    result({ studentNumber: 1, grade: "A", comment: '정확하고, "유창"하게 말함.' }),
    result({ studentNumber: 2, comment: "첫 줄\n둘째 줄" }),
  ]);
  assert.equal(
    csv,
    '\uFEFF학급,번호,등급,코멘트\r\n5-1,1,A,"정확하고, ""유창""하게 말함."\r\n5-1,2,,"첫 줄\n둘째 줄"',
  );
});
