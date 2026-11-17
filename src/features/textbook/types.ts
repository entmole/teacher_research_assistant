/** 자료실의 교과서 내용 1건 (기본 자료 또는 교사 공유본) */
export type TextbookVersionSummary = {
  id: string;
  /** base = 관리자가 넣은 기본 자료, shared = 교사가 공유한 수정본 */
  kind: "base" | "shared";
  note: string;
  unitCount: number;
  lessonCount: number;
  createdAt: string;
  /** 내가 올린 공유본인지 (삭제 가능 여부) */
  isMine: boolean;
};

/** 자료실의 교과서 1종과 그 내용들 */
export type TextbookEntry = {
  id: string;
  grade: number;
  semester: number;
  subject: string;
  publisher: string;
  versions: TextbookVersionSummary[];
};

export const SEMESTER_OPTIONS = [
  { value: 0, label: "학년 전체" },
  { value: 1, label: "1학기" },
  { value: 2, label: "2학기" },
];

export function semesterLabel(semester: number): string {
  return SEMESTER_OPTIONS.find((option) => option.value === semester)?.label ?? "학년 전체";
}

/** 출판사 입력 자동완성 후보 */
export const COMMON_PUBLISHERS = [
  "국정",
  "천재교육",
  "천재교과서",
  "비상교육",
  "미래엔",
  "동아출판",
  "아이스크림미디어",
  "지학사",
  "YBM",
  "금성출판사",
  "교학사",
  "대교",
  "김영사",
];

export const MAX_PUBLISHER_LENGTH = 30;
export const MAX_SHARE_NOTE_LENGTH = 100;
