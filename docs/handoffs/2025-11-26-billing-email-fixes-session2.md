# Handoff: Billing Email Fixes - Session 2

**Date:** 2025-11-26
**Previous Handoff:** `2025-11-25-billing-email-and-service-log-fixes.md`

---

## Summary of Session

| Issue | Status |
|-------|--------|
| BCC emails not appearing in Gmail | ✅ Fixed (user-side filter) |
| Invoice Customer saving to wrong table | ✅ Fixed |
| Fallback template URLs pointing to ops.sailorskills.com | ✅ Fixed |
| Duplicate service completion emails | ✅ Fixed |
| Duplicate email has broken template variables | ✅ Fixed (root cause was duplicate) |

---

## Issues Fixed

### 1. BCC Emails Not Appearing in Gmail
**Problem:** User had Gmail filter set up but wasn't seeing BCC emails
**Root Cause:** Gmail filter used `to:(standardhuman+bcc@gmail.com)` but BCC addresses don't appear in the "to:" header
**Fix:** Updated Gmail filter to use `deliveredto:standardhuman+bcc@gmail.com`

### 2. Invoice Customer Saving to Wrong Table
**Problem:** "Invoice Customer" button saved conditions to `service_conditions_log` (33 records) instead of `service_logs` (1,215 records)
**Root Cause:** `invoice-flow.js` used `fetch('/api/save-conditions')` which calls Vercel API that writes to wrong table
**Fix:** Updated to use `window.supabaseClient.functions.invoke('save-conditions')` (same as charge flow)
**Commit:** `2e97b72` in sailorskills-billing

### 3. Fallback Template URLs Wrong Domain
**Problem:** Fallback email templates in send-notification pointed to `ops.sailorskills.com/portal*`
**Root Cause:** Portal was moved to separate service but fallback templates weren't updated
**Fix:** Updated 6 URLs to `portal.sailorskills.com/portal*`
**Commit:** `a5f9696` in sailorskills-operations
**Deployed:** send-notification edge function

### 4. Duplicate Service Completion Emails
**Problem:** Customer received TWO service completion emails - one with correct data, one with broken template variables
**Root Cause:**
1. Billing sends service_completion email directly via send-notification (with full data)
2. Billing saves conditions to service_logs table
3. Database trigger `on_service_log_insert` → `notify_service_completion` fires
4. Trigger sends SECOND email with only basic data (missing paint, growth, anodes, etc.)

**Fix:**
- Added `email_sent` column to `service_logs` table
- Updated `notify_service_completion` trigger to skip if `email_sent = true`
- Updated `save-conditions` edge function to accept `email_sent` parameter
- Updated `enhanced-charge-flow.js` to set `email_sent: true` when saving

**Commit:** `8407bfd` in sailorskills-billing
**Database:** ALTER TABLE + CREATE OR REPLACE FUNCTION

---

## Test Account Setup

Created test account for verifying portal links:

| Field | Value |
|-------|-------|
| Customer Name | TEST CUSTOMER - Email Testing |
| Email | validemailforsure@gmail.com |
| Boat | Test Email Portal |

**Usage:**
1. In Billing, search for "Email Testing" or "Test Email Portal"
2. Create invoice/charge
3. Email goes to validemailforsure@gmail.com
4. Click portal links from that email to test as customer would

---

## Code Changes

### sailorskills-billing

**Commits:**
1. `2e97b72` - fix(invoice): save conditions to service_logs table via edge function
2. `8407bfd` - fix(email): prevent duplicate service completion emails

**Files Changed:**
- `src/admin/invoice-flow.js` - Uses edge function instead of API
- `src/admin/inline-scripts/enhanced-charge-flow.js` - Sets email_sent: true
- `supabase/functions/save-conditions/index.ts` - Accepts email_sent parameter

### sailorskills-operations

**Commits:**
1. `a5f9696` - fix(email): update fallback template URLs to portal.sailorskills.com

**Files Changed:**
- `supabase/functions/send-notification/index.ts` - 6 URLs updated

---

## Database Changes

```sql
-- Added column
ALTER TABLE service_logs ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT false;

-- Updated trigger to check flag
CREATE OR REPLACE FUNCTION notify_service_completion()
-- Now checks: IF NEW.email_sent = true THEN RETURN NEW; END IF;
```

---

## Edge Functions Deployed

1. `save-conditions` - Accepts email_sent parameter
2. `send-notification` - Updated fallback template URLs

---

## Testing Checklist

After these fixes:

- [x] BCC emails appear in Gmail (with corrected filter)
- [x] Invoice Customer saves to service_logs table
- [x] Portal links in emails use portal.sailorskills.com
- [ ] Single service completion email per charge (not two)
- [ ] Email has correct template variable values

---

## Known Issues

1. **Invoice flow service completion:** When using "Invoice Customer", the trigger will still send a service_completion email (email_sent not set). This may be intended behavior - invoice customers get both invoice email AND service completion email.

---

## Related Documentation

- Previous handoff: `docs/handoffs/2025-11-25-billing-email-and-service-log-fixes.md`
- BCC Configuration: Settings service → System Configuration → BCC Email Configuration

---

## Rollback Instructions

### Database:
```sql
-- Remove email_sent check from trigger (if needed to restore old behavior)
-- Revert to previous notify_service_completion function definition

-- Or drop the column entirely (not recommended)
ALTER TABLE service_logs DROP COLUMN email_sent;
```

### Code:
```bash
cd sailorskills-billing
git revert 8407bfd 2e97b72

cd sailorskills-operations
git revert a5f9696
```
