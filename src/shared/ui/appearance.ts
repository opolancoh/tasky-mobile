import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** How the app looks (M68): follow the phone, or always light or dark. */
export type AppearanceChoice = 'system' | 'light' | 'dark';

/** The user's Appearance (Me › Appearance, M68), kept on this device for every account on it. Light until changed. */
export const useAppearance = create<{ appearance: AppearanceChoice; setAppearance(appearance: AppearanceChoice): void }>()(
  persist(
    (set) => ({
      appearance: 'light',
      setAppearance: (appearance) => set({ appearance }),
    }),
    { name: 'azignia.appearance', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

/** True once the stored Appearance is read, so the first screen draws in it (the splash waits for this). */
export function useAppearanceHydrated() {
  const [hydrated, setHydrated] = useState(() => useAppearance.persist.hasHydrated());
  useEffect(() => useAppearance.persist.onFinishHydration(() => setHydrated(true)), []);
  return hydrated || useAppearance.persist.hasHydrated();
}
