# Active Context

## Current Status
The project has completed the **Chantal Delegation** feature (delivery `001-chantal-delegation`). All 14 tasks implemented + 4 post-test bugfixes (BF-01 through BF-04) + UI enhancements (real-time conflict detection + panel redesign with inline pills + styled header toggle).

## Recent Work
- Implemented full delegation feature: Marie can assign appointment blocks to Chantal.
- BF-04: Removed the "available services" filtering at creation — all services always shown. Conflict validated at save per-assignee with 409 + popup.
- **Real-time conflict detection (UI-01 to UI-06):**
  - Backend endpoint `POST /appointments/conflict-check` checks per-block conflicts.
  - `blockConflicts` state updated live via `useEffect`; submit button disabled on conflict.
- **Panel redesign — Inline pills (UI-07 to UI-11):**
  - Marie ↔ Chantal toggle slider removed from below each block.
  - Replaced with two vertical pill buttons **inside** each service card (right side): "Marie" and "Chantal", each with a ✅/❌ availability indicator to the right.
  - Conflict detection now runs **two parallel calls** (all-Marie + all-Chantal) so both pills show live availability independently of the current selection. `blockConflicts[svc_idx] = { marie: bool, chantal: bool }`.
  - Pills: active = white background, inactive = translucent white ghost, conflicted = disabled (opacity 0.35).
  - Conflict indicator on card: amber left border (`4px solid #ffc107`).
  - Submit button disabled logic updated to use `.marie` / `.chantal` per selected assignee.
  - Panel widened to 340px.
- **Header toggle (UI-10):**
  - "Afficher les tâches de Chantal" native checkbox replaced with a styled CSS slider matching the app theme (indigo/purple gradient when active).
  - Moved to the **top-left** of the header (before the "Calendrier" title). Keyboard accessible (Space/Enter).
- **Phone number search:**
  - `filteredCustomers` in both `Customers.js` and `Appointments.js` now matches on `customer.phone` in addition to `customer.name`.
  - Appointments dropdown shows phone number alongside customer name (`Jean Dupont — 0791234567`) via `.customerItemPhone` CSS class.

## Architecture Decisions (Real-time Conflict UI)
- **`/appointments/conflict-check` is read-only**: Reuses `has_assignee_conflict`, never persists. Safe to call on every interaction.
- **Dual parallel conflict check**: Two calls per service/date change — one with no delegation (Marie), one with all blocks delegated (Chantal). This avoids re-fetching when the user switches a pill.
- **CSS specificity fix**: `.appointmentPanel button` is a broad rule — pill overrides duplicated with `.appointmentPanel .assignPill` selectors.

## Next Steps
- Continue user testing of the Chantal delegation feature.
- Deploy to Render (migration already prepared).
- Potential further UI refinements based on user feedback.
