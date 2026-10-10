[Tasky mobile](../../README.md) › [Structure](README.md) › features

# `src/features`

One folder per product area. A feature holds its screens at the top, `components/` used only by them, and hooks or helpers that combine data for them. A feature never imports another: it navigates to its screens by route name.

```
src/features/
├── auth/
│   ├── SignInScreen.tsx  SignUpScreen.tsx  VerifyCodeScreen.tsx
│   ├── ForgotPasswordScreen.tsx  ResetCodeScreen.tsx  NewPasswordScreen.tsx
│   ├── UnreachableScreen.tsx
│   ├── components/       CodeInput, CodeStep
│   ├── signUpDraft.ts  resetDraft.ts
│   ├── useEmailField.ts
│   └── validation.ts
├── today/          TodayScreen.tsx (the first tab)  TodayListScreen.tsx (See all)  todaySections.ts  useNotificationText.ts
│   └── components/       StreamRows (the rows Today and See all share)
├── sharing/        InvitationScreen.tsx
├── activity/       ActivityScreen.tsx (the fifth tab)
├── me/             MeScreen.tsx (from the avatar)  EditNameScreen  TimeZoneScreen  LanguageScreen  ChangePasswordScreen  SessionsScreen  useHeaderSave
├── browse/         BrowseScreen.tsx (the tab)  CollectionScreen  TeamScreen  PeopleScreen  BrowseListScreen  ArchivedScreen  RecentlyDeletedScreen
│   ├── BrowseSheet.tsx   New/Edit list, New/Rename team, Edit tag (mounted in App; browseSheetStore.ts says what)
│   ├── browseMenus.ts    The long-press and ••• menus, by role
│   ├── browseSections.ts Groups (Inbox, mine, shared with me, by team), reorder, who may do what
│   └── components/       BrowseRow, CompletedRow, Faces (Avatar)
├── search/         SearchScreen.tsx  SearchRow.tsx  recentSearchesStore.ts
├── quick-add/      QuickAddSheet.tsx  QuickAddBar.tsx  NotesPage.tsx  quickAddStore.ts
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
| `auth` | Sign in, Sign up, Verify code, Forgot password, Reset code, New password, Can't reach Tasky | Built ([Auth docs](../auth/README.md)) |
| `today` | Today (first tab, M36), See all (`TodayList`) | Built ([M32, M33, M37](../../../tasky-docs/design/clients/apps/06-mobile.md#decisions)): "my pending stuff" in one stream from `GET /home` (D67, D69) and the unread notifications, over everything the user can see. Greeting, summary, and the Important and Inbox chips; Needs attention (invitations with Decline / Join, assignments with Accept, overdue with Today), Today (title and reminder time), Coming up (title and day), Updates (unread; opening one marks it read and opens its task); each with its count, 5 rows and See all; "All caught up" when there is nothing. `TodayList` shows a whole section, 20 at a time as the list scrolls (Coming up under day headings, then Later, M39; Updates with Mark all read). Rows (`StreamRows`) are shared by both and open Task detail. First load: skeletons (M27). FlashList. The avatar at the top opens Me (M39) |
| `sharing` | Invitation, pushed from Needs attention | Built ([M34](../../../tasky-docs/design/clients/apps/06-mobile.md#decisions)): who invited, people, open tasks or lists, expiry; Join in the header, Decline invitation (asks first) at the end; both go back with a toast |
| `task` | Task detail, pushed from task rows (Home's Today and Important) and `tasky://task/{id}` | Built ([M25](../../../tasky-docs/design/clients/apps/06-mobile.md#decisions)): title in place with the circle and the Important flag (red edge); rows for Collection, Assigned to (shared and team lists, M43), Due date, Reminder, Repeat, Tags (the value with ✕, or None and a chevron), each a page in `TaskFieldSheet` (shared pickers; `RepeatPicker` here); Skip for repeating tasks; steps (tick, rename, swipe to delete, add); notes; created and updated with who, in the profile's time zone; Delete with an Undo toast. Edits go into a draft saved with Save in the header (M26: one PATCH, D56; discard prompt on leaving); the circle, Skip and Delete act at once (`useChangeTask`, `useDeleteTask`). A task waiting for the caller's answer reads only, with no Save or Delete, and an Assignment row with Reject (optional reason, `askReason`) and Accept (M35) |
| `browse` | Browse (second tab); pushed: Collection, Team, People, BrowseList (Assigned to me, Completed, a tag, a team's tasks), Archived, Recently Deleted | Built ([M38](../../../tasky-docs/design/clients/apps/06-mobile.md#decisions)): Inbox and Assigned to me; My lists (+, a people icon on shared ones); Shared with me (owner's first name); Teams, a row each A–Z with its open count; Tags; More. Edit reorders lists inside their section and tags (arrows; `POST /collections:reorder`, `/tags:reorder`, optimistic). Long press or ••• opens a native menu by role (`chooseAction`; deletes and leaving ask with `confirm`). A filter field over 25 rows. A list: a line under the title says who is in it (Shared with…, Team · N people, Share… on a private list; opens People, M44), its tasks in its sort mode, Completed folded and paged. A team: All tasks, its lists, the first 3 people. People: roles, Invite by email, open invitations with Revoke, Leave. `BrowseSheet` edits with a draft and Save (M26, M28); a tag rename or merge asks first when others' tasks change (preview). Invited without an Inbox (D59): Start your own lists. FlashList everywhere except the team page (bounded) |
| `search` | Search (fourth tab) | Built ([M40](../../../tasky-docs/design/clients/apps/06-mobile.md#decisions)): `GET /search` after a short pause in typing, best match first, 20 at a time; before typing, recent searches (on the device, per user, 8; remembered when a result is opened) and tags as chips; a row bolds the found words, shows its list and Completed; the circle completes or reopens |
| `activity` | Activity (fifth tab) | Built ([M39](../../../tasky-docs/design/clients/apps/06-mobile.md#decisions)): every notification, New then Earlier, paged; Mark all read; the unread count on the tab; the avatar opens Me |
| `me` | Me, pushed from the avatar; its settings pages | Built (M39, M41): name, time zone, language (each a page that saves; language switches the app), email, change password (new tokens for this device), signed-in devices (sign one out, or all); Sign out (asks first) |
| `quick-add` | Quick add: the new-task form in a sheet, from the + | Built: title; a summary of Collection plus a row per set field (Important, due date, reminder, tags, notes; each with ✕) and a bottom icon bar, style E, that sets them (`QuickAddBar`, Sheet `footer` slot); due date and reminder pages (quick choices or a custom date and time); Notes page (`NotesPage`); the Collection, Due date, Tags and Reminder pages are the shared `CollectionPicker`, `DueDatePicker`, `TagPicker` and `ReminderPicker`; an Assign icon after Reminder on shared and team lists (M43, assigned right after creating); never waits for the lists (no collection = the user's Inbox, M31; Add shows a spinner while saving, M27); tags page with search, create and last-used order, sent as `tags`, the title as typed ([M14, M15, M16, M31](../../../tasky-docs/design/clients/apps/06-mobile.md#decisions)) |

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
