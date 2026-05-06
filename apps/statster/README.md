# Statster

## Vision & Purpose

Statster is a stat diary for people who want to track their own progress with precision. The core idea: whenever you practice something — disc golf, guitar, gym — you log entries with whatever stats matter to you that day. Sometimes detailed, sometimes minimal. The app never forces a specific shape on your data.

The two deliberately separate concerns:

**Data collection** — the priority. An entry is just a set of stat values. The schema is intentionally slim and generic. The EntryForm is the heart of the app; most engineering effort goes here because frictionless input is the whole point.

**Analysis** — built on top, kept separate. Correlations and aggregates are derived from the raw data. The exact shape of this layer is intentionally deferred until there's enough real data to know what's actually useful.

Correlation views (e.g. your anhyzer results vs your pull tendency) are the long-term analytical payoff. The HomeScreen shows entry counts; StatDetail shows per-stat histograms and option occurrence bars, all filterable.

The interest/workspace concept makes the whole thing generic — disc golf, guitar, anything you'd want to gamify.

---

## Domain Concepts

### Interest (workspace)

The top-level container, modelled after Slack workspaces. Each interest has a name, emoji, and accent color, and owns a completely isolated SQLite database file (e.g. `disc_golf.db`). Interests define their own stats, exercises, and sessions independently. A lightweight `meta.db` tracks the interests list and which interest is active — it is the only database opened unconditionally on launch.

### Stats

The building blocks of data collection. Stats belong to an interest and form a shared pool that any exercise in that interest can reference.

There are **2 DB-level types** (separate tables):
- **scalar_parameter** — a numeric value with min, max, step, unit, optional labels, and an optional `target` (stored for reference but not used in computation). Always surfaces as type `scalar` in TypeScript (`NumberStatDef`).
- **named_parameter** — a pick-list. Has child `named_option` rows, each with a label and sort order. Options can be archived (soft-deleted) without losing historical data; archived options are excluded from the exercise input but visible in `StatEditorScreen` where they can be restored or permanently deleted. Surfaces as type `named` in TypeScript (`ChoiceStatDef`).

There is also a **exercise-level UI construct** (not a stat type):
- **grid2d** — two number stats combined into a single 2D input in an exercise layout. Stored as two regular `scalar_datapoint` rows on submission. Defined per-exercise in `form_grid2d`, not in the stat tables. Surfaces as `Grid2DStatDef` in TypeScript.

### Exercises

Named layout templates within an interest. An exercise is an ordered list of stats (and optional grid2d combos) curated from the interest's stat pool. Each slot in an exercise has a `clear_after_submit` flag: when `true` the value resets after each entry; when `false` the value is sticky and persists across entries (useful for things like disc or hand selection that rarely change within a session).

### Sessions

A practice session groups entries together. Created lazily on the first logged entry. Sessions can be named, and can be shared as a `.statster` JSON export.

### Entries

A slim, timestamped record within a session. Stores which exercise was used and an entry number for ordering. Contains no data itself — the actual measurements are separate datapoint rows.

### Datapoints

The leaf-level measurements. Each entry has zero or more:
- **scalar_datapoint** — a numeric value for a scalar_parameter (number stat)
- **named_datapoint** — a selected option_id for a named_parameter (choice stat)

Grid2d values decompose into two scalar_datapoints (one per axis) on save.

### Levels

Named filter presets for the home screen. A level stores a list of choice-stat filters (e.g. `hand = Forehand`) and a display name. The XP/level engine runs against only the entries matching those filters. The top 4 levels appear on the home screen; the rest are managed in the Levels screen.

---

## Navigation

