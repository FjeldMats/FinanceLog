#!/bin/bash

# Rollback Script: Restore from backup
# This script helps you restore the database from a backup

set -e  # Exit on error

BACKUP_DIR="/home/mats/FinanceLog/database/backups"

echo "=========================================="
echo "Database Restore from Backup"
echo "=========================================="
echo ""

# List available backups
echo "Available backups:"
echo "----------------------------------------"
ls -lh "${BACKUP_DIR}"/*.sql 2>/dev/null || echo "No backups found in ${BACKUP_DIR}"

echo ""
read -p "Enter the full path to the backup file: " BACKUP_FILE

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo ""
echo "You are about to restore from:"
echo "  ${BACKUP_FILE}"
echo "  Size: $(du -h "${BACKUP_FILE}" | cut -f1)"
echo ""
echo "WARNING: This will overwrite all current data in the database!"
echo ""
read -p "Are you sure you want to proceed? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi

echo ""
echo "Restoring database..."
docker compose exec -T database psql -U admin -d finance_tracker < "${BACKUP_FILE}"

if [ $? -eq 0 ]; then
    echo "✓ Database restored successfully!"
else
    echo "✗ Restore failed!"
    exit 1
fi

echo ""
echo "=========================================="
echo "Restore Complete!"
echo "=========================================="

