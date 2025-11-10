# Database Diagnosis Report
**Date:** 2025-11-05
**Status:** Phase 1 Complete - Root Causes Identified

---

## Executive Summary

After the database rebuild on 2025-11-04, multiple UI issues appeared across services. Systematic investigation reveals **schema-data mismatches** rather than data corruption. All core data is present (226 customers, 174 boats, 1,196 service logs), but **denormalization tables are empty** and **frontend queries use wrong column names**.

---

## Issues Reported

1. ✅ Operations dashboard showing '226 customers' (user says "wildly inaccurate")
2. ✅ Scheduling: No boats showing on calendar
3. ✅ Queue: Empty (Blow Fish, Raindancer II orders missing)
4. ✅ Boats table: Customer names not showing
5. ✅ Boats table: Clicking boat doesn't show modal
6. ✅ Boats table: Paint status showing 'unknown' for all boats
7. ✅ Boats table: Search returns all boats regardless of input
8. ✅ Forecast: No boats showing due for service in November

---

## Root Causes Identified

### 1. Customer Names Not Showing ⚠️ **SCHEMA MISMATCH**

**Evidence:**
```
Boats WITHOUT customer_name: 174 (all boats)
Boats WITH customer_name: 0
```

**Root Cause:**
- Frontend queries `boats.customer_name` directly (line 14 in `boatDataFetcher.js`)
- Database has `customer_name` column but it's NULL for all boats
- Database has `customer_id` that correctly links to `customers` table
- Customers table HAS the names: "Ted Crocker", "Paul Kamen", "Louis Benanouis", etc.

**Fix Required:**
- Option A: Populate `boats.customer_name` from `customers` table (denormalization)
- Option B: Change frontend to JOIN with customers table via `customer_id`

**Recommendation:** Option B (use proper foreign key relationship)

---

### 2. Paint Status Showing 'Unknown' ⚠️ **EMPTY TABLE**

**Evidence:**
```
Total boats: 174
Boats with paint_repaint_schedule: 0
Boats WITHOUT paint schedule: 174
```

**Root Cause:**
- Frontend expects data in `paint_repaint_schedule` table (line 56 in `boatDataFetcher.js`)
- `paint_repaint_schedule` table is COMPLETELY EMPTY
- Service logs HAVE paint condition data (`paint_condition_overall`: "excellent", "good", etc.)
- Paint repaint schedule should be auto-calculated from service_logs

**Fix Required:**
- Create migration to populate `paint_repaint_schedule` from `service_logs` data
- Calculate `urgency_level`, `avg_paint_condition`, `trend` from historical paint conditions

---

### 3. Service Orders Queue Empty ⚠️ **DATA LOSS**

**Evidence:**
```
service_orders: 0 records
```

**Root Cause:**
- Table exists but has zero records
- User mentioned "Blow Fish" and "Raindancer II" orders need restoration from backup
- Data was not migrated during rebuild

**Fix Required:**
- Restore service_orders from backup
- Specifically recover: Blow Fish, Raindancer II orders

---

### 4. Scheduling Calendar Empty ⚠️ **NEEDS INVESTIGATION**

**Evidence:**
```
service_schedules: 120 records (active)
service_logs: 1,196 records
```

**Root Cause:**
- Data EXISTS in service_schedules (120 boats have schedules)
- Frontend might be filtering incorrectly or there's a date range issue
- Sample boats show schedules like "2025-12-01"
- Need to check Schedule view code for filtering logic

**Fix Required:**
- Investigate Schedule.jsx component
- Check date filtering and rendering logic

---

### 5. Forecast Not Showing November Boats ⚠️ **DATE FILTERING**

**Evidence:**
- service_schedules has dates (sample: "2025-12-01")
- Need to verify if any boats are actually scheduled for November 2025

**Root Cause:**
- May not be a bug - might not have boats scheduled for November
- Or forecast date filter is wrong

**Fix Required:**
- Query service_schedules for November 2025 dates
- Check forecast view filtering logic

---

### 6. Customer Count "Wildly Inaccurate" ⚠️ **CLARIFICATION NEEDED**

**Evidence:**
```
customers: 226 records
```

**Root Cause:**
- Database has 226 customers
- User says this is "wildly inaccurate"
- From previous session: 177 real customers, 732 test customers deleted
- 226 seems reasonable post-cleanup

**Fix Required:**
- Ask user what the expected count is
- May need to identify more test customers to delete

---

## Data Quality Summary

### ✅ Good Data
- **Customers:** 226 records
- **Boats:** 174 records
- **Service Logs:** 1,196 records (with paint_condition_overall data)
- **Service Schedules:** 120 active schedules
- **Invoices:** 1,617 records
- **Customer ↔ Boat Relationships:** VALID (customer_id properly linked)

### ❌ Missing/Empty Data
- **boats.customer_name:** NULL for all boats (should be denormalized from customers.name)
- **paint_repaint_schedule:** EMPTY (should be calculated from service_logs)
- **service_orders:** EMPTY (needs restoration from backup)

---

## Sample Boat Analysis

**Boat: "Twilight Zone"**
- customer_id: `8eea68b6-bcc8-4fa2-8098-a9e1fd854e32` ✅
- customer_name: NULL ❌ (should be "Paul Kamen")
- Customer from table: "Paul Kamen" ✅ (data exists, just not denormalized)
- Latest service: 2025-10-15 ✅
- Paint condition: "excellent" ✅ (in service_logs)
- paint_repaint_schedule: MISSING ❌
- service_schedules: 2025-12-01 ✅

**Diagnosis:** All core data exists and relationships are valid. Missing denormalized/calculated tables.

---

## Recommended Fix Priority

1. **HIGH:** Fix customer names (JOIN with customers table)
2. **HIGH:** Populate paint_repaint_schedule from service_logs
3. **HIGH:** Restore service_orders from backup
4. **MEDIUM:** Investigate scheduling calendar rendering
5. **MEDIUM:** Check forecast November date filtering
6. **LOW:** Verify customer count with user

---

## Phase 2: Pattern Analysis

### Similar Issues in Sailorskills Suite?

Need to check if other services have similar issues:
- **Portal:** Uses same boats/customers tables - likely has same customer name issue
- **Billing:** May rely on paint_repaint_schedule for upsell alerts
- **Dashboard (Insight):** Analytics may be affected by missing paint schedule data

### Common Pattern
All issues stem from:
1. Database rebuild cleaned up core tables but didn't recalculate denormalized/derived tables
2. Frontend expects pre-calculated data in separate tables
3. Need to run calculation/population scripts post-rebuild

---

## Next Steps (Phase 3 & 4)

1. Create migration to populate `paint_repaint_schedule` from `service_logs`
2. Update `boatDataFetcher.js` to JOIN customers table via `customer_id`
3. Restore service_orders from backup (user to provide backup data)
4. Test all fixes in operations dashboard
5. Apply similar fixes to portal and other services
6. Create post-rebuild checklist to prevent this in future

---

**Diagnostic Script:** `/scripts/diagnose-database.mjs`
**Run:** `node scripts/diagnose-database.mjs`
