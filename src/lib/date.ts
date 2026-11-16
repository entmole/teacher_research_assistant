/**
 * 날짜 유틸. 시간대 오차를 피하기 위해 날짜는 'YYYY-MM-DD' 문자열로 다루고
 * 계산은 모두 UTC 기준으로 한다.
 */
export type IsoDate = string;

const DAY_MS = 24 * 60 * 60 * 1000;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

export function isIsoDate(value: unknown): value is IsoDate {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const time = Date.parse(`${value}T00:00:00Z`);
  return !Number.isNaN(time) && toIso(new Date(time)) === value;
}

function toIso(date: Date): IsoDate {
  return date.toISOString().slice(0, 10);
}

function toUtcDate(iso: IsoDate): Date {
  return new Date(`${iso}T00:00:00Z`);
}

/** 한국 시간 기준 오늘 날짜 */
export function todayKst(now: Date = new Date()): IsoDate {
  return toIso(new Date(now.getTime() + KST_OFFSET_MS));
}

export function addDays(iso: IsoDate, days: number): IsoDate {
  return toIso(new Date(toUtcDate(iso).getTime() + days * DAY_MS));
}

/** 해당 날짜가 속한 주의 월요일 */
export function startOfWeek(iso: IsoDate): IsoDate {
  const weekday = toUtcDate(iso).getUTCDay(); // 0 = 일요일
  const daysFromMonday = (weekday + 6) % 7;
  return addDays(iso, -daysFromMonday);
}

/** 월요일부터 금요일까지 5일 */
export function schoolWeekDays(monday: IsoDate): IsoDate[] {
  return [0, 1, 2, 3, 4].map((offset) => addDays(monday, offset));
}

export function weekdayLabel(iso: IsoDate): string {
  return WEEKDAY_LABELS[toUtcDate(iso).getUTCDay()];
}

/** '11.16' 형식 */
export function shortDate(iso: IsoDate): string {
  const [, month, day] = iso.split("-");
  return `${Number(month)}.${Number(day)}`;
}

/** 학년도: 3월에 시작하므로 1~2월은 전년도에 속한다. */
export function schoolYearOf(iso: IsoDate): number {
  const [year, month] = iso.split("-").map(Number);
  return month >= 3 ? year : year - 1;
}

/** NEIS 날짜 형식(YYYYMMDD) 변환 */
export function toNeisYmd(iso: IsoDate): string {
  return iso.replaceAll("-", "");
}

export function fromNeisYmd(ymd: string): IsoDate {
  return `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`;
}
