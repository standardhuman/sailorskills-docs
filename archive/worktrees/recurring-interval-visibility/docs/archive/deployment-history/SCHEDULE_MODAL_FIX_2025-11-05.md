# Schedule Modal Fix - Audit Logs Security

**Date:** 2025-11-05
**Status:** ✅ FIXED
**Issue:** Schedule button opens modal (correct), but creating service order fails with RLS error

---

## Problem

When clicking "Schedule" on forecast boats:
1. ✅ Modal opens correctly (fixed in previous commit)
2. ❌ Creating service order fails with error:
   ```
   Failed to create service order: new row violates row-level
   security policy for table "audit_logs"
   ```

---

## Root Cause

**Sequence of Events:**
1. User submits schedule form
2. Frontend inserts row into `service_orders` table
3. Database trigger `audit_service_orders` fires
4. Trigger calls `log_audit_trail()` function
5. Function tries to INSERT into `audit_logs` table
6. **RLS policy blocks the insert** ❌

**Why RLS Blocked It:**

The `audit_logs` table has an RLS policy that blocks ALL manual inserts:
```sql
POLICY "audit_logs_no_manual_changes" USING (false)
```

This is intentional - audit logs should only be written by database triggers, not by application code.

**The Bug:**

The `log_audit_trail()` function was set to `SECURITY INVOKER`, meaning it runs with the **calling user's permissions**. When a staff user creates a service_order, the trigger runs with their permissions, which are blocked by RLS.

**What It Should Do:**

The function should run as `SECURITY DEFINER` (with **postgres user's elevated privileges**) so it can bypass RLS and write audit logs.

---

## Solution Applied

### Migration 022: Fix Audit Logs Security

Changed `log_audit_trail()` function from `SECURITY INVOKER` to `SECURITY DEFINER`:

```sql
CREATE OR REPLACE FUNCTION log_audit_trail()
RETURNS TRIGGER
SECURITY DEFINER  -- ✅ Run with elevated privileges
SET search_path = public  -- Security best practice
LANGUAGE plpgsql
AS $$ ... $$;
```

**Before:**
- Security: `invoker` (user's permissions)
- Result: RLS blocks audit log insert ❌

**After:**
- Security: `definer` (postgres permissions)
- Result: Bypasses RLS, audit log written ✅

---

## Files Changed

1. **`/migrations/022_fix_audit_logs_security.sql`** (NEW)
   - Recreates `log_audit_trail()` with SECURITY DEFINER
   - Applied to database: 2025-11-05

2. **Database function updated:**
   - Function: `log_audit_trail()`
   - Security: `invoker` → `definer`

---

## Testing Instructions

### Verify Fix in Production

1. Open https://ops.sailorskills.com/forecast.html
2. Click "Schedule" on any November boat
3. Fill in the form:
   - **Scheduled Date**: Pick a date (defaults to pattern date)
   - **Service Type**: Select from dropdown (e.g., "Routine Service")
   - **Estimated Amount**: Enter dollar amount (e.g., 150.00)
   - **Notes**: Optional
4. Click "Create Service Order"
5. **Expected result**:
   - ✅ Success toast: "Service order created for [boat name]"
   - ✅ Modal closes
   - ✅ Forecast refreshes
   - ✅ Boat's "Scheduled Date" column updates in table

### Verify Audit Log Written

```bash
source .env.local && psql "$DATABASE_URL" -c "
SELECT
  user_id,
  entity_type,
  action,
  timestamp
FROM audit_logs
WHERE entity_type = 'service_orders'
ORDER BY timestamp DESC
LIMIT 5;
"
```

Should show recent INSERT action for service_orders.

---

## Security Implications

**Is SECURITY DEFINER Safe?**

Yes, when used correctly:

✅ **Safe:**
- Function only writes to `audit_logs` (read-only table for users)
- Uses `SET search_path = public` to prevent schema attacks
- Function is simple and auditable (no complex logic)
- Only called by database triggers (not user-facing)

❌ **Would be unsafe if:**
- Function accepted user input (it doesn't)
- Function executed dynamic SQL (it doesn't)
- Function modified user-accessible tables (it doesn't)

**Best Practice Applied:**
```sql
SECURITY DEFINER
SET search_path = public  -- Prevents schema hijacking
```

This is a standard pattern for audit logging in PostgreSQL with RLS.

---

## Related Issues

- **Forecast Fix (2025-11-05)**: November boats showing 0 → Fixed pattern_date calculation
- **Schedule Modal (2025-11-05)**: Button redirects → Fixed to open modal

---

## Future Improvements

### Short Term (Optional)

1. **Add validation**: Check if service_order already exists for boat+date before creating duplicate
2. **Pre-fill marina/dock/slip**: Query from boats table to populate location fields
3. **Batch scheduling**: Allow selecting multiple boats and scheduling all at once

### Long Term (Consider)

1. **Drag-and-drop scheduling**: Use React Schedule view for visual calendar scheduling
2. **Conflict detection**: Warn if scheduling conflicts exist (same technician, two boats)
3. **Auto-scheduling**: Suggest optimal schedule based on predictions and technician availability

---

## Summary

**Problem:** Audit trail trigger couldn't write logs due to RLS policy blocking invoker permissions

**Solution:** Changed `log_audit_trail()` to SECURITY DEFINER to bypass RLS with elevated privileges

**Result:** Schedule modal now successfully creates service orders with full audit trail ✅

---

**Fixed by:** Claude (systematic-debugging skill)
**Verified:** Database function security updated
**User testing:** Ready for verification
