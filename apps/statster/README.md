# Statster

## Vision & Purpose

Statster is a stat diary for people who want to track their own progress with precision. The core idea: whenever you practice something — disc golf, guitar, gym — you log entries with whatever parameters matter to you that day. Sometimes detailed, sometimes minimal. The app never forces a specific shape on your data.

The two deliberately separate concerns:

**Data collection** — the priority. An entry is just a set of parameter values. The schema is intentionally slim and generic. The EntryForm is the heart of the app; most engineering effort goes here because frictionless input is the whole point.

**Analysis** — built on top, kept separate. Correlations and aggregates are derived from the raw data. The exact shape of this layer is intentionally deferred until there's enough real data to know what's actually useful.

Correlation views (e.g. your anhyzer results vs your pull tendency) are the long-term analytical payoff. The HomeScreen shows entry counts; StatDetail shows per-param histograms and option occurrence bars, all filterable.

The skill/workspace concept makes the whole thing generic — disc golf, guitar, anything you'd want to gamify.

---

## Domain Concepts

### Skill (workspace)

The top-level container, modelled after Slack workspaces. Each skill has a name, emoji, and accent color, and owns a completely isolated SQLite database file (e.g. `disc_golf.db`). Skills define their own parameters, forms, and sessions independently. A lightweight `meta.db` tracks the skills list and which skill is active — it is the only database opened unconditionally on launch.

### Parameters

The building blocks of data collection. Parameters belong to a skill and form a shared pool that any form in that skill can reference.

There are **2 DB-level types** (separate tables):
- **scalar_parameter** — a numeric value with min, max, step, unit, optional labels, and an optional `target` (stored for reference but not used in computation). Always surfaces as type `scalar` in TypeScript.
- **named_parameter** — a pick-list. Has child `named_option` rows, each with a label and sort order. Options can be archived (soft-deleted) without losing historical data; archived options are excluded from the form input but visible in `ParamEditorScreen` where they can be restored or permanently deleted.

There is also a **form-level UI construct** (not a parameter type):
- **grid2d** — two scalar parameters combined into a single 2D input in a form layout. Stored as two regular `scalar_datapoint` rows on submission. Defined per-form in `form_grid2d`, not in the parameter tables.

### Forms

Named layout templates within a skill. A form is an ordered list of parameters (and optional grid2d combos) curated from the skill's parameter pool. Each slot in a form has a `clear_after_submit` flag: when `true` the value resets after each entry; when `false` the value is sticky and persists across entries (useful for things like disc or hand selection that rarely change within a session).

### Sessions

A practice session groups entries together. Created lazily on the first logged entry. Sessions can be named, and can be shared as a `.statster` JSON export.

### Entries

A slim, timestamped record within a session. Stores which form was used and an entry number for ordering. Contains no data itself — the actual measurements are separate datapoint rows.

### Datapoints

The leaf-level measurements. Each entry has zero or more:
- **scalar_datapoint** — a numeric value for a scalar_parameter
- **named_datapoint** — a selected option_id for a named_parameter

Grid2d values decompose into two scalar_datapoints (one per axis) on save.

### Saved Levels

Named filter presets for the home screen. A saved level stores a list of named-param filters (e.g. `hand = Forehand`) and a display name. The XP/level engine runs against only the entries matching those filters. The top 4 saved levels appear on the home screen; the rest are managed in the SavedLevels screen.

---

## Navigation

```
Home
├── Skill name header          → SkillSwitcherSheet (bottom sheet, in-place)
├── "Overall" card             → StatDetail (no filters)
├── Tracked level card         → StatDetail (pre-loaded with saved level's filters)
├── "Manage" button            → SavedLevels
├── Gear icon                  → Forms (param & form management)
├── Session row                → UnifiedSession
└── "+ New session" button     → UnifiedSession (new session)

UnifiedSession
├── "+" pill in form selector  → FormEditor (new form, auto-selected on return)
├── Entry card (tap)           → inline edit card (tap title area to re-collapse)
└── Add param sheet            → one-off param for current entry only

StatDetail
└── Filter chips               → refine the level/XP calculation in place

Forms
├── Form row                   → FormEditor
└── Param row (scalar/named)   → ParamEditor

FormEditor                     ← layout editor: reorder, sticky toggle, add/remove params
ParamEditor                    ← create/edit scalar or named param; archive option
```

---

## Components

### EntryForm (`src/components/EntryForm/`)

The core of the app. Loaded by `SessionFormScreen`. Has two top-level modes:

