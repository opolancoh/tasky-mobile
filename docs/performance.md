# Performance

How we keep the app smooth. Every screen follows these rules; checking them is part of "done", next to `npm run check`.

## Rules

1. **React Compiler is on** (`app.json` › `experiments.reactCompiler`). It memoizes components, values and callbacks for us, so we don't write `memo`, `useMemo` or `useCallback` by hand unless a measurement shows the compiler can't. Its lint rules (`react-hooks/*` from `eslint-plugin-react-hooks` 7, through `eslint-config-expo`) run in `npm run check`: fix them, don't silence them. A component the compiler skips loses that help.
2. **Keep fast-changing state local.** Text being typed, a wheel's position, a pressed state: keep it in the smallest component that needs it, so a keystroke redraws one field, not the screen. Lift it only when a parent really needs every change.
3. **Lists use FlashList** (`@shopify/flash-list`), not a `ScrollView` with `.map`, once a list can grow (tasks, search results, notifications). Give rows a stable `key`, keep row components small, and don't build new objects for every row in the parent.
4. **Never build `Intl` objects in render or in a loop.** `Intl.DateTimeFormat`, `Intl.Collator` and `String.localeCompare` cost milliseconds each in Hermes. Reuse one per locale and options: `core/dates/localDate.ts` caches formatters; sort with a shared `Intl.Collator`.
5. **Animate on the UI thread.** New animations use Reanimated (installed); React Native's `Animated` only with `useNativeDriver: true`. Never drive an animation from React state.
6. **Keyboard on the UI thread where it moves things.** `Sheet` follows the keyboard with Reanimated's `useAnimatedKeyboard` (a shared value, no re-render), only while it is shown. Don't track the keyboard height in React state. Screens use `Screen scroll` (React Native's `KeyboardAvoidingView`). Sheets are overlays mounted at the app root, not native `Modal`s. We stay on Expo Go, so only libraries Expo Go ships: `react-native-keyboard-controller` (the usual choice) needs a development build; revisit if we move to one.
7. **Read stores through selectors.** `useStore((s) => s.field)`, never the whole store. Context values are memoized (`ThemeProvider`, `SessionProvider` do it); a context that changes often belongs in a Zustand store instead.
8. **Server data through React Query** with the shared `staleTime`; don't copy query data into component state.
9. **Images with `expo-image`**, sized to what is shown.

## Measuring

The development build in the simulator is slower than a real build, which makes problems easy to see. Keep developing there, and use:

- **Perf Monitor** (Cmd+D in the simulator › Perf Monitor). If the JS frame rate drops while you type or scroll, the cause is our code; if it stays near 60 and the UI still lags, look at native code or the simulator.
- **React DevTools Profiler** (press `j` in the Expo terminal; turn on "Highlight updates when components render"). Shows what redraws on each keystroke or tap.
- **A release build** before calling a screen done, to tell real lag from development overhead:

  ```bash
  npx expo run:ios --configuration Release
  ```

After changing `app.json` or Babel settings, restart Metro with a clean cache: `npx expo start --clear`. We run in Expo Go (`npx expo start`, simulators and the QR code on a phone): add only libraries Expo Go includes (`npx expo install` picks the right version).
