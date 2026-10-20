[Azignia mobile](../README.md) › Notifications

# Notifications

How people hear about what others do: which channel each action uses, who is told, and where the app handles it.
Read from the code (the API's `NotificationRules`, `PushTexts`, its email senders and `GET /home`), as of 2026-10-19.
Setting up push: [Push setup](push-setup.md). The spec: D92, D97, D99, D100 (`azignia-docs/design/api/README.md`), M58,
M82, M85, M88, M92 (`06-mobile.md`).

## Contents

- [The channels](#the-channels)
- [Who is told, by action](#who-is-told-by-action)
- [Rules for every push](#rules-for-every-push)
- [Where it lives in the app](#where-it-lives-in-the-app)

## The channels

| Channel | What it is | Comes from |
|---|---|---|
| **Activity** | The bell on Home and the Activity tab: one row per notification, unread until opened | Collaboration's `notification` table, written by event handlers in the recipient's account |
| **Push** | A banner on the lock screen, only for what asks the recipient to act; one switch per group in Me › Notifications | `PushHandler`, from each new notification, through Expo to APNs or FCM |
| **Email** | Account codes, and invitations or tasks given to an email with no account (with a Join button); people with an account hear in the app (D100) | Identity and Tasks, sent at the time of the request |
| **Home** | Cards under Requests: what waits for an answer | `GET /home` (invitations, to answer, follow-up, holds), not notifications |
| **Reminders** | A local notification at the time the user set, on that phone only | The app (`syncReminders`), never the server; not in Activity |

Nobody is told about their own action.

## Who is told, by action

✓ yes, — no. **Push** names the Me › Notifications switch it belongs to.

### Account

| Action | Who's told | Activity | Push | Email | Home |
|---|---|---|---|---|---|
| Sign up | The new user | — | — | ✓ code | — |
| Sign up with an email that already has an account | That account | — | — | ✓ "already registered" | — |
| Forgot password | The user | — | — | ✓ code | — |
| Password changed or reset | The user | — | — | ✓ "password changed" | — |
| Sign out everywhere, revoke a device | — | — | — | — | — |

### Teams and shared lists

| Action | Who's told | Activity | Push | Email | Home |
|---|---|---|---|---|---|
| Invite someone with an account | Invitee | ✓ Invited | ✓ Invitations | — | ✓ invitation card |
| Invite a closed account | Refused: “This person's account is closed” | — | — | — | — |
| Invite an email without an account | That email | — | — | ✓ with Join | ✓ after they sign up |
| Accept an invitation | Whoever invited (not the team's owner or admins) | ✓ Joined | ✓ Answers | — | — |
| Decline an invitation | Whoever invited | ✓ Declined | ✓ Answers | — | — |
| Revoke an invitation | Nobody (the invitee's card goes away) | — | — | — | — |
| Join with a team's invite link | Whoever made the link, and the team's owner | ✓ Joined by link | — | — | — |
| Remove someone | The person removed | ✓ Removed | — | — | — |
| Leave | Nobody | — | — | — | — |
| Change someone's role (team) | That person | ✓ Role changed | — | — | — |
| Transfer ownership, or the owner is deactivated | The new owner | ✓ Ownership received | — | — | — |
| Delete a shared list or team | Nobody | — | — | — | — |

### Assignment

| Action | Who's told | Activity | Push | Email | Home |
|---|---|---|---|---|---|
| Give a task to someone | Assignee | ✓ Assigned | ✓ Assigned to you | Only when given by email to someone without an account | ✓ to answer (Task detail locked until answered) |
| Assign it to yourself | — | — | — | — | — |
| Reassign | Previous assignee (the new one as above) | ✓ Reassigned | — | — | — |
| Assignee accepts | Whoever gave it | ✓ Accepted | ✓ Answers | — | — |
| Assignee declines (with a reason) | Whoever gave it | ✓ Declined | ✓ Answers | — | ✓ follow-up |
| Assignee drops it (gives it back) | Whoever gave it | ✓ Dropped | ✓ Answers | — | ✓ follow-up (until assigned again or unassigned) |
| Someone else unassigns it | Assignee | ✓ Unassigned | — | — | — |
| Assignee completes it | Whoever gave it | ✓ Completed · Confirm | ✓ Answers | — | ✓ follow-up (Confirm) |
| Someone else completes it | Assignee | ✓ Completed | — | — | — |
| Someone else deletes it | Assignee | ✓ Deleted | — | — | — |
| Someone else moves it | Assignee | ✓ Moved | — | — | — |
| Someone else changes its due date by hand | Assignee | ✓ Rescheduled | — | — | — |

### On hold

| Action | Who's told | Activity | Push | Email | Home |
|---|---|---|---|---|---|
| Put on hold (with a reason) | Assignee (the first time, when someone else paused it) and whoever can resume it | ✓ On hold | ✓ On hold | — | — |
| Its Until date comes | Whoever can resume it | — | — | — | ✓ Requests |
| Someone else resumes it | Whoever paused it | ✓ Resumed | — | — | — |

### Comments

| Action | Who's told | Activity | Push | Email | Home |
|---|---|---|---|---|---|
| New comment | Assignee, the task's creator, earlier commenters | ✓ Commented | ✓ Comments | — | — |
| @mention, in a new comment or added in an edit | The person mentioned, instead of Commented | ✓ Mentioned | ✓ Mentions or Comments | — | — |
| Edit or delete a comment | — | — | — | — | — |

A mention counts only when the name is picked from the strip of faces; typed by hand it's plain text.

### Everything else

Creating, editing, completing or deleting an **unassigned** task in a shared list, and its steps, notes, tags and
Important, tell nobody in any channel. So do edits to an assigned task other than its due date.

## Rules for every push

- **App open:** no banner; the bell, Activity and the screens refresh instead (M85).
- **Quiet hours** (Me › Notifications, in the profile's time zone): a silent push that only sets the badge (iOS; Android shows
  nothing); Activity has it.
- **Switch off:** nothing for that group.
- **Only what they can open:** no push when the task is deleted (Recently Deleted too) or out of their sight, or the comment
  is gone; Activity keeps the row.
- **At least once:** a repeat (a crash before it's recorded) replaces the first, by its collapse id (the notification's).
- **Every phone** the person is signed in on gets it; signing out removes that phone. Signed out offline, the app sends
  it at the next launch or return with a connection, so the server still stops the pushes.
- **Text:** title the task's name (or the team's or list's), body what happened, in the recipient's language; a comment's
  first 100 characters. The phone's own "Show previews" setting hides it.
- **Badge:** the unread count, sent with each push and set again by the app.
- **App open:** that task's detail and comments refetch too, so an open thread shows the new comment.
- **A tap** opens what its Activity row opens and marks it read: task kinds (commented, mentioned, on hold, assigned,
  accepted) open the task at once, at the comment for comments; the others fetch first: the invitation, the list or team
  (an accepted or declined invitation too), Home's follow-up state. A task gone by then: Activity, with “This task is no
  longer available”. Closed or signed out: it waits for sign-in.
- **Not in Expo Go or on simulators:** the app doesn't register there; Activity works the same.

## Where it lives in the app

| What | Where |
|---|---|
| Notifications, unread count, mark read | `src/data/collaboration/` (`api.ts`, `queries.ts`, `mutations.ts`) |
| Activity tab | `src/features/activity/ActivityScreen.tsx` |
| The bell on Home | `src/features/today/components/ActivityBell.tsx` |
| Home's Requests | `src/features/today/components/RequestRows.tsx`, `todaySections.ts` (`GET /home`) |
| Where a notification leads | `src/shared/components/useActivityState.ts` (`activityState`, `openActivityGo`) |
| Push: registering, received, taps, badge, the ask | `src/app/PushWatcher.tsx`, `src/shared/notifications/` (`push.ts`, `permission.ts`, `NotificationAskSheet.tsx`) |
| A sign-out made offline, sent later | `src/shared/session/pendingSignOut.ts` |
| A gone task after a push | `src/features/task/TaskDetailScreen.tsx` (`fromPush`) |
| No banner while open | `src/shared/notifications/reminders.ts` (`setNotificationHandler`, `isPush`) |
| Reminders | `src/shared/notifications/reminders.ts`, `useReminders.ts` |
| Me › Notifications (switches, quiet hours) | `src/features/me/NotificationsScreen.tsx` |