**View mode** — data entry. Shows a scrollable list of param rows for the active form. Sticky values (params with `clearAfterSubmit = false`) survive across entries but reset when switching forms. The `ViewModeContent` sub-component is keyed by `activeId` so its state fully resets on form switch.

**Edit mode** — form editing. Drag-reorder params, combine two scalars into a grid2d, split a grid2d back into two scalars, add params from the library, create new params, adjust per-param settings (min/max/step/target/options/sticky).

| File | Responsibility |
|------|---------------|
| `EntryForm.tsx` | Top-level orchestrator. Loads form definitions, owns form tab state, sticky values, edit/view mode toggle, add/rename form actions. |
| `hooks/useEntryForm.ts` | View mode state: current values, expanded rows, setValue/clearValue/clearSubmitted. |
| `hooks/useEditForm.ts` | Edit mode state: draft param list, combine/split grid2d, reorder, settings sheet open state. |
| `components/FormHeader.tsx` | Top bar with back button, form name, edit and rename triggers. |
| `components/TabBar.tsx` | Horizontal tab strip for switching between forms; also renders the "+" add-form button. |
| `components/ParamRow.tsx` | Single param row in view mode: expand/collapse header, delegates to the appropriate input. |
| `components/StickyBar.tsx` | Bottom bar showing entry count and the "Log throw" submit button. |
| `components/EditParamRow.tsx` | Single param row in edit mode: drag handle, sticky toggle, settings trigger, remove button. |
| `components/EditModeBar.tsx` | Bottom bar in edit mode: overwrite / save-as-new / cancel actions. |
| `components/AddParamSheet.tsx` | Bottom sheet for adding a param from the library or creating a new one. |
| `components/ParamSettingsSheet.tsx` | Bottom sheet for configuring a param (all fields for scalar/quality/named). |
| `components/inputs/ScalarInput.tsx` | Numeric slider/stepper input for scalar and quality params. |
| `components/inputs/PillPicker.tsx` | Option pill selector for named params. |
| `components/inputs/Grid2DInput.tsx` | 2D grid input for grid2d params (two scalar axes). |

### Session components (`src/components/session/`)

| File | Responsibility |
|------|---------------|
| `EntryCard.tsx` | Collapsed entry row in the feed. Shows `#N`, form name, time, and a chip summary (named option labels + scalar abbreviations with unit). `FeedEntry` carries `parameterId`/`optionId` on scalars/named fields so edit mode can reconstruct values without a DB query. |
| `FittingPills.tsx` | Pill row that measures all pill widths in an invisible pass, shows as many as fit, and puts overflow into a bottom sheet. A "+" pill always appears at the end for adding a new item (form or named option). |
| `ParamRow.tsx` | Accordion row for a single form parameter in draft/edit mode. Collapsed: shows name + current value. Expanded: `ScalarInput` for scalar params, `FittingPills` for named params with an add-option trigger. |

### SkillSwitcher (`src/components/SkillSwitcher/`)

| File | Responsibility |
|------|---------------|
| `SkillSwitcherSheet.tsx` | Bottom sheet for switching the active skill or adding a new one. Calls `switchSkill` / `addSkill` from `SkillContext`. |

---

## State & Context

| File | Responsibility |
|------|---------------|
| `src/contexts/SkillContext.tsx` | Global context: skills list, active skill, `switchSkill`, `addSkill`. Opens the correct skill DB on mount and on switch. Blocks render until DB is ready. |
| `src/navigation/AppNavigator.tsx` | Native stack navigator. Defines all screens and shared header style. |
| `src/navigation/types.ts` | `RootStackParamList` — typed route params for all screens. |

---

## Screens

