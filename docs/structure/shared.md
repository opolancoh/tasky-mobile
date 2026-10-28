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
├── notifications/     permission.ts (the one permission, our ask sheet's state), push.ts (register the push token), NotificationAskSheet.tsx, reminders.ts (sync the phone's reminders with GET /me/reminders), useReminders.ts (ReminderSync, mounted in App)
├── appInfo.ts             This app's version, build number (store builds), Expo Go or not, where to update (M46, M48)
├── errors/                Error reports (M89)
│   ├── errorReports.ts    The reports on this phone (Zustand persisted to AsyncStorage, the newest 50), recordError, sendReports (plain fetch, the token only for the signed-in person's own; Pending on failure), sendPending
│   ├── captureErrors.ts   installErrorCapture: the global handler (a fatal error sets `crashed`) and Hermes' unhandled-rejection tracker (API errors skipped)
│   ├── breadcrumbs.ts     The last 20 screens and API calls (breadcrumbRecorder, addScreenCrumb), the current screen, a failed call's traceId in the last minute
│   ├── ErrorBoundary.tsx  At the root; CrashScreen.tsx: Something went wrong, Restart, View report
│   └── reportText.ts      A report as text, for Share and Copy
├── network/
│   ├── networkLog.ts      The Network log: the last 100 API calls while recording (networkRecorder feeds it), M53
│   ├── cantConnect.ts     Can't connect's capsule (showCantConnect, once per failure) and what its Try again repeats (M90)
│   └── NetworkLogAccess.tsx  Mounted in App: records only while /me has a platform role
├── links/
│   └── pendingLinkStore.ts  A join link kept until someone is signed in; an invitation's email for sign-up (D95)
├── selection/             Bulk actions (M81)
│   ├── selectionStore.ts  Which tasks are picked, in which screen (route key); useSelectionScope (start, ends on blur and Android's back), useRowSelection, selectable()
│   ├── useBulkActions.ts  Complete, Date, Assign, Move, Flag, Put on hold, Delete: one request per task with its newest cached version, 4 at a time, optimistic rows (editRows), failed ones stay picked, one toast with one Undo
│   ├── SelectionBar.tsx   The bar of six labelled actions (progress over 10 tasks); SelectionCancel, SelectionTitle, SelectionAll for the header; SelectionTopBar where there's no header (Search)
│   ├── SelectCheck.tsx    A picked row's round check
│   └── BulkSheet.tsx      Date, Move and Assign (people in every selected list) for the selection; mounted in App
├── browseSheet/
│   └── browseSheetStore.ts  Which Browse sheet is open (new or edited list, team, tag); useShowBrowseSheet opens it from any screen
├── quickAdd/
│   └── quickAddStore.ts   Quick add open or closed; show({ title, dueDate, taskListId, onAdded }) from the tab bar +, due on a day from Calendar (M72), or on a list from its Add a task (M103)
├── session/
│   ├── sessionStore.ts    App-wide state (Zustand); updateRequired after a 426 (M48)
│   ├── SessionProvider.tsx  useSession(): launch, sign in, sign out, retry
│   ├── pendingSignOut.ts  A sign-out made offline, kept in SecureStore and sent at launch or on coming back (M88)
│   ├── homeCacheStore.ts  Home's last GET /home per user, on the device; cleared on sign-out (M105)
├── components/            Domain pieces several features use; import from '@/shared/components'
│   ├── TaskListIcon.tsx   TaskListPicker.tsx   recentListsStore.ts   DueDatePicker.tsx   ReminderPicker.tsx   ReminderIcon.tsx   TaskRow.tsx   TaskOrigin.tsx
│   ├── UpdateRow.tsx   useActivityState.ts   Faces.tsx (Avatar)   MeButton.tsx   BarTitle.tsx
│   ├── BrowseRow.tsx   CompletedRow.tsx   CompletedHeading.tsx   (rows Home and Spaces share, M105)
│   ├── LoadError.tsx      A screen whose first load failed: the Can't connect page, or the error in a Notice, with Try again (M90)
│   └── tags/                TagPicker  TagsRow  tagItems.ts (TagItem, sortByRecent)  recentTagsStore.ts
├── hooks/
│   ├── useDateLabels.ts   "Today", "Tomorrow", "Wed, Oct 7"; reminder text
│   ├── usePullRefresh.tsx  Pull to refresh on every list screen
│   └── foldedListsStore.ts  The lists (and Home's views) whose Completed the user folded, per user, on the device (M63, M105)
└── i18n/
    ├── i18n.ts            i18next setup, device language and time zone
    ├── en.json  es.json   Every string
    └── errors.ts          errorMessage(), fieldErrors(), toastError() (an error with no form to show it in, M56; Can't connect's capsule, M90)
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
| `Screen` | Every screen's root: background, safe areas, side padding, optional scrolling (`scrollRef` to scroll it, e.g. to an error at the top), which ends right above the keyboard on the UI thread; `footer` (with `scroll`): docked under the content, above the keyboard (Task detail's comment field, M82) |
| `Sheet` | The large size by default ([M28](../../../azignia-docs/design/clients/apps/06-mobile.md#decisions)): its top just below the status bar, never resized by typing or filtering; `size="fit"` only for Quick add's form (M29). A bottom sheet over the whole app: optional title, left and right actions (text, an icon, or both), an optional `footer` kept above the keyboard; dismissed by tapping outside (`onBackdropPress`) or Android's back. An overlay, not a native Modal: mount it at the app root, after the navigator. Animates and follows the keyboard on the UI thread (Reanimated, `useAnimatedKeyboard`). A header action can be `busy` (a small spinner after 300 ms, M27, M56) |
| `ListRow` | A settings-style row: icon, label, value or a two-line detail, chevron, check mark or ✕ to clear; a divider below; `busy` while saving what the tap chose (a spinner in the chevron's place, M56) |
| `confirm` | `await confirm({ title, message, confirmLabel, cancelLabel })`: an action sheet on iOS, an alert on Android. **Every delete asks through it**, and so does discarding edits. `chooseAction({ title, actions, cancelLabel })`: a native menu of actions for one thing (Browse's long press and •••); resolves the index or null |
| `inform` | `inform(title, message, okLabel)`: an alert with one button that explains something (the List page's ⓘ, M111) |
| `askReason` | `await askReason({ title, message, confirmLabel, cancelLabel, placeholder, maxLength })` (M101, `ReasonSheet.tsx`, `ReasonSheetHost` at the app root): a fit sheet with Cancel and the action (red) in its bar, the message and an optional text field, the same on iOS and Android; resolves the reason ('' when none) or null |
| `chooseAction` | `await chooseAction({ title, actions, cancelLabel })` (M64): a menu for one thing (•••, a long press) as a sheet from the bottom, the same on iOS and Android; each action may have an `icon`, a `value`, `selected` (a check) or `more` (a chevron, it opens another menu). Resolves the index or null. Drawn by `ActionSheetHost`, mounted in App |
| `Pill` | A small rounded button for one action in a row or a chip under a heading ("Join", "Accept", "⚑ 3 important"): `accent`, `quiet` or `danger`, 32 pt with a 44 pt hit area; `busy` while saving (M56) |
| `TextButton` | A text-only action in a header or beside a field or row (Save, Invite, Revoke): `accent` or `quiet`, 44 pt target, `busy` while saving (M56) |
| `useDelayedFlag` | Busy controls (M56): disabled and busy for screen readers at once, the spinner only after 300 ms (`BUSY_DELAY_MS`), so a fast answer shows none. Screens pass `busy={mutation.isPending}`, nothing more |
| `Skeleton`, `SkeletonRow`, `SkeletonSection` | A grey placeholder with a soft shimmer (UI thread; still with Reduce Motion; hidden from screen readers), a task-row-shaped one: circle and two lines ([M27](../../../azignia-docs/design/clients/apps/06-mobile.md#decisions)), and a section: heading, then lines or a box. A screen's skeleton is rough on purpose (M108): the top as laid out, from each row's own skeleton kept beside it (`FieldRowSkeleton`, `BrowseRowSkeleton`), the rest generic sections, nothing conditional; change it only when the screen's shape changes |
| `Spinner` | A ring that spins (faint accent track, one accent arc; Reanimated), the same on iOS and Android; the saving state of a task's circle (M75) |
| `Toast` | `useToast.getState().show({ message, action, icon })` from anywhere; `ToastHost` (mounted in App) shows it above the tab bar, with one action such as Undo; with `icon` it is a capsule (Can't connect, M90) |
| `WheelColumn`, `WheelFrame` | One snapping wheel column (rows fade and shrink with native-driver animations, no re-render while scrolling; adjustable for screen readers; a haptic tick on change) and the band behind the columns |
| `ClearButton` | The ✕ that clears a value: 44 pt target drawn like a 20 pt chevron, flush with the row's padding |
| `SectionLabel` | Small upper-case heading over a group of rows ("ALL TAGS", "CUSTOM"); `action`: one icon at its right (a section's Share, M91); `info`: a grey ⓘ right after the words that explains the section (the List page's kinds of lists, M111) |
| `Segmented` | A segmented control: equal segments on a grey track, the chosen one raised (`options`, `value`, `onChange`); unused since M94 moved Important's order and Assigned by me's switch into ••• |
| `ColorDot` | A list or tag color swatch; ink3 when none. `faint(color, scheme)`: the same color faint, for a tile behind a dot or "#" (Browse rows) |
| `SearchField` | A rounded search box with ✕; takes its placeholder and clear label as props; `busy` spins a ring in place of the magnifier |
| `DateWheel` | Day, month name, year (that order in every language); keeps the day inside shorter months; `min` (turning before it picks it, the column goes back if nothing changes); a past value shows with its own year; value `"2026-09-30"` |
| `TimeWheel` | Hour, minute (15-minute steps by default; a value between steps, 09:10, gets its own row), AM/PM when the locale uses it; `min` (as DateWheel's); value always 24-hour `"09:00"` |

**Colors live only in `palettes/`** ([M10](../../../azignia-docs/design/clients/apps/06-mobile.md#decisions)): `azure.json` (light and dark), checked against `PaletteColors` in `types.ts`, which also lists the contrast minimums. `useTheme()` gives the active palette, light or dark from the OS. Lint rejects color literals anywhere else.

## components/

May use `data` types and `shared/ui`; knows tasks, tags, lists.

| Piece | Purpose |
|---|---|
| `TaskListIcon` | The Inbox tray or the list's color dot |
| `ReminderIcon` | A reminder's mark everywhere: the hub's alarm clock (Ionicons `alarm-outline`; Feather has none). Never the bell, which is Activity |
| `UpdateRow` | A notification: unread dot, icon, one line and when (Today's Updates, Activity). Needs you (Respond, Confirm), something to see, or nowhere to go, from `useActivityState` (M58) |
| `Avatar` | Initials in a circle, colors by a hash of the user id (pickers, Me, a task row's assignee) |
| `AssigneePicker`, `givesOutside` | Who a task is assigned to: the list's people (`GET /task-lists/{id}/members`), you first as Me, the chosen one with its status, Unassign (Task detail, Quick add; M43); on Personal and the user's private lists, Only this task with `PeoplePicker` (D70, D88, M45, M73) |
| `askDecline` | Declining a task given to you (M101): `askReason` with the Decline strings (`assign.decline*`), from Task detail and Home's Requests |
| `PeoplePicker` | Finding someone instead of typing an email (M73, D89): a search field; empty, the people the user works with most (`GET /people`, `usePeople`, kept 5 minutes); typing searches after 250 ms, colleagues under Your company; a typed email ends with Invite by email / Give it by email. Used by `AssigneePicker`'s Only this task and People's Invite |
| `MeButton` | The user's avatar at the top right of Home; opens Me (M39) |
| `BarTitle`, `useBarTitle` | A list screen's title in the bar once its own scrolled away, over "16 open · Soonest" (M94): pass `onScroll` to the FlashList, `BarTitle` as `headerTitle`. Fades on the UI thread; the bar's hairline turns on while scrolled |
| `TaskRow`, `TaskMeta`, `TaskMarks` | Every task row (06-mobile.md, HIG rules): round checkbox (completes), title at most 2 lines, `TaskMeta` (list · when · progress · assignment, joined by “·”; `showTime` for Today's reminder time), then `TaskMarks` at the right (the flag, the initials of whoever has it, you included, except in the Inbox, M44) and at most one `action`; a task completed for the user waits ticked, with Confirm (D71, M45); `onPress` opens it; `selectable` (M81): a long press starts selecting, then a tap picks it (a round check, the row tinted). Search's row uses `TaskMeta` and `TaskMarks` |
| `CheckCircle`, `useTaskCheck`, `useTaskSaving`, `easeNextLayout` | A task's round checkbox (M75, option A): a tap eases the list and moves the task at once (`moveTask`); while it saves the circle is a spinner and the whole row takes no taps (`useTaskSaving`), then the check pops back. Used by `TaskRow`, Home's rows, Completed rows, search and Task detail (`size` 28): every place a task is completed or reopened |
| `TaskOrigin` | Where a task comes from in a meta line: its list, or "From Olga" for a task seen only as its assignee (D70) |
| `TaskListPicker` | The List page (M111): a search, Recent (the last 3 picked, `useRecentLists` on the device), then All lists (an ⓘ explains the kinds of lists, `inform`), Personal first, then private, shared and team lists, each saying what it is (Private, Shared, Team · name); the chosen one checked; a tap picks (Quick add, task detail); `note` under the search for a narrowed set; skeleton rows while `loading` |
| `DueDatePicker` | Today, Tomorrow, Next week, a custom date on the wheel, No date (Quick add, task detail); opens with the set date checked, a date that isn't a quick choice on Custom with the wheel open; with no date the wheel starts on today and sets nothing until it turns |
| `TagPicker` | Search or create, picked tags, all tags last used first ([M16](../../../azignia-docs/design/clients/apps/06-mobile.md#decisions)) |
| `TagsRow` | A form's Tags row: the picked tags as colored chips, ✕ to clear |
| `ReminderPicker` | Four quick choices, a custom date and time (wheels; a reminder that isn't a quick choice opens on its date wheel; nothing before the next quarter hour, M95), Remove ([M15](../../../azignia-docs/design/clients/apps/06-mobile.md#decisions)) |
| `sortByRecent`, `useRecentTags` | Tags in last-used order; the last 10 used, per user, on this device |
| `BrowseRow`, `BrowseRowSkeleton`, `SharedMark`, `OwnerMark` | A Spaces and Home row (M38, M105): a 30 pt tile, the name (a line under it with `sub`), an aside, the count (hidden at 0 unless `zero`), a chevron; arrows in Edit |
| `CompletedRow` | A completed task: the filled circle reopens it, the title struck through, its list under it |
| `CompletedHeading` | A list's Completed heading: a tap folds or unfolds it, its count beside it (M63, M105) |

## hooks/

| Hook | Purpose |
|---|---|
| `useDateLabels(today)` | `day(date)`: "Today", "Tomorrow" or "Wed, Oct 7"; `reminder(at)`: "Wed, 9:00 AM"; `time("09:00")`: "9:00 AM", in the app's language |
| `usePullRefresh(...queries)` | Every list screen's `refreshControl`: a pull refetches the screen's queries (those enabled) |
| `useFoldedLists` | Whether a list's Completed is folded (open by default), per user, on the device: a task list by id, Home's views by name (`today`, `important`, `assigned`, `assignedBy`) (M63, M105) |

## notifications/

Reminders as local notifications ([M42](../../../azignia-docs/design/clients/apps/06-mobile.md#decisions), D11). `syncReminders(timeZone)` keeps the nearest 50 scheduled at their date and time in the profile's zone (one run at a time); `ReminderSync` runs it at launch, on foreground, on a time zone change, once allowed and after saved changes. Sign-out clears them (`clearReminders`).

Push (M85, D97). **One permission** for both (`permission.ts`, `useNotificationPermission`): never asked by the phone first; `askForNotifications()` shows `NotificationAskSheet` (one line, Turn on or Not now) when it matters: a reminder set, or a mutation whose `meta.asksNotifications` says so (giving a task to someone, a team created, an invite, joining). `push.ts`: `registerPush()` sends the Expo push token to `PUT /me/devices/{installId}` (an install id kept in SecureStore), skipped in Expo Go; `unregisterPush()` before sign-out (false when offline: the sign-out stays pending, `session/pendingSignOut.ts`, M88); `usePushToken` for Me › About. The notification handler (`reminders.ts`) shows reminders as banners and no banner for a push with the app open. `app/PushWatcher.tsx` does the rest (taps, badge, refresh).

## session/

| Piece | Purpose |
|---|---|
| `sessionStore.ts` | Status (`loading`, `signedIn`, `signedOut`, `unreachable`), the current user and `updateRequired` (the API answered 426, M48). No current workspace (M31). Readable outside React ([M13](../../../azignia-docs/design/clients/apps/06-mobile.md#decisions)) |
| `SessionProvider.tsx` | Launch, sign in, sign out, retry; `useIsSignedIn()` and friends pick the navigation group |
| `pendingSignOut.ts` | A sign-out the API didn't hear (offline, M88): the refresh token and, if its push device wasn't removed, the install id, in SecureStore; `retryPendingSignOut()` at launch and on coming back removes the device and ends the session, then forgets it |
| `homeCacheStore.ts` | Home's last `GET /home` for the signed-in user, kept on the device (AsyncStorage): Home shows it at once on launch while it refreshes; cleared on sign-out or when the session ends (M105) |

How they're used: [Auth](../auth/README.md).

## i18n/

- English and Spanish. The profile's language wins once signed in; before that, the device's.
- Every string is in `en.json` and `es.json`; screens use `t('area.key')`.
- API errors are shown by their `code` (`errors.<code>`), never by the API's text.

---

← [features](features.md) · ↑ [Structure](README.md)
