#!/bin/bash

# Migration Script: Clean up invalid subcategories
# This script removes subcategories that are not in the valid list
# and moves them to the description field if description is empty

set -e  # Exit on error

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/mats/FinanceLog/database/backups"
BACKUP_FILE="${BACKUP_DIR}/backup_before_subcategory_cleanup_${TIMESTAMP}.sql"

echo "=========================================="
echo "Subcategory Cleanup Migration"
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

# Step 2: Show current invalid subcategories
echo ""
echo "Step 2: Finding invalid subcategories..."
echo "----------------------------------------"

# Valid subcategories for each category
VALID_SUBCATS="
-- Hus
'Lån Storebrand', 'moss kommune', 'Gjensidige forsikring hus',
-- Faste utgifter
'Telia telefon', 'Telia internett/Tv', 'Strøm',
-- Personelig
'Spenst', 'Klær', 'Sparing',
-- Mat
'Rema 1000', 'Kiwi', 'Spar', 'Meny', 'Bunnpris', 'Willis', 'Nordby', 'Obs', 'Div butikk',
-- Transport
'Bensin', 'Toyota lån', 'Parkering', 'Gejensidige forsikring', 'Service', 'Bompenger',
-- Andre
'Gaver', 'Hage', 'Andre',
-- Inntekt
'Alders pensjon jan', 'EU pensjon jan', 'pensjon storebrand jan', 'Moss kommune jan', 
'Div inntekter jan', 'Alders pensjon Bjørg', 'pensjon moss kommune bjørg', 'div inntekter'
"

docker compose exec -T database psql -U admin -d finance_tracker -c "
SELECT 
    category,
    subcategory,
    COUNT(*) as count
FROM transactions
WHERE subcategory IS NOT NULL 
  AND subcategory != ''
  AND subcategory NOT IN (
    'Lån Storebrand', 'moss kommune', 'Gjensidige forsikring hus',
    'Telia telefon', 'Telia internett/Tv', 'Strøm',
    'Spenst', 'Klær', 'Sparing',
    'Rema 1000', 'Kiwi', 'Spar', 'Meny', 'Bunnpris', 'Willis', 'Nordby', 'Obs', 'Div butikk',
    'Bensin', 'Toyota lån', 'Parkering', 'Gejensidige forsikring', 'Service', 'Bompenger',
    'Gaver', 'Hage', 'Andre',
    'Alders pensjon jan', 'EU pensjon jan', 'pensjon storebrand jan', 'Moss kommune jan',
    'Div inntekter jan', 'Alders pensjon Bjørg', 'pensjon moss kommune bjørg', 'div inntekter'
  )
GROUP BY category, subcategory
ORDER BY category, subcategory;
"

# Step 3: Move invalid subcategories to description (if description is empty)
echo ""
echo "Step 3: Moving invalid subcategories to description..."
echo "-------------------------------------------------------"

docker compose exec -T database psql -U admin -d finance_tracker -c "
UPDATE transactions
SET 
    description = CASE 
        WHEN description IS NULL OR description = '' THEN subcategory
        ELSE description || ' (' || subcategory || ')'
    END,
    subcategory = NULL
WHERE subcategory IS NOT NULL 
  AND subcategory != ''
  AND subcategory NOT IN (
    'Lån Storebrand', 'moss kommune', 'Gjensidige forsikring hus',
    'Telia telefon', 'Telia internett/Tv', 'Strøm',
    'Spenst', 'Klær', 'Sparing',
    'Rema 1000', 'Kiwi', 'Spar', 'Meny', 'Bunnpris', 'Willis', 'Nordby', 'Obs', 'Div butikk',
    'Bensin', 'Toyota lån', 'Parkering', 'Gejensidige forsikring', 'Service', 'Bompenger',
    'Gaver', 'Hage', 'Andre',
    'Alders pensjon jan', 'EU pensjon jan', 'pensjon storebrand jan', 'Moss kommune jan',
    'Div inntekter jan', 'Alders pensjon Bjørg', 'pensjon moss kommune bjørg', 'div inntekter'
  );
"

echo "✓ Invalid subcategories cleaned up!"

# Step 4: Verify the cleanup
echo ""
echo "Step 4: Verifying cleanup..."
echo "----------------------------"

docker compose exec -T database psql -U admin -d finance_tracker -c "
SELECT 
    category,
    subcategory,
    COUNT(*) as count
FROM transactions
WHERE subcategory IS NOT NULL 
  AND subcategory != ''
  AND subcategory NOT IN (
    'Lån Storebrand', 'moss kommune', 'Gjensidige forsikring hus',
    'Telia telefon', 'Telia internett/Tv', 'Strøm',
    'Spenst', 'Klær', 'Sparing',
    'Rema 1000', 'Kiwi', 'Spar', 'Meny', 'Bunnpris', 'Willis', 'Nordby', 'Obs', 'Div butikk',
    'Bensin', 'Toyota lån', 'Parkering', 'Gejensidige forsikring', 'Service', 'Bompenger',
    'Gaver', 'Hage', 'Andre',
    'Alders pensjon jan', 'EU pensjon jan', 'pensjon storebrand jan', 'Moss kommune jan',
    'Div inntekter jan', 'Alders pensjon Bjørg', 'pensjon moss kommune bjørg', 'div inntekter'
  )
GROUP BY category, subcategory
ORDER BY category, subcategory;
"

echo ""
echo "=========================================="
echo "Migration completed successfully!"
echo "=========================================="
echo ""
echo "Backup location: ${BACKUP_FILE}"

