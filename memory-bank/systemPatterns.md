# System Patterns

## Architecture
Shear Time follows a client-server architecture:
- **Backend**: Python Flask application serving a REST API.
    - Uses SQLAlchemy for ORM.
    - Handles business logic for appointments and customers.
    - Manages service definitions via `services.json`.
- **Frontend**: React application for the user interface.
    - Consumes the Flask API.
    - Uses React Router for navigation.
    - Utilizes FullCalendar for appointment visualization.
    - **Holidays**: Public holidays (specifically for Vaud, Switzerland) are calculated client-side using `date-holidays` and merged into the calendar view as background events.

## Key Design Patterns

### Multi-Block Service Scheduling
Services are not treated as monolithic time blocks. Instead, they are composed of a sequence of steps defined in `backend/services.json`.
- When an appointment is created for a service, the backend iterates through its blocks.
- **Service** type blocks create an `Appointment` record.
- **Pause** type blocks advance the time without creating a record (effectively leaving a gap).
- All created appointments for a single service booking share a generated `group_id` UUID to link them together.

### Assignee Model (Chantal Delegation)
- Each `Appointment` block has an `assignee` field (`'marie'` or `'chantal'`).
- At creation, the frontend sends `delegated_blocks` (list of service-block indices to assign to Chantal).
- Conflict validation is per-assignee: Marie's blocks are checked against Marie's existing appointments, Chantal's blocks against Chantal's.
- Reassignment is bidirectional via PUT with conflict check in both directions.
- The frontend always shows all services (no pre-filtering by availability). Conflicts are caught at save time with 409 responses.

### Data Models
- **Customer**: `id`, `name`, `phone`.
- **Appointment**: 
    - `id`, `customer_id` (FK), `date`, `duration_minutes`.
    - `service_code`: Code corresponding to `services.json`.
    - `group_id`: Links related appointment blocks.
    - `block_index`: Original order in the service definition.
    - `assignee`: `'marie'` (default) or `'chantal'`.

### API Structure
- Resource-based routing (`/customers`, `/appointments`, `/services`).
- Standard CRUD operations.
- `GET /appointments/<id>/assignee-feasibility`: Returns availability of both assignees for a given block.
- Conflict detection via `has_assignee_conflict()` helper (used in creation, reassignment, and feasibility).

### Frontend Component Patterns
- `Modal.js`: Accepts `children` prop for extensibility (used for reassignment checkbox).
- Services are loaded once at mount and reused for both the calendar display and the creation panel.
- `delegated_blocks` indexing uses service-block-only indices (pauses excluded from count).
