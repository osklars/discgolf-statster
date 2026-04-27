# Current Work in Progress

## Deep-document the app in apps/statster/README.md

The goal is to make the README detailed enough that Claude can locate where to make any change just by reading it — without searching through files. This eliminates the most expensive part of our collaboration.

The README should contain:

- **Domain concept hierarchy** — skill → session → form → parameter, explained in plain English so a change request maps naturally to a concept
- **Navigation and component tree** — so UI-level changes have a clear entry point
- **Per-file responsibility index** — what each file owns, what state it manages, what it does NOT do

### Tasks

- [ ] Read and deeply understand the full codebase
- [ ] Write the domain concept hierarchy section
- [ ] Write the navigation and component tree section
- [ ] Write the per-file responsibility index
- [ ] Clean up stale/legacy content in the README (old Status section, "From old claude.md" heading etc.)

### Notes

- This is a read-heavy task — explore freely
- Accuracy matters more than speed; if something is unclear, check the source
- Once done, this README becomes a living document: update it after every code change
