# Boat Data Fix - Deployment Guide

## Issue Summary
Customer boat information (boat name, marina, dock, slip) was not being saved during Estimator signups due to database schema mismatch between Estimator edge function and actual boats table schema.

## Affected Customer
- **Name**: Paul Roge
- **Email**: proge@berkeley.edu
- **Phone**: 8318184769
- **Boat Name**: Grace
- **Marina**: Berkeley
- **Dock**: O
- **Slip**: 605
- **Order Number**: ORD-1761166799964-DOS7B

## Files Changed
1. ✅ `/sailorskills-site/supabase/migrations/011_add_boat_location_fields.sql` - Created
2. ✅ `/sailorskills-estimator/shared/supabase/functions/create-payment-intent/index.ts` - Fixed field names

---

## Step 1: Run Database Migration

### Option A: Supabase Dashboard (Recommended)
1. Go to https://supabase.com/dashboard/project/fzygakldvvzxmahkdylq/sql/new
2. Copy and paste the entire contents of `/sailorskills-site/supabase/migrations/011_add_boat_location_fields.sql`
3. Click "Run" button
4. Verify success message

### Option B: Supabase CLI (Requires Docker)
```bash
cd /Users/brian/app-development/sailorskills-repos/sailorskills-site
supabase db push --project-ref fzygakldvvzxmahkdylq
```

---

## Step 2: Deploy Edge Function Update

### Option A: Supabase Dashboard (Recommended)
1. Go to https://supabase.com/dashboard/project/fzygakldvvzxmahkdylq/functions
2. Find `create-payment-intent` function
3. Click "Edit function"
4. Replace the entire function code with the updated version from:
   `/sailorskills-estimator/shared/supabase/functions/create-payment-intent/index.ts`
5. Click "Deploy" button
6. Verify deployment success

### Option B: Supabase CLI (Requires Docker)
```bash
cd /Users/brian/app-development/sailorskills-repos/sailorskills-estimator
docker ps  # Ensure Docker is running
cd shared/supabase/functions
supabase functions deploy create-payment-intent --project-ref fzygakldvvzxmahkdylq
```

---

## Step 3: Backfill Paul Roge's Boat Data

### SQL to Run in Supabase Dashboard
```sql
-- First, find Paul Roge's customer record
SELECT id, name, email FROM customers WHERE email = 'proge@berkeley.edu';
-- Note the customer_id from the result

-- Then, create his boat record with the correct data
INSERT INTO boats (
  customer_id,
  name,
  marina,
  dock,
  slip,
  customer_name,  -- backward compatibility
  customer_email, -- backward compatibility
  customer_phone, -- backward compatibility
  length,
  type,
  is_active
) VALUES (
  '<customer_id_from_above>',  -- Replace with actual UUID
  'Grace',
  'Berkeley',
  'O',
  '605',
  'Paul Roge',
  'proge@berkeley.edu',
  '8318184769',
  0,  -- Length unknown from order email
  NULL,  -- Type unknown
  true
) RETURNING *;

-- Finally, link the boat to the service order
UPDATE service_orders
SET boat_id = '<boat_id_from_above>'  -- Replace with boat UUID from previous INSERT
WHERE order_number = 'ORD-1761166799964-DOS7B';
```

---

## Step 4: Verify Fix

### Test in Billing Service
1. Go to https://sailorskills-billing.vercel.app
2. Log in with: standardhuman@gmail.com / KLRss!650
3. Search for "Grace" in the search bar
4. **Expected Result**: Paul Roge's profile appears with boat name "Grace"
5. Click on the result
6. **Expected Result**: Full profile shows:
   - Customer: Paul Roge, proge@berkeley.edu, 8318184769
   - Boat: Grace
   - Location: Berkeley Marina, Dock O, Slip 605
   - Payment method: Saved

### Test New Signup
1. Go to Estimator: https://sailorskills-estimator-309d9lol8-brians-projects-bc2d3592.vercel.app
2. Create a test order with boat information
3. Check Billing to verify boat name, marina, dock, slip all saved correctly
4. Search by boat name - should find the customer

---

## Step 5: Check for Other Affected Orders

### SQL to Find Orders Missing Boat Data
```sql
-- Find service orders that are missing boat_id
SELECT
  so.id,
  so.order_number,
  so.created_at,
  c.name as customer_name,
  c.email as customer_email,
  so.service_type,
  so.status,
  so.service_details->>'boatName' as boat_name_from_details,
  so.service_details->>'boatLength' as boat_length
FROM service_orders so
LEFT JOIN customers c ON c.id = so.customer_id
WHERE so.boat_id IS NULL
  AND so.service != 'Item Recovery'  -- Item Recovery intentionally has no boat
  AND so.created_at > '2025-10-01'   -- Check last month
ORDER BY so.created_at DESC;
```

For each affected order, extract boat information from `service_details` JSONB field and create boat records using the same INSERT pattern as Step 3.

---

## Step 6: Push Changes to Git

```bash
cd /Users/brian/app-development/sailorskills-repos

# Add the changed files
git add sailorskills-site/supabase/migrations/011_add_boat_location_fields.sql
git add sailorskills-estimator/shared/supabase/functions/create-payment-intent/index.ts
git add DEPLOYMENT_GUIDE_BOAT_FIX.md

# Commit
git commit -m "Fix boat data schema mismatch - add marina/dock/slip columns and update Estimator edge function

- Add migration 011: Add marina, dock, slip columns to boats table
- Fix Estimator edge function to use correct field names (name, make, model, length vs boat_name, boat_make, etc.)
- Add dock field to boat data capture
- Update boat lookup query to use 'name' instead of 'boat_name'

Resolves issue where boat information was not being saved during signups due to field name mismatch."

# Push to GitHub
git push origin main
```

---

## Summary of Changes

### Database Schema
**Before:**
```
boats table: name, make, model, length (missing marina, dock, slip)
```

**After:**
```
boats table: name, make, model, length, marina, dock, slip
```

### Estimator Edge Function
**Before:**
```typescript
boat_name: formData.boatName,
boat_make: formData.boatMake,
boat_model: formData.boatModel,
boat_length_ft: parseInt(formData.boatLength),
marina_location: formData.marinaName,
slip_number: formData.slipNumber,
// Missing dock field
```

**After:**
```typescript
name: formData.boatName,
make: formData.boatMake,
model: formData.boatModel,
length: parseInt(formData.boatLength),
marina: formData.marinaName,
dock: formData.dock,
slip: formData.slipNumber,
```

### Search Capabilities (Billing)
**Before:** Could search by customer name/email only
**After:** Can search by customer name/email AND boat name/make/model

---

## Rollback Plan (if needed)

If issues arise, rollback with:

```sql
-- Remove added columns
ALTER TABLE boats DROP COLUMN IF EXISTS marina;
ALTER TABLE boats DROP COLUMN IF EXISTS dock;
ALTER TABLE boats DROP COLUMN IF EXISTS slip;
DROP INDEX IF EXISTS idx_boats_marina;
```

Then revert edge function to previous version via Supabase dashboard.

---

## Questions?
Contact: Brian (brian@sailorskills.com)
