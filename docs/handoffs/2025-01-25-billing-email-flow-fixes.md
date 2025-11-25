# Session Handoff: Billing Email Flow Fixes

**Date:** 2025-01-25
**Focus:** Fix invoice email issues for charged customers

## Problem Statement

When charging a customer with payment info on file in the Billing UI:
1. ❌ Customer received "invoice ready to pay" email (should be "payment receipt")
2. ❌ Email showed template variables ({{CUSTOMER_NAME}}, etc.) instead of actual data
3. ❌ Checkmark icon was off-center in email
4. ❌ No BCC emails received for billing notifications

## Root Causes Identified

### 1. Wrong Email Template for Paid Invoices
- Database trigger always sent `'new_invoice'` template, regardless of payment status
- Should send `'payment_receipt'` for paid invoices, `'new_invoice'` for unpaid

### 2. Template Variable Mismatch
- Email template used UPPERCASE: `{{CUSTOMER_NAME}}`, `{{BOAT_NAME}}`, etc.
- Database trigger sent camelCase: `customerName`, `boatName`, etc.
- JavaScript is case-sensitive, so variables weren't replaced

### 3. Incorrect Column Names
- Trigger used non-existent columns: `payment_status`, `total_amount`, `invoice_date`, `service_date`
- Actual columns: `status`, `amount`, `issued_at`, `due_at`

### 4. Hardcoded BCC Service
- `send-notification` edge function hardcoded `'operations'` for BCC lookup
- Should accept `serviceName` parameter to use service-specific BCC

### 5. CSS Display Issue
- Checkmark div used `display: inline-flex` instead of `display: flex`
- Caused off-center rendering

## Fixes Implemented

### 1. Database Trigger Update (`notification-triggers.sql`)
✅ **File:** `sailorskills-operations/database/notification-triggers.sql`

**Changes:**
- Added `serviceName` parameter to `call_send_notification_edge_function()` helper (default: `'operations'`)
- Updated `notify_invoice_created()` function:
  - Check `NEW.status` instead of `NEW.payment_status`
  - Send `'payment_receipt'` template when `status = 'paid'`
  - Send `'new_invoice'` template when `status != 'paid'`
  - Use correct column names: `amount`, `issued_at`, `due_at`
  - Extract service name from `service_details->>'service_name'`
  - Pass `'billing'` as serviceName parameter for BCC lookup

**Deployed:** ✅ Run against production database

### 2. Edge Function Update (`send-notification/index.ts`)
✅ **File:** `sailorskills-operations/supabase/functions/send-notification/index.ts`

**Changes:**
- Added `serviceName` parameter to `sendEmail()` function (default: `'operations'`)
- Extract `serviceName` from request body in main handler
- Pass `serviceName` to `getBccAddress()` instead of hardcoded `'operations'`
- Added `'payment_receipt'` to valid template types

**Deployed:** ✅ Deployed with `supabase functions deploy send-notification`

### 3. Email Template Fixes (Database)
✅ **Table:** `email_templates`

**Changes:**
- Updated `new_invoice` template:
  - `{{CUSTOMER_NAME}}` → `{{customerName}}`
  - `{{BOAT_NAME}}` → `{{boatName}}`
  - `{{INVOICE_NUMBER}}` → `{{invoiceNumber}}`
  - `{{SERVICE_DATE}}` → `{{serviceDate}}`
  - `{{INVOICE_TOTAL}}` → `{{invoiceTotal}}`
  - `{{DUE_DATE}}` → `{{dueDate}}`
  - `{{PAYMENT_LINK}}` → `{{paymentLink}}`
  - `display: inline-flex;` → `display: flex;` (checkmark centering)

**Deployed:** ✅ Direct SQL UPDATE applied

### 4. BCC Configuration Added
✅ **Table:** `email_bcc_settings`

**Changes:**
- Added row for `'Billing'` service
- BCC address: `standardhuman+bcc@gmail.com`
- Active: `true`
- Description: "BCC for billing invoice and receipt emails"

**Deployed:** ✅ Direct SQL INSERT applied

## Testing Instructions

### Test 1: Charge Customer with Payment Method
1. Open https://billing.sailorskills.com
2. Select "Test customer 30ft monohull" (has payment method on file)
3. Select a service and click "Charge Customer"
4. **Expected results:**
   - ✅ Customer receives "Payment Receipt" email (NOT "Invoice Ready")
   - ✅ Email shows actual customer name, boat name, amounts (NOT {{variables}})
   - ✅ Checkmark icon is centered in email
   - ✅ BCC email arrives at `standardhuman+bcc@gmail.com`
   - ✅ Customer also receives "Service Complete" email (unchanged)

### Test 2: Create Unpaid Invoice
1. Select a customer without payment method
2. Click "Invoice Customer" instead of "Charge Customer"
3. **Expected results:**
   - ✅ Customer receives "New Invoice" email
   - ✅ Email shows actual data (NOT {{variables}})
   - ✅ BCC email arrives at `standardhuman+bcc@gmail.com`

## Files Changed

### sailorskills-operations
- `database/notification-triggers.sql` - Updated trigger functions
- `supabase/functions/send-notification/index.ts` - Added serviceName parameter

### Database (direct updates)
- `email_templates` table - Fixed variable names and CSS
- `email_bcc_settings` table - Added Billing configuration

## Verification Commands

```bash
# Check BCC configuration
source db-env.sh
psql "$DATABASE_URL" -c "SELECT * FROM email_bcc_settings WHERE service_name = 'Billing'"

# Check email template variables
psql "$DATABASE_URL" -c "
SELECT template_key,
  CASE WHEN html_template_file LIKE '%{{customerName}}%' THEN '✓ camelCase' ELSE '✗ UPPERCASE' END as vars,
  CASE WHEN html_template_file LIKE '%display: flex;%' THEN '✓ centered' ELSE '✗ off-center' END as checkmark
FROM email_templates
WHERE template_key = 'new_invoice'"

# Check trigger function
psql "$DATABASE_URL" -c "
SELECT proname, prosrc
FROM pg_proc
WHERE proname = 'notify_invoice_created'"
```

## Commits

- **sailorskills-operations:** `cc69ff9` - "fix(email): fix invoice email flow for charged customers"
- **sailorskills-docs:** `ac83e34` - "chore: update sailorskills-operations submodule"

## Status

✅ **ALL FIXES DEPLOYED AND READY FOR TESTING**

## Next Steps

1. Test charging a customer in billing UI
2. Verify payment receipt email received (not invoice ready)
3. Verify BCC emails arrive
4. Verify all variables replaced correctly
5. Verify checkmark centered
6. Set up Gmail filters for BCC emails (if not already done)

---

**Note:** All changes are live in production. No Vercel redeployment needed (changes were database/edge function only).
