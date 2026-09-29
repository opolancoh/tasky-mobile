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
└── workspaces/          GET /workspaces
    ├── api.ts  keys.ts  queries.ts  types.ts
```

Coming with their screens: `tasks/` (views, collections, tasks, steps, tags, search) and `collaboration/` (notifications).

## Files in a module

| File | Holds | Example |
|---|---|---|
| `types.ts` | Request and response types, in the API's names and shapes | `Me`, `Workspace`, `TokenResponse` |
| `api.ts` | One function per endpoint; calls `http()`, no caching | `identityApi.login(body)` |
| `keys.ts` | Query key factories | `tenancyKeys.me` |
| `queries.ts` | Query definitions and hooks | `meQuery`, `useMe()` |
| `mutations.ts` | Writes with optimistic update, rollback and invalidation | (with tasks) |

## Rules

- **Keys start with the workspace** for anything workspace-scoped, so switching workspaces never shows another workspace's data.
- **Writes send `If-Match`** with the version last read; a `412` refetches and says the item changed.
- **Optimistic only where it should feel instant:** complete, reopen, tick a step, reorder. Everything else waits for the response.
- **After a write,** invalidate the item, the views it can appear in, and `/views/counts`.
- **Types are written by hand** for now; generated from `/openapi/v1.json` once the contract settles ([M5](../../../tasky-docs/design/clients/apps/06-mobile.md#decisions)).

Details: [06-mobile.md › Data](../../../tasky-docs/design/clients/apps/06-mobile.md#data).

---

← [core](core.md) · ↑ [Structure](README.md) · Next: [features](features.md) →
