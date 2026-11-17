import assert from "node:assert/strict";
import { test } from "node:test";
import { schoolYearRange, weekdaysBetween } from "../../lib/date";
import { countPlannedSchoolDays, filterByPeriod, summarizeHours } from "./summary";

const lesson = (date: string, subject: string, isCancelled = false) => ({ date, subject, isCancelled });

test("과목별로 오늘까지 한 시수와 입력된 전체 시수를 센다", () => {
  const summary = summarizeHours(
    [
      lesson("2026-03-02", "국어"),
      lesson("2026-03-02", "수학"),
      lesson("2026-03-03", "국어"),
      lesson("2026-03-10", "국어"), // 오늘 이후
    ],
    "2026-03-03",
  );
  assert.deepEqual(summary.subjects, [
    { subject: "국어", done: 2, entered: 3 },
    { subject: "수학", done: 1, entered: 1 },
  ]);
  assert.equal(summary.totalDone, 3);
  assert.equal(summary.totalEntered, 4);
  assert.equal(summary.doneDays, 2);
  assert.equal(summary.enteredDays, 3);
});

test("수업 없음으로 표시한 칸은 시수와 수업일에서 뺀다", () => {
  const summary = summarizeHours(
    [lesson("2026-03-02", "국어", true), lesson("2026-03-03", "국어")],
    "2026-03-31",
  );
  assert.deepEqual(summary.subjects, [{ subject: "국어", done: 1, entered: 1 }]);
  assert.equal(summary.doneDays, 1);
});

test("학기는 2학기 시작일을 기준으로 나눈다", () => {
  const lessons = [lesson("2026-07-10", "국어"), lesson("2026-08-18", "국어"), lesson("2026-09-01", "수학")];
  assert.equal(filterByPeriod(lessons, "year", "2026-08-18").length, 3);
  assert.equal(filterByPeriod(lessons, "first", "2026-08-18").length, 1);
  assert.equal(filterByPeriod(lessons, "second", "2026-08-18").length, 2);
  // 2학기 시간표가 아직 없으면 모두 1학기
  assert.equal(filterByPeriod(lessons, "first", null).length, 3);
  assert.equal(filterByPeriod(lessons, "second", null).length, 0);
});

test("달력 기준 수업일수는 평일에서 휴업일을 뺀다", () => {
  // 2026-03-02(월) ~ 2026-03-08(일): 평일 5일
  const weekdays = weekdaysBetween("2026-03-02", "2026-03-08");
  assert.equal(weekdays.length, 5);
  assert.equal(countPlannedSchoolDays(weekdays, ["2026-03-04", "2026-03-07", "2026-03-04"]), 4);
});

test("학년도는 3월 1일부터 이듬해 2월 말일까지다", () => {
  assert.deepEqual(schoolYearRange(2026), { from: "2026-03-01", to: "2027-02-28" });
  assert.deepEqual(schoolYearRange(2027), { from: "2027-03-01", to: "2028-02-29" }); // 윤년
});
