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
├── network-log/    NetworkLogScreen.tsx  NetworkLogEntryScreen.tsx  shareText.ts (Share, curl)  useSessionInfo.ts (Me › About, support and admin, M53)
├── today/          TodayScreen.tsx (Home, the first tab)  TodayListScreen.tsx (See all)  todaySections.ts  homeDismissedStore.ts (Requests dismissed from Home, M65)  components/HomeCards.tsx  components/RequestRows.tsx  components/GetStartedCard.tsx (first day, M67)
│   └── components/       StreamRows (the rows Today and See all share)
├── sharing/        InvitationScreen.tsx
├── activity/       ActivityScreen.tsx (the fifth tab)
├── me/             MeScreen.tsx (from the avatar)  EditNameScreen  TimeZoneScreen  LanguageScreen  AppearanceScreen (M68)  ChangePasswordScreen  SessionsScreen  AboutScreen (M48)  useHeaderSave
├── browse/         BrowseScreen.tsx (the tab)  TaskListScreen  TeamScreen  PeopleScreen  BrowseListScreen  ArchivedScreen  RecentlyDeletedScreen
│   ├── BrowseSheet.tsx   New/Edit list, New/Rename team, Edit tag (mounted in App; shared/browseSheet/browseSheetStore.ts says what)
│   ├── browseMenus.ts    The long-press and ••• menus, by role
│   ├── foldedListsStore.ts The lists whose Completed the user folded, per user, on the device (M63)
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
| `today` | Home (first tab, M65; the route is still `Today`), See all (`TodayList`) | Built ([M33, M37, M65](../../../azignia-docs/design/clients/apps/06-mobile.md#decisions)) from `GET /home` (D67, D69, D86), over everything the user can see. The date and one line with what's next; four cards (`HomeCards`: Today with done of total, Overdue, Important, Inbox), each opening its See all; Requests (invitations with Decline / Join, assignments with Accept, follow-ups with Confirm; 3 rows; swipe left to dismiss from Home, kept per user on the device in `homeDismissedStore`, Undo in the toast; all dismissed → one Requests row), Today (5, reminder time), "All done for today", Assigned to me (3, from whom and when), Coming up (5, day); with nothing of those but open tasks somewhere, From your lists (3 undated tasks with Today, M66). Notifications are only in Activity. `TodayList` shows a whole section, 20 at a time as the list scrolls (Coming up under day headings, then Later, M39). Rows (`StreamRows`) are shared by both and open Task detail. No open task and nothing to answer (M67): the welcome line, the cards, Get started (five steps) and Add a task. First load: skeletons (M27). FlashList. The avatar at the top opens Me (M39) |
| `sharing` | Invitation, pushed from Requests | Built ([M34](../../../azignia-docs/design/clients/apps/06-mobile.md#decisions)): who invited, people, open tasks or lists, expiry; Join in the header, Decline invitation (asks first) at the end; both go back with a toast |
| `task` | Task detail, pushed from task rows (Home's Today and Important) and `azignia://task/{id}` | Built ([M25](../../../azignia-docs/design/clients/apps/06-mobile.md#decisions)): title in place with the circle and the Important flag (red edge); rows for Task list, Assigned to (shared and team lists, M43), Due date, Reminder, Repeat, Tags (the value with ✕, or None and a chevron), each a page in `TaskFieldSheet` (shared pickers; `RepeatPicker` here); Skip for repeating tasks; steps (tick, rename, swipe to delete, add); notes; created and updated with who, in the profile's time zone; Delete with an Undo toast. Edits go into a draft saved with Save in the header (M26: one PATCH, D56; discard prompt on leaving); the circle, Skip and Delete act at once (`useChangeTask`, `useDeleteTask`). A task waiting for the caller's answer reads only, with no Save or Delete, and an Assignment row with Reject (optional reason, `askReason`) and Accept (M35) |
| `browse` | Browse (second tab); pushed: List, Team, People, BrowseList (Assigned to me, Completed, a tag, a team's tasks), Archived, Recently Deleted | Built ([M38](../../../azignia-docs/design/clients/apps/06-mobile.md#decisions)): Inbox and Assigned to me; My lists (+, a people icon on shared ones); Shared with me (owner's first name); Teams, a row each A–Z with its open count; Tags; More. Edit reorders lists inside their section and tags (arrows; `POST /task-lists:reorder`, `/tags:reorder`, optimistic). Long press or ••• opens a menu by role, a sheet from the bottom (`chooseAction`, M64; Sort first on a list, its own menu; deletes and leaving ask with `confirm`). A filter field over 25 rows. A list (M64): under the title one line, "3 open · Shared with Luis" (who opens People, M44; only the count on a private list), add people beside •••, its tasks in its sort mode, a Completed section that folds (open by default, the fold remembered per list in `foldedListsStore`, loaded only while open and paged, M63), and a field docked at the bottom that adds a task by its title (Return or ↑, M62). A team: All tasks, its lists, the first 3 people. People: roles, Invite by email, open invitations with Revoke, Leave. `BrowseSheet` edits with a draft and Save (M26, M28); a tag rename or merge asks first when others' tasks change (preview). Invited without an Inbox (D59): Start your own lists. FlashList everywhere except the team page (bounded) |
| `search` | Search (fourth tab) | Built ([M40](../../../azignia-docs/design/clients/apps/06-mobile.md#decisions)): `GET /search` after a short pause in typing, best match first, 20 at a time; before typing, recent searches (on the device, per user, 8; remembered when a result is opened) and tags as chips; a row bolds the found words, shows its list and Completed; the circle completes or reopens |
| `activity` | Activity (fifth tab) | Built ([M39](../../../azignia-docs/design/clients/apps/06-mobile.md#decisions)): every notification, New then Earlier, paged; Mark all read; the unread count on the tab; the avatar opens Me |
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
