# Tech Context

## Backend
- **Core**: Python 3, Flask.
- **Database**: 
    - ORM: Flask-SQLAlchemy.
    - Engine: Likely SQLite for development (implied by typical Flask setups, though `psycopg2` indicates potential PostgreSQL usage/compatibility).
    - Migrations: Flask-Migrate (Alembic).
- **Other Libraries**: 
    - `flask-cors` for Cross-Origin Resource Sharing.
    - `gunicorn` for production serving.

## Frontend
- **Framework**: React 19.
- **Build Tool**: Create React App (`react-scripts`).
- **Scheduling**: `@fullcalendar/react` and plugins (daygrid, timegrid, interaction).
- **Dates/Holidays**: `date-holidays` (Swiss Vaud configuration).
- **Routing**: `react-router-dom` v7.

## Development Environment
- **Node.js**: Required for frontend.
- **Python**: Required for backend.
- **Scripts**: `start_app.bat` (Windows batch file) likely provided for easy startup.

## Project Structure
- `backend/`: Python server code, database models, migrations.
- `frontend/`: React components, pages, public assets.