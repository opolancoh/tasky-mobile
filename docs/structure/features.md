[Azignia mobile](../../README.md) › [Structure](README.md) › features

# `src/features`

One folder per product area. A feature holds its screens at the top, `components/` used only by them, and hooks or helpers that combine data for them. A feature never imports another: it navigates to its screens by route name.

```
src/features/
├── auth/
│   ├── SignInScreen.tsx  SignUpScreen.tsx  VerifyCodeScreen.tsx
│   ├── ForgotPasswordScreen.tsx  ResetCodeScreen.tsx  NewPasswordScreen.tsx
│   ├── UnreachableScreen.tsx  UpdateRequiredScreen.tsx (after a 426, M48)
│   ├── components/       CodeInput, CodeStep
│   ├── signUpDraft.ts  resetDraft.ts
│   ├── useEmailField.ts
│   └── validation.ts
├── error-reports/  ErrorReportsScreen.tsx  ErrorReportScreen.tsx  statusTone.ts (Me › About › Error reports, everyone while testing, with Test an error, M89)
├── network-log/    NetworkLogScreen.tsx  NetworkLogEntryScreen.tsx  shareText.ts (Share, curl)  useSessionInfo.ts (Me › About, support and admin, M53)
├── today/          TodayScreen.tsx (Home, the first tab)  TodayListScreen.tsx (See all)  todaySections.ts  homeDismissedStore.ts (Requests dismissed from Home, M65)  components/HomeCards.tsx  components/RequestRows.tsx  components/NothingOpen.tsx (no open tasks, M67)  components/ActivityBell.tsx (M74)
│   └── components/       StreamRows (the rows Today and See all share)
├── sharing/        InvitationScreen.tsx
├── activity/       ActivityScreen.tsx (from Home's bell)
├── calendar/       CalendarScreen.tsx (the third tab)  MonthView (Calendar)  DaysView (List)  calendarViewStore.ts (List | Calendar and Month | Week, on the device)  useOverdue.ts  useCalendarLabels.ts
│   └── components/       CalendarHeader, MonthGrid, OverdueChip, DayHeading, AddTaskRow
├── me/             MeScreen.tsx (from the avatar)  EditNameScreen  TimeZoneScreen  LanguageScreen  AppearanceScreen (M68)  ChangePasswordScreen  SessionsScreen  AboutScreen (M48)  useHeaderSave
├── browse/         BrowseScreen.tsx (the tab)  TaskListScreen  TeamScreen  PeopleScreen  BrowseListScreen  ArchivedScreen  RecentlyDeletedScreen
│   ├── BrowseSheet.tsx   New/Edit list, New/Rename team, Edit tag (mounted in App; shared/browseSheet/browseSheetStore.ts says what)
│   ├── browseMenus.ts    The long-press and ••• menus, by role
│   ├── foldedListsStore.ts The lists whose Completed the user folded, per user, on the device (M63)
│   ├── foldedSectionsStore.ts The Spaces sections the user folded, per user, on the device (M70)
│   ├── assignedByGroupStore.ts Assigned by me's Person | Status switch, per user, on the device (M71)
│   ├── browseSections.ts Groups (Inbox, mine, shared with me, by team), reorder, who may do what
│   └── components/       BrowseRow, CompletedRow, AddTaskField (a list's docked add field, M62), Faces (Avatar)
├── search/         SearchScreen.tsx  SearchRow.tsx  recentSearchesStore.ts
├── quick-add/      QuickAddSheet.tsx  QuickAddBar.tsx  NotesPage.tsx (its store is shared/quickAdd)
└── task/
    ├── TaskDetailScreen.tsx  TaskFieldSheet.tsx
    ├── components/       StepList, RepeatPicker
    ├── taskDraft.ts      The draft (TaskDraft), the PATCH for Save (patchOf), rebase after a 412
    ├── taskDraftStore.ts The draft being edited (Zustand), useDirty
    ├── taskSheetStore.ts Which field's sheet is open (the sheet is mounted in App)
    ├── useRepeatText.ts  "Weekly on Monday", "Every 2 weeks on Mon, Thu"
    └── reminderOf.ts
```

## Areas

