# Boat Data Flow Fix - Implementation Guide

## Problem Summary

Customer and boat information was not flowing correctly from Estimator → Billing → Operations due to database schema mismatches:

### Issues Identified:

1. **Estimator saving to wrong columns**: Tried to save `boat_name`, `boat_length_ft`, `marina_location`, `slip_number` but database only had `name`, `length`, `marina`, `slip`
2. **Missing propeller_count column**: Propeller data stored only in JSONB `service_details`, but Billing UI expected dedicated column
3. **Operations showing null data**: Denormalized schema not implemented yet
4. **Billing showing N/A**: Could not find boat data due to column name mismatches

## Solution Implemented

### 1. Database Migration (✅ Created)

**File**: `sailorskills-site/supabase/migrations/012_denormalize_boats_add_propeller_count.sql`

**Changes**:
- Adds denormalized columns: `boat_name`, `boat_make`, `boat_model`, `boat_length_ft`
- Adds customer columns: `customer_name`, `customer_email`, `customer_phone`
- Adds location columns: `marina_location`, `slip_number`
- Adds metadata columns: `is_active`, `propeller_count`, `boat_year`, `hull_material`
- Migrates data from old columns (`name` → `boat_name`, etc.)
- Backfills `propeller_count` from `service_orders.service_details` JSONB
- Creates performance indexes

**Status**: ⚠️ **NEEDS TO BE RUN MANUALLY**

### 2. Estimator Edge Function (✅ Updated)

**File**: `sailorskills-site/supabase/functions/create-payment-intent/index.ts:242-244`

**Changes**:
- Extracts `propellerCount` from `serviceDetails`
- Saves to `boats.propeller_count` column

**Status**: ✅ Code updated, needs deployment

### 3. Billing Edge Functions (✅ Updated)

#### search-customers-with-boats
**File**: `sailorskills-billing/supabase/functions/search-customers-with-boats/index.ts`

**Changes**:
- Returns `propeller_count` instead of `has_twin_engines`
- Supports both old (`name`, `length`) and new (`boat_name`, `boat_length_ft`) column names as fallbacks
- Returns `boat_type`, `hull_type`, `dock`, `slip` for complete boat info

**Status**: ✅ Code updated, needs deployment

#### customer-details
**File**: `sailorskills-billing/supabase/functions/customer-details/index.ts`

**Changes**:
- None needed - already uses `select("*")` which returns all columns

**Status**: ✅ Already working

### 4. Billing UI Components (✅ Updated)

**File**: `sailorskills-billing/src/admin/customer-info-card.js`

**Changes**:
- Displays `boat.boat_name || boat.name` (supports both schemas)
- Displays `boat.boat_length_ft || boat.length` (supports both schemas)
- Updated `formatLocation()` to support `slip_number` and `marina_location` fallbacks
- `formatPropellerCount()` already correct

**Status**: ✅ Code updated, needs deployment

---

## Deployment Steps

### Step 1: Run Database Migration ⚠️ REQUIRED FIRST

**Option A: Via Supabase Dashboard (Recommended)**

1. Go to https://supabase.com/dashboard/project/fzygakldvvzxmahkdylq/sql/new
2. Copy contents of `sailorskills-site/supabase/migrations/012_denormalize_boats_add_propeller_count.sql`
3. Paste into SQL Editor
4. Click "Run"
5. Verify success messages in output

**Option B: Via Supabase CLI**

```bash
cd sailorskills-site
supabase db push
# Enter database password when prompted
```

**Expected Output**:
```
✅ Migrated name → boat_name
✅ Migrated make → boat_make
✅ Migrated model → boat_model
✅ Migrated length → boat_length_ft
✅ Populated customer data from customers table
✅ Backfilled propeller_count for X boats
✅ MIGRATION COMPLETE!
```

### Step 2: Deploy Edge Functions

**Estimator (create-payment-intent)**:
```bash
cd sailorskills-site
supabase functions deploy create-payment-intent
```

**Billing (search-customers-with-boats)**:
```bash
cd sailorskills-billing
supabase functions deploy search-customers-with-boats
```

### Step 3: Deploy Frontend Changes

**Billing UI**:
```bash
cd sailorskills-billing
npm run build
vercel --prod
```

### Step 4: Verify in Production

