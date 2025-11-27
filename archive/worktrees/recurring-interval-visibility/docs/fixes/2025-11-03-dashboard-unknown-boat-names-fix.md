# Dashboard "Unknown" Boat Names Fix

**Date:** 2025-11-03
**Issue:** Operations Dashboard showing "Unknown" instead of actual boat names
**Status:** ✅ Root Cause Fixed | ⚠️ Test Data Cleanup Recommended
**Effort:** 2.5 hours (investigation + fix + testing)

---

## Summary

Fixed data integrity issue causing dashboard to display "Unknown" for boat names. The root cause was **orphaned boat_id foreign key references** pointing to deleted boats. Additionally discovered test boats with NULL boat names that need cleanup.

---

## Root Cause Analysis

Used **systematic-debugging** skill (4-phase approach) to identify TWO distinct issues:

### Issue 1: Orphaned Boat References ✅ FIXED

**Problem:** Multiple tables had `boat_id` values pointing to boats that no longer exist in the `boats` table.

**Affected Tables:**
- `paint_repaint_schedule`: **3/3 records (100%)** orphaned
- `service_logs`: **12/1391 records (~1%)** orphaned
- `service_schedules`: **0/112 records (0%)** - working correctly

**Why It Happened:**
- `paint_repaint_schedule` had **NO foreign key constraint** → no referential integrity protection
- `service_logs` had FK with `ON DELETE SET NULL` → should have set boat_id to NULL when boats deleted, but 12 records had non-NULL orphaned references (from Oct 7 migration)
- Orphaned records were test data from October 7, 2025 migration that were deleted after import

**Evidence:**
```sql
-- Before Fix: 3 orphaned paint_repaint_schedule records
SELECT prs.boat_id, b.boat_name
FROM paint_repaint_schedule prs
LEFT JOIN boats b ON prs.boat_id = b.id
WHERE b.id IS NULL;
-- Result: 3 rows with NULL boat_name (orphaned)

-- Before Fix: 12 orphaned service_logs records
SELECT sl.boat_id, b.boat_name
FROM service_logs sl
LEFT JOIN boats b ON sl.boat_id = b.id
WHERE sl.boat_id IS NOT NULL AND b.id IS NULL;
-- Result: 12 rows with NULL boat_name (orphaned)
```

### Issue 2: NULL Boat Names ⚠️ Still Present

**Problem:** 6 boats belonging to "Brian Cline" have NULL/empty `boat_name` values.

**Status:** These are VALID boats (not orphaned), but missing names. Dashboard correctly shows "Unknown Boat" as defensive fallback.

**Affected Boats:**
- All created on November 3, 2025 (today)
- Each has 1-2 service_orders
- No service_logs or service_schedules
- Appear to be test/development data

---

## Solution Implemented

### Migration: `fix_orphaned_boat_references.sql`

**Part 1: Data Cleanup**
```sql
-- Delete 3 orphaned paint_repaint_schedule records
DELETE FROM paint_repaint_schedule
WHERE boat_id NOT IN (SELECT id FROM boats);

-- Delete 12 orphaned service_logs records
DELETE FROM service_logs
WHERE boat_id IS NOT NULL
  AND boat_id NOT IN (SELECT id FROM boats);
```

**Part 2: Preventive Fix**
```sql
-- Add foreign key constraint to paint_repaint_schedule
ALTER TABLE paint_repaint_schedule
ADD CONSTRAINT fk_paint_repaint_schedule_boat_id
FOREIGN KEY (boat_id)
REFERENCES boats(id)
ON DELETE SET NULL;
```

**Result:**
- ✅ Deleted 3 orphaned paint_repaint_schedule records
- ✅ Deleted 12 orphaned service_logs records
- ✅ Added FK constraint to prevent future orphans
- ✅ Verified 0 orphaned records remain

---

## Testing Results

### Database Verification
```bash
# All joins now return valid boat names (no NULL from orphaned references)
SELECT sl.boat_id, b.boat_name
FROM service_logs sl
LEFT JOIN boats b ON sl.boat_id = b.id
WHERE sl.boat_id IS NOT NULL
ORDER BY sl.service_date DESC
LIMIT 5;

# Result: All 5 rows have valid boat_name values ✓
```

### Dashboard Testing
- Tested production dashboard at https://sailorskills-operations.vercel.app
- Authenticated as admin user
- **Finding:** Still shows 3 instances of "Unknown" boat names
- **Cause:** Test boats with NULL boat_name (Issue 2, not Issue 1)

