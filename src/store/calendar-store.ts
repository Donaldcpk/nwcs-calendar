"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { temporal } from "zundo";
import { defaultExportMapping, ExportMapping } from "@/types/export-mapping";
import { PublicHolidayEvent, injectPublicHolidays } from "@/lib/public-holiday-injection";
import { DayType, SchoolDayMap } from "@/types/school-day";
import { createSchoolYearDays, defaultSchoolYearConfig } from "@/lib/calendar-init";
import { recalculateCycles } from "@/lib/cycle-engine";
import { CalendarSnapshotPayload } from "@/types/calendar-snapshot";

interface BatchUpdate {
  type?: DayType;
  event?: string;
  isLessonSuspended?: boolean;
  countsAs190?: boolean;
}

interface CalendarState {
  days: SchoolDayMap;
  cycleLength: number;
  schoolYearStart: string;
  schoolYearEnd: string;
  exportMapping: ExportMapping;
  selectedDates: string[];
  activeDate: string | null;
  updateDay: (date: string, updates: Partial<SchoolDayMap[string]>) => void;
  applyBatchUpdate: (dates: string[], updates: BatchUpdate) => void;
  setSelectedDates: (dates: string[]) => void;
  setActiveDate: (date: string | null) => void;
  setCycleLength: (length: number) => void;
  setExportMapping: (mapping: Partial<ExportMapping>) => void;
  applyPublicHolidays: (holidays: PublicHolidayEvent[], overwriteExisting: boolean) => number;
  importTemplateUpdates: (updates: Partial<SchoolDayMap>, overwriteExisting: boolean) => number;
  replaceCalendarState: (snapshot: CalendarSnapshotPayload) => void;
  undo: () => void;
  redo: () => void;
}

const initialDays = createSchoolYearDays(defaultSchoolYearConfig.schoolYearStart, defaultSchoolYearConfig.schoolYearEnd);
const initialRecalculated = recalculateCycles(initialDays, defaultSchoolYearConfig.cycleLength, defaultSchoolYearConfig.schoolYearStart, defaultSchoolYearConfig.schoolYearStart);

export const useCalendarStore = create<CalendarState>()(
  temporal(
    persist(
      (set, get) => ({
        days: initialRecalculated,
        cycleLength: defaultSchoolYearConfig.cycleLength,
        schoolYearStart: defaultSchoolYearConfig.schoolYearStart,
        schoolYearEnd: defaultSchoolYearConfig.schoolYearEnd,
        exportMapping: defaultExportMapping,
        selectedDates: [],
        activeDate: null,
        updateDay: (date, updates) => {
          const state = get();
          const existing = state.days[date];
          if (!existing) return;
          const nextDays = { ...state.days, [date]: { ...existing, ...updates } };
          const recalculated = recalculateCycles(nextDays, state.cycleLength, state.schoolYearStart, date);
          set({ days: recalculated, activeDate: date });
        },
        applyBatchUpdate: (dates, updates) => {
          const state = get();
          if (dates.length === 0) return;
          let nextDays = { ...state.days };
          for (const date of dates) {
            const day = nextDays[date];
            if (!day) continue;
            nextDays[date] = {
              ...day,
              ...(updates.type ? { type: updates.type } : {}),
              ...(updates.isLessonSuspended !== undefined ? { isLessonSuspended: updates.isLessonSuspended } : {}),
              ...(updates.countsAs190 !== undefined ? { countsAs190: updates.countsAs190 } : {}),
              ...(updates.event ? { events: Array.from(new Set([...day.events, updates.event])) } : {}),
            };
          }
          const startDate = dates.slice().sort()[0];
          nextDays = recalculateCycles(nextDays, state.cycleLength, state.schoolYearStart, startDate);
          set({ days: nextDays, selectedDates: dates, activeDate: startDate });
        },
        setSelectedDates: (dates) => set({ selectedDates: dates }),
        setActiveDate: (date) => set({ activeDate: date }),
        setCycleLength: (length) => {
          const state = get();
          const nextDays = recalculateCycles(state.days, length, state.schoolYearStart, state.schoolYearStart);
          set({ cycleLength: length, days: nextDays });
        },
        applyPublicHolidays: (holidays, overwriteExisting) => {
          const state = get();
          let appliedCount = 0;
          for (const holiday of holidays) {
            const current = state.days[holiday.date];
            if (!current) continue;
            if (!overwriteExisting && (current.isLocked || current.type !== DayType.Normal || current.events.length > 0)) {
              continue;
            }
            appliedCount += 1;
          }
          const injected = injectPublicHolidays(state.days, holidays, overwriteExisting);
          const recalculated = recalculateCycles(
            injected,
            state.cycleLength,
            state.schoolYearStart,
            state.schoolYearStart,
          );
          set({ days: recalculated });
          return appliedCount;
        },
        importTemplateUpdates: (updates, overwriteExisting) => {
          const state = get();
          const nextDays = { ...state.days };
          let appliedCount = 0;

          for (const [date, patch] of Object.entries(updates)) {
            const current = nextDays[date];
            if (!current || !patch) continue;
            if (!overwriteExisting && (current.type !== DayType.Normal || current.events.length > 0 || current.isLocked)) {
              continue;
            }
            nextDays[date] = {
              ...current,
              ...patch,
            };
            appliedCount += 1;
          }

          const recalculated = recalculateCycles(
            nextDays,
            state.cycleLength,
            state.schoolYearStart,
            state.schoolYearStart,
          );
          set({ days: recalculated });
          return appliedCount;
        },
        replaceCalendarState: (snapshot) => {
          set({
            days: snapshot.days,
            cycleLength: snapshot.cycleLength,
            schoolYearStart: snapshot.schoolYearStart,
            schoolYearEnd: snapshot.schoolYearEnd,
            exportMapping: snapshot.exportMapping,
            selectedDates: [],
            activeDate: null,
          });
        },
        setExportMapping: (mapping) => {
          const state = get();
          set({
            exportMapping: {
              ...state.exportMapping,
              ...mapping,
            },
          });
        },
        undo: () => {
          const temporalState = useCalendarStore.temporal.getState();
          if (temporalState.pastStates.length > 0) temporalState.undo();
        },
        redo: () => {
          const temporalState = useCalendarStore.temporal.getState();
          if (temporalState.futureStates.length > 0) temporalState.redo();
        },
      }),
      {
        name: "school-calendar-storage",
        storage: createJSONStorage(() => localStorage),
        skipHydration: true,
        partialize: (state) => ({
          days: state.days,
          cycleLength: state.cycleLength,
          schoolYearStart: state.schoolYearStart,
          schoolYearEnd: state.schoolYearEnd,
          exportMapping: state.exportMapping,
        }),
      },
    ),
    {
      partialize: (state) => ({
        days: state.days,
        cycleLength: state.cycleLength,
        exportMapping: state.exportMapping,
      }),
      limit: 50,
    },
  ),
);