| Area | Screens | State |
|---|---|---|
| `auth` | Sign in, Sign up, Verify code, Forgot password, Reset code, New password, Can't reach Azignia | Built ([Auth docs](../auth/README.md)) |
| `today` | Home (first tab, M65; the route is still `Today`), See all (`TodayList`) | Built ([M33, M37, M65](../../../azignia-docs/design/clients/apps/06-mobile.md#decisions)) from `GET /home` (D67, D69, D86), over everything the user can see. The date and one line with what's next; four cards (`HomeCards`: Today with done of total, Overdue, Important, Personal), each opening its See all, except Important and Personal, which open the same screens as Spaces (`BrowseList` Important, the Personal `TaskList`); Requests (invitations with Decline / Join, assignments with Accept, follow-ups with Confirm; 3 rows; swipe left to dismiss from Home, kept per user on the device in `homeDismissedStore`, Undo in the toast; all dismissed → one Requests row), Today (5, reminder time), "All done for today", Assigned to me (3, from whom and when), Coming up (5, day); with nothing of those but open tasks somewhere, From your lists (3 undated tasks with Today, M66). Notifications are only in Activity, behind the bell beside the avatar (`ActivityBell`, with the unread count, M74). `TodayList` shows a whole section, 20 at a time as the list scrolls (Coming up under day headings, then Later, M39). Rows (`StreamRows`) are shared by both and open Task detail. No open task and nothing to answer (M67): the welcome line, the cards, a list's empty state (Nothing open here, or All done) and five rows to start. First load: skeletons (M27). FlashList. The avatar at the top opens Me (M39) |
| `sharing` | Invitation, pushed from Requests | Built ([M34](../../../azignia-docs/design/clients/apps/06-mobile.md#decisions)): who invited, people, open tasks or lists, expiry; Join in the header, Decline invitation (asks first) at the end; both go back with a toast. Links into the app (M84, D95): `JoinScreen` (Join …? from a link, a modal), `JoinPasteScreen` (Join with a link, from Spaces' Teams); links are caught by `app/LinkWatcher` and kept in `shared/links/pendingLinkStore` through sign-in |
| `task` | Task detail, pushed from task rows (Home's Today and Important) and `azignia://task/{id}` | Built ([M25](../../../azignia-docs/design/clients/apps/06-mobile.md#decisions)): title in place with the circle and the Important flag (red edge); rows for Task list, Assigned to (shared and team lists, M43), Due date, Reminder, Repeat, Tags (the value with ✕, or None and a chevron), each a page in `TaskFieldSheet` (shared pickers; `RepeatPicker` here); Skip for repeating tasks; steps (tick, rename, swipe to delete, add); notes; created and updated with who, in the profile's time zone; Delete with an Undo toast. Edits go into a draft saved with Save in the header (M26: one PATCH, D56; discard prompt on leaving); the circle, Skip and Delete act at once (`useChangeTask`, `useDeleteTask`). A task waiting for the caller's answer reads only, with no Save or Delete, and an Assignment row with Reject (optional reason, `askReason`) and Accept (M35). Comments (M82, D92): `components/CommentThread` (the thread after Notes: latest 20, Show earlier, a menu per comment), `components/CommentField` (docked through `Screen`'s `footer`; @ shows a strip of faces), `components/mentions.ts` (`@{userId}` tokens to "@Name" and back); shown on a task someone else sees or one with comments; `commentId` from Activity tints one. History (M83, D94): `components/HistorySection` (Show history, loaded on demand), `HistoryRow`, `useHistoryText` (wording), `useWhen`; past 60 (`INLINE_MAX`) comments and history open `CommentsScreen` / `HistoryScreen` (FlashLists) |
| `browse` | Spaces, the second tab (route Browse, M70); pushed: List, Team, People, BrowseList (All tasks, Important, Assigned to me, Assigned by me, Completed, a tag, a team's tasks), Archived, Recently Deleted | Built ([M38](../../../azignia-docs/design/clients/apps/06-mobile.md#decisions), [M76](../../../azignia-docs/design/clients/apps/06-mobile.md#decisions), [M70](../../../azignia-docs/design/clients/apps/06-mobile.md#decisions)): Personal, Important, Assigned to me, Assigned by me (M71) and All tasks, always, with counts; My lists (+, a people icon on shared ones); Shared with me (owner's first name); Teams, a row each A–Z with its open count; Tags; the four sections fold from their heading (`foldedSectionsStore`); More with no counts, loaded only when opened. All tasks, in Spaces and in a team (M78): a row that scrolls with Group (Date, List, Person; `allTasksGroupStore`, Spaces on Date, a team on Person) and one filter (Mine, Unassigned, Overdue, This week, sent to the API; `FilterStrip`); Date pages, List and Person load every page 200 at a time; headings fold. Important: Soonest, By list (every page, grouped in the user's list order) or Newest. Assigned by me (`assignedBy=me`, D88): every page, grouped by Person or Status (`assignedByGroupStore`), declined and to-confirm first, with Pending and the decline reason on rows. Edit reorders lists inside their section and tags (arrows; `POST /task-lists:reorder`, `/tags:reorder`, optimistic). Long press or ••• opens a menu by role, a sheet from the bottom (`chooseAction`, M64; Sort first on a list, its own menu; deletes and leaving ask with `confirm`). A filter field over 25 rows. A list (M64): under the title one line, "3 open · Shared with Luis" (who opens People, M44; only the count on a private list), add people beside •••, its tasks in its sort mode, a Completed section that folds (open by default, the fold remembered per list in `foldedListsStore`, loaded only while open and paged, M63; opened from Home's Personal card, `foldCompleted` starts it folded for that visit without saving, M93), and a field docked at the bottom that adds a task by its title (Return or ↑, M62). A team (M76): under the title "3 lists · 4 people" (opens People; the count from `GET /teams`, no members request), add people beside ••• for managers, All tasks, its lists, an empty state with New list. On hold (M80): `shared/hold/useHoldActions` (Put on hold from Task detail, the pause icon's Resume/Complete/Edit), the Hold screen in `task/`, a folding On hold section in a list. Bulk actions (M81, `shared/selection/`): a long press on a task or ••• › Select tasks in a list, Important, All tasks, a person's tasks, Assigned to me, Assigned by me, a tag (and Search); the header becomes Cancel · "3 selected" · All and the selection bar takes the add field's place; Completed folds away. People: roles; in a team each person's open and late tasks (M79, a tap opens them; a manager long-presses for Make admin/member, Make owner…, Remove), Invite by email, open invitations with Revoke, Leave; the first invitation of a private list with tasks given outside asks Invite them too (by user id) or Keep them as they are (M71), whose rows then say Outside the list. `BrowseSheet` edits with a draft and Save (M26, M28); a tag rename or merge asks first when others' tasks change (preview). Invited without an Inbox (D59): Start your own lists. FlashList everywhere |
| `calendar` | Calendar (third tab, M74) | Built ([M72](../../../azignia-docs/design/clients/apps/06-mobile.md#decisions)): every open task the user can see by due date; a List \| Calendar switch in the bar. Calendar: a month (weeks from Monday) or, from the title's menu (`chooseAction`), the picked day's week; both choices kept on the device across launches (`calendarViewStore`), with up to 3 dots in the tasks' list colors; ‹ › move a month or a week; Today once another day is picked or today is off screen; the picked day's tasks as `TaskRow`s and Add a task (Quick add due that day). `GET /tasks?dueFrom=&dueTo=` for the range, every page. List: one scroll from today (`dueFrom=<today>&sort=due`, 50 at a time): month headings, a week line at each new week, a large day number per day with tasks (and today). Both: only dated tasks; an Overdue chip (`?due=overdue`) with its count lists those tasks. FlashList |
| `search` | Search (fifth tab) | Built ([M40](../../../azignia-docs/design/clients/apps/06-mobile.md#decisions)): `GET /search` after a short pause in typing, best match first, 20 at a time; before typing, recent searches (on the device, per user, 8; remembered when a result is opened) and tags as chips; a row bolds the found words, shows its list and Completed; the circle completes or reopens |
| `activity` | Activity (pushed from Home's bell, M74) | Built ([M39](../../../azignia-docs/design/clients/apps/06-mobile.md#decisions)): every notification, New then Earlier, paged; Mark all read; the unread count on Home's bell |
| `me` | Me, pushed from the avatar; its settings pages | Built (M39, M41): name, time zone, language (each a page that saves; language switches the app), Appearance under This device (System, Light or Dark; Light by default; kept on the device, applies at once, M68), email, change password (new tokens for this device), signed-in devices (sign one out, or all); Sign out (asks first) |
| `quick-add` | Quick add: the new-task form in a sheet, from the + | Built: title; a summary of List plus a row per set field (Important, due date, reminder, tags, notes; each with ✕) and a bottom icon bar, style E, that sets them (`QuickAddBar`, Sheet `footer` slot); due date and reminder pages (quick choices or a custom date and time); Notes page (`NotesPage`); the Task list, Due date, Tags and Reminder pages are the shared `TaskListPicker`, `DueDatePicker`, `TagPicker` and `ReminderPicker`; an Assign icon after Reminder on shared and team lists (M43, assigned right after creating); never waits for the lists (no task list = the user's Inbox, M31; Add shows a spinner while saving, M27); tags page with search, create and last-used order, sent as `tags`, the title as typed ([M14, M15, M16, M31](../../../azignia-docs/design/clients/apps/06-mobile.md#decisions)) |

Planned (06-mobile.md): `assignments`, transferring ownership and changing roles (`sharing`), `notifications` (the full list beyond Home's Updates), `settings`.

## Auth helpers

| File | Purpose |
|---|---|
| `components/CodeStep.tsx` | "Check your email" with six boxes and Resend; shared by sign-up and reset |
| `components/CodeInput.tsx` | The six boxes: one hidden field, paste and one-time-code autofill work |
| `signUpDraft.ts`, `resetDraft.ts` | What a flow carries between its screens, in memory only (never passwords in route params or storage) |
| `useEmailField.ts` | An email field checked when you leave it (HIG timing) |
| `validation.ts` | Form validators; return keys under `auth.validation` |

---

← [data](data.md) · ↑ [Structure](README.md) · Next: [shared](shared.md) →
