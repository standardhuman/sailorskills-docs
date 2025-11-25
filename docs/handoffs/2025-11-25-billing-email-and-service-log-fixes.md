# Handoff: Billing Email Flow and Service Log Fixes

**Date:** 2025-11-25
**Status:** Complete
**Services Affected:** Billing, Database Triggers, Email Templates

---

## Summary

Fixed multiple issues with the billing charge flow including duplicate service logs, incorrect email types, broken email templates, and slider value storage.

---

## Issues Fixed

### 1. Duplicate Service Logs (Fixed)
**Problem:** Each charge created TWO service_logs entries
**Root Cause:** Both `enhanced-charge-flow.js` (line ~803) AND `conditions-logging.js` (line ~969) called `save-conditions`
**Fix:** Removed the duplicate call from `conditions-logging.js` - now only `enhanced-charge-flow.js` saves conditions

### 2. Numeric Slider Values Stored as "3" Instead of "good" (Fixed)
**Problem:** Service logs showed "Paint: 3" instead of "Paint: good"
**Root Cause:** `enhanced-charge-flow.js` read from `chargeBreakdown.boatDetails` (numeric) before `data-value` attribute (text)
**Fix:** Reordered to read `data-value` first:
```javascript
paint_condition_overall: document.getElementById('actualPaintCondition')?.getAttribute('data-value') || ...
```

### 3. Wrong Email Type - "Invoice Ready" Instead of "Payment Receipt" (Fixed)
**Problem:** Paid invoices sent "Invoice Ready" email instead of "Payment Receipt"
**Root Cause:** `/api/invoices.js` hardcoded `status: 'pending'` ignoring request body
**Fix:** API now accepts and uses `status` from request body

### 4. Duplicate Payment Receipt Email (Fixed)
**Problem:** Customers received both "Service Complete" AND "Payment Receipt" emails
**Root Cause:** Invoice trigger sent email even when billing already sent Service Complete
**Fix:**
- Set `emailSent: true` when creating invoice from billing charge
- Updated trigger to skip when `email_sent = true`

### 5. Broken Email Template Variables (Fixed)
**Problem:** Email showed `${{amount}}`, `{{paymentIntentId}}`, `{{currentYear}}` literally
**Root Cause:** Template variable names didn't match trigger data
**Fix:** Updated `payment_receipt` template to use correct variables:
- `{{invoiceTotal}}` (already includes $)
- `{{invoiceNumber}}` instead of paymentIntentId
- Hardcoded year 2025

### 6. Checkmark Off-Center in Emails (Fixed)
**Problem:** Green checkmark circle was left-aligned, not centered
**Root Cause:** `display: flex` not supported in email clients
**Fix:** Used table-based centering with `line-height`:
```html
<table><tr><td align="center">
  <div style="width: 80px; height: 80px; line-height: 80px; text-align: center;">
    <span style="font-size: 40px;">✓</span>
  </div>
</td></tr></table>
```

### 7. Missing Customer Name "Hi ," (Fixed)
**Problem:** Email greeting showed "Hi ," with no name
**Root Cause:** `customer_accounts` table had NULL names; trigger didn't fallback properly
**Fix:**
- Synced 180 customer_accounts records with names from customers table
- Updated trigger to fallback to customers table when name is NULL

### 8. save-conditions Edge Function 500 Error (Fixed)
**Problem:** Edge function returned 500 Internal Server Error
**Root Causes:**
1. Function `call_send_notification_edge_function(text, jsonb)` was ambiguous (two overloads)
2. Database constraints didn't accept new slider values like "excellent-good"
**Fixes:**
- Dropped 2-argument function version (kept 3-arg with default)
- Expanded CHECK constraints for paint and growth columns

---

## Database Changes

### Functions Modified
```sql
-- Dropped ambiguous function
DROP FUNCTION call_send_notification_edge_function(text, jsonb);

-- Updated notify_invoice_created - now skips when email_sent=true
-- Updated notify_service_completion - explicit type cast
```

