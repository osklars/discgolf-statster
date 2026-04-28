# Backlog

Tasks move through: **idea → ready → in progress**
A task is `ready` when there are no blocking open questions and it can go straight into CLAUDE_WIP.
When a task is merged and done, delete its section entirely — the git log is the history.

---

## Task: Editable entries
**Status:** idea
**Description:** Allow the user to edit a previously logged entry. Currently entries are write-once.
**Notes:**
- Needs a way to load existing datapoints back into the form with the correct values pre-filled
- On save: replace (delete + re-insert) the datapoints for that entry, keep the entry row itself
- UI entry point unclear — tap an entry card in `SessionScreen`?
- Should editing use the same form the entry was created with, or any form?

---

## Task: Form export / import
**Status:** idea
**Description:** Forms should be exportable and importable as JSON files so they can be shared between skills or users.
**Notes:**
- An export format for `FormDefinition` (params + layout) needs to be designed, parallel to the existing `.statster` session format
- Should export include the parameter definitions (min/max/options etc.) or just the layout referencing param IDs?
- Import needs to handle ID conflicts (params that already exist in the target skill)

---

## Task: Move default forms to importable asset files
**Status:** idea
**Description:** The disc golf seed data in `seed.ts` hard-codes default forms and parameters. These should move to JSON asset files in `assets/` so the app ships without opinionated defaults and users (or Oskar) can import a skill template on first launch.
**Notes:**
- Depends on form export/import format being defined first
- `seed.ts` and `SEED_VERSION` can be removed or simplified once this is done
- First-launch experience needs thought: empty state UI, an "import a template" prompt?

---

## Task: Restyle AddParamSheet to match param card design
**Status:** idea
**Description:** Once the parameter overview redesign is done, update `AddParamSheet` (form editor) to share the same card design language. Distribution data not needed here — it's a picker, not an overview.

---

## Task: Dynamic forms redesign
**Status:** idea
**Description:** Make forms feel leaner during a session. The current design shows all params expanded all the time. The goal is fewer taps to log a quick entry, with the option to add more detail when needed.
**Notes / keep in mind:**
- Core idea: params are collapsed or hidden by default; you expand only what you need per entry
- Stretch idea: ability to add a param to just one entry (a one-off) without it becoming part of the permanent form layout
- Order forms by most recently used (small UX win, low effort, could be done independently)
- Named option pickers: instead of showing all options, show a small fixed set + the most recently used ones — reduces cognitive load and scroll for large option lists
- This is the most impactful but most open-ended task — needs a prototype or mockup conversation before it's `ready`

---

## Bugs

- [ ] `SessionScreen` displays the raw `form_id` (e.g. `throw_detailed`) as the form label on each entry card, instead of the form's display name. Needs a name lookup.

---

## Architectural questions / undecided

- [ ] `quality` vs `scalar` param type split — at the DB level both are `scalar_parameter` (quality = target not null). At the TypeScript/UI level they're separate types. Whether `quality` belongs in the data-collection layer at all is undecided — the target/scoring concept may belong purely in the analysis layer, not the stats schema.
- [ ] `skillDb.ts` has a runtime migration baked in (`ALTER TABLE session ADD COLUMN name TEXT` wrapped in try/catch) rather than through a schema version. Fine for now but will need a proper migration strategy as the schema grows.
