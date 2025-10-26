# 🚨 Run Migration 014 - Schema Fixes

## What Happened

Migration 013 fixed **RLS permissions** ✅, but revealed **schema problems**:

### Problem #1: Missing Foreign Keys
```
Error: Could not find a relationship between 'service_orders' and 'boats'
```
- Operations query: `service_orders.select('boat_id, boats(id,name)')` fails
- **Fix:** Add foreign key `service_orders.boat_id → boats.id`

### Problem #2: Wrong Table Name!
```
Hint: Perhaps you meant 'replenishment_list' instead of 'replenishment_queue'
```
- **Billing created:** `replenishment_queue` ❌
- **Inventory expects:** `replenishment_list` ✅
- **Fix:** Rename table + update function

---

## 🎯 Run This Migration Now

### Step 1: Open Supabase SQL Editor

**URL:** https://supabase.com/dashboard/project/fzygakldvvzxmahkdylq

Click: **SQL Editor** → **New Query**

### Step 2: Copy Migration File

**Location:** `/sailorskills-billing/supabase/migrations/014_fix_foreign_keys_and_table_names.sql`

**Or from GitHub:**
https://github.com/standardhuman/sailorskills-billing/blob/main/supabase/migrations/014_fix_foreign_keys_and_table_names.sql

### Step 3: Paste & Run

1. **Paste** entire SQL file
2. **Click "Run"** (Cmd/Ctrl + Enter)
3. **Wait** ~10 seconds

### Step 4: Verify Success

Look for these messages:

```
NOTICE:  ✅ service_orders.boat_id → boats.id FK exists
NOTICE:  ✅ replenishment_list table exists (correct name)
NOTICE:  ✅ replenishment_list.item_id → anodes_catalog.id FK exists
NOTICE:  ✅ replenishment_list has X RLS policies
NOTICE:  ✅ Migration 014 complete!
```

---

## 📦 What This Migration Does

### Fix #1: Add Foreign Key (service_orders → boats)
```sql
ALTER TABLE service_orders
ADD CONSTRAINT service_orders_boat_id_fkey
FOREIGN KEY (boat_id) REFERENCES boats(id);
```
**Enables:** `boats(id, name)` join syntax in Operations queries

### Fix #2: Rename Table (replenishment_queue → replenishment_list)
```sql
ALTER TABLE replenishment_queue RENAME TO replenishment_list;
```
**Why:** Matches Inventory schema definition
**Impact:** All existing data preserved

### Fix #3: Add Foreign Key (replenishment_list → anodes_catalog)
```sql
ALTER TABLE replenishment_list
ADD CONSTRAINT replenishment_list_item_id_fkey
FOREIGN KEY (item_id) REFERENCES anodes_catalog(id);
```
**Enables:** `anodes_catalog:item_id(...)` join syntax in Inventory queries

### Fix #4: Update Function
```sql
CREATE OR REPLACE FUNCTION add_to_replenishment(...)
-- Now INSERTs into replenishment_list (not replenishment_queue)
```
**Ensures:** Billing creates records in correct table

---

## 🔄 After Migration: Refresh Your Browser

### Hard Refresh Both Services:

**Vercel has already deployed the code fixes**, but you need to reload:

1. **Operations:** https://ops.sailorskills.com
   - Hard refresh: **Cmd+Shift+R** (Mac) or **Ctrl+Shift+F5** (Windows)

2. **Inventory:** https://sailorskills-inventory-kqes0q8hl-brians-projects-bc2d3592.vercel.app
   - Hard refresh: **Cmd+Shift+R** (Mac) or **Ctrl+Shift+F5** (Windows)

---

## ✅ After Refresh: Test Again

### Test #1: Operations Packing Lists
1. Go to Operations → Packing Lists
2. **SHOULD SEE:** No more errors
3. **SHOULD SEE:** Page loads correctly
4. **Console:** No more "Could not find relationship" errors

### Test #2: Inventory Orders
1. Go to Inventory → Orders
2. **SHOULD SEE:** Replenishment Queue loads
3. **SHOULD SEE:** No more "Perhaps you meant replenishment_list" errors
4. **Console:** Clean, no 400 errors

---

## 📊 Verification Queries

After migration, test with these SQL queries:

```sql
-- Check foreign keys exist
SELECT
  tc.table_name,
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name IN ('service_orders', 'replenishment_list');

-- Should show:
-- service_orders.boat_id → boats.id
-- replenishment_list.item_id → anodes_catalog.id

-- Test joins work
SET ROLE anon;
SELECT * FROM service_orders
LIMIT 0; -- Just testing the query works

SELECT * FROM replenishment_list
LIMIT 0; -- Just testing the query works

RESET ROLE;
```

---

## 🐛 Troubleshooting

### If "table replenishment_queue does not exist":
- Migration 013 might not have created it yet
- That's OK - migration 014 handles both cases

### If "table boats does not exist":
- Run COMPLETE-SETUP.sql first from Operations repo
- Then run migrations 013 + 014

### If still seeing errors after migration + refresh:
1. Clear browser cache completely
2. Check network tab for actual errors
3. Verify tables exist in Supabase dashboard

---

## 🎉 Success Criteria

After migration + refresh, you should have:

✅ Operations loads packing lists without errors
✅ Inventory loads replenishment queue without errors
✅ No "Could not find relationship" errors
✅ No "Perhaps you meant replenishment_list" hints
✅ All joins working correctly

---

**Run migration 014 now, then hard refresh both services!** 🚀
