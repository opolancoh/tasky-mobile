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
├── home/           HomeScreen.tsx
├── upcoming/       UpcomingScreen.tsx
├── browse/         BrowseScreen.tsx
├── search/         SearchScreen.tsx
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
| `home` | Home (first tab) | Built ([M23](../../../tasky-docs/design/clients/apps/06-mobile.md#decisions)): greeting and summary; Needs attention (overdue with Move to today, assignments with Accept / Reject; hidden when empty); Important (up to 3 not due today, a red edge on each row, before Today; M24); Today (shared `TaskRow`, complete with the circle); Coming up by day, then Later (→ Upcoming); Inbox to sort (→ Browse); pull to refresh. Every task row (Needs attention, Important, Today) opens Task detail. First load: skeleton sections and rows (M27). One FlashList. Sign out until Settings exists |
| `task` | Task detail, pushed from task rows (Home's Today and Important) and `tasky://task/{id}` | Built ([M25](../../../tasky-docs/design/clients/apps/06-mobile.md#decisions)): title in place with the circle and the Important flag (red edge); rows for Collection, Due date, Reminder, Repeat, Tags (the value with ✕, or None and a chevron), each a page in `TaskFieldSheet` (shared pickers; `RepeatPicker` here); Skip for repeating tasks; steps (tick, rename, swipe to delete, add); notes; created and updated with who, in the profile's time zone; Delete with an Undo toast. Edits go into a draft saved with Save in the header (M26: one PATCH, D56; discard prompt on leaving); the circle, Skip and Delete act at once (`useChangeTask`, `useDeleteTask`) |
| `upcoming`, `browse`, `search` | One tab each | Shells, waiting for their designs |
| `quick-add` | Quick add: the new-task form in a sheet, from the + | Built: title; a summary of Collection plus a row per set field (Important, due date, reminder, tags, notes; each with ✕) and a bottom icon bar, style E, that sets them (`QuickAddBar`, Sheet `footer` slot); due date and reminder pages (quick choices or a custom date and time); Notes page (`NotesPage`); the Collection, Due date, Tags and Reminder pages are the shared `CollectionPicker`, `DueDatePicker`, `TagPicker` and `ReminderPicker`; never waits for the lists (no collection = the user's Inbox, M31; Add shows a spinner while saving, M27); tags page with search, create and last-used order, sent as `tags`, the title as typed ([M14, M15, M16, M31](../../../tasky-docs/design/clients/apps/06-mobile.md#decisions)) |

Planned (06-mobile.md): `assignments`, `sharing` (teams, members, invitations), `notifications`, `settings`.

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
