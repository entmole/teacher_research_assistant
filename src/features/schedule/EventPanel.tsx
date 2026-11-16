import { shortDate, weekdayLabel, type IsoDate } from "@/lib/date";
import { cardClass } from "@/lib/ui";
import { deleteCustomEvent } from "./actions";
import { AddEventForm } from "./AddEventForm";
import type { SchoolEvent } from "./types";

type Props = {
  days: IsoDate[];
  today: IsoDate;
  events: SchoolEvent[];
};

/** 이번 주 일정 목록 (NEIS 학사일정 + 직접 추가한 일정) */
export function EventPanel({ days, today, events }: Props) {
  const defaultDate = days.includes(today) ? today : days[0];

  return (
    <section className={cardClass} aria-labelledby="event-panel-title">
      <h2 id="event-panel-title" className="text-base font-semibold text-stone-900">
        이번 주 일정
      </h2>

      {events.length === 0 ? (
        <p className="mt-3 text-sm text-stone-500">등록된 일정이 없습니다.</p>
      ) : (
        <ul className="mt-3 divide-y divide-stone-100">
          {events.map((event) => (
            <li key={event.key} className="flex items-center gap-3 py-2 text-sm">
              <span className="w-20 shrink-0 text-stone-500">
                {weekdayLabel(event.date)} ({shortDate(event.date)})
              </span>
              <span className={`min-w-0 flex-1 ${event.isDayOff ? "text-red-700" : "text-stone-900"}`}>
                {event.title}
                {event.grades.length > 0 && (
                  <span className="ml-2 text-xs text-stone-500">
                    {event.grades.join("·")}학년
                  </span>
                )}
              </span>
              {event.customId ? (
                <form action={deleteCustomEvent.bind(null, event.customId)}>
                  <button
                    type="submit"
                    className="text-xs font-medium text-stone-500 underline-offset-2 hover:text-red-700 hover:underline"
                  >
                    삭제
                  </button>
                </form>
              ) : (
                <span className="text-xs text-stone-400">NEIS</span>
              )}
            </li>
          ))}
        </ul>
      )}

      <AddEventForm days={days} defaultDate={defaultDate} />
    </section>
  );
}
