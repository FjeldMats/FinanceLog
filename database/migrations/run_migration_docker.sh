#!/bin/bash

# ============================================
# Database Migration Runner (Docker)
# ============================================
# This script runs the authentication migration on a Docker-based PostgreSQL instance
# For standalone PostgreSQL, use run_migration.sh instead
#
# Usage:
#   chmod +x run_migration_docker.sh
#   ./run_migration_docker.sh
#
# Prerequisites:
#   - Docker and docker-compose installed
#   - Database container running (postgres_transactions)
#   - Backend container running (finance_backend)

set -e  # Exit on error

# ============================================
# Configuration
# ============================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR/../.."
MIGRATION_FILE="001_add_authentication.sql"

# Docker container names (adjust if different)
DB_CONTAINER=${DB_CONTAINER:-postgres_transactions}
BACKEND_CONTAINER=${BACKEND_CONTAINER:-finance_backend}

# Database credentials from docker-compose
DB_NAME=${POSTGRES_DB:-finance_tracker}
DB_USER=${POSTGRES_USER:-admin}

# Default admin password for migration
ADMIN_PASSWORD=${ADMIN_PASSWORD:-password}

# ============================================
# Banner
# ============================================
echo "=========================================="
echo "  Authentication Migration Runner (Docker)"
echo "=========================================="
echo "Database Container: $DB_CONTAINER"
echo "Backend Container: $BACKEND_CONTAINER"
echo "Database: $DB_NAME"
echo "=========================================="
echo ""

# ============================================
# Check prerequisites
# ============================================
echo "Checking prerequisites..."

# Check if docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Error: docker is not installed"
    exit 1
fi

# Check if database container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
    echo "❌ Error: Database container '$DB_CONTAINER' is not running"
    echo "   Start it with: docker-compose up -d"
    exit 1
fi

# Check if backend container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${BACKEND_CONTAINER}$"; then
    echo "❌ Error: Backend container '$BACKEND_CONTAINER' is not running"
    echo "   Start it with: docker-compose up -d"
    exit 1
fi

echo "✅ All prerequisites met"
echo ""

# ============================================
# Generate password hash using backend container
# ============================================
echo "Generating password hash for admin user..."
ADMIN_PASSWORD_HASH=$(docker exec $BACKEND_CONTAINER python -c "
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
sed "s|__PASSWORD_HASH_PLACEHOLDER__|$ADMIN_PASSWORD_HASH|g" "$SCRIPT_DIR/$MIGRATION_FILE" > "$TEMP_MIGRATION"

echo "✅ Migration SQL prepared"
echo ""

# ============================================
# Backup database
# ============================================
echo "Creating database backup..."
BACKUP_DIR="$PROJECT_ROOT/backups"
BACKUP_FILE="pre_migration_$(date +%Y%m%d_%H%M%S).sql"
mkdir -p "$BACKUP_DIR"

docker exec $DB_CONTAINER pg_dump -U $DB_USER -d $DB_NAME > "$BACKUP_DIR/$BACKUP_FILE" 2>/dev/null || {
    echo "⚠️  Warning: Could not create backup (continuing anyway)"
}

if [ -f "$BACKUP_DIR/$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)
    echo "✅ Backup created: $BACKUP_FILE ($BACKUP_SIZE)"
else
    echo "⚠️  No backup created"
fi
echo ""

# ============================================
# Copy migration to container
# ============================================
echo "Copying migration SQL to database container..."
docker cp "$TEMP_MIGRATION" $DB_CONTAINER:/tmp/migration.sql

echo "✅ Migration SQL copied to container"
echo ""

# ============================================
# Run migration
# ============================================
echo "Running migration..."
echo "=========================================="

docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -f /tmp/migration.sql

MIGRATION_STATUS=$?

# ============================================
# Cleanup
# ============================================
echo ""
echo "Cleaning up..."
rm -f "$TEMP_MIGRATION"
docker exec $DB_CONTAINER rm -f /tmp/migration.sql
echo "✅ Cleanup complete"

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
    echo ""
    echo "Next steps:"
    echo "  1. Restart the backend container:"
    echo "     docker-compose restart backend"
    echo "  2. Visit http://localhost:3000/login"
    echo "  3. Login with admin/$ADMIN_PASSWORD"
    echo "  4. Change the admin password"
else
    echo "❌ Migration failed!"
    echo ""
    echo "To rollback, restore from backup:"
    echo "  docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME < $BACKUP_DIR/$BACKUP_FILE"
fi
echo "=========================================="

exit $MIGRATION_STATUS

