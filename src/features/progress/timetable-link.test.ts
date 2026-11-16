import assert from "node:assert/strict";
import { test } from "node:test";
import { buildProgressLinks, findProgressLink } from "./timetable-link";

const classrooms = [
  { id: "c51", grade: 5, classNm: "1" },
  { id: "c61", grade: 6, classNm: "1" },
];
const subjects = [
  {
    id: "s5",
    grade: 5,
    name: "영어",
    units: [
      { id: "u1", title: "1단원", lessons: [{ id: "l1", title: "듣기" }, { id: "l2", title: "말하기" }] },
      { id: "u2", title: "2단원", lessons: [{ id: "l3", title: "읽기" }] },
    ],
  },
];

test("같은 학년 과목만 연결하고 다음 차시와 기록한 차시를 계산한다", () => {
  const links = buildProgressLinks(classrooms, subjects, [
    { classroomId: "c51", lessonId: "l1", taughtOn: "2026-11-16" },
  ]);
  assert.equal(links.length, 1); // 6학년 학급에는 5학년 과목을 연결하지 않는다
  assert.equal(links[0].classroomId, "c51");
  assert.deepEqual(links[0].nextLesson, {
    lessonId: "l2",
    shortLabel: "1-2",
    label: "1단원 2차시 · 말하기",
  });
  assert.deepEqual(
    links[0].taught.map((t) => `${t.shortLabel}@${t.date}`),
    ["1-1@2026-11-16"],
  );
});

test("모든 차시를 마치면 다음 차시가 없다", () => {
  const links = buildProgressLinks(
    classrooms,
    subjects,
    ["l1", "l2", "l3"].map((lessonId) => ({ classroomId: "c51", lessonId, taughtOn: "2026-11-16" })),
  );
  assert.equal(links[0].nextLesson, null);
});

test("시간표 과목명에 과목 이름이 들어 있으면 연결한다", () => {
  const links = buildProgressLinks(classrooms, subjects, []);
  assert.equal(findProgressLink(links, "c51", "영어")?.subjectName, "영어");
  assert.equal(findProgressLink(links, "c51", "수학"), null);
  assert.equal(findProgressLink(links, "c61", "영어"), null);
});
