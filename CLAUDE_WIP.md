# Current Work in Progress

## Data collection redesign
**Branch:** `feature/unified-session`
**Status:** ready to implement

---

### Design decisions (settled)

**Layout** — One `UnifiedSessionScreen` replaces both `SessionScreen` and `SessionFormScreen`:
```
┌─────────────────────────────┐
│  Session header             │  name (tap to rename) + entry count + XP
├─────────────────────────────┤
│  Entry feed  ↑ scroll up    │  oldest entries at top
│  for older                  │
│  ...                        │
│  [most recent entry]        │  ← newest always at the bottom, closest to form
├─────────────────────────────┤
│  Form selector (pill strip) │  up to 4 pills + "more ▾" if needed
│  Param rows (collapsed)     │  one expands at a time (accordion)
│  [Log]                      │
└─────────────────────────────┘
```

**Hybrid pill selector** — applies to both form selector and named param input:
- Show up to 4 options as tappable pills
- If more exist, a "more ▾" pill opens a bottom sheet / inline list with all options
- For named params: the 4 shown are the most frequently used in the current session (falls back to definition order on first entry)
- For forms: show up to 4 forms in definition order; "more ▾" only appears with 5+

**Collapsed param rows** — default state for all params in the form area:
- Single line: param name on left, current value (or "—" if unset) on right
- Tap to expand into the full input (PillPicker or ScalarInput)
- Accordion: expanding one row collapses any other open row
- Sticky params show their persisted value in the collapsed state, making it easy to confirm before logging

**No grid2d** — grid2d params are skipped in the new form input. The underlying data stays in the DB; only the input widget is dropped for now. (Assumption: form edit mode access is deferred — details below.)

**Entry feed** — compact cards, newest at the bottom (closest to the form). Each card shows the form name and a summary of values. Non-tappable in phase 1; tapping is wired up in phase 2 (edit entries).

**Empty state** — when no entries yet, feed area shows a short muted prompt ("Your entries will appear here"). I'll set a placeholder and we can adjust on review.

**Edit entries (phase 2, same branch)** — entry cards become tappable. Tap opens a bottom sheet pre-filled with that entry's values. On save, delete + re-insert the datapoints for that entry row. Entry timestamp and session membership are preserved.

**Form editing access** — the current edit mode lives inside EntryForm and is reached via the FormHeader. Since we're replacing the form host screen, form edit mode will be accessible via a settings icon in the session header (opens the existing edit flow). Assumption: this can be done with minimal changes to the EntryForm internals.

**Share export** — moves to a button in the session header (was in the old SessionScreen).

---

### Implementation tasks

- [ ] Create `feature/unified-session` branch
- [ ] Add `UnifiedSession` route to `AppNavigator` and `types.ts`; wire Home navigation targets to it
- [ ] Build `UnifiedSessionScreen` skeleton: header + scrollable feed + sticky form footer
- [ ] Entry feed: load entries + datapoints for the session, render compact cards (non-tappable), newest at bottom
- [ ] Session header: name (rename on tap), entry count, session XP
- [ ] Form selector: hybrid pill strip (up to 4 + "more ▾")
- [ ] Collapsed param rows + accordion expansion (skip grid2d params)
- [ ] Named param input: hybrid pill picker (top-4 by session frequency + "more ▾")
- [ ] Sticky value display in collapsed rows; sticky values persist across entries
- [ ] Log button: write entry + datapoints, append new card to feed
- [ ] Empty feed placeholder text
- [ ] Share export button in header
- [ ] Form edit mode access via settings icon in header
- [ ] Remove old `SessionScreen` and `SessionFormScreen` once unified screen covers all functionality
- [ ] **Phase 2 — edit entries:**
  - [ ] Make entry cards tappable
  - [ ] Edit sheet: pre-fill form values from existing datapoints
  - [ ] On save: delete existing datapoints for entry, re-insert new ones
- [ ] Update README
