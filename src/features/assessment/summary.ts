import { GRADES, type Grade, type StudentResult } from "./types";

export type GradeCounts = Record<Grade, number> & { ungraded: number };

/** 등급별 인원과 미입력 인원을 센다. */
export function countGrades(results: Pick<StudentResult, "grade">[]): GradeCounts {
  const counts: GradeCounts = { A: 0, B: 0, C: 0, ungraded: 0 };
  for (const result of results) {
    if (result.grade) counts[result.grade] += 1;
    else counts.ungraded += 1;
  }
  return counts;
}

/**
 * 결과를 "번호⇥등급⇥코멘트" 형식의 텍스트로 만든다. (엑셀·나이스에 붙여넣기용)
 * 코멘트 안의 줄바꿈과 탭은 칸이 깨지지 않도록 공백으로 바꾼다.
 */
export function toClipboardText(results: StudentResult[]): string {
  return results
    .map((result) =>
      [
        result.studentNumber,
        result.grade ?? "",
        result.comment.replace(/[\t\r\n]+/g, " ").trim(),
      ].join("\t"),
    )
    .join("\n");
}

export function isGrade(value: unknown): value is Grade {
  return GRADES.includes(value as Grade);
}
