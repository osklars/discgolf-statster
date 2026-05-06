# Backlog

Tasks move through: **idea → ready → in progress**
A task is `ready` when there are no blocking open questions and it can go straight into CLAUDE_WIP.
When a task is merged and done, delete its section entirely — the git log is the history.

---

## Task: Exercise export / import
**Status:** ready
**Description:** Exercises (forms) and their stats (params) should be exportable and importable as JSON so they can be shared between interests or between users. This is also the primary data portability and "migration" story for the app — the DB schema stays clean and changes freely; users move data via JSON manipulation outside the app.
**Notes:**
- Design a JSON format for an `ExerciseTemplate`: stat definitions (type, min/max/options etc.) + layout (ordered stat slots, sticky flags, grid2d combos)
- Import: handle ID conflicts for stats that already exist in the target interest — match by name or generate new IDs
- Parallel to the existing `.statster` session export format (see `export.ts`)
- This unlocks "Move default exercises to importable asset files" below

---

## Task: Move default exercises to importable asset files
**Status:** idea
**Description:** The disc golf seed data in `seed.ts` hard-codes default exercises and stats. These should move to JSON asset files in `assets/` so the app ships without opinionated defaults and users (or Oskar) can import an interest template on first launch.
**Notes:**
- Depends on exercise export/import format being defined first
- `seed.ts` and `SEED_VERSION` can be removed once this is done
- First-launch experience needs thought: empty state UI, an "import a template" prompt?

---

## Task: XP and Levels system
**Status:** idea
**Description:** Gamify logged data with an XP system. Each logged entry earns XP; levels are named filter presets that track your XP within a subset of entries (e.g. "Forehand drives only").
**Notes / ideas:**
- Base XP per entry = exercise base value × completion fraction (more stats filled = more XP)
- Multipliers: streak bonus for consecutive practice days, comeback bonus after a gap
- The Levels screen (currently SavedLevels) becomes the place to see your level progress per filter preset
- XP mechanics are deliberately deferred until there's enough real data to know what feels right

---

## Task: Restyle AddStatSheet to match stat card design
**Status:** idea
**Description:** Once the stat overview redesign is done, update `AddStatSheet` (exercise editor) to share the same card design language. Distribution data not needed here — it's a picker, not an overview.

---

## Task: Dynamic exercises redesign
**Status:** idea
**Description:** Make exercises feel leaner during a session. The current design shows all stats expanded all the time. The goal is fewer taps to log a quick entry, with the option to add more detail when needed.
**Notes / keep in mind:**
- Core idea: stats are collapsed or hidden by default; you expand only what you need per entry
- Stretch idea: ability to add a stat to just one entry (a one-off) without it becoming part of the permanent exercise layout
- Order exercises by most recently used (small UX win, low effort, could be done independently)
- Choice stat pickers: instead of showing all options, show a small fixed set + the most recently used ones — reduces cognitive load and scroll for large option lists
- This is the most impactful but most open-ended task — needs a prototype or mockup conversation before it's `ready`

---

## Architectural questions / undecided

- [ ] `quality` vs `scalar` stat type split — at the DB level both are `scalar_parameter` (quality = target not null). At the TypeScript/UI level they're separate types. Whether `quality` belongs in the data-collection layer at all is undecided — the target/scoring concept may belong purely in the analysis layer, not the stats schema.
