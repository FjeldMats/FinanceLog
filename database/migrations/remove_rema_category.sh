#!/bin/bash

# Migration Script: Remove Rema main category
# This script moves transactions from "Rema" category to "Mat" category with "Rema 1000" subcategory

set -e  # Exit on error

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/mats/FinanceLog/database/backups"
BACKUP_FILE="${BACKUP_DIR}/backup_before_rema_category_removal_${TIMESTAMP}.sql"

echo "=========================================="
echo "Remove Rema Category Migration"
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

# Step 2: Show current Rema category transactions
echo ""
echo "Step 2: Current transactions in 'Rema' category:"
echo "-------------------------------------------------"
docker compose exec -T database psql -U admin -d finance_tracker -c "
SELECT 
    id,
    transaction_date,
    category,
    subcategory,
    description,
    amount
FROM transactions
WHERE category = 'Rema'
ORDER BY transaction_date;
"

# Step 3: Move Rema category to Mat with Rema 1000 subcategory
echo ""
echo "Step 3: Moving 'Rema' category to 'Mat' with 'Rema 1000' subcategory..."
echo "------------------------------------------------------------------------"

docker compose exec -T database psql -U admin -d finance_tracker -c "
UPDATE transactions
SET 
    category = 'Mat',
    subcategory = 'Rema 1000',
    description = CASE 
        WHEN description IS NULL OR description = '' THEN 'Rema'
        ELSE description
    END
WHERE category = 'Rema';
"

echo "✓ Rema category removed and moved to Mat!"

# Step 4: Verify the migration
echo ""
echo "Step 4: Verifying migration..."
echo "-------------------------------"

echo "Checking for any remaining 'Rema' category transactions:"
docker compose exec -T database psql -U admin -d finance_tracker -c "
SELECT COUNT(*) as remaining_rema_transactions
FROM transactions
WHERE category = 'Rema';
"

echo ""
echo "Checking updated transactions in 'Mat' category with 'Rema 1000' subcategory:"
docker compose exec -T database psql -U admin -d finance_tracker -c "
SELECT 
    transaction_date,
    category,
    subcategory,
    description,
    amount
FROM transactions
WHERE category = 'Mat' AND subcategory = 'Rema 1000'
ORDER BY transaction_date DESC
LIMIT 5;
"

echo ""
echo "=========================================="
echo "Migration completed successfully!"
echo "=========================================="
echo ""
echo "Backup location: ${BACKUP_FILE}"