```
Home
├── Interest name header       → InterestSwitcherSheet (bottom sheet, in-place)
├── "Overall" card             → StatDetail (no filters)
├── Tracked level card         → StatDetail (pre-loaded with level's filters)
├── "Manage" button            → Levels
├── Gear icon                  → Exercises (stat & exercise management)
├── Session row                → UnifiedSession
└── "+ New session" button     → UnifiedSession (new session)

UnifiedSession
├── "+" pill in exercise selector  → ExerciseEditor (new exercise, auto-selected on return)
├── Entry card (tap)               → inline edit card (tap title area to re-collapse)
└── Add stat sheet                 → one-off stat for current entry only

StatDetail
└── Filter chips               → refine the level/XP calculation in place

Exercises
├── Exercise row               → ExerciseEditor
└── Stat row (number/choice)   → StatEditor

ExerciseEditor                 ← layout editor: reorder, sticky toggle, add/remove stats
StatEditor                     ← create/edit number or choice stat; archive option
```

---

## Components

### EntryForm (`src/components/EntryForm/`)

The core of the app. Loaded by `SessionFormScreen`. Has two top-level modes:

**View mode** — data entry. Shows a scrollable list of stat rows for the active exercise. Sticky values (stats with `clearAfterSubmit = false`) survive across entries but reset when switching exercises. The `ViewModeContent` sub-component is keyed by `activeId` so its state fully resets on exercise switch.

**Edit mode** — exercise editing. Drag-reorder stats, combine two number stats into a grid2d, split a grid2d back into two number stats, add stats from the library, create new stats, adjust per-stat settings (min/max/step/target/options/sticky).

| File | Responsibility |
|------|---------------|
| `EntryForm.tsx` | Top-level orchestrator. Loads exercise definitions, owns exercise tab state, sticky values, edit/view mode toggle, add/rename exercise actions. |
| `hooks/useEntryForm.ts` | View mode state: current values, expanded rows, setValue/clearValue/clearSubmitted. Returns `stats: StatDef[]`. |
| `hooks/useEditForm.ts` | Edit mode state: draft stat list, combine/split grid2d, reorder, settings sheet open state. |
| `components/FormHeader.tsx` | Top bar with back button, exercise name, edit and rename triggers. |
| `components/TabBar.tsx` | Horizontal tab strip for switching between exercises; also renders the "+" add-exercise button. |
| `components/ParamRow.tsx` | Single stat row in view mode: expand/collapse header, delegates to the appropriate input. |
| `components/StickyBar.tsx` | Bottom bar showing entry count and the "Log throw" submit button. |
| `components/EditParamRow.tsx` | Single stat row in edit mode: drag handle, sticky toggle, settings trigger, remove button. |
| `components/EditModeBar.tsx` | Bottom bar in edit mode: overwrite / save-as-new / cancel actions. |
| `components/AddParamSheet.tsx` | Bottom sheet for adding a stat from the library or creating a new one. |
| `components/ParamSettingsSheet.tsx` | Bottom sheet for configuring a stat (all fields for number/choice stats). |
| `components/inputs/ScalarInput.tsx` | Numeric slider/stepper input for number stats. |
| `components/inputs/PillPicker.tsx` | Option pill selector for choice stats. |
| `components/inputs/Grid2DInput.tsx` | 2D grid input for grid2d stats (two number stat axes). |

### Session components (`src/components/session/`)

| File | Responsibility |
|------|---------------|
| `EntryCard.tsx` | Collapsed entry row in the feed. Shows `#N`, exercise name, time, and a chip summary (choice option labels + number stat abbreviations with unit). `FeedEntry` carries `statId`/`optionId` on choice/number fields so edit mode can reconstruct values without a DB query. |
| `FittingPills.tsx` | Pill row that measures all pill widths in an invisible pass, shows as many as fit, and puts overflow into a bottom sheet. A "+" pill always appears at the end for adding a new item (exercise or choice option). |
| `StatRow.tsx` | Accordion row for a single exercise stat in draft/edit mode. Collapsed: shows name + current value. Expanded: `ScalarInput` for number stats, `FittingPills` for choice stats with an add-option trigger. |

### InterestSwitcher (`src/components/InterestSwitcher/`)

| File | Responsibility |
|------|---------------|
| `InterestSwitcherSheet.tsx` | Bottom sheet for switching the active interest or adding a new one. Calls `switchInterest` / `addInterest` from `InterestContext`. |

---

## State & Context

