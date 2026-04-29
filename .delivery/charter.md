# Charter — Shear Time

## Project Nature
Brownfield React + Flask application for hairdresser appointment scheduling.

## Engineering Rules

### Language
- All user-facing text must be in **French**.
- Code identifiers (variables, functions, DB columns) may be English.

### Backend
- Python / Flask — follow existing patterns in `routes.py` and `models.py`.
- SQLAlchemy ORM. Every schema change requires an **Alembic migration** (Flask-Migrate).
- No breaking changes to existing API contracts. New fields must be backward-compatible.
- Services are defined declaratively in `services.json`; business logic reads from it.

### Frontend
- React with functional components and hooks — no class components.
- FullCalendar for calendar views (`@fullcalendar/react`).
- CSS Modules for component-scoped styles (e.g. `Appointments.module.css`).
- French locale already active (`frLocale`); maintain it.

### Quality Bar
- New API endpoints must return consistent JSON shapes matching existing style.
- No orphaned data: DB constraints and cascade logic must be maintained.
- UI interactions must be non-destructive by default (no accidental overwrites).

### Decision Constraints
- Minimal surface area: only add what the requirements explicitly call for.
- Prefer extending existing models over creating new tables when semantically correct.
- Avoid feature flags or environment-specific behaviour unless explicitly requested.
