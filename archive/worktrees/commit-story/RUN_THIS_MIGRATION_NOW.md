# 🚨 ACTION REQUIRED: Run Database Migration

## Why You're Seeing Errors

The console errors you're seeing are because the database migration **hasn't been run yet**:

```
400 errors on:
- /rest/v1/service_orders (Operations Packing Lists)
- /rest/v1/replenishment_queue (Inventory Orders)
- /rest/v1/boat_service_flags (Operations Packing Lists)
```

**Root cause:** These tables have no RLS (Row Level Security) policies, so your apps (using anon key) are blocked from reading them.

---

## 🎯 Solution: Run This Migration (5 minutes)

### Step 1: Open Supabase

**URL:** https://supabase.com/dashboard/project/fzygakldvvzxmahkdylq

### Step 2: Open SQL Editor

Click: **"SQL Editor"** in left sidebar

### Step 3: Create New Query

Click: **"New Query"** button (top right)

### Step 4: Copy Migration File

**Location:** `/sailorskills-billing/supabase/migrations/013_fix_integration_bugs.sql`

**Or get it from GitHub:**
https://github.com/standardhuman/sailorskills-billing/blob/main/supabase/migrations/013_fix_integration_bugs.sql

### Step 5: Paste & Run

1. **Paste** the entire SQL file into the editor
2. **Click "Run"** (or press Cmd/Ctrl + Enter)
3. **Wait** ~5 seconds for completion

### Step 6: Verify Success

You should see these messages in the output:

```
NOTICE:  service_orders has 2 RLS policies
NOTICE:  replenishment_queue has 3 RLS policies
NOTICE:  boat_service_flags has 3 RLS policies
NOTICE:  anode_inventory has storage_location column ✓
NOTICE:  ✅ Migration complete! All RLS policies added.
```

---

## ✅ After Migration: Test Everything

### Test 1: Operations Packing Lists

1. Go to: https://ops.sailorskills.com
2. Login: standardhuman@gmail.com / KLRss!650
3. Click: **"Packing Lists"** tab
4. **SHOULD SEE:** No more "Error loading packing list"
5. **SHOULD SEE:** Monthly view loads (may be empty if no services scheduled)

### Test 2: Inventory Orders

1. Go to: https://sailorskills-inventory-kqes0q8hl-brians-projects-bc2d3592.vercel.app
2. Login with password (if prompted)
3. Click: **"Orders"** tab
4. **SHOULD SEE:** No more "Error loading data"
5. **SHOULD SEE:** Replenishment Queue section loads (may be empty)

### Test 3: Billing Modal

1. Go to: https://billing.sailorskills.com
2. Login: standardhuman@gmail.com / KLRss!650
3. Open any service
4. Set anode statuses (retrieve/order)
5. Click: **"Review Inventory Actions"**
6. **SHOULD SEE:** Stock shows "(X in stock, Y available)"
7. **SHOULD NOT SEE:** Hardcoded "(out of stock)"

---

## 🐛 What This Migration Fixes

### Fix #1: service_orders RLS
**Symptom:** Operations Packing Lists showing "Error loading packing list"
**Cause:** Table had no RLS policies
**Fix:** Added public SELECT policy

### Fix #2: replenishment_queue RLS
**Symptom:** Inventory Orders showing "Error loading data"
**Cause:** Table had no RLS policies
**Fix:** Added public SELECT + UPDATE policies

### Fix #3: boat_service_flags RLS
**Symptom:** Operations Packing Lists 400 errors
**Cause:** Table had no RLS policies
**Fix:** Added public SELECT policy

### Fix #4: storage_location column
**Symptom:** (Potential future issue)
**Fix:** Ensures column exists for queries

---

## 📋 Quick Verification Queries

After running the migration, test with these SQL queries in Supabase:

```sql
-- Set to anon role (simulates your app)
SET ROLE anon;

-- These should all succeed (not "permission denied")
SELECT COUNT(*) FROM service_orders;
SELECT COUNT(*) FROM replenishment_queue;
SELECT COUNT(*) FROM boat_service_flags;

-- Reset role
RESET ROLE;
```

If any of these fail with "permission denied", the migration didn't work correctly.

---

## 🔥 Troubleshooting

### If migration fails:

1. **Check error message** - Most common: table doesn't exist yet
2. **Run COMPLETE-SETUP.sql first** - Creates missing tables
3. **Try migration again**

### If still seeing 400 errors after migration:

1. **Hard refresh browser** (Cmd+Shift+R / Ctrl+Shift+F5)
2. **Clear browser cache**
3. **Check Supabase logs** in dashboard
4. **Verify policies were created:**
   ```sql
   SELECT * FROM pg_policies
   WHERE tablename IN ('service_orders', 'replenishment_queue', 'boat_service_flags');
   ```

---

## 🎉 Success!

Once the migration runs successfully:

✅ Operations Packing Lists will load
✅ Inventory Orders will load
✅ Billing modal will show correct stock
✅ Full integration workflow will work

**Time to complete:** 5 minutes
**Risk:** Very low (only adding read permissions)
**Reversible:** Yes (can disable RLS if needed)

---

**Run this migration NOW to fix all the errors!** 🚀
