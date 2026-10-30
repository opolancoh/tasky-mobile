# Changelog

The app's releases, newest first (docs/releases.md).

## 0.12.0 — 2026-10-30

- M120: follow any keyboard to its full height
- M119: error details for everyone while testing
- M119: error details for support and admin when Azignia can't be reached
- M117, M118: Select tasks only with something to select; Delete completed tasks
- M116: an invitation shows at once; People's bar button is users

## 0.11.0 — 2026-10-29

- release.sh: say why it stopped (the check's errors, or the failing line)
- Fix the AndroidImportance lint error (npm run check passes)
- Spaces: the filter field waits for everything to load (M115)
- Reminders: repeat icon on Home › Reminders rows; alarm clock instead of a bell on Home and the +
- Loading: generic skeletons, data actions wait for the data (M115)
- A list or team made from the + opens over Spaces (M113)
- Reminder form: quick choices as one-line capsules (M114)
- Reminder form: clear Repeat and Notes, When?, Set time, quick choices as rows (M114)
- Reminder sheet, rang and snoozed reminders, banner actions (M114)
- The + menu: Reminder opens Quick add on its Reminder page (M113)
- Quick add: docked Set due date / Set reminder (M112); the + asks Task, List or Team (M113)
- List page: a grey ⓘ right after ALL LISTS (SectionLabel `info`); its popup is "Who sees each list" (M111)
- List page: an ⓘ at All lists explains the kinds of lists; a person's narrowed set says so under the search (M111)
- Quick add gives a task person first; one List page with Recent and Private/Shared/Team; no Assigned to on Personal (M111)
- Comments: + Add a comment opens the comment page, as Quick add's Notes; Edit opens it too; no field docked at the bottom (M110)
- Task detail: History from ••• on its own screen (M109); Assigned to keeps the person icon; From's face at 20
- Task detail's skeleton rough on purpose: the top as laid out, then generic sections; FieldRowSkeleton, SkeletonSection; row preview removed (M108)

## 0.10.0 — 2026-10-26

- Task detail loads as one skeleton, top to bottom, comment field docked where comments show (M108)
- Task detail: ••• menu with Save only when changed (M107); the row's title, list and due date while it loads (M108)
- Home and Spaces skeletons in the screens' shape: real headings, two-line rows, More as it is
- One task row everywhere: list · when · progress · assignment; flag, face and one action at the right
- Overdue rows as Today's: due date · list, flag, face, Today (M105)
- Task detail: steps and notes under their headings, after the fields (M106) in the structure doc
- Home: the line under the date opens what it names, with a › (M105)
- Pull to refresh on every list screen (usePullRefresh)
- Today: a completed task lands in Completed at once, done today counts it (M75, M105)
- Expo Go on Android (SDK 58): stub the topic module, detect Expo Go with isRunningInExpoGo, no push token listener there
- Today screen as the hub: time · list, flag and face at the right, one line under the title, empty cards
- Requests: ✕ and one answer, two-line titles, first names (Assigned by Maximiliano · Fri)
- Home and Spaces: one spacing scale; Spaces' line under the title (3 teams · 8 lists · 5 tags)
- Requests: "Marta gave you this · due Fri", the same text as Task detail's answer bar
- Task detail: open steps first, "2 of 4" on the Add a step row
- Requests: one icon for every kind (people, accent)
- Home: urgency lines on Important and Personal; last Home kept on the device for instant launch (M105)
- Home: Assigned to me lists accepted tasks only, matching its count; Today and Overdue cards share one height
- Spaces: Teams first, Edit reorders teams (D108); section names in capitals on Home and Spaces
- Expo SDK 58: React Native 0.88, React 19.3; refs typed as TextInputInstance/ScrollViewInstance
- Home v5: two cards, Requests, My stuff, Assignments, More; Reminders screen; Completed in every list (M105)
- Quick add: no List row from a list (M103), opens with the keyboard, Return adds (M104)
- A list adds through Quick add: Add a task opens it on that list (M103)
- A declined task on Home: Review and its menu (M102)
- Answering a task given to you: Decline and Accept docked, a reason sheet (M101)
- Adding a task shows at once: optimistic create with a client UUIDv7 id (M100)
- Calendar: the overdue chip asks for its count only, loads its tasks when opened (M99)
- Reminder: "Only you get this reminder" once, in the picker (M98)
- Calendar: Overdue under the grid folds, folded at first, kept across launches (M99)
- Calendar counts and lists the month on screen, + per day, Earlier chip (M99)

## 0.9.0 — 2026-10-22

- Task detail v2: the list under the title, steps first, grouped fields, 22 pt title, a ring before Pending or Declined (M98)
- New list goes where it was opened, sends its sort, asks before discarding (M97, D106)
- People shows a few members, See all the rest (M96, D105)
- People picker: search a typed email, exclude sent to the API (D104)
- PeoplePicker: Invite by email under the field, long emails cut in the middle (M73)
- No past reminders on the pickers (M95)
- Remove expo-dev-client
- Pickers: custom reminder opens its wheel, off-step minutes, no date set on opening Custom
- Pickers open on the set value: custom due dates, past years, a min on DateWheel

## 0.8.0 — 2026-10-20

- List tops: title in the bar on scroll, sort in •••, pinned headings (M94)
- Task-row dates show the year outside this year
- Spaces wording, Personal in Task detail, team name on the back button
- Personal card: Just for you, opens with Completed folded (M93)

## 0.7.0 — 2026-10-20

- Task detail: comments and history read-only while an assignment waits
- Push follow-ups and answers (M88, M92)
- Push setup: the APNs key is set with eas credentials (the build doesn't ask)
- Share one section of an error report or a logged call (M91)
- Error reports and Can't connect (M89, M90)
- Screen scroll follows the keyboard on the UI thread
- expo-dev-client for development builds (testing push on real phones)

## 0.6.1 — 2026-10-19

- Releases: Gradle's memory per Mac (~/.gradle/gradle.properties) for the Metaspace failure

## 0.6.0 — 2026-10-19

- Launch screen: the mark with the name on white, black in dark (M87)
- Reminders: the hub's alarm clock instead of the bell, everywhere (ReminderIcon)
- Me: no header over one-row groups, About row shows the version (M86)
- Push notifications: Me › Notifications, the ask sheet, token registration, taps and badge (M85, D97)

## 0.5.0 — 2026-10-18

- Add push notifications config
- Links into the app: invite link in People, Join screen, join with a link (M84)
- Task history on demand; long comment and history lists on their own screen (M83)
- Comments and @mentions: thread in Task detail, docked field, @ faces, counts on rows (M82)
- Bulk actions: long press selects, a bar of six actions, one Undo (M81)
- On hold: pause icon, reason chip, quick reasons, banner (M80)
- Workload in People: open and late counts per person (M79)
- All tasks: Date, List or Person and one filter, in Spaces and a team (M78)
- Expo Go gets the top-level icon: ios.icon's object only for builds
- App icon A10: blue disk with a white check on a white tile (M77)
- Team menu: New list first, no People row on the Team screen (M76)
- People picker: name only, without where you know them from (M73)
- Team: title and one line, people one tap away; roles in People (M76)

## 0.4.0 — 2026-10-17

- Spaces loads as row-shaped skeletons, the fixed rows included (M27, M70)
- Calendar shows only dated tasks: drop the No date chip (M72)
- Calendar tab (List | Calendar) and Activity behind Home's bell (M72, M74)
- Ring spinner everywhere a task or search is saving or loading (M40, M73, M75)
- A ring spinner like the hub's for a saving task circle (M75)
- Complete and reopen move the task at once; the circle spins until the answer (M75)
- Home's Important and Personal cards open the same screens as Spaces
- Find people instead of typing an email (M73)
- Assigned by me in Spaces, giving a task from Personal (M71, D88)
- Spaces: Important is the user's own, as on Home (D61, M70)
- Spaces, the second tab: fixed rows, folding sections, More loaded on tap (M70)
- Call the Inbox Personal on screen (M69)
- Home with no open tasks: a list's empty state and five ways to start (M67)
- Get started: Set a reminder second (M67)
- Get started: no progress text, no Add a task button (M67)
- Get started: 0 open tasks, cards always, steps open their pickers (M67)
- Appearance: System, Light or Dark, Light by default (M68)
- Get started on a first day (M67)
- Home: cards, Requests, Assigned to me and From your lists (M65, M66)
- The top of a list and menus as sheets (M64)
- A list adds inline and folds Completed (M62, M63)

## 0.3.0 — 2026-10-15

- Android builds with Gradle, only from a release commit (M61)

## 0.2.0 — 2026-10-14

- First release.

