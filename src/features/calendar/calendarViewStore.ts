import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** The Calendar tab's two views (M72). */
export type CalendarView = 'list' | 'calendar';

/** What the Calendar view shows: the whole month or the picked day's week (M72). */
export type CalendarMode = 'month' | 'week';

interface CalendarViewState {
  view: CalendarView;
  mode: CalendarMode;
  /** The Overdue group under the Calendar view's grid, folded (M99); folded at first. */
  overdueFolded: boolean;
  setView(view: CalendarView): void;
  setMode(mode: CalendarMode): void;
  setOverdueFolded(folded: boolean): void;
}

/** The Calendar tab's List | Calendar switch, its Month | Week choice (M72) and Overdue's fold (M99), kept on this device across launches. */
export const useCalendarView = create<CalendarViewState>()(
  persist(
    (set) => ({
      view: 'calendar',
      mode: 'month',
      overdueFolded: true,   // folded until opened (M99)
      setView: (view) => set({ view }),
      setMode: (mode) => set({ mode }),
      setOverdueFolded: (overdueFolded) => set({ overdueFolded }),
    }),
    { name: 'azignia.calendarView', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
