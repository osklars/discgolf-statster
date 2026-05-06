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

- [x] UI strings — all screen titles, labels, button text, empty states, alerts
- [x] Code identifiers — component names, variable names, function names, type names where they surface in readable code (e.g. `ExerciseDef`, `ExerciseEditorScreen`, `useEntryDraft.exerciseId`, `switchExercise`)
- [ ] DB column/table names — deferred to a separate task; keep snake_case DB names as-is for now, rename only at the TypeScript boundary
- [x] README + CLAUDE_WIP/TODO — update all references once code is done
- [x] `seed.ts` — already uses new function names; exercise/stat display names are domain content, not identifier renames
