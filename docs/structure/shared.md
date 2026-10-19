[Azignia mobile](../../README.md) › [Structure](README.md) › shared

# `src/shared`

What several features use: the design system, the session and translations.

```
src/shared/
├── ui/                    The design system; import from '@/shared/ui'
│   ├── Text  Button  TextField  Notice  RuleCheck  Logo  Screen  Sheet  ListRow
│   ├── ClearButton  SectionLabel  Segmented  ColorDot  SearchField  Toast  confirm  ActionSheet  Skeleton  Pill  TextButton
│   ├── useDelayedFlag.ts  The 300 ms before a busy control shows its spinner (M56)
│   ├── WheelColumn  DateWheel  TimeWheel   Wheel pickers
│   ├── theme.tsx          ThemeProvider, useTheme()
│   ├── tokens.ts          Spacing, radius, type scale, fonts
│   └── palettes/          One JSON file per palette; active.json names the one in use
├── notifications/     reminders.ts (sync the phone's reminders with GET /me/reminders, permission state), useReminders.ts (ReminderSync, mounted in App)
├── appInfo.ts             This app's version, build number (store builds), Expo Go or not, where to update (M46, M48)
├── network/
│   ├── networkLog.ts      The Network log: the last 100 API calls while recording (networkRecorder feeds it), M53
│   └── NetworkLogAccess.tsx  Mounted in App: records only while /me has a platform role
├── selection/             Bulk actions (M81)
│   ├── selectionStore.ts  Which tasks are picked, in which screen (route key); useSelectionScope (start, ends on blur and Android's back), useRowSelection, selectable()
│   ├── useBulkActions.ts  Complete, Date, Assign, Move, Flag, Put on hold, Delete: one request per task with its newest cached version, 4 at a time, optimistic rows (editRows), failed ones stay picked, one toast with one Undo
│   ├── SelectionBar.tsx   The bar of six labelled actions (progress over 10 tasks); SelectionCancel, SelectionTitle, SelectionAll for the header; SelectionTopBar where there's no header (Search)
│   ├── SelectCheck.tsx    A picked row's round check
│   └── BulkSheet.tsx      Date, Move and Assign (people in every selected list) for the selection; mounted in App
├── browseSheet/
│   └── browseSheetStore.ts  Which Browse sheet is open (new or edited list, team, tag); useShowBrowseSheet opens it from any screen, e.g. Home's Make a list (M67)
├── quickAdd/
│   └── quickAddStore.ts   Quick add open or closed; show(title?, page?, dueDate?) from the tab bar +, on its due date or reminder picker from Home (M67), or due on a day from Calendar (M72)
├── session/
│   ├── sessionStore.ts    App-wide state (Zustand); updateRequired after a 426 (M48)
│   ├── SessionProvider.tsx  useSession(): launch, sign in, sign out, retry
├── components/            Domain pieces several features use; import from '@/shared/components'
│   ├── TaskListIcon.tsx   TaskListPicker.tsx   DueDatePicker.tsx   ReminderPicker.tsx   TaskRow.tsx   TaskOrigin.tsx
│   ├── UpdateRow.tsx   useActivityState.ts   Faces.tsx (Avatar)   MeButton.tsx
│   └── tags/                TagPicker  TagsRow  tagItems.ts (TagItem, sortByRecent)  recentTagsStore.ts
├── hooks/
│   └── useDateLabels.ts   "Today", "Tomorrow", "Wed, Oct 7"; reminder text
└── i18n/
    ├── i18n.ts            i18next setup, device language and time zone
    ├── en.json  es.json   Every string
    └── errors.ts          errorMessage(), fieldErrors(), toastError() (an error with no form to show it in, M56)
```

Before writing something new in a feature, look here and in `core/`. When a second feature needs a piece, move it here (strings to a neutral namespace such as `tags.*`, `reminders.*`, `dates.*`).

## ui/

Knows nothing about tasks; takes variants, not colors (`<Button variant="primary">`).

