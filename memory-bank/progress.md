# Progress

## Status
- **Core Logic**: Fully implemented.
    - Customer CRUD: Complete.
    - Appointment CRUD: Complete.
    - Multi-block scheduling: Complete.
    - Chantal delegation: Complete (assignee per block, conflict checks, reassignment).
- **Frontend**: Feature-complete.
    - Calendar view: FullCalendar with styled header toggle (top-left) for Chantal blocks.
    - Holidays: Swiss Vaud canton integrated.
    - Service creation panel: Shows all services; inline Marie/Chantal pills per block with live ✅/❌ availability; conflict = amber border; submit disabled on conflict.
    - Reassignment modal: Slider toggle with feasibility check, immediate save.
    - Drag & drop: Removed.
    - Customer search by name **and phone number** in both Customers page and new appointment dropdown.
    - Appointment dropdown shows customer phone alongside name.
- **Backend**: Feature-complete.
    - `has_assignee_conflict`: Per-assignee conflict detection.
    - Creation: Per-block validation (Marie for her blocks, Chantal for delegated).
    - PUT reassignment: Bidirectional with conflict check.
    - Feasibility endpoint: Returns availability for both assignees.
- **Documentation**: Full delivery spec in `deliveries/001-chantal-delegation/`.

## Completed Deliveries
- [x] `001-chantal-delegation` — All 14 tasks + 4 post-test fixes (BF-01 to BF-04)

## Known Issues
- None currently identified.

## Roadmap
- [x] Complete Memory Bank initialization.
- [x] Integrate public holidays (Vaud) into calendar.
- [x] Implement Chantal delegation feature.
- [x] Remove service availability pre-filtering (BF-04).
- [x] Real-time conflict detection UI in creation panel.
- [ ] Deploy to Render with migration.
- [ ] Further user testing and feedback collection.
