[Tasky mobile](../../README.md) › [Structure](README.md) › shared

# `src/shared`

What several features use: the design system, the session and translations.

```
src/shared/
├── ui/                    The design system; import from '@/shared/ui'
│   ├── Text  Button  TextField  Notice  RuleCheck  Logo  Screen  Sheet  ListRow
│   ├── WheelColumn  DateWheel  TimeWheel   Wheel pickers
│   ├── theme.tsx          ThemeProvider, useTheme()
│   ├── tokens.ts          Spacing, radius, type scale, fonts
│   └── palettes/          One JSON file per palette; active.json names the one in use
├── session/
│   ├── sessionStore.ts    App-wide state (Zustand)
│   ├── SessionProvider.tsx  useSession(): launch, sign in, sign out, retry
│   └── useCurrentWorkspace.ts
└── i18n/
    ├── i18n.ts            i18next setup, device language and time zone
    ├── en.json  es.json   Every string
    └── errors.ts          errorMessage(), fieldErrors()
```

Planned: `components/` (task rows, avatars and other domain pieces used by several features) and `hooks/`.

## ui/

Knows nothing about tasks; takes variants, not colors (`<Button variant="primary">`).

| Piece | Purpose |
|---|---|
| `Text` | Every text, by variant (`largeTitle`, `title`, `body`, `callout`, `label`…) and color role |
| `Button` | `primary` (one per screen) or `link`; 44 pt minimum touch target |
| `TextField` | Label above, error or footer below, optional Show/Hide for passwords |
| `Notice` | A message above a form: error or info |
| `RuleCheck` | A rule that turns green as you type (password length) |
| `Logo` | The Tasky mark and name |
| `Screen` | Every screen's root: background, safe areas, side padding, optional scrolling |
| `Sheet` | A bottom sheet over the screen: optional title, optional left and right actions (text, an icon, or both), dismissed by tapping outside; rises above the keyboard |
| `ListRow` | A settings-style row: icon, label, value or a two-line detail, chevron, check mark or ✕ to clear; a divider below |
| `WheelColumn`, `WheelFrame` | One snapping wheel column (rows fade and shrink with native-driver animations, no re-render while scrolling; adjustable for screen readers; a haptic tick on change) and the band behind the columns |
| `SearchField` | A rounded search box with ✕; takes its placeholder and clear label as props |
| `DateWheel` | Day, month name, year (that order in every language); keeps the day inside shorter months; value `"2026-09-30"` |
| `TimeWheel` | Hour, minute (15-minute steps by default), AM/PM when the locale uses it; value always 24-hour `"09:00"` |

**Colors live only in `palettes/`** ([M10](../../../tasky-docs/design/clients/apps/06-mobile.md#decisions)): `azure.json` (light and dark), checked against `PaletteColors` in `types.ts`, which also lists the contrast minimums. `useTheme()` gives the active palette, light or dark from the OS. Lint rejects color literals anywhere else.

## session/

| Piece | Purpose |
|---|---|
| `sessionStore.ts` | Status (`loading`, `signedIn`, `signedOut`, `unreachable`), the current user, and the workspace each user last chose (saved in AsyncStorage). Readable outside React ([M13](../../../tasky-docs/design/clients/apps/06-mobile.md#decisions)) |
| `SessionProvider.tsx` | Launch, sign in, sign out, retry; `useIsSignedIn()` and friends pick the navigation group |
| `useCurrentWorkspace.ts` | The workspace every view shows: the saved choice, else the personal one |

How they're used: [Auth](../auth/README.md).

## i18n/

- English and Spanish. The profile's language wins once signed in; before that, the device's.
- Every string is in `en.json` and `es.json`; screens use `t('area.key')`.
- API errors are shown by their `code` (`errors.<code>`), never by the API's text.

---

← [features](features.md) · ↑ [Structure](README.md)
