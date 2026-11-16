import type { IsoDate } from "@/lib/date";

/** 시간표 화면에 표시되는 일정 1건 (NEIS 학사일정 또는 직접 추가한 일정) */
export type SchoolEvent = {
  key: string;
  date: IsoDate;
  title: string;
  /** 휴업일·공휴일 여부 */
  isDayOff: boolean;
  /** 일부 학년에만 해당하면 그 학년 목록, 전 학년이면 빈 배열 */
  grades: number[];
  /** 직접 추가한 일정이면 id, NEIS 일정이면 null */
  customId: string | null;
};
