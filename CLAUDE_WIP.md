# Current Work in Progress

## Data collection redesign
**Branch:** `feature/unified-session`
**Status:** in progress

---

### Design (settled)

**Layout**
```
┌─────────────────────────────┐
│  Session header             │  name (tap to rename) · entry count · XP
├─────────────────────────────┤
│  Entry feed  ↑ older        │
│  ...                        │
│  [most recent entry]        │  ← newest at bottom, closest to form
├─────────────────────────────┤
│  [Form selector — pills]    │
│  [Param rows — collapsed]   │  one expands at a time
│  [+ Add param for entry]    │  one-off param, not saved to form def
│  [Log]                      │
└─────────────────────────────┘
```

**FittingPills** — reused for both form selector and named param input:
- Measures all pill widths (invisible first pass)
- Shows as many as fit in the available width
- If any overflow: a "more ▾" pill appears (taking its own space), overflow items go into a bottom sheet showing all options
- A "+" pill always appears at the end — adds a new option (named_option to DB) or a new form

**Collapsed param rows** — accordion, one open at a time:
- Shows param name + current value (or "—")
- Sticky params show persisted value in collapsed state
- Scalar: expands into ScalarInput
- Named: expands into FittingPills
- Grid2d: skipped in this design

**One-off params** — "+" below the param list:
- Opens a sheet with skill params not currently in the form
- Selected param appears as an expanded row for this entry only
- Cleared after Log; never written to the form definition

**Edit entries (phase 2, same branch)** — entry cards start non-tappable; wired up after layout is solid.

**Empty feed** — muted placeholder text: "Your entries will appear here"

---

### Tasks

- [ ] Create branch, add `UnifiedSession` to `AppNavigator` + `types.ts`, wire Home navigation
- [ ] `FittingPills` component (measure → fit → overflow sheet)
- [ ] `UnifiedSessionScreen` skeleton: header + scrollable feed + sticky form footer
- [ ] Session header: rename on tap, entry count, XP
- [ ] Entry feed: compact `EntryCard`, load from DB, empty state
- [ ] Form selector as `FittingPills` (forms as items, active form highlighted)
- [ ] `ParamRow`: collapsed display + accordion expand
- [ ] Named param input: `FittingPills` for options
- [ ] Scalar param input: reuse `ScalarInput`
- [ ] Sticky values: persist across Log, reset on form switch
- [ ] Log: write entry + datapoints, append card to feed
- [ ] One-off param: "+ Add param" → sheet → param appears for this entry only
- [ ] Share export button in header
- [ ] Remove `SessionScreen` + `SessionFormScreen` once covered
- [ ] **Phase 2 — edit entries:**
  - [ ] Entry cards tappable
  - [ ] Edit sheet pre-filled from existing datapoints
  - [ ] Save: delete + re-insert datapoints
- [ ] Update README

---

### File plan

```
src/screens/UnifiedSessionScreen.tsx
src/components/session/FittingPills.tsx
src/components/session/ParamRow.tsx
src/components/session/EntryCard.tsx
```
