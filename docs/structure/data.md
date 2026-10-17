[Azignia mobile](../../README.md) › [Structure](README.md) › data

# `src/data`

One folder per API module, mirroring `azignia-api`: endpoints, types and the cache around them. No UI.

```
src/data/
├── http.ts              configureHttp() at startup; http() for every module; Page<T>, getAll() (follows nextCursor, D76)
├── identity/            Sign-in, sign-up, codes, refresh, sign-out
│   ├── api.ts
│   └── types.ts
├── tenancy/             GET /me
│   ├── api.ts  keys.ts  queries.ts  types.ts
│   ├── api.ts  keys.ts  queries.ts  types.ts
├── tasks/               Lists (create, edit, archive, delete, reorder), teams, people and invitations to them, tags (color, rename, merge,
│   │                    delete, reorder), Recently Deleted, task lists (GET /tasks), one task and its edits: steps, tags, reminder, move, delete and restore;
│   │                    Home, the first tab (GET /home, GET /home/{section}, D67, D69, D86; named after the API) and the caller's invitations (join, decline, D68): the API's Tasks module holds sharing (D64)
│   ├── api.ts  keys.ts  queries.ts  mutations.ts  types.ts
├── collaboration/       Notifications: the list (unread only for Home's Updates), the unread count, mark read
│   ├── api.ts  keys.ts  queries.ts  mutations.ts  types.ts
└── system/              GET /api/version (outside /api/v1, for Me › About, M48) and the server's address
    ├── api.ts  queries.ts  types.ts
```

## Files in a module

| File | Holds | Example |
|---|---|---|
| `types.ts` | Request and response types, in the API's shapes; JSON fields keep the API's names (`taskListId`, `taskList`), types use the app's (`TaskList`: the API calls lists task lists) | `Me`, `TaskList`, `TokenResponse` |
| `api.ts` | One function per endpoint; calls `http()`, no caching | `identityApi.login(body)` |
| `keys.ts` | Query key factories | `tenancyKeys.me` |
| `queries.ts` | Query definitions and hooks | `meQuery`, `useMe()` |
| `mutations.ts` | Writes with optimistic update, rollback and invalidation | `useSaveTask`, `useChangeTask` |

## Rules

- **No workspace in the keys** (M31): lists cover everything the user can see. Signing out clears the cache, so another user never sees them.
- **Writes send `If-Match`** with the version last read. Task detail saves with `useSaveTask` (one PATCH with every change, D56; a `412` goes back to the screen, which rereads the task and keeps the edits). `useChangeTask` runs commands (complete, reopen, skip) one at a time (`scope`); a `412` rereads the task and runs the command once more.
- **Optimistic only where it should feel instant:** complete, reopen, tick a step, reorder. Everything else waits for the response.
- **After a write,** invalidate the item and every task list it can appear in (`taskKeys.views`).
- **Types are written by hand** for now; generated from `/openapi/v1.json` once the contract settles ([M5](../../../azignia-docs/design/clients/apps/06-mobile.md#decisions)).

Details: [06-mobile.md › Data](../../../azignia-docs/design/clients/apps/06-mobile.md#data).

---

← [core](core.md) · ↑ [Structure](README.md) · Next: [features](features.md) →
