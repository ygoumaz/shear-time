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

### Data Models
- **Customer**: `id`, `name`, `phone`.
- **Appointment**: 
    - `id`, `customer_id` (FK), `date`, `duration_minutes`.
    - `service_code`: Code corresponding to `services.json`.
    - `group_id`: Links related appointment blocks.
    - `block_index`: Original order in the service definition.

### API Structure
- Resource-based routing (`/customers`, `/appointments`, `/services`).
- Standard CRUD operations.
- Specific endpoints for complex logic (e.g., `/services/available` for checking multi-block fit).