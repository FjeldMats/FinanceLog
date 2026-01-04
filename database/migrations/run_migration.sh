#!/bin/bash

# ============================================
# Database Migration Runner (Standalone)
# ============================================
# This script runs the authentication migration on a standalone PostgreSQL instance
# For Docker environments, use run_migration_docker.sh instead
#
# Usage:
#   chmod +x run_migration.sh
#   ./run_migration.sh
#
# Prerequisites:
#   - PostgreSQL client (psql) installed
#   - Python 3 with werkzeug installed
#   - Database credentials in environment or .env file

set -e  # Exit on error

# ============================================
# Configuration
# ============================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATION_FILE="$SCRIPT_DIR/001_add_authentication.sql"

# Load environment variables from .env if it exists
if [ -f "$SCRIPT_DIR/../../.env" ]; then
    echo "Loading environment variables from .env..."
    export $(grep -v '^#' "$SCRIPT_DIR/../../.env" | xargs)
fi

# Database credentials (with defaults)
DB_HOST=${POSTGRES_HOST:-localhost}
DB_PORT=${POSTGRES_PORT:-5432}
DB_NAME=${POSTGRES_DB:-finance_tracker}
DB_USER=${POSTGRES_USER:-admin}
DB_PASSWORD=${POSTGRES_PASSWORD:-admin}

# Default admin password for migration
ADMIN_PASSWORD=${ADMIN_PASSWORD:-password}

# ============================================
# Banner
# ============================================
echo "=========================================="
echo "  Authentication Migration Runner"
echo "=========================================="
echo "Database: $DB_NAME"
echo "Host: $DB_HOST:$DB_PORT"
echo "User: $DB_USER"
echo "=========================================="
echo ""

# ============================================
# Check prerequisites
# ============================================
echo "Checking prerequisites..."

# Check if psql is installed
if ! command -v psql &> /dev/null; then
    echo "❌ Error: psql (PostgreSQL client) is not installed"
    echo "   Install it with: sudo apt-get install postgresql-client"
    exit 1
fi

# Check if python3 is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: python3 is not installed"
    exit 1
fi

# Check if werkzeug is available
if ! python3 -c "import werkzeug" 2>/dev/null; then
    echo "❌ Error: werkzeug is not installed"
    echo "   Install it with: pip3 install werkzeug"
    exit 1
fi

echo "✅ All prerequisites met"
echo ""

# ============================================
# Generate password hash
# ============================================
echo "Generating password hash for admin user..."
ADMIN_PASSWORD_HASH=$(python3 -c "
from werkzeug.security import generate_password_hash
print(generate_password_hash('$ADMIN_PASSWORD'))
")

if [ -z "$ADMIN_PASSWORD_HASH" ]; then
    echo "❌ Error: Failed to generate password hash"
    exit 1
fi

echo "✅ Password hash generated"
echo ""

# ============================================
# Prepare migration SQL
# ============================================
echo "Preparing migration SQL..."
TEMP_MIGRATION="/tmp/migration_$(date +%s).sql"

# Replace placeholder with actual password hash
sed "s|__PASSWORD_HASH_PLACEHOLDER__|$ADMIN_PASSWORD_HASH|g" "$MIGRATION_FILE" > "$TEMP_MIGRATION"

echo "✅ Migration SQL prepared"
echo ""

# ============================================
# Backup database (optional but recommended)
# ============================================
echo "Creating database backup..."
BACKUP_FILE="$SCRIPT_DIR/../backups/pre_migration_$(date +%Y%m%d_%H%M%S).sql"
mkdir -p "$SCRIPT_DIR/../backups"

PGPASSWORD=$DB_PASSWORD pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME > "$BACKUP_FILE" 2>/dev/null || {
    echo "⚠️  Warning: Could not create backup (continuing anyway)"
}

if [ -f "$BACKUP_FILE" ]; then
    echo "✅ Backup created: $BACKUP_FILE"
else
    echo "⚠️  No backup created"
fi
echo ""

# ============================================
# Run migration
# ============================================
echo "Running migration..."
echo "=========================================="

PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$TEMP_MIGRATION"

MIGRATION_STATUS=$?

# ============================================
# Cleanup
# ============================================
rm -f "$TEMP_MIGRATION"

# ============================================
# Summary
# ============================================
echo ""
echo "=========================================="
if [ $MIGRATION_STATUS -eq 0 ]; then
    echo "✅ Migration completed successfully!"
    echo ""
    echo "Default admin credentials:"
    echo "  Username: admin"
    echo "  Password: $ADMIN_PASSWORD"
    echo ""
    echo "⚠️  IMPORTANT: Change the admin password after first login!"
else
    echo "❌ Migration failed!"
    echo ""
    echo "To rollback, restore from backup:"
    echo "  PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME < $BACKUP_FILE"
fi
echo "=========================================="

exit $MIGRATION_STATUS