| Piece | Purpose |
|---|---|
| `Text` | Every text, by variant (`largeTitle`, `title`, `body`, `callout`, `label`…) and color role |
| `Button` | `primary` (one per screen) or `link`; 44 pt minimum touch target; `loading` while saving (M56) |
| `TextField` | Label above, error or footer below, optional Show/Hide for passwords |
| `Notice` | A message above a form: error or info |
| `RuleCheck` | A rule that turns green as you type (password length) |
| `Logo` | The Azignia mark and name |
| `Screen` | Every screen's root: background, safe areas, side padding, optional scrolling (`scrollRef` to scroll it, e.g. to an error at the top); `followKeyboard` lifts the content above the keyboard on the UI thread, for a list with a field docked at its bottom (M62); `footer` (with `scroll`): docked under the content, above the keyboard (Task detail's comment field, M82) |
| `Sheet` | The large size by default ([M28](../../../azignia-docs/design/clients/apps/06-mobile.md#decisions)): its top just below the status bar, never resized by typing or filtering; `size="fit"` only for Quick add's form (M29). A bottom sheet over the whole app: optional title, left and right actions (text, an icon, or both), an optional `footer` kept above the keyboard; dismissed by tapping outside (`onBackdropPress`) or Android's back. An overlay, not a native Modal: mount it at the app root, after the navigator. Animates and follows the keyboard on the UI thread (Reanimated, `useAnimatedKeyboard`). A header action can be `busy` (a small spinner after 300 ms, M27, M56) |
| `ListRow` | A settings-style row: icon, label, value or a two-line detail, chevron, check mark or ✕ to clear; a divider below; `busy` while saving what the tap chose (a spinner in the chevron's place, M56) |
| `confirm` | `await confirm({ title, message, confirmLabel, cancelLabel })`: an action sheet on iOS, an alert on Android. **Every delete asks through it**, and so does discarding edits. `askReason(...)`: the same with an optional reason (a text prompt on iOS; Android, with no text alert, asks without it); resolves the reason or null. `chooseAction({ title, actions, cancelLabel })`: a native menu of actions for one thing (Browse's long press and •••); resolves the index or null |
| `chooseAction` | `await chooseAction({ title, actions, cancelLabel })` (M64): a menu for one thing (•••, a long press) as a sheet from the bottom, the same on iOS and Android; each action may have an `icon`, a `value`, `selected` (a check) or `more` (a chevron, it opens another menu). Resolves the index or null. Drawn by `ActionSheetHost`, mounted in App |
| `Pill` | A small rounded button for one action in a row or a chip under a heading ("Join", "Accept", "⚑ 3 important"): `accent`, `quiet` or `danger`, 32 pt with a 44 pt hit area; `busy` while saving (M56) |
| `TextButton` | A text-only action in a header or beside a field or row (Save, Invite, Revoke): `accent` or `quiet`, 44 pt target, `busy` while saving (M56) |
| `useDelayedFlag` | Busy controls (M56): disabled and busy for screen readers at once, the spinner only after 300 ms (`BUSY_DELAY_MS`), so a fast answer shows none. Screens pass `busy={mutation.isPending}`, nothing more |
| `Skeleton`, `SkeletonRow` | A grey placeholder with a soft shimmer (UI thread; still with Reduce Motion; hidden from screen readers), and a task-row-shaped one: circle and two lines ([M27](../../../azignia-docs/design/clients/apps/06-mobile.md#decisions)) |
| `Spinner` | A ring that spins (faint accent track, one accent arc; Reanimated), the same on iOS and Android; the saving state of a task's circle (M75) |
| `Toast` | `useToast.getState().show({ message, action })` from anywhere; `ToastHost` (mounted in App) shows it above the tab bar, with one action such as Undo |
| `WheelColumn`, `WheelFrame` | One snapping wheel column (rows fade and shrink with native-driver animations, no re-render while scrolling; adjustable for screen readers; a haptic tick on change) and the band behind the columns |
| `ClearButton` | The ✕ that clears a value: 44 pt target drawn like a 20 pt chevron, flush with the row's padding |
| `SectionLabel` | Small upper-case heading over a group of rows ("ALL TAGS", "CUSTOM") |
| `Segmented` | A segmented control: equal segments on a grey track, the chosen one raised (`options`, `value`, `onChange`); All tasks' order (M70) |
| `ColorDot` | A list or tag color swatch; ink3 when none. `faint(color, scheme)`: the same color faint, for a tile behind a dot or "#" (Browse rows) |
| `SearchField` | A rounded search box with ✕; takes its placeholder and clear label as props; `busy` spins a ring in place of the magnifier |
| `DateWheel` | Day, month name, year (that order in every language); keeps the day inside shorter months; value `"2026-09-30"` |
| `TimeWheel` | Hour, minute (15-minute steps by default), AM/PM when the locale uses it; value always 24-hour `"09:00"` |

**Colors live only in `palettes/`** ([M10](../../../azignia-docs/design/clients/apps/06-mobile.md#decisions)): `azure.json` (light and dark), checked against `PaletteColors` in `types.ts`, which also lists the contrast minimums. `useTheme()` gives the active palette, light or dark from the OS. Lint rejects color literals anywhere else.

## components/

May use `data` types and `shared/ui`; knows tasks, tags, lists.

| Piece | Purpose |
|---|---|
| `TaskListIcon` | The Inbox tray or the list's color dot |
| `UpdateRow` | A notification: unread dot, icon, one line and when (Today's Updates, Activity). Needs you (Respond, Confirm), something to see, or nowhere to go, from `useActivityState` (M58) |
| `Avatar` | Initials in a circle, colors by a hash of the user id (pickers, Me, a task row's assignee) |
| `AssigneePicker`, `givesOutside` | Who a task is assigned to: the list's people (`GET /task-lists/{id}/members`), you first as Me, the chosen one with its status, Unassign (Task detail, Quick add; M43); on Personal and the user's private lists, Only this task with `PeoplePicker` (D70, D88, M45, M73) |
| `PeoplePicker` | Finding someone instead of typing an email (M73, D89): a search field; empty, the people the user works with most (`GET /people`, `usePeople`, kept 5 minutes); typing searches after 250 ms, colleagues under Your company; a typed email ends with Invite by email / Give it by email. Used by `AssigneePicker`'s Only this task and People's Invite |
| `MeButton` | The user's avatar at the top right of Home; opens Me (M39) |
| `TaskRow` | A task in a list: round checkbox (completes), title at most 2 lines, meta (`TaskOrigin`, due, steps, repeat, Declined or Invited, a red flag last when important), the initials of whoever has it at the right, you included, except in the Inbox (M44); a task completed for the user waits ticked, with Confirm (D71, M45); `onPress` opens it; `selectable` (M81): a long press starts selecting, then a tap picks it (a round check, the row tinted) |
| `CheckCircle`, `useTaskCheck`, `useTaskSaving`, `easeNextLayout` | A task's round checkbox (M75, option A): a tap eases the list and moves the task at once (`moveTask`); while it saves the circle is a spinner and the whole row takes no taps (`useTaskSaving`), then the check pops back. Used by `TaskRow`, Home's rows, Completed rows, search and Task detail (`size` 28): every place a task is completed or reopened |
| `TaskOrigin` | Where a task comes from in a meta line: its list, or "From Olga" for a task seen only as its assignee (D70) |
| `TaskListPicker` | The lists the user can see, Inbox first, the chosen one checked; a tap picks (Quick add, task detail); skeleton rows while `loading` |
| `DueDatePicker` | Today, Tomorrow, Next week, a custom date on the wheel, No date (Quick add, task detail) |
| `TagPicker` | Search or create, picked tags, all tags last used first ([M16](../../../azignia-docs/design/clients/apps/06-mobile.md#decisions)) |
| `TagsRow` | A form's Tags row: the picked tags as colored chips, ✕ to clear |
| `ReminderPicker` | Four quick choices, a custom date and time (wheels), Remove ([M15](../../../azignia-docs/design/clients/apps/06-mobile.md#decisions)) |
| `sortByRecent`, `useRecentTags` | Tags in last-used order; the last 10 used, per user, on this device |

## hooks/

| Hook | Purpose |
|---|---|
| `useDateLabels(today)` | `day(date)`: "Today", "Tomorrow" or "Wed, Oct 7"; `reminder(at)`: "Wed, 9:00 AM"; `time("09:00")`: "9:00 AM", in the app's language |

## notifications/

Reminders as local notifications ([M42](../../../azignia-docs/design/clients/apps/06-mobile.md#decisions), D11). `syncReminders(timeZone)` keeps the nearest 50 scheduled at their date and time in the profile's zone (one run at a time); `ReminderSync` runs it at launch, on foreground, on a time zone change and after saved changes, and opens a tapped reminder's task. Permission is asked when the first reminder exists; `useReminderPermission` tells Me. Sign-out clears them (`clearReminders`).

## session/

| Piece | Purpose |
|---|---|
| `sessionStore.ts` | Status (`loading`, `signedIn`, `signedOut`, `unreachable`), the current user and `updateRequired` (the API answered 426, M48). No current workspace (M31). Readable outside React ([M13](../../../azignia-docs/design/clients/apps/06-mobile.md#decisions)) |
| `SessionProvider.tsx` | Launch, sign in, sign out, retry; `useIsSignedIn()` and friends pick the navigation group |

How they're used: [Auth](../auth/README.md).

## i18n/

- English and Spanish. The profile's language wins once signed in; before that, the device's.
- Every string is in `en.json` and `es.json`; screens use `t('area.key')`.
- API errors are shown by their `code` (`errors.<code>`), never by the API's text.

---

← [features](features.md) · ↑ [Structure](README.md)
