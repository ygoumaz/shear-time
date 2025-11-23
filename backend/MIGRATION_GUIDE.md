# Database Migration Guide

This project uses Flask-Migrate (Alembic) for database schema migrations.

## Local Development

### Initial Setup (Already Done)
```bash
cd backend
pip install Flask-Migrate
flask db init
flask db migrate -m "Initial migration"
flask db upgrade
```

### Creating New Migrations
When you modify the models in `models.py`:

```bash
cd backend
flask db migrate -m "Description of changes"
flask db upgrade
```

### Common Commands
- `flask db migrate -m "message"` - Auto-generate migration from model changes
- `flask db upgrade` - Apply migrations to database
- `flask db downgrade` - Revert last migration
- `flask db history` - Show migration history
- `flask db current` - Show current migration version

## Render Deployment

### Prerequisites
1. Your code must be pushed to GitHub
2. The `migrations/` folder must be committed to git
3. PostgreSQL database must be configured on Render

### Render Configuration

#### Build Command
```bash
pip install -r requirements.txt && flask db upgrade
```

This ensures migrations are applied automatically during deployment.

#### Environment Variables
Set these in Render dashboard:
- `DATABASE_URL` - Provided automatically by Render for PostgreSQL
- `FLASK_APP` - Set to `app.py`
- Any other custom environment variables

### Important Notes

1. **SQLite vs PostgreSQL**: 
   - Local development uses SQLite
   - Production (Render) uses PostgreSQL
   - The migration system handles both databases

2. **Migration Files**:
   - Always commit `migrations/` folder to git
   - Render will use these files to update the database schema

3. **First Deployment**:
   - Render will create tables from scratch using migrations
   - No need to run `flask db init` on Render

4. **Subsequent Deployments**:
   - New migrations are automatically applied via build command
   - Database preserves existing data

### Troubleshooting

If migrations fail on Render:
1. Check the build logs for specific error messages
2. Ensure all migration files are committed to git
3. Verify DATABASE_URL is set correctly
4. Test migrations locally with PostgreSQL if possible

## Current Migration Status

- **Migration**: `6bca7ca82e54_add_group_id_service_code_and_block_.py`
- **Changes**: Added `group_id`, `service_code`, and `block_index` columns to Appointment table
- **Date**: 2025-11-23
