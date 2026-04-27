# Current Work in Progress

## Improve collaboration between Oskar and Claude

Establishing clear ground rules and shared tooling for efficient cooperation.

### Tasks

- [ ] Update `apps/statster/README.md` — expand into a living codebase map:
  - Domain concept hierarchy (skill → session → form → parameter)
  - Navigation and component tree
  - Per-file responsibility index (what each file owns, manages, and does NOT do)
  - Remove stale "Status" section
- [ ] Update `CLAUDE.md` — replace current architecture summary with:
  - Reference to README as the codebase map
  - Collaboration workflow rules (see Notes below)
  - Keep the Commands section as-is

### Collaboration workflow (to be written into CLAUDE.md)

- **Discuss before code** — propose approach and affected files before making any edits; wait for approval
- **Read CLAUDE_WIP.md at the start of each prompt** — Oskar may have edited it directly between sessions
- **After any code edits, read README and update it** if the change affects file responsibilities, structure, or concepts
- **Flag slow operations upfront** — if a task requires exploration or multi-file edits, say so before starting; ask Oskar if he knows the relevant file to save time
- **Oskar commits between each prompt/response cycle** — the README diff serves as a human-readable summary of what structurally changed

### Notes

- `CLAUDE_WIP.md` lives at the repo root; both Oskar and Claude treat it as the source of truth for current work
- `apps/statster/README.md` is the codebase map; detailed enough that Claude can locate where to make a change without searching files