| File | Responsibility |
|------|---------------|
| `src/contexts/InterestContext.tsx` | Global context: interests list, active interest, `switchInterest`, `addInterest`. Opens the correct interest DB on mount and on switch. Blocks render until DB is ready. |
| `src/navigation/AppNavigator.tsx` | Native stack navigator. Defines all screens and shared header style. |
| `src/navigation/types.ts` | `RootStackParamList` — typed route params for all screens. |

---

## Screens

| File                        | What it shows | Key behaviour |
|-----------------------------|--------------|---------------|
| `HomeScreen.tsx`            | Overall entry count, top 4 tracked levels with counts, recent sessions | Reloads on focus; opens InterestSwitcherSheet inline; gear icon navigates to Exercises |
| `StatDetailScreen.tsx`      | Stat overview + entry count for a filter set | `queryRichEntries` drives all cards; choice cards show top-2 options with occurrence bars (expandable accordion); number cards show a histogram with a two-handle range slider; filtered stats shown as dismissible chips |
| `LevelsScreen.tsx`          | All levels, reorderable | Top 4 appear on home screen |
| `UnifiedSessionScreen.tsx`  | Session feed + entry logging in a single unified list | Single ScrollView: collapsed `EntryCard` rows oldest-first, expanded edit card in-place, draft card at bottom; exercise pill strip with "+" to create a new exercise (auto-selected on return); choice option pills ordered by recency (session-first); creates session lazily on first log; tapping a collapsed entry expands it for editing; tapping the title area of an expanded edit card re-closes it; Delete button with confirmation instead of ×; new choice options auto-select after creation. State managed by `useEntryDraft(exercises, dbRecentOptions)` hook (two instances: draft + edit): each instance owns its entire card state — values bag, exercise pill order (`exerciseOrder`), option pill order (`localOptionOrders` merged over `dbRecentOptions`), expanded stat, and one-offs. `selectOption` sets value + bubbles option to top + advances expanded; `switchExercise` clears bag + updates pill order; `loadEntry` (stable) batch-initialises edit state from an existing entry; `initExercise` (stable) sets the initial exercise from `loadExercises` without touching the values bag. Neither instance shares ordering state with the other. |
| `ExercisesScreen.tsx`       | All exercises + number/choice stat library | New exercise navigates to ExerciseEditor; archive icon on exercise rows; archived exercises section (collapsed); archived stats section (collapsed); stat entry counts |
| `ExerciseEditorScreen.tsx`  | Layout editor for a single exercise | PanResponder drag-and-drop reordering; sticky toggle; add from library or create new via StatEditorScreen; lazy save for new exercises — DB write deferred to Save button; `isNew` route param hides archive button |
| `StatEditorScreen.tsx`      | Create/edit number or choice stat | Reads `initialName` from route params for pre-filled name on new stats; Number: min/max/step/unit/labels/target; Choice: options with archive icon + archived options section with restore; archive button in header for existing stats |

---

## Database Layer (`src/db/`)

Two SQLite databases, both in WAL mode:
- **meta.db** — always open; holds the interests list and active interest ID.
- **`<interest>.db`** — one per interest; opened (and schema-applied) when that interest becomes active.

Note: DB column/table names remain in their original snake_case form (`scalar_parameter`, `named_parameter`, `form`, `form_param`, etc.). TypeScript types and function names use the renamed vocabulary; mapper functions bridge the boundary.

