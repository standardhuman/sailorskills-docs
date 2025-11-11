# RLS Policy Fix - Admin Access to Service Logs

**Date**: 2025-10-26
**Issue**: Operations showing "Never" for Last Service on all boats
**Root Cause**: Admin user in customer_accounts table, triggering RLS restriction

## The Problem

After fixing orphaned service logs (116 boat_ids were NULL), Operations still showed "Never" for Last Service because the RLS policy on `service_logs` table was blocking admin access.

### RLS Policy Logic

```sql
"Admin and customer access to service_logs" FOR SELECT
USING ((NOT (EXISTS (SELECT 1 FROM customer_accounts WHERE id = auth.uid())))
   OR (EXISTS (SELECT 1 FROM customer_boat_access WHERE customer_account_id = auth.uid() AND boat_id = service_logs.boat_id)))
```

Translation:
- **IF user NOT in customer_accounts** → Can see ALL service logs (admin access) ✅
- **IF user IS in customer_accounts** → Can only see service logs for boats they have explicit access to ❌

### The Issue

The admin user `standardhuman@gmail.com` was present in the `customer_accounts` table, which caused Supabase RLS to treat them as a customer portal user instead of an admin.

Result: They could only see service logs for boats they had explicit access to (none), so all boats showed "Never" for Last Service.

## The Fix

**Solution**: Remove admin email from `customer_accounts` table

```sql
DELETE FROM customer_accounts
WHERE email = 'standardhuman@gmail.com';
```

This allows the RLS policy to recognize them as an admin (NOT a customer), granting access to all service logs.

## Verification

**Before Fix:**
```
About Time: Never
Aleph Null: Never
Alsager: Never
...all boats showing "Never"
```

**After Fix:**
```
About Time: 10/22/2025 ✅
Aleph Null: 10/20/2025 ✅
Alsager: 2/10/2025 ✅
Amaterasu: 9/30/2025 ✅
Anacapa: 10/22/2025 ✅
...136 boats showing service history
```

## Lessons Learned

1. **Admin users should NOT be in customer_accounts** - They need full database access via RLS bypass
2. **Test RLS policies with actual user roles** - What works with anon key may fail with authenticated users
3. **RLS can silently block data** - No error messages, just empty results

## Related Issues

- **Orphaned service logs fix**: 116 service logs were missing boat_id, fixed in same session
- **RLS policy review needed**: Consider adding explicit admin role check instead of relying on "NOT in customer_accounts" logic

## Future Recommendations

Consider adding an `is_admin` flag or role-based access:

```sql
-- Option 1: Add admin flag to customer_accounts
ALTER TABLE customer_accounts ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;

-- Option 2: Use Supabase auth roles
UPDATE auth.users
SET raw_app_meta_data = jsonb_set(raw_app_meta_data, '{role}', '"admin"')
WHERE email = 'standardhuman@gmail.com';
```
