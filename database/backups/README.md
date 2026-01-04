# Database Backups

This directory contains database backups for the Finance Tracker application.

## Latest Backup

- **File**: `finance_tracker_20260104_212935_clean.sql`
- **Date**: 2026-01-04 21:29:35
- **Description**: Clean database with deduplicated transactions and authentication support
- **Records**: 2,371 transactions
- **Date Range**: 2023-01-02 to 2026-01-21
- **Features**: 
  - User authentication tables
  - Cleaned category names (trimmed whitespace)
  - Deduplicated transactions
  - All transactions linked to user_id=1 (admin)

## Restore Instructions

To restore this backup:

```bash
# From the repository root
docker exec -i 820c5a0d3916_postgres_transactions psql -U admin -d finance_tracker < database/backups/finance_tracker_20260104_212935_clean.sql
```

Or if you need to recreate the database:

```bash
# Drop and recreate the database
docker exec 820c5a0d3916_postgres_transactions psql -U admin -c "DROP DATABASE IF EXISTS finance_tracker;"
docker exec 820c5a0d3916_postgres_transactions psql -U admin -c "CREATE DATABASE finance_tracker;"

# Restore the backup
docker exec -i 820c5a0d3916_postgres_transactions psql -U admin -d finance_tracker < database/backups/finance_tracker_20260104_212935_clean.sql
```

## Creating New Backups

To create a new backup:

```bash
docker exec 820c5a0d3916_postgres_transactions pg_dump -U admin -d finance_tracker > database/backups/finance_tracker_$(date +%Y%m%d_%H%M%S).sql
```

## Note

Backup files (*.sql) are excluded from git for security reasons. Keep backups in a secure location.

