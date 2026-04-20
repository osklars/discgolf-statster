# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Statster** is a React Native / Expo mobile app for tracking personal skill-based statistics (disc golf, gym, guitar, etc.). Each "skill" is an isolated workspace with its own SQLite database, parameters, forms, and entry tracking.

The app lives in `apps/statster/`.

## Commands

Run from `apps/statster/`:

```bash
npm start          # Start Expo dev server
npm run ios        # Run on iOS device
npm run android    # Run on Android device/emulator
npm run web        # Run web version
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