1. **Test Estimator Submission**:
   - Go to https://sailorskills-estimator.vercel.app
   - Complete a test estimate with boat details (length, type, hull, propellers)
   - Check Supabase `boats` table - verify all fields populated

2. **Test Billing Display**:
   - Go to https://sailorskills-billing.vercel.app
   - Search for test customer
   - Verify boat card shows: Name, Length, Type, Hull, Propellers, Location

3. **Test Operations Display**:
   - Go to https://sailorskills-operations.vercel.app
   - Find test customer's boat
   - Verify boat name and location display correctly
   - Verify service order amount shows correctly

---

## Data Flow After Fix

```
┌─────────────────────────────────────────────────────────────┐
│ ESTIMATOR                                                    │
│ - Customer fills form                                        │
│ - Boat: name, length, make, model, type, hull, propellers   │
│ - Location: marina, dock, slip                              │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ create-payment-intent Edge Function                          │
│ Saves to boats table:                                        │
│ - boat_name, boat_make, boat_model, boat_length_ft          │
│ - customer_name, customer_email, customer_phone             │
│ - type, hull_type, propeller_count                          │
│ - marina_location, slip_number                              │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ SUPABASE boats TABLE                                         │
│ Old columns: name, make, model, length                      │
│ New columns: boat_name, boat_make, boat_model,              │
│              boat_length_ft, customer_name, propeller_count │
│ (Both available during transition)                           │
└─────┬──────────────────────────────────┬────────────────────┘
      │                                   │
      ▼                                   ▼
┌─────────────────────┐         ┌────────────────────────────┐
│ BILLING             │         │ OPERATIONS                 │
│ - Reads both old    │         │ - Reads denormalized       │
│   and new columns   │         │   columns                  │
│ - Shows all boat    │         │ - Shows boat name,         │
│   details correctly │         │   location correctly       │
└─────────────────────┘         └────────────────────────────┘
```

---

## Rollback Plan (If Needed)

If issues arise, the migration is **non-destructive**:

- Old columns (`name`, `make`, `model`, `length`) are preserved
- New columns are additive only
- Code supports both schemas via fallback logic

To rollback:
1. Revert edge function deployments
2. Old columns still have data and will work
3. Can drop new columns if needed (not recommended)

---

## Files Modified

### Database
- ✅ `sailorskills-site/supabase/migrations/012_denormalize_boats_add_propeller_count.sql`

### Backend (Edge Functions)
- ✅ `sailorskills-site/supabase/functions/create-payment-intent/index.ts`
- ✅ `sailorskills-billing/supabase/functions/search-customers-with-boats/index.ts`

### Frontend
- ✅ `sailorskills-billing/src/admin/customer-info-card.js`

---

## Testing Checklist

### Database Migration
- [ ] Migration runs without errors
- [ ] Existing boats have data migrated to new columns
- [ ] Propeller count backfilled from service_orders
- [ ] Indexes created successfully

### Estimator
- [ ] New estimate creates boat record with all fields
- [ ] boat_name, boat_length_ft, propeller_count populated
- [ ] marina_location, slip_number populated

### Billing
- [ ] Search finds customers by boat name
- [ ] Boat card shows: Name, Length, Type, Hull, Propellers
- [ ] Location shows: Dock, Slip, Marina
- [ ] No more N/A for existing data

### Operations
- [ ] Boat name displays correctly (not "null")
- [ ] Location displays fully (not just "O")
- [ ] Service order amounts display correctly (not $NaN)

---

## Maintenance Notes

### Future Considerations
- **Drop old columns**: After transition period (30-60 days), can drop `name`, `make`, `model`, `length` columns
- **Update all queries**: Once old columns dropped, update all services to use new column names exclusively
- **Document schema**: Update schema documentation to reflect denormalized structure

### Related Services to Update
- ✅ Estimator - Updated
- ✅ Billing - Updated
- ⏳ Operations - Will work automatically after migration
- ⏳ Dashboard - May need similar updates if it queries boats table
- ⏳ Inventory - Check if it reads boat data

---

## Support

If issues occur during deployment:
1. Check Supabase logs for edge function errors
2. Verify migration ran completely (check Supabase SQL Editor history)
3. Check browser console for frontend errors
4. Verify all environment variables are set correctly

Contact: Brian (standardhuman@gmail.com)
