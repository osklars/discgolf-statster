# Current Work in Progress

## Task: Rename domain concepts throughout the app

Agreed renames from terminology discussion:

| Old | New | Notes |
|-----|-----|-------|
| Skill | Interest | "Skill" implies ability level; "Interest" is neutral and generic |
| Form | Exercise | A form defines one real-world thing you do. "Log an exercise" reads naturally |
| Parameter / Param | Stat | More human, fits the app name Statster |
| Named parameter | Choice stat | User-facing type label |
| Scalar parameter | Number stat | User-facing type label |
| Saved Levels | Levels | Any combination of stat filters is a level you can rank up in |

### Scope

- [ ] UI strings — all screen titles, labels, button text, empty states, alerts
- [ ] Code identifiers — component names, variable names, function names, type names where they surface in readable code (e.g. `FormDef`, `FormEditorScreen`, `useEntryDraft.formId`, `switchForm`)
- [ ] DB column/table names — rename fully; app is pre-release so no migration needed; JSON export/import is the data continuity story going forward
- [ ] README + CLAUDE_WIP/TODO — update all references once code is done
- [ ] `seed.ts` — exercise/stat names in the disc golf demo data
