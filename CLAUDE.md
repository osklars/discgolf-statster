# CLAUDE.md

Hello and welcome to my app `Statster`. 

When working on this app together I want us to discuss the planned changes before we make any edits. This way I can help spot potential bugs or misunderstandings. 

## Project

**Statster** is a React Native / Expo mobile app for tracking personal progress and statistics. For example the skill we're focused on during development is disc golf, where the user can track anything from how good it is at forehand anhyzer throws, to putting and different courses. You can choose to enter as much or as little data you want while playing and then 

The power of the app lies in the very generic and powerful schema and interface that allows the user to track whatever parameter it cares about for each individual skill. Each "skill" is an isolated workspace with its own SQLite database, parameters, forms, and entry tracking even though they all share the same schema.


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
