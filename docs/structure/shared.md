[Tasky mobile](../../README.md) › [Structure](README.md) › shared

# `src/shared`

What several features use: the design system, the session and translations.

```
src/shared/
├── ui/                    The design system; import from '@/shared/ui'
│   ├── Text  Button  TextField  Notice  RuleCheck  Logo  Screen  Sheet  ListRow
│   ├── ClearButton  SectionLabel  ColorDot  SearchField  Toast  confirm  Skeleton
│   ├── WheelColumn  DateWheel  TimeWheel   Wheel pickers
│   ├── theme.tsx          ThemeProvider, useTheme()
│   ├── tokens.ts          Spacing, radius, type scale, fonts
│   └── palettes/          One JSON file per palette; active.json names the one in use
├── session/
│   ├── sessionStore.ts    App-wide state (Zustand)
│   ├── SessionProvider.tsx  useSession(): launch, sign in, sign out, retry
│   └── useCurrentWorkspace.ts
├── components/            Domain pieces several features use; import from '@/shared/components'
│   ├── CollectionIcon.tsx   CollectionPicker.tsx   DueDatePicker.tsx   ReminderPicker.tsx   TaskRow.tsx
│   └── tags/                TagPicker  TagsRow  tagItems.ts (TagItem, sortByRecent)  recentTagsStore.ts
├── hooks/
│   └── useDateLabels.ts   "Today", "Tomorrow", "Wed, Oct 7"; reminder text
└── i18n/
    ├── i18n.ts            i18next setup, device language and time zone
    ├── en.json  es.json   Every string
    └── errors.ts          errorMessage(), fieldErrors()
```

Before writing something new in a feature, look here and in `core/`. When a second feature needs a piece, move it here (strings to a neutral namespace such as `tags.*`, `reminders.*`, `dates.*`).

## ui/

Knows nothing about tasks; takes variants, not colors (`<Button variant="primary">`).

| Piece | Purpose |
|---|---|
| `Text` | Every text, by variant (`largeTitle`, `title`, `body`, `callout`, `label`…) and color role |
| `Button` | `primary` (one per screen) or `link`; 44 pt minimum touch target |
| `TextField` | Label above, error or footer below, optional Show/Hide for passwords |
| `Notice` | A message above a form: error or info |
| `RuleCheck` | A rule that turns green as you type (password length) |
| `Logo` | The Tasky mark and name |
| `Screen` | Every screen's root: background, safe areas, side padding, optional scrolling |
| `Sheet` | The large size by default ([M28](../../../tasky-docs/design/clients/apps/06-mobile.md#decisions)): its top just below the status bar, never resized by typing or filtering; `size="fit"` only for Quick add's form (M29). A bottom sheet over the whole app: optional title, left and right actions (text, an icon, or both), an optional `footer` kept above the keyboard; dismissed by tapping outside (`onBackdropPress`) or Android's back. An overlay, not a native Modal: mount it at the app root, after the navigator. Animates and follows the keyboard on the UI thread (Reanimated, `useAnimatedKeyboard`). A header action can be `busy` (a small spinner, M27) |
| `ListRow` | A settings-style row: icon, label, value or a two-line detail, chevron, check mark or ✕ to clear; a divider below |
| `confirm` | `await confirm({ title, message, confirmLabel, cancelLabel })`: an action sheet on iOS, an alert on Android. **Every delete asks through it**, and so does discarding edits |
| `Skeleton`, `SkeletonRow` | A grey placeholder with a soft shimmer (UI thread; still with Reduce Motion; hidden from screen readers), and a task-row-shaped one: circle and two lines ([M27](../../../tasky-docs/design/clients/apps/06-mobile.md#decisions)) |
| `Toast` | `useToast.getState().show({ message, action })` from anywhere; `ToastHost` (mounted in App) shows it above the tab bar, with one action such as Undo |
| `WheelColumn`, `WheelFrame` | One snapping wheel column (rows fade and shrink with native-driver animations, no re-render while scrolling; adjustable for screen readers; a haptic tick on change) and the band behind the columns |
| `ClearButton` | The ✕ that clears a value: 44 pt target drawn like a 20 pt chevron, flush with the row's padding |
| `SectionLabel` | Small upper-case heading over a group of rows ("ALL TAGS", "CUSTOM") |
| `ColorDot` | A collection or tag color swatch; ink3 when none |
| `SearchField` | A rounded search box with ✕; takes its placeholder and clear label as props |
| `DateWheel` | Day, month name, year (that order in every language); keeps the day inside shorter months; value `"2026-09-30"` |
| `TimeWheel` | Hour, minute (15-minute steps by default), AM/PM when the locale uses it; value always 24-hour `"09:00"` |

**Colors live only in `palettes/`** ([M10](../../../tasky-docs/design/clients/apps/06-mobile.md#decisions)): `azure.json` (light and dark), checked against `PaletteColors` in `types.ts`, which also lists the contrast minimums. `useTheme()` gives the active palette, light or dark from the OS. Lint rejects color literals anywhere else.

## components/

May use `data` types and `shared/ui`; knows tasks, tags, collections.

| Piece | Purpose |
|---|---|
| `CollectionIcon` | The Inbox tray or the collection's color dot |
| `TaskRow` | A task in a list: round checkbox (completes), title at most 2 lines, meta (the task's collection, due, steps, repeat), red flag when important; `onPress` opens it |
| `CollectionPicker` | The workspace's collections, Inbox first, the chosen one checked; a tap picks (Quick add, task detail); skeleton rows while `loading` |
| `DueDatePicker` | Today, Tomorrow, Next week, a custom date on the wheel, No date (Quick add, task detail) |
| `TagPicker` | Search or create, picked tags, all tags last used first ([M16](../../../tasky-docs/design/clients/apps/06-mobile.md#decisions)) |
| `TagsRow` | A form's Tags row: the picked tags as colored chips, ✕ to clear |
| `ReminderPicker` | Four quick choices, a custom date and time (wheels), Remove ([M15](../../../tasky-docs/design/clients/apps/06-mobile.md#decisions)) |
| `sortByRecent`, `useRecentTags` | Tags in last-used order; the last 10 used, per workspace, on this device |

## hooks/

| Hook | Purpose |
|---|---|
| `useDateLabels(today)` | `day(date)`: "Today", "Tomorrow" or "Wed, Oct 7"; `reminder(at)`: "Wed, 9:00 AM"; `time("09:00")`: "9:00 AM", in the app's language |

## session/

| Piece | Purpose |
|---|---|
| `sessionStore.ts` | Status (`loading`, `signedIn`, `signedOut`, `unreachable`), the current user, and the workspace each user last chose (saved in AsyncStorage). Readable outside React ([M13](../../../tasky-docs/design/clients/apps/06-mobile.md#decisions)) |
| `SessionProvider.tsx` | Launch, sign in, sign out, retry; `useIsSignedIn()` and friends pick the navigation group |
| `useCurrentWorkspace.ts` | The workspace every view shows: the saved choice, else the personal one |

How they're used: [Auth](../auth/README.md).

## i18n/

- English and Spanish. The profile's language wins once signed in; before that, the device's.
- Every string is in `en.json` and `es.json`; screens use `t('area.key')`.
- API errors are shown by their `code` (`errors.<code>`), never by the API's text.

---

← [features](features.md) · ↑ [Structure](README.md)
