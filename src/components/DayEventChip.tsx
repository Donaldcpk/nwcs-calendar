"use client";

import { MouseEvent } from "react";
import { useCalendarStore } from "@/store/calendar-store";

interface Props {
  date: string;
  eventName: string;
  compact?: boolean;
}

function stopGridInteraction(event: MouseEvent) {
  event.preventDefault();
  event.stopPropagation();
}

export function DayEventChip({ date, eventName, compact = false }: Props) {
  const removeDayEvent = useCalendarStore((state) => state.removeDayEvent);

  return (
    <div
      className={`group flex items-start gap-0.5 rounded bg-white/80 pr-0.5 ${compact ? "text-[11px]" : "text-xs"}`}
      title={eventName}
    >
      <span className={`min-w-0 flex-1 leading-tight text-slate-700 ${compact ? "px-1 py-[1px]" : "px-1.5 py-0.5"}`}>
        {eventName}
      </span>
      <button
        type="button"
        aria-label={`刪除「${eventName}」`}
        className={`shrink-0 rounded font-bold leading-none text-rose-600 opacity-70 hover:bg-rose-100 hover:opacity-100 ${compact ? "mt-[1px] h-4 w-4 text-[10px]" : "h-5 w-5 text-xs"}`}
        onMouseDown={stopGridInteraction}
        onClick={(event) => {
          stopGridInteraction(event);
          removeDayEvent(date, eventName);
        }}
      >
        ×
      </button>
    </div>
  );
}
