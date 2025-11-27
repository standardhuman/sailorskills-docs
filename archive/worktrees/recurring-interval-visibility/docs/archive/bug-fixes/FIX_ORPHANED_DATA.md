# Fix Orphaned Data - Quick Reference

**Problem:** Migration 014 fails because `service_orders` references a non-existent boat.

**Error:**
```
Key (boat_id)=(5e98ad8a-b40f-4a75-8d3d-4d9ba88a55e0) is not present in table "boats".
```

---

## 🔍 Step 1: Investigate Orphaned Data

Run this in Supabase SQL Editor:

```sql
-- Find all orphaned service_orders
SELECT
  so.id,
  so.boat_id,
  so.scheduled_date,
  so.service_type,
  so.status,
  so.created_at,
  CASE
    WHEN b.id IS NULL THEN '❌ ORPHANED'
    ELSE '✅ VALID'
  END as status_check
FROM service_orders so
LEFT JOIN boats b ON so.boat_id = b.id
WHERE b.id IS NULL;
```

**Review the results:**
- How many orphaned records?
- Are they test data or real data?
- Do you need to preserve them?

---

## ✅ Step 2: Choose Your Fix

### Option A: Delete Orphaned Records (Recommended for Test Data)

```sql
-- CAUTION: This permanently deletes orphaned service_orders
-- Review Step 1 results first!

BEGIN;

-- Show what will be deleted
SELECT COUNT(*) as will_delete FROM service_orders so
LEFT JOIN boats b ON so.boat_id = b.id
WHERE b.id IS NULL;

-- Delete orphaned records
DELETE FROM service_orders
WHERE boat_id IN (
  SELECT so.boat_id
  FROM service_orders so
  LEFT JOIN boats b ON so.boat_id = b.id
  WHERE b.id IS NULL
);

-- Verify deletion
SELECT COUNT(*) as remaining_orphaned FROM service_orders so
LEFT JOIN boats b ON so.boat_id = b.id
WHERE b.id IS NULL;
-- Should return 0

COMMIT;
```

---

### Option B: Create Placeholder Boat (If Data is Needed)

```sql
-- Create a placeholder boat for orphaned service_orders
INSERT INTO boats (
  id,
  customer_name,
  customer_email,
  boat_name,
  is_active,
  notes
) VALUES (
  '5e98ad8a-b40f-4a75-8d3d-4d9ba88a55e0',
  'Data Migration',
  'migration@sailorskills.com',
  'Orphaned Service Records',
  false,
  'Placeholder boat created to preserve orphaned service_orders data. Review and update.'
);

-- Verify boat was created
SELECT * FROM boats WHERE id = '5e98ad8a-b40f-4a75-8d3d-4d9ba88a55e0';
```

---

### Option C: Create Pre-Migration Cleanup (Safest)

Update migration 014 to include cleanup:

```sql
-- Add this at the beginning of migration 014, before adding FK

-- ============================================================================
-- PRE-FIX: Clean up orphaned service_orders
-- ============================================================================

DO $$
DECLARE
  v_orphaned_count INT;
BEGIN
  -- Count orphaned records
  SELECT COUNT(*) INTO v_orphaned_count
  FROM service_orders so
  LEFT JOIN boats b ON so.boat_id = b.id
  WHERE b.id IS NULL;

  IF v_orphaned_count > 0 THEN
    RAISE NOTICE 'Found % orphaned service_orders records', v_orphaned_count;

    -- Delete orphaned records
    DELETE FROM service_orders
    WHERE boat_id NOT IN (SELECT id FROM boats);

    RAISE NOTICE 'Deleted % orphaned service_orders records', v_orphaned_count;
  ELSE
    RAISE NOTICE 'No orphaned service_orders records found';
  END IF;
END $$;

-- Now proceed with adding FK constraint...
```

---

## 🚀 Step 3: Run Migration 014

After cleaning up orphaned data, run migration 014:

1. Open Supabase SQL Editor
2. Copy: `/sailorskills-billing/supabase/migrations/014_fix_foreign_keys_and_table_names.sql`
3. Paste and Run
4. Look for: `✅ Migration 014 complete!`

---

## ✅ Step 4: Verify Success

```sql
-- Check foreign key was added
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'service_orders';

-- Should show: service_orders.boat_id → boats.id
```

---

## 🎯 Quick Decision Matrix

| Scenario | Recommended Option |
|----------|-------------------|
| Test/development data only | **Option A** - Delete orphaned records |
| Unknown if data is important | **Option B** - Create placeholder boat |
| Want safest approach | **Option C** - Update migration with cleanup |
| Production system | **Review data first**, then Option B or C |
| Many orphaned records | **Option A** after verification |

---

## ⚠️ Important Notes

1. **Backup First** (if on production):
   ```sql
   -- Create backup of service_orders
   CREATE TABLE service_orders_backup AS
   SELECT * FROM service_orders;
   ```

2. **Transaction Safety**:
   - All options above use transactions
   - Can ROLLBACK if something looks wrong
   - Use `BEGIN` and `COMMIT` explicitly

3. **Cascade Effects**:
   - Check if service_orders has dependent data
   - May need to clean up related tables too
   - Use CASCADE carefully

---

## 📊 After Cleanup

Once migration 014 succeeds:

1. ✅ **Hard refresh browsers**
   - Operations: Cmd+Shift+R
   - Inventory: Cmd+Shift+R

2. ✅ **Test queries work**
   - Operations Packing Lists should load
   - Inventory Orders should load
   - No more "Could not find relationship" errors

3. ✅ **Test integration**
   - Create order in Billing
   - Verify appears in Inventory
   - Process through workflow

---

## 🐛 If Still Having Issues

```sql
-- Check if FK actually exists
SELECT COUNT(*) FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY'
AND table_name = 'service_orders'
AND constraint_name = 'service_orders_boat_id_fkey';
-- Should return 1

-- Test join syntax works
SET ROLE anon;
SELECT * FROM service_orders LIMIT 0;
RESET ROLE;
-- Should succeed without errors

-- Check for remaining orphaned data
SELECT COUNT(*) FROM service_orders so
LEFT JOIN boats b ON so.boat_id = b.id
WHERE b.id IS NULL;
-- Should return 0
```

---

**Choose your option, run the cleanup, then run migration 014!** 🚀

**Recommended for most cases:** Start with Option A (delete orphaned records) since this appears to be test/development data.
