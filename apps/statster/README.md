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
