# Current Work in Progress

## Data collection redesign
**Branch:** (not started — planning phase)
**Status:** proposal for review

---

### The core problem

The current flow has two separate screens for what is really one activity — being in a session and logging throws. `SessionScreen` shows history, `SessionFormScreen` shows the form. You can't see both at once, and the form itself is noisy: all params are expanded all the time, the tab bar is large, and switching forms takes several taps.

---

### Proposed: Unified session screen

One screen replaces both `SessionScreen` and `SessionFormScreen`. It has three vertical zones:

```
┌─────────────────────────────┐
│  Session header             │  name + compact progress (entry count, XP)
├─────────────────────────────┤
│                             │
│  Entry feed (scrollable)    │  most recent entries, newest at top
│                             │  tap any entry to edit it
│                             │
├─────────────────────────────┤
│  Form area (fixed bottom)   │  always visible, never scrolls away
│  [Form selector]            │
│  [Param inputs]             │
│  [Log]                      │
└─────────────────────────────┘
```

**Entry feed**
- Newest entry at the top, directly above the form area — you immediately see the last throw you logged
- Each entry card is compact: form name + key values in one line, timestamp small
- Tap → opens an edit sheet (pre-fills the form with that entry's values)
- ⚠️ *Assumption: edit-entry is part of this redesign. If we want to ship the nav redesign first without editing, tap-to-edit can be stubbed with a "Coming soon" or just disabled for now.*

**Form area**
- Fixed to the bottom, always reachable without scrolling
- Form selector: compact horizontal pill strip (replaces the current large tab bar). If only one form, no strip shown.
- Param inputs: collapsed by default — each param is a single-line row showing its name and current value. Tap a row to expand it into its input. Only one param expanded at a time (same accordion pattern as the stat cards).
- ⚠️ *Assumption: "sticky" params (clear_after_submit = false) show their persisted value in the collapsed row, making it easy to confirm they're still set correctly before logging.*
- Log button: same as today — submits the current values and collapses all inputs back to their single-line state, ready for the next entry.

**Session header**
- Session name (tappable to rename, same as today)
- Entry count + XP earned this session — no level curve here, just the raw numbers
- ⚠️ *Assumption: no per-session mini stat graph in this iteration. That's a natural extension but would add scope.*

---

### Navigation change

```
Home
├── "+ New session" → UnifiedSession (empty feed, form ready)
└── Session row    → UnifiedSession (existing entries + form)
```

The old `SessionScreen` and `SessionFormScreen` are replaced by a single `UnifiedSessionScreen`. The "Continue session" concept disappears — navigating to an existing session always lands on this unified view, and the form is just there.

⚠️ *Assumption: share session export moves to a header button on the unified screen (currently lives in SessionScreen).*

---

### Form area — param input detail

Collapsed param row:
```
  Disc         [Destroyer    ]    ← named: shows current option
  Distance     [68 m         ]    ← scalar: shows current value
  Angle        [—            ]    ← empty / not yet set
```

Expanded param (tapped):
```
  Disc         ▲
  ┌─────────────────────┐
  │ Boss  Destroyer  DD │   ← pill picker / slider fills this space
  └─────────────────────┘
```

⚠️ *Assumption: the expanded input uses the existing PillPicker / ScalarInput components — no new input widgets needed.*

⚠️ *Assumption: grid2d params expand into their 2D input as before, just within the collapsed row pattern.*

---

### What this unblocks

- **Edit entry** — tap any entry in the feed to open an edit sheet. The sheet pre-fills the form values for that entry. On save, it replaces the datapoints for that entry row. This resolves the "Editable entries" task in the backlog.
- **Session progress at a glance** — entry count and XP are visible without navigating away.
- **Leaner form** — collapsing params by default removes most of the noise. Power users who fill in everything still can; casual users who only log one or two params per throw aren't confronted with the whole list at once.

---

### Open questions (for Oskar to answer)

1. **Edit or not in v1?** Edit-entry is implied by the tap-on-entry pattern. Should we build it in this iteration, stub it, or leave entries non-tappable for now?
2. **Form selector style** — horizontal pill strip is the idea, but if someone has 4+ forms the strip could get cramped. Alternative: a single "Form ▾" dropdown. Which feels better?
3. **Feed ordering** — newest at top (reverse chronological) feels right to me so the last throw is right above the form. Does that match your mental model, or do you prefer oldest-at-top so the session reads like a log?
4. **Empty state** — when no entries yet, the feed area is blank. A short prompt ("Log your first throw below") or just empty space?
