[Tasky mobile](../../README.md) › [Structure](README.md) › data

# `src/data`

One folder per API module, mirroring `tasky-api`: endpoints, types and the cache around them. No UI.

```
src/data/
├── http.ts              configureHttp() at startup; http() for every module
├── identity/            Sign-in, sign-up, codes, refresh, sign-out
│   ├── api.ts
│   └── types.ts
├── tenancy/             GET /me
│   ├── api.ts  keys.ts  queries.ts  types.ts
├── workspaces/          GET /workspaces
│   ├── api.ts  keys.ts  queries.ts  types.ts
└── tasks/               Collections, tags, task lists (GET /tasks), one task and its edits: steps, tags, reminder, move, delete and restore
    ├── api.ts  keys.ts  queries.ts  mutations.ts  types.ts
```

Coming with its screens: `collaboration/` (notifications).

## Files in a module

| File | Holds | Example |
|---|---|---|
| `types.ts` | Request and response types, in the API's names and shapes | `Me`, `Workspace`, `TokenResponse` |
| `api.ts` | One function per endpoint; calls `http()`, no caching | `identityApi.login(body)` |
| `keys.ts` | Query key factories | `tenancyKeys.me` |
| `queries.ts` | Query definitions and hooks | `meQuery`, `useMe()` |
| `mutations.ts` | Writes with optimistic update, rollback and invalidation | `useChangeTask(workspaceId, taskId)` |

## Rules

- **Keys start with the workspace** for anything workspace-scoped, so switching workspaces never shows another workspace's data.
- **Writes send `If-Match`** with the version last read. `useChangeTask` runs a task's changes one at a time (`scope`), rereads the task after changes that return no task (steps and tags change its version too), and on a `412` rereads it and runs the change once more; a second `412` shows "This task changed".
- **Optimistic only where it should feel instant:** complete, reopen, tick a step, reorder. Everything else waits for the response.
- **After a write,** invalidate the item and every task list it can appear in (`taskKeys.views`).
- **Types are written by hand** for now; generated from `/openapi/v1.json` once the contract settles ([M5](../../../tasky-docs/design/clients/apps/06-mobile.md#decisions)).

Details: [06-mobile.md › Data](../../../tasky-docs/design/clients/apps/06-mobile.md#data).

---

← [core](core.md) · ↑ [Structure](README.md) · Next: [features](features.md) →
