import type { Grade } from "./types";

/** 종합 보기의 평가 1건 (열) */
export type OverviewAssessment = {
  id: string;
  title: string;
  subjectName: string;
};

/** 학생 한 명의 평가 1건 결과 */
export type OverviewResult = {
  studentId: string;
  assessmentId: string;
  grade: Grade | null;
  comment: string;
};

/** 종합 보기의 학생 1명 (행) */
export type StudentOverviewRow = {
  studentId: string;
  studentNumber: number;
  /** 평가 순서대로의 등급. 미입력이면 null */
  grades: (Grade | null)[];
  /** 코멘트가 있는 평가만, 평가 순서대로 */
  comments: { assessmentTitle: string; subjectName: string; comment: string }[];
  /** 모든 코멘트를 평가 순서대로 한 줄로 이은 글 */
  combinedComment: string;
};

/** 학생별로 여러 평가의 등급과 코멘트를 모은다. */
export function buildStudentOverview(
  students: { id: string; studentNumber: number }[],
  assessments: OverviewAssessment[],
  results: OverviewResult[],
): StudentOverviewRow[] {
  const resultByKey = new Map(results.map((r) => [`${r.studentId}|${r.assessmentId}`, r]));

  return students.map((student) => {
    const studentResults = assessments.map((assessment) => ({
      assessment,
      result: resultByKey.get(`${student.id}|${assessment.id}`),
    }));
    const comments = studentResults.flatMap(({ assessment, result }) => {
      const comment = result?.comment.trim() ?? "";
      return comment === ""
        ? []
        : [{ assessmentTitle: assessment.title, subjectName: assessment.subjectName, comment }];
    });

    return {
      studentId: student.id,
      studentNumber: student.studentNumber,
      grades: studentResults.map(({ result }) => result?.grade ?? null),
      comments,
      combinedComment: comments.map((item) => item.comment).join(" "),
    };
  });
}

/** "번호⇥종합 코멘트" 형식의 붙여넣기용 텍스트. 코멘트 안의 줄바꿈·탭은 공백으로 바꾼다. */
export function overviewToClipboardText(rows: StudentOverviewRow[]): string {
  return rows
    .map((row) => `${row.studentNumber}\t${row.combinedComment.replace(/[\t\r\n]+/g, " ")}`)
    .join("\n");
}
