import assert from "node:assert/strict";
import { test } from "node:test";
import { buildStudentOverview, overviewToClipboardText } from "./overview";

const students = [
  { id: "s1", studentNumber: 1 },
  { id: "s2", studentNumber: 2 },
];
const assessments = [
  { id: "a1", title: "말하기 평가", subjectName: "영어" },
  { id: "a2", title: "쓰기 평가", subjectName: "영어" },
];
const results = [
  { studentId: "s1", assessmentId: "a2", grade: "B" as const, comment: " 문장을 바르게 씀. " },
  { studentId: "s1", assessmentId: "a1", grade: "A" as const, comment: "길을 묻고 답함." },
  { studentId: "s2", assessmentId: "a1", grade: null, comment: "" },
];

test("학생별 등급은 평가 순서대로, 미입력은 null 이다", () => {
  const [first, second] = buildStudentOverview(students, assessments, results);
  assert.deepEqual(first.grades, ["A", "B"]);
  assert.deepEqual(second.grades, [null, null]);
});

test("코멘트는 평가 순서대로 모으고 빈 코멘트는 뺀다", () => {
  const [first, second] = buildStudentOverview(students, assessments, results);
  assert.deepEqual(
    first.comments.map((item) => item.assessmentTitle),
    ["말하기 평가", "쓰기 평가"],
  );
  assert.equal(first.combinedComment, "길을 묻고 답함. 문장을 바르게 씀.");
  assert.deepEqual(second.comments, []);
  assert.equal(second.combinedComment, "");
});

test("붙여넣기용 텍스트는 번호와 종합 코멘트를 탭으로 구분한다", () => {
  const rows = buildStudentOverview(students, assessments, [
    { studentId: "s1", assessmentId: "a1", grade: "A", comment: "첫 줄\n둘째 줄" },
  ]);
  assert.equal(overviewToClipboardText(rows), "1\t첫 줄 둘째 줄\n2\t");
});
