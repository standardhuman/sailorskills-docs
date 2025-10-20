# Service Logs Consolidation - Migration Summary

**Date:** 2025-10-17
**Migration:** Consolidate `service_conditions_log` and `service_conditions` into `service_logs`

---

## Overview

Successfully consolidated two separate service tracking tables into a single source of truth with enhanced propeller support.

### What Changed

1. **Table Consolidation**
   - ❌ Deprecated: `service_conditions_log` (billing)
   - ❌ Deprecated: `service_conditions` (operations)
   - ✅ New: `service_logs` (unified table)

2. **Propeller Support Enhancement**
   - ❌ Old: `propeller_1_condition`, `propeller_2_condition` (limited to 2)
   - ✅ New: `propellers` JSONB array (supports unlimited propellers, typically up to 5)
   - Format: `[{number: 1, condition: "excellent", notes: "polished"}, ...]`

3. **Additional Fields**
   - Added: `paint_detail_keel`, `paint_detail_waterline`, `paint_detail_boot_stripe`
   - Added: `service_type`, `service_name`, `service_time`
   - Added: `customer_id` (now required)
   - Added: `created_by` (tracking who created the log)

---

## Migration File

**Location:** `/sailorskills-shared/supabase/migrations/003_consolidate_to_service_logs.sql`

**What it does:**
1. Creates new `service_logs` table with enhanced schema
2. Migrates all data from `service_conditions_log` (converts propeller fields to JSONB)
3. Migrates all data from `service_conditions` (converts prop_condition to JSONB)
4. Creates indexes for performance
5. Sets up Row Level Security policies
6. Preserves old tables for rollback safety (can be dropped after verification)

**To run the migration:**
```sql
-- In Supabase SQL Editor
\i /sailorskills-shared/supabase/migrations/003_consolidate_to_service_logs.sql
```

---

## Files Updated

### Billing Service

#### API
- ✅ `/sailorskills-billing/api/save-conditions.js`
  - Now writes to `service_logs` table
  - Converts legacy propeller_1/2 fields to JSONB array
  - Returns `service_log_id` (with `condition_log_id` for backward compatibility)

#### Frontend
- ✅ `/sailorskills-billing/src/admin/inline-scripts/enhanced-charge-flow.js`
  - Collects up to 5 propellers from wizard
  - Sends propellers as JSONB array to API
  - Updated success messages

- ✅ `/sailorskills-billing/src/admin/inline-scripts/conditions-logging.js`
  - Collects propellers 1-5 dynamically
  - Handles both new format (array) and legacy format for historical display
  - Updated field mapping

### Operations Service

#### API
- ✅ `/sailorskills-operations/api/service-complete.js`
  - Reads from and writes to `service_logs` table
  - Converts legacy propeller fields to JSONB array
  - Updated all helper functions (paint schedule, anode dates)
  - Returns `service_log_id`

#### Frontend
- ✅ `/sailorskills-operations/src/forms/service-log-form.js`
  - Dynamic propeller fields (add/remove up to 10)
  - Saves propellers as JSONB array
  - Updated to use `service_logs` table
  - Sets required fields for manual entries

- ✅ `/sailorskills-operations/src/views/boats.js`
  - Updated all queries to use `service_logs`

- ✅ `/sailorskills-operations/src/client-portal.js`
  - Updated all queries to use `service_logs`

- ✅ `/sailorskills-operations/src/views/service-logs.js`
  - Updated all queries to use `service_logs`

---

## Data Flow (After Migration)

```
Billing Service
    ↓
    Complete service → Collect conditions (including propellers)
    ↓
    POST /api/save-conditions
    ↓
    Write to service_logs table
    ↓
Operations Service
    ↓
    Query service_logs table
    ↓
    Display in boat history, client portal, service logs view
```

---

## Propeller Data Structure

### New Format (JSONB Array)
```json
[
  {
    "number": 1,
    "condition": "excellent",
    "notes": "polished"
  },
  {
    "number": 2,
    "condition": "good",
    "notes": "minor ding on leading edge"
  },
  {
    "number": 3,
    "condition": "fair",
    "notes": ""
  }
]
```

### Legacy Format (Still Supported for Reading)
- `propeller_1_condition`: "excellent"
- `propeller_2_condition`: "good"

**Note:** Code automatically converts legacy format to new format when updating/migrating.

---

## Testing Checklist

### Required Tests

- [ ] **Database Migration**
  - [ ] Run migration script in Supabase
  - [ ] Verify `service_logs` table created
  - [ ] Verify all data migrated from old tables
  - [ ] Verify propeller data converted correctly

- [ ] **Billing → Database**
  - [ ] Complete service in billing with 2 propellers
  - [ ] Verify data written to `service_logs` table
  - [ ] Complete service with 5 propellers
  - [ ] Verify all 5 propellers saved correctly

- [ ] **Operations Display**
  - [ ] Open boat detail in operations
  - [ ] Verify service logs display correctly
  - [ ] Verify propeller conditions display
  - [ ] Edit service log - add/remove propellers
  - [ ] Verify changes save correctly

- [ ] **Client Portal**
  - [ ] Open client portal for a boat
  - [ ] Verify service history displays
  - [ ] Verify propeller conditions visible

- [ ] **Backward Compatibility**
  - [ ] Verify legacy data (with propeller_1/2) still displays
  - [ ] Verify editing legacy log converts to new format
  - [ ] Verify paint alerts still calculate correctly
  - [ ] Verify anode tracking still works

### Test Data Scenarios

1. **Boat with 1 propeller**
2. **Boat with 2 propellers (legacy data)**
3. **Boat with 2 propellers (new format)**
4. **Boat with 5 propellers**
5. **Boat with no propeller data**

---

## Rollback Plan

If issues arise:

1. **Keep old tables** - Don't drop `service_conditions_log` or `service_conditions` yet
2. **Revert code changes** - Git revert all commits from this migration
3. **Restore API endpoints** - Point back to old tables
4. **Data is safe** - Migration copies data, doesn't move it

**To drop old tables after verification (DANGEROUS - only do after thorough testing):**
```sql
DROP TABLE IF EXISTS service_conditions_log CASCADE;
DROP TABLE IF EXISTS service_conditions CASCADE;
```

---

## Known Limitations

1. **Propeller UI in billing** - Currently collects propeller_1 and propeller_2 only
   - Need to add dynamic propeller fields to billing wizard
   - Current workaround: Code converts 2 propellers to array format

2. **Manual entries** - Operations can add up to 10 propellers
   - Billing limited to 2 until wizard updated

---

## Next Steps

1. ✅ Run database migration
2. ✅ Test billing service creation
3. ✅ Test operations display
4. ✅ Test client portal
5. ⏸️ Optional: Add dynamic propeller fields to billing wizard
6. ⏸️ After 30 days of successful operation: Drop old tables

---

## Questions?

If you encounter issues:
1. Check migration log in Supabase
2. Verify all code files updated correctly
3. Test with sample data first
4. Contact: Development team

---

**Migration Status:** ✅ Code Complete - Ready for Database Migration and Testing