### Constraints Updated
```sql
-- service_logs_paint_check now accepts:
'not_inspected', 'excellent', 'excellent-good', 'good', 'good-fair',
'fair', 'fair-poor', 'poor', 'very_poor', NULL

-- service_logs_growth_check now accepts:
'not_inspected', 'minimal', 'minimal-moderate', 'light', 'moderate',
'moderate-heavy', 'heavy', 'heavy-severe', 'severe', 'extreme', NULL
```

### Email Templates Updated
- `new_invoice` - Fixed checkmark centering, variable names
- `payment_receipt` - Fixed checkmark centering, variable names, removed paymentIntentId row

### Data Fixes
- Updated 180 `customer_accounts` records with names from `customers` table

---

## Code Changes (Committed to Git)

### sailorskills-billing

**Commits:**
1. `98e1a8f` - fix(charge): remove duplicate service log save and fix slider value reading
2. `03a5e50` - fix(api): invoice endpoint now respects status from request body
3. `b54f617` - fix(email): skip duplicate payment receipt when charging via billing
4. `2e97b72` - fix(invoice): save conditions to service_logs table via edge function

**Files Changed:**
- `src/admin/inline-scripts/conditions-logging.js` - Removed duplicate save call
- `src/admin/inline-scripts/enhanced-charge-flow.js` - Fixed slider reading order, set emailSent=true
- `api/invoices.js` - Accept status, paymentMethod, paymentReference, paidAt from request
- `src/admin/invoice-flow.js` - Now uses edge function instead of API (writes to correct table)

---

## Testing Checklist

After these fixes:

- [x] Single service log entry per charge (not two)
- [x] Service logs show text values ("good", "moderate") not numeric ("3")
- [x] Only Service Complete email sent (no duplicate Payment Receipt)
- [x] Email shows customer name correctly
- [x] Email amount shows single $ (not $$)
- [x] Checkmark centered in green circle
- [x] BCC emails received (Gmail filter needed `deliveredto:` not `to:`)
- [x] Invoice Customer saves to service_logs table (not service_conditions_log)

---

## Session 2 Fixes (2025-11-25 evening)

### 9. Invoice Customer Saving to Wrong Table (Fixed)
**Problem:** Invoice Customer button saved conditions to `service_conditions_log` (33 records) instead of `service_logs` (1,215 records)
**Root Cause:** `invoice-flow.js` used `fetch('/api/save-conditions')` which calls Vercel API → wrong table
**Fix:** Updated to use `window.supabaseClient.functions.invoke('save-conditions')` (same as charge flow)

### 10. BCC Emails Not Showing in Gmail (Fixed - User Side)
**Problem:** User wasn't seeing BCC emails in their "Sailor Skills/BCCs" folder
**Root Cause:** Gmail filter used `to:(standardhuman+bcc@gmail.com)` - but BCC addresses don't appear in the "to:" header
**Fix:** Updated Gmail filter to use `deliveredto:standardhuman+bcc@gmail.com`

---

## Known Remaining Issues

1. **Invoice PATCH 404** - `/api/invoices/:id` PATCH endpoint returns 404 (non-critical, logged as warning)
2. **customer_services 406** - Query returns "Not Acceptable" (uses service_logs fallback)
3. **Legacy table cleanup** - `service_conditions_log` has 33 orphaned records (can migrate or delete)

---

## Related Documentation

- Previous handoff: `docs/handoffs/2025-01-25-billing-email-flow-fixes.md`
- BCC Configuration: Settings service → System Configuration → BCC Email Configuration

---

## Rollback Instructions

If issues arise:

### Database (run in Supabase SQL Editor):
```sql
-- Restore email_sent skip check (if needed to send emails again)
-- Edit notify_invoice_created function to remove the email_sent check at the top
```

### Code:
```bash
# Revert to before these changes
git revert b54f617 03a5e50 98e1a8f
```