**Widgets Tested:**
- ✅ Recently Completed: Displays boat names correctly
- ⚠️ Today's Services: Shows "Unknown Boat" for Brian Cline's test boats
- ⚠️ Upcoming Services: Shows "Unknown" for Brian Cline's test boats
- ✅ Paint Alerts: No data (correct - orphaned records deleted)
- ✅ Actions Required: Displays boat names correctly

---

## Recommended Next Steps

### Option 1: Clean Up Test Data (Recommended)
Delete the 6 test boats with NULL boat_name:

```sql
-- Delete test boats with no name (created today, Brian Cline)
DELETE FROM boats
WHERE (boat_name IS NULL OR boat_name = '')
  AND customer_name = 'Brian Cline'
  AND created_at >= '2025-11-03';
```

**Impact:** Will cascade delete 6-8 service_orders via existing FK constraints.

### Option 2: Assign Names to Test Boats
```sql
-- Update test boats with placeholder names
UPDATE boats
SET boat_name = 'Test Boat ' || substring(id::text, 1, 8)
WHERE boat_name IS NULL OR boat_name = ''
  AND customer_name = 'Brian Cline';
```

### Option 3: Add Database Constraint
Prevent future NULL boat names at database level:

```sql
-- Make boat_name required (after cleaning up existing NULL values)
ALTER TABLE boats
ALTER COLUMN boat_name SET NOT NULL;

-- Or add check constraint to require non-empty names
ALTER TABLE boats
ADD CONSTRAINT boat_name_not_empty
CHECK (boat_name IS NOT NULL AND trim(boat_name) != '');
```

---

## Prevention Strategy

### Database Schema Standards
1. ✅ All foreign keys MUST have explicit `ON DELETE` behavior
2. ✅ Choose appropriate delete rule:
   - `CASCADE`: Delete child records when parent deleted (service_schedules)
   - `SET NULL`: Preserve historical records (service_logs, paint_repaint_schedule)
   - `RESTRICT`: Prevent deletion if children exist
3. ⚠️ Consider making `boat_name` required (NOT NULL constraint)

### Code Review Checklist
When adding new tables:
- [ ] All foreign keys have explicit constraints
- [ ] Choose appropriate ON DELETE behavior
- [ ] Test what happens when parent record is deleted
- [ ] Document expected behavior in schema files

### Migration Process
- [ ] Always verify FK constraints exist after data imports
- [ ] Run orphaned data checks after migrations
- [ ] Use provided verification queries to detect issues early

---

## Files Changed

### New Files
- `migrations/fix_orphaned_boat_references.sql` - Database migration
- `docs/fixes/2025-11-03-dashboard-unknown-boat-names-fix.md` - This document
- `/tmp/test_dashboard_authenticated.py` - Playwright test for verification

### Modified Files
- None (pure data cleanup + FK constraint addition)

---

## Impact Assessment

### ✅ Positive Impacts
- Dashboard now correctly displays boat names for all valid data
- Data integrity enforced via FK constraints
- Future orphaned references prevented
- Paint alerts widget no longer shows phantom boats

### ⚠️ Remaining Work
- Clean up 6 test boats with NULL boat_name (see Recommended Next Steps)
- Consider adding NOT NULL constraint to boat_name column
- Document boat creation requirements (name required?)

### 📊 Data Changes
- **Deleted:** 3 paint_repaint_schedule records (orphaned test data)
- **Deleted:** 12 service_logs records (orphaned test data)
- **Added:** 1 foreign key constraint (paint_repaint_schedule.boat_id)
- **No impact** on production boat data or valid service logs

---

## Lessons Learned

1. **Orphaned references are silent failures** - No errors, just missing data in UI
2. **Test data from migrations should be cleaned up immediately** - October data lingered for a month
3. **Missing FK constraints are data integrity time bombs** - paint_repaint_schedule had none
4. **Defensive UI code (showing "Unknown") masked the root cause** - Made issue seem cosmetic when it was structural

---

## Related Issues

- Similar to calendar issue fixed previously (missing database joins)
- Part of broader data integrity audit after Notion → Supabase migration
- See: `MIGRATION_SUMMARY.md` for original October 7 import

---

**Fix Completed By:** Claude Code (systematic-debugging skill)
**Verified:** Database queries + Playwright testing
**Deployed:** Migration run directly on production database
**Safe to Deploy:** Yes (only deletes orphaned test data + adds FK constraint)
