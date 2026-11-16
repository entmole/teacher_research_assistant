/** 과목별 색상 (Tailwind 클래스는 빌드 시 추출되므로 문자열을 그대로 적는다) */
const SUBJECT_COLORS: [keyword: string, className: string][] = [
  ["국어", "bg-rose-50 text-rose-900 border-rose-200"],
  ["수학", "bg-sky-50 text-sky-900 border-sky-200"],
  ["사회", "bg-amber-50 text-amber-900 border-amber-200"],
  ["과학", "bg-emerald-50 text-emerald-900 border-emerald-200"],
  ["영어", "bg-violet-50 text-violet-900 border-violet-200"],
  ["체육", "bg-orange-50 text-orange-900 border-orange-200"],
  ["음악", "bg-pink-50 text-pink-900 border-pink-200"],
  ["미술", "bg-teal-50 text-teal-900 border-teal-200"],
  ["도덕", "bg-lime-50 text-lime-900 border-lime-200"],
  ["실과", "bg-cyan-50 text-cyan-900 border-cyan-200"],
  ["바른", "bg-lime-50 text-lime-900 border-lime-200"],
  ["슬기", "bg-emerald-50 text-emerald-900 border-emerald-200"],
  ["즐거운", "bg-pink-50 text-pink-900 border-pink-200"],
];

const DEFAULT_COLOR = "bg-stone-50 text-stone-800 border-stone-200";

export function subjectColorClass(subject: string): string {
  return SUBJECT_COLORS.find(([keyword]) => subject.includes(keyword))?.[1] ?? DEFAULT_COLOR;
}

/** 과목 입력 자동완성 후보 */
export const COMMON_SUBJECTS = [
  "국어",
  "수학",
  "사회",
  "과학",
  "영어",
  "체육",
  "음악",
  "미술",
  "도덕",
  "실과",
  "바른생활",
  "슬기로운생활",
  "즐거운생활",
  "자율활동",
  "동아리활동",
  "진로활동",
];
