# CLAUDE.md

## Collaboration

We discuss ideas and plan before implementing. `CLAUDE_WIP.md` at the repo root is our shared task tracker — read it at the start of each prompt in case Oskar has made edits directly.

**Markdown files are not code** — edit `.md` files freely without waiting for approval.

**During planning** — avoid file exploration. Refer to `apps/statster/README.md` or ask Oskar as a first resort. This saves time and credits.

**During implementation** — explore freely. Use whatever tools and operations are needed; Oskar may step away and leave you to it.

**After any code changes** — re-read `apps/statster/README.md` and update it to reflect what changed. Oskar commits between every prompt, so the README diff serves as his summary of what structurally changed.

## Git workflow

Each WIP task gets its own branch. When the task is done, squash merge to main and delete the branch.

```bash
# Start a task
git checkout -b feature/<task-name>

# Finish a task
git checkout main
git merge --squash feature/<task-name>
git commit -m "<clean summary message>"
git branch -D feature/<task-name>
```

Claude creates the branch when a task moves into CLAUDE_WIP. Claude never pushes or merges without explicit approval.

When a task is merged and done, delete its section from CLAUDE_TODO entirely — the git log is the history.

## Shared files

- **`CLAUDE_WIP.md`** — the current task and its sub-steps as checkboxes. Read at the start of every prompt. Rewritten when starting a new task.
- **`CLAUDE_TODO.md`** — persistent backlog: bugs, observations, future ideas. Add items freely during any task; check them off as they get resolved. Read it at the start of each prompt alongside CLAUDE_WIP.

## Project

See `apps/statster/README.md` for the full architecture, domain concepts, and per-file responsibility index.

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
