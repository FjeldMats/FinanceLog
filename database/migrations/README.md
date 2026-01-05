# Database Migrations

This directory contains database migration scripts for the FinanceLog application.

## Moss Kommune Subcategory Consolidation

### Overview
This migration consolidates two subcategories under the "Hus" category:
- `Renovasjon (moss kommune)` → `moss kommune`
- `Eindomskatt (moss kommune)` → `moss kommune`

### Files
- `consolidate_moss_kommune.sh` - Main migration script
- `rollback_moss_kommune.sh` - Rollback/restore script

### Running the Migration

1. **SSH into the server:**
   ```bash
   ssh mats@10.0.0.29
   ```

2. **Navigate to the project directory:**
   ```bash
   cd /home/mats/FinanceLog
   ```

3. **Run the migration script:**
   ```bash
   ./database/migrations/consolidate_moss_kommune.sh
   ```

4. **Follow the prompts:**
   - The script will show you the current data
   - You'll be asked to confirm before proceeding
   - A backup will be created automatically

### What the Migration Does

1. **Creates a backup** of the entire database before making any changes
2. **Shows current data** for the affected subcategories
3. **Asks for confirmation** before proceeding
4. **Updates all transactions** with the old subcategories to the new one
5. **Verifies the changes** by showing the updated data

### Rollback

If you need to undo the migration:

```bash
./database/migrations/rollback_moss_kommune.sh
```

This will:
1. List all available backups
2. Ask you to select which backup to restore
3. Restore the database from that backup

### Backup Location

Backups are stored in:
```
/home/mats/FinanceLog/database/backups/
```

Backup filename format:
```
backup_before_moss_kommune_consolidation_YYYYMMDD_HHMMSS.sql
```

### Manual Rollback

If needed, you can manually restore from a backup:

```bash
cd /home/mats/FinanceLog
docker compose exec -T database psql -U admin -d finance_tracker < database/backups/backup_before_moss_kommune_consolidation_YYYYMMDD_HHMMSS.sql
```

## Safety Features

- ✅ Automatic backup before migration
- ✅ Confirmation prompt before making changes
- ✅ Transaction-based updates (atomic operation)
- ✅ Verification step after migration
- ✅ Easy rollback mechanism

