# Backlog / Observations

## Bugs

- [ ] `SessionScreen` displays the raw `form_id` (e.g. `throw_detailed`) as the form label on each entry card, instead of the form's display name. Needs a name lookup.

## Architectural questions / undecided

- [ ] `quality` vs `scalar` param type split — at the DB level both are `scalar_parameter` (quality = target not null). At the TypeScript/UI level they're separate types. Whether `quality` belongs in the data-collection layer at all is undecided — the target/scoring concept may belong purely in the analysis layer, not the stats schema.

## Small observations

- [ ] Sessions are created eagerly (a DB row is written) as soon as `SessionFormScreen` opens, before any entry is logged. This means abandoned sessions (navigating away immediately) leave orphan session rows.
- [ ] `export.ts` + `shareSession.ts` implement a `.statster` JSON export shared via the iOS share sheet. The format is versioned (`version: 1`). Now documented in README.
- [ ] `skillDb.ts` has a runtime migration baked in (`ALTER TABLE session ADD COLUMN name TEXT` wrapped in try/catch) rather than through a schema version. Fine for now but will need a proper migration strategy as the schema grows.
- [x] Add to claude.md that markdown-files are not code and do not need explicit "go" before editing.
- [x] Add collab routines for how to use CLAUDE_TODO.
