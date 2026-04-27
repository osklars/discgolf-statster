# Statster

A personal skill-tracking app. Track stats for any practice-based skill — disc golf, guitar, gym, etc. Each skill is an isolated workspace with its own parameters, options, and entries.

---

## Architecture

### Skills (workspaces)

Skills are top-level workspaces, modelled after Slack's workspace switcher. Each skill:

- Has a name, emoji icon, and accent color
- Owns a completely isolated SQLite database file (e.g. `disc_golf.db`, `guitar.db`)
- Defines its own params, form layouts, and entries independently of other skills

A lightweight `meta.db` tracks the skills list and app-level settings. It is the only database opened unconditionally on launch.

### meta.db schema

```sql
CREATE TABLE skills (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  emoji      TEXT NOT NULL,
  color      TEXT NOT NULL,
  db_file    TEXT NOT NULL UNIQUE,   -- e.g. "disc_golf.db"
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL        -- unix timestamp
);

CREATE TABLE app_state (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
-- stores e.g. ("active_skill_id", "disc_golf")
```

### Per-skill db schema (each `<skill>.db`)

```sql
CREATE TABLE params (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL,   -- "scalar" | "named" | "grid2d"
  config      TEXT NOT NULL,   -- JSON: min/max/step/unit/options/axes etc.
  created_at  INTEGER NOT NULL
);

CREATE TABLE forms (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE form_params (
  form_id    TEXT NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  param_id   TEXT NOT NULL REFERENCES params(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (form_id, param_id)
);

CREATE TABLE sessions (
  id          TEXT PRIMARY KEY,
  label       TEXT,            -- optional name/note
  started_at  INTEGER NOT NULL,
  ended_at    INTEGER
);

CREATE TABLE entries (
  id         TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  form_id    TEXT NOT NULL,
  data       TEXT NOT NULL,    -- JSON: { [paramId]: string }
  logged_at  INTEGER NOT NULL
);
```

---

## Navigation structure

```
App
└── SkillProvider (active skill, skill list, switcher state)
    └── NavigationContainer
        └── Stack
            ├── Home          ← skill-scoped; header opens SkillSwitcherSheet
            ├── StatDetail    ← stat breakdown for active skill
            ├── Session       ← entries logged in one session
            └── SessionForm   ← entry form with layout switcher
```

---

## Tech stack

| Concern        | Library                          |
|----------------|----------------------------------|
| UI             | React Native (Expo ~54)          |
| Navigation     | React Navigation native-stack    |
| Charts/inputs  | react-native-svg                 |
| Icons          | @expo/vector-icons (Feather)     |
| Database       | expo-sqlite (WAL mode)           |
| Safe areas     | react-native-safe-area-context   |

---

## Status

### Implemented (mock data)
- Entry form with scalar, named, and 2D grid params
- Form edit mode: reorder (drag), combine to 2D, delete, param settings
- Param library: global pool, per-form curation, add from library or create new
- App navigation: Home → Stat detail, Session, Session form
- Skill switcher UI (workspace switcher shell)

### Deferred — requires Expo Dev Client
- `expo-sqlite` integration (meta.db + per-skill dbs)
- Persisting skills, params, forms, sessions, entries
- Real stat computation from entry data

### Not yet started
- Stat computation engine (levels, progress, recent level-ups)
- Session editing (edit/delete individual entries)
- Charts in stat detail view
- Push notifications / reminders

# From old claude.md

## Commands

Run from `apps/statster/`:

Expo dev client
```bash
npx expo run:ios   # Start Expo dev server (add --device to launch automatically on phone without scanning qr) 
npx expo prebuild --clean # run when switching bundles
```

Standalone ios app
```bash
rm -rf ~/Library/Developer/Xcode/DerivedData/Statster-* 
npx expo run:ios --configuration Release
open ios/Statster.xcworkspace/ 
# xcode > Product > Scheme > Edit Scheme > Run > Release
```

No lint or test scripts are configured. TypeScript strict mode serves as the primary type-safety mechanism.


## Architecture

### Data Model

Two tiers of SQLite databases (via expo-sqlite, WAL mode):

- **meta.db** — App-level; `skills` table (list of workspaces) and `app_state` table (active skill ID).
- **`<skill>.db`** — One per skill workspace; contains parameters, forms, sessions, entries, and datapoints.

Database layer lives in `src/db/`:
- `skillDb.ts` — Singleton connection manager
- `schema.ts` — Table definitions (WAL + foreign keys enabled)
- `meta.ts`, `parameters.ts`, `forms.ts`, `entries.ts`, `datapoints.ts`, `sessions.ts`, `savedLevels.ts` — CRUD per entity
- `xp.ts` — XP/level computation (`levelThreshold(n) = n*(n+1)/2 * 500`, quality weight 0.5–2.0, BASE_XP = 40 per entry)
- `queries.ts` — Filtered entry retrieval
- `mappers.ts` — Form ↔ DB serialization
- `seed.ts` — Versioned demo data (bumping `SEED_VERSION` wipes and re-seeds)

### State & Navigation

- **SkillProvider** (`src/contexts/SkillContext.tsx`) — Global context managing the skills list, active skill, and per-skill DB connection. Wraps the entire app.
- **AppNavigator** (`src/navigation/AppNavigator.tsx`) — Native stack with screens: `Home`, `StatDetail`, `SavedLevels`, `Session`, `SessionForm`.

### Forms & Components

- **EntryForm** (`src/components/EntryForm/`) — Core data-entry component. Handles three parameter types: scalar (numeric), named (pill picker), and 2D grid. Uses `useEntryForm` and `useEditForm` hooks internally.
- **SkillSwitcher** (`src/components/SkillSwitcher/`) — Bottom sheet for switching skill workspaces.

### Theme

Shared constants in `src/constants/theme.ts`: `Colors`, `Spacing`, `Radius`, `Typography`.

