#!/bin/bash

# Migration Script: Consolidate Moss Kommune Subcategories
# This script consolidates "Renovasjon (moss kommune)" and "Eindomskatt (moss kommune)"
# into a single subcategory "moss kommune"

set -e  # Exit on error

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/mats/FinanceLog/database/backups"
BACKUP_FILE="${BACKUP_DIR}/backup_before_moss_kommune_consolidation_${TIMESTAMP}.sql"

echo "=========================================="
echo "Moss Kommune Subcategory Consolidation"
echo "=========================================="
echo ""

# Create backup directory if it doesn't exist
echo "Creating backup directory..."
mkdir -p "${BACKUP_DIR}"

# Step 1: Backup the database
echo ""
echo "Step 1: Creating database backup..."
echo "Backup file: ${BACKUP_FILE}"
docker compose exec -T database pg_dump -U admin -d finance_tracker > "${BACKUP_FILE}"

if [ $? -eq 0 ]; then
    echo "✓ Backup created successfully!"
    echo "  Location: ${BACKUP_FILE}"
    echo "  Size: $(du -h "${BACKUP_FILE}" | cut -f1)"
else
    echo "✗ Backup failed! Aborting migration."
    exit 1
fi

# Step 2: Show current data
echo ""
echo "Step 2: Current data in 'Hus' category:"
echo "----------------------------------------"
docker compose exec -T database psql -U admin -d finance_tracker -c "
SELECT
    subcategory,
    COUNT(*) as transaction_count,
    SUM(amount) as total_amount
FROM transactions
WHERE category = 'Hus'
  AND subcategory LIKE '%moss kommune%'
GROUP BY subcategory
ORDER BY subcategory;
"

# Step 3: Ask for confirmation
echo ""
echo "Step 3: Confirmation"
echo "----------------------------------------"
echo "This will:"
echo "  1. Update all transactions with subcategory 'Renovasjon (moss kommune)' to 'moss kommune'"
echo "  2. Update all transactions with subcategory 'Eindomskatt (moss kommune)' to 'moss kommune'"
echo "  3. Update all transactions with subcategory 'Eindomskatt  (moss kommune)' to 'moss kommune'"
echo "  (Note: This includes all variations with different spacing)"
echo ""
read -p "Do you want to proceed with the migration? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Migration cancelled."
    exit 0
fi

# Step 4: Perform the migration
echo ""
echo "Step 4: Performing migration..."
echo "----------------------------------------"

docker compose exec -T database psql -U admin -d finance_tracker <<EOF
BEGIN;

-- Update all moss kommune related subcategories to 'moss kommune'
-- This handles all variations including different spacing
UPDATE transactions
SET subcategory = 'moss kommune'
WHERE category = 'Hus'
  AND subcategory LIKE '%moss kommune%';

COMMIT;
EOF

if [ $? -eq 0 ]; then
    echo "✓ Migration completed successfully!"
else
    echo "✗ Migration failed!"
    echo "You can restore from backup: ${BACKUP_FILE}"
    exit 1
fi

# Step 5: Verify the changes
echo ""
echo "Step 5: Verification"
echo "----------------------------------------"
echo "New data in 'Hus' category:"
docker compose exec -T database psql -U admin -d finance_tracker -c "
SELECT 
    subcategory, 
    COUNT(*) as transaction_count,
    SUM(amount) as total_amount
FROM transactions 
WHERE category = 'Hus' 
  AND subcategory = 'moss kommune'
GROUP BY subcategory;
"

echo ""
echo "Checking for old subcategories (should be empty):"
docker compose exec -T database psql -U admin -d finance_tracker -c "
SELECT
    subcategory,
    COUNT(*) as transaction_count
FROM transactions
WHERE category = 'Hus'
  AND subcategory LIKE '%moss kommune%'
  AND subcategory != 'moss kommune'
GROUP BY subcategory;
"

echo ""
echo "=========================================="
echo "Migration Complete!"
echo "=========================================="
echo "Backup saved at: ${BACKUP_FILE}"
echo ""
echo "To restore from backup if needed:"
echo "  docker compose exec -T database psql -U admin -d finance_tracker < ${BACKUP_FILE}"
echo ""

