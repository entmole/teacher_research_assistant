import type { TextbookContent } from "@/types/database";

/**
 * 붙여넣은 진도표를 단원·차시 목록으로 바꾸는 순수 함수 모음.
 * - 엑셀에서 복사한 표(탭으로 칸이 나뉨): 단원 열과 차시 열을 골라 해석한다.
 * - 일반 텍스트: 빈 줄로 단원을 나누고, 각 묶음의 첫 줄을 단원 이름으로 본다.
 */
export const MAX_UNITS = 60;
export const MAX_LESSONS_PER_UNIT = 60;
const MAX_UNIT_TITLE = 60;
const MAX_LESSON_TITLE = 100;

/** 붙여넣은 글을 줄·칸으로 나눈다. 완전히 빈 줄은 버린다. */
export function parseGrid(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .map((line) => line.split("\t").map((cell) => cell.trim()))
    .filter((row) => row.some((cell) => cell !== ""));
}

/** 칸이 여러 개인 표 형태인지 */
export function isTabular(grid: string[][]): boolean {
  return grid.some((row) => row.length > 1);
}

export function columnCount(grid: string[][]): number {
  return Math.max(0, ...grid.map((row) => row.length));
}

const isNumberLike = (value: string) => /^[\d\s.~\-/()차시월주쪽]+$/.test(value);

/**
 * 단원 열과 차시 열을 추측한다.
 * 차시 열: 글자로 된 서로 다른 값이 가장 많은 열 (차시 제목은 줄마다 다르다)
 * 단원 열: 그 왼쪽에서 글자로 된 값이 있는 열 중 가장 가까운 열
 */
export function guessColumns(grid: string[][]): { unitColumn: number; lessonColumn: number } {
  const count = columnCount(grid);
  const distinctTextValues = (column: number) =>
    new Set(grid.map((row) => row[column] ?? "").filter((cell) => cell && !isNumberLike(cell))).size;

  let lessonColumn = 0;
  for (let column = 1; column < count; column += 1) {
    if (distinctTextValues(column) > distinctTextValues(lessonColumn)) lessonColumn = column;
  }
  let unitColumn = lessonColumn === 0 ? Math.min(1, count - 1) : 0;
  for (let column = lessonColumn - 1; column >= 0; column -= 1) {
    if (distinctTextValues(column) > 0) {
      unitColumn = column;
      break;
    }
  }
  return { unitColumn, lessonColumn };
}

function finalize(units: TextbookContent): TextbookContent {
  return units
    .filter((unit) => unit.title !== "")
    .slice(0, MAX_UNITS)
    .map((unit) => ({
      title: unit.title.slice(0, MAX_UNIT_TITLE),
      lessons: unit.lessons
        .slice(0, MAX_LESSONS_PER_UNIT)
        .map((lesson) => lesson.slice(0, MAX_LESSON_TITLE)),
    }));
}

/**
 * 표 형태 진도표 해석. 단원 칸이 비어 있으면(엑셀의 병합된 칸) 위 단원이 이어지는 것으로 본다.
 */
export function buildUnitsFromColumns(
  grid: string[][],
  unitColumn: number,
  lessonColumn: number,
  skipFirstRow: boolean,
): TextbookContent {
  const units: TextbookContent = [];
  for (const row of skipFirstRow ? grid.slice(1) : grid) {
    const unitTitle = row[unitColumn] ?? "";
    const lessonTitle = row[lessonColumn] ?? "";
    const current = units[units.length - 1];

    if (unitTitle !== "" && unitTitle !== current?.title) {
      units.push({ title: unitTitle, lessons: lessonTitle ? [lessonTitle] : [] });
    } else if (lessonTitle !== "" && current) {
      current.lessons.push(lessonTitle);
    }
  }
  return finalize(units);
}

/** 일반 텍스트 해석: 빈 줄로 단원을 나누고, 묶음의 첫 줄이 단원 이름, 나머지가 차시 */
export function buildUnitsFromBlocks(text: string): TextbookContent {
  const units = text
    .split(/\r?\n\s*\r?\n/)
    .map((block) =>
      block
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean),
    )
    .filter((lines) => lines.length > 0)
    .map(([title, ...lessons]) => ({ title, lessons }));
  return finalize(units);
}

export function countLessons(units: TextbookContent): number {
  return units.reduce((sum, unit) => sum + unit.lessons.length, 0);
}