| File                      | What it shows | Key behaviour |
|---------------------------|--------------|---------------|
| `HomeScreen.tsx`          | Overall entry count, top 4 tracked filters with counts, recent sessions | Reloads on focus; opens SkillSwitcherSheet inline; gear icon navigates to Forms |
| `StatDetailScreen.tsx`    | Parameter overview + entry count for a filter set | `queryRichEntries` drives all cards; named cards show top-2 options with occurrence bars (expandable accordion); scalar cards show a histogram with a two-handle range slider; filtered params shown as dismissible chips |
| `SavedLevelsScreen.tsx`   | All saved levels, reorderable | Top 4 appear on home screen |
| `UnifiedSessionScreen.tsx` | Session feed + entry logging in a single unified list | Single ScrollView: collapsed `EntryCard` rows oldest-first, expanded edit card in-place, draft card at bottom; form pill strip with "+" to create a new form (auto-selected on return); named option pills ordered by recency (session-first); creates session lazily on first log; tapping a collapsed entry expands it for editing; tapping the title area of an expanded edit card re-closes it; Delete button with confirmation instead of ×; new named options auto-select after creation. State managed by `useEntryDraft(forms, dbRecentOptions)` hook (two instances: draft + edit): each instance owns its entire card state — values bag, form pill order (`formOrder`), option pill order (`localOptionOrders` merged over `dbRecentOptions`), expanded param, and one-offs. `selectOption` sets value + bubbles option to top + advances expanded; `switchForm` clears bag + updates pill order; `loadEntry` (stable) batch-initialises edit state from an existing entry; `initForm` (stable) sets the initial form from `loadForms` without touching the values bag. Neither instance shares ordering state with the other. |
| `SettingsScreen.tsx`      | All forms + scalar/named param library | New form navigates to FormEditor without DB write (lazy save); archive icon on form rows; archived forms section (collapsed); archived params section (collapsed); param entry counts |
| `FormEditorScreen.tsx`    | Layout editor for a single form | PanResponder drag-and-drop reordering; sticky toggle; add from library or create new via ParamEditorScreen; lazy save for new forms — DB write deferred to Save button; `isNew` route param hides archive button |
| `ParamEditorScreen.tsx`   | Create/edit scalar or named param | Reads `initialName` from route params for pre-filled name on new params; Scalar: min/max/step/unit/labels/target; Named: options with archive icon + archived options section with restore; archive button in header for existing params |

---

## Database Layer (`src/db/`)

Two SQLite databases, both in WAL mode:
- **meta.db** — always open; holds the skills list and active skill ID.
- **`<skill>.db`** — one per skill; opened (and schema-applied) when that skill becomes active.

| File | Responsibility |
|------|---------------|
| `schema.ts` | All `CREATE TABLE` / `CREATE INDEX` statements for the skill DB. Source of truth for the schema. |
| `skillDb.ts` | Singleton connection manager. `openSkillDb(file)` closes the previous DB and opens the new one. `getSkillDb()` returns the current connection (throws if none open). |
| `meta.ts` | `getAllSkills`, `insertSkill`, `getActiveSkillId`, `setActiveSkillId` — operates on meta.db directly (lazy-opens it). |
| `parameters.ts` | CRUD for `scalar_parameter`, `named_parameter`, `named_option`. Archive/restore/delete for scalar and named params. Options support soft-delete via `archiveNamedOption`; restored by re-upserting (ON CONFLICT clears `archived_at`). |
| `forms.ts` | CRUD for `form`, `form_param`, `form_grid2d`. `saveFormLayout` replaces a form's entire layout atomically. Archive/restore/delete for forms. |
| `entries.ts` | `createEntry`, `getEntriesForSession`, `deleteEntry`. |
| `datapoints.ts` | `insertDatapoints` (bulk, transactional), `getDatapointsForEntry`, `deleteDatapointsForEntry` (deletes all scalar+named datapoints for an entry, used before re-inserting on edit). |
| `sessions.ts` | `startSession`, `renameSession`, `getSession`, `getSessionsWithEntryCounts`. |
| `savedLevels.ts` | CRUD + `reorderSavedLevels` for saved level filter presets. |
| `queries.ts` | `queryEntries(filters)` — dynamic JOIN query. `queryRichEntries(filters)` — same with full datapoints for stats view; includes `unit` on scalar rows. `queryRecentNamedOptions()` — recency order for UnifiedSession option pills. `queryParamUsageCounts()` — entry counts per param for FormsScreen. `queryOptionUsageCounts()` — entry counts per named option for ParamEditorScreen. |
| `mappers.ts` | Bridge between DB types and EntryForm types. `loadFormDefinitions` assembles the full form tree (params + grid2ds, ordered). `saveFormDefinitionToDb` persists a FormDefinition. `formValuesToDatapoints` converts form values to scalar/named datapoint inputs. |
| `types.ts` | TypeScript types for all DB entities (`ScalarParameter`, `NamedParameter`, `Form`, `Entry`, `Session`, etc.). |
| `seed.ts` | Demo disc golf data. Wipes and re-seeds the skill DB when `SEED_VERSION` is bumped. |
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

Applied pattern: `queryRichEntries(filters) → RichEntry[]` → passed to all param cards → each card does a local reduce.

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
