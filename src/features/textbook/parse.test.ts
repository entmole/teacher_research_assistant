import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildUnitsFromBlocks,
  buildUnitsFromColumns,
  countLessons,
  guessColumns,
  isTabular,
  parseGrid,
} from "./parse";

// 엑셀 진도표를 복사한 모양: 월, 주, 단원(병합된 칸은 빈칸), 차시, 학습 내용, 쪽수
const SHEET = [
  "월\t주\t단원\t차시\t학습 내용\t쪽수",
  "3\t1\t1. Where Are You From?\t1\t나라 이름 듣기\t8~9",
  "3\t1\t\t2\t출신 나라 묻고 답하기\t10~11",
  "3\t2\t\t3\t나라 이름 읽고 쓰기\t12~13",
  "",
  "3\t3\t2. What Do You Do on Weekends?\t1\t주말 활동 듣기\t22~23",
  "3\t3\t\t2\t주말 활동 묻고 답하기\t24~25",
].join("\n");

test("붙여넣은 표를 줄·칸으로 나누고 빈 줄은 버린다", () => {
  const grid = parseGrid(SHEET);
  assert.equal(grid.length, 6);
  assert.equal(isTabular(grid), true);
  assert.equal(grid[1][2], "1. Where Are You From?");
});

test("단원 열과 차시 열을 추측한다", () => {
  assert.deepEqual(guessColumns(parseGrid(SHEET)), { unitColumn: 2, lessonColumn: 4 });
});

test("병합되어 비어 있는 단원 칸은 위 단원으로 이어 붙인다", () => {
  const units = buildUnitsFromColumns(parseGrid(SHEET), 2, 4, true);
  assert.deepEqual(units, [
    {
      title: "1. Where Are You From?",
      lessons: ["나라 이름 듣기", "출신 나라 묻고 답하기", "나라 이름 읽고 쓰기"],
    },
    { title: "2. What Do You Do on Weekends?", lessons: ["주말 활동 듣기", "주말 활동 묻고 답하기"] },
  ]);
  assert.equal(countLessons(units), 5);
});

test("단원 이름이 줄마다 반복되어도 한 단원으로 묶는다", () => {
  const grid = parseGrid("1단원\t듣기\n1단원\t말하기\n2단원\t읽기");
  assert.deepEqual(buildUnitsFromColumns(grid, 0, 1, false), [
    { title: "1단원", lessons: ["듣기", "말하기"] },
    { title: "2단원", lessons: ["읽기"] },
  ]);
});

test("일반 텍스트는 빈 줄로 단원을 나누고 첫 줄을 단원 이름으로 본다", () => {
  const units = buildUnitsFromBlocks("1. 분수의 덧셈\n 분모가 같은 분수 \n분모가 다른 분수\n\n\n2. 소수의 곱셈\n");
  assert.deepEqual(units, [
    { title: "1. 분수의 덧셈", lessons: ["분모가 같은 분수", "분모가 다른 분수"] },
    { title: "2. 소수의 곱셈", lessons: [] },
  ]);
  assert.equal(isTabular(parseGrid("1. 분수의 덧셈\n분모가 같은 분수")), false);
});

test("너무 긴 제목은 저장 한도에 맞게 자른다", () => {
  const [unit] = buildUnitsFromBlocks(`${"가".repeat(80)}\n${"나".repeat(150)}`);
  assert.equal(unit.title.length, 60);
  assert.equal(unit.lessons[0].length, 100);
});
