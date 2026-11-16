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

const CSV_HEADER = ["학급", "번호", "등급", "코멘트"];
/** 엑셀이 한글을 올바로 읽도록 파일 맨 앞에 붙이는 표시(BOM) */
const UTF8_BOM = "\uFEFF";

function csvField(value: string | number): string {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/** 결과를 엑셀에서 바로 열 수 있는 CSV 텍스트로 만든다. */
export function toCsv(classLabel: string, results: StudentResult[]): string {
  const rows = results.map((result) => [
    classLabel,
    result.studentNumber,
    result.grade ?? "",
    result.comment.trim(),
  ]);
  return UTF8_BOM + [CSV_HEADER, ...rows].map((row) => row.map(csvField).join(",")).join("\r\n");
}

export function isGrade(value: unknown): value is Grade {
  return GRADES.includes(value as Grade);
}
