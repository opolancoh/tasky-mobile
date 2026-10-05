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
└── quick-add/      QuickAddSheet.tsx  QuickAddBar.tsx  NotesPage.tsx  quickAddStore.ts
```

## Areas

| Area | Screens | State |
|---|---|---|
| `auth` | Sign in, Sign up, Verify code, Forgot password, Reset code, New password, Can't reach Tasky | Built ([Auth docs](../auth/README.md)) |
| `home` | Home (first tab) | Built ([M23](../../../tasky-docs/design/clients/apps/06-mobile.md#decisions)): greeting and summary; Needs attention (overdue with Move to today, assignments with Accept / Reject; hidden when empty); Important (up to 3 not due today, a red edge on each row, before Today; M24); Today (shared `TaskRow`, complete with the circle); Coming up by day, then Later (→ Upcoming); Inbox to sort (→ Browse); pull to refresh. One FlashList. Sign out until Settings exists |
| `upcoming`, `browse`, `search` | One tab each | Shells, waiting for their designs |
| `quick-add` | Quick add: the new-task form in a sheet, from the + | Built: title; a summary of Collection plus a row per set field (Important, due date, reminder, tags, notes; each with ✕) and a bottom icon bar, style E, that sets them (`QuickAddBar`, Sheet `footer` slot); due date and reminder pages (quick choices or a custom date and time); Notes page (`NotesPage`); the Tags and Reminder pages are the shared `TagPicker` and `ReminderPicker`; tags page with search, create and last-used order ([M14, M15, M16](../../../tasky-docs/design/clients/apps/06-mobile.md#decisions)) |

Planned (06-mobile.md): `task`, `assignments`, `workspace`, `notifications`, `settings`.

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