| File | Responsibility |
|------|---------------|
| `schema.ts` | All `CREATE TABLE` / `CREATE INDEX` statements for the interest DB. Source of truth for the schema. |
| `interestDb.ts` | Singleton connection manager. `openInterestDb(file)` closes the previous DB and opens the new one. `getInterestDb()` returns the current connection (throws if none open). |
| `meta.ts` | `getAllInterests`, `insertInterest`, `getActiveInterestId`, `setActiveInterestId` — operates on meta.db directly (lazy-opens it). |
| `parameters.ts` | CRUD for `scalar_parameter` (number stats), `named_parameter` (choice stats), `named_option`. Archive/restore/delete for number and choice stats. Options support soft-delete; restored by re-upserting (ON CONFLICT clears `archived_at`). Exports: `getNumberStats`, `getChoiceStats`, `getAllChoiceOptions`, `upsertNumberStat`, `upsertChoiceStat`, `upsertChoiceOption`, `archiveNumberStat`, `archiveChoiceStat`, `getArchivedNumberStats`, `getArchivedChoiceStats`, `restoreNumberStat`, `restoreChoiceStat`, `deleteNumberStat`, `deleteChoiceStat`. |
| `forms.ts` | CRUD for exercises (`form` table), exercise stat slots (`form_param`), grid2d combos (`form_grid2d`). `saveExerciseLayout` replaces an exercise's entire layout atomically. Archive/restore/delete for exercises. Exports: `getExercises`, `getExerciseStats`, `saveExerciseLayout`, `upsertExercise`, `archiveExercise`, `restoreExercise`, `deleteExercise`, `getArchivedExercises`. |
| `entries.ts` | `createEntry(sessionId, exerciseId, entryNumber)`, `getEntriesForSession`, `deleteEntry`, `updateEntryExerciseId`. |
| `datapoints.ts` | `insertDatapoints` (bulk, transactional). Accepts `InsertNumberInput = { statId, value }` and `InsertChoiceInput = { statId, optionId }`. `getDatapointsForEntry`, `deleteDatapointsForEntry`. |
| `sessions.ts` | `startSession`, `renameSession`, `getSession`, `getSessionsWithEntryCounts`. |
| `levels.ts` | CRUD + `reorderLevels` for level filter presets. `LevelFilter` has `statId`, `statName`, `optionId`, `optionLabel`. |
| `queries.ts` | `queryRichEntries(filters)` — dynamic JOIN query with full datapoints. `RichEntry` has `exerciseId`; scalar rows have `statId`, named rows have `statId`. `EntryQueryFilters` uses `choiceFilters`/`numberFilters`. `queryRecentChoiceOptions()` — recency order for UnifiedSession option pills, returns `{ statId, optionId, sessionId }[]`. `queryStatUsageCounts()` — entry counts per stat for ExercisesScreen. `queryChoiceOptionUsageCounts()` — entry counts per choice option for StatEditorScreen. |
| `mappers.ts` | Bridge between DB types and EntryForm types. `loadExerciseDefs()` returns `{ exercises: ExerciseDef[], statLibrary: (NumberStatDef \| ChoiceStatDef)[] }`. `saveExerciseDefToDb` persists an ExerciseDef. `saveStatToDb` persists a StatDef. `exerciseValuesToDatapoints` converts exercise values to number/choice datapoint inputs. |
| `seed.ts` | Demo disc golf data. Wipes and re-seeds the interest DB when `SEED_VERSION` is bumped. |
| `export.ts` | Assembles a complete session as a versioned `ExportedSession` JSON object (used by `shareSession`). |

---

## Utilities

| File | Responsibility |
|------|---------------|
| `src/utils/shareSession.ts` | Calls `exportSession`, writes the result to a `.statster` cache file, triggers the iOS share sheet via `expo-sharing`. |
| `src/constants/theme.ts` | Shared design tokens: `Colors`, `Spacing`, `Radius`, `Typography`, `hairline`, `MIN_HIT`. |

---

## Programming guidelines

### Data fetching
Prefer a single DB query that returns rich, fully-joined objects over multiple lazy per-component fetches. Pass the result down to child components which reduce it locally to compute what they need. This avoids layout jitter from staggered loading, reduces total state updates, and keeps the data flow easy to reason about.

Applied pattern: `queryRichEntries(filters) → RichEntry[]` → passed to all stat cards → each card does a local reduce.

---

## Tech stack

| Concern | Library |
|---------|---------|
| UI | React Native (Expo ~54) |
| Navigation | React Navigation native-stack |
| Icons | @expo/vector-icons (Feather) |
| Database | expo-sqlite (WAL mode) |
| Safe areas | react-native-safe-area-context |
| Sharing | expo-sharing |
| File system | expo-file-system |
| SVG rendering | react-native-svg |
