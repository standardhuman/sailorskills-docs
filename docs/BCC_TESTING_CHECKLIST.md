# BCC Email Configuration - Testing Checklist

**Feature:** Database-backed BCC email configuration with admin UI
**Test Date:** _To be completed after deployment_
**Tester:** _____________________

---

## Pre-Testing Verification

- [ ] Database migration applied successfully
- [ ] All edge functions deployed (9 total)
- [ ] Settings UI deployed to production
- [ ] Can access Settings UI at https://settings.sailorskills.com/src/views/system-config.html

---

## Test 1: BCC Configuration UI Loading

**Steps:**
1. Navigate to https://settings.sailorskills.com/src/views/system-config.html
2. Scroll to "📧 Email BCC Configuration" section
3. Verify table displays with 6 services

**Expected Results:**
- [ ] Table shows: operations, billing, booking, portal, settings, shared
- [ ] All BCC addresses show: standardhuman@gmail.com
- [ ] All Active checkboxes are checked
- [ ] Global Fallback shows: standardhuman@gmail.com (from Supabase secrets)
- [ ] Test buttons (📧) appear for each service

**Actual Results:**
_____________________

---

## Test 2: Update BCC Address via UI

**Steps:**
1. Change Operations BCC to: `test-operations@example.com`
2. Leave Active checkbox checked
3. Click "💾 Save BCC Changes"
4. Wait for success message

**Expected Results:**
- [ ] Success message: "✓ BCC settings saved successfully! Changes are effective immediately."
- [ ] Table reloads with new address showing
- [ ] Change appears in "Recent BCC Changes" section
- [ ] Shows: `Updated operations BCC` with `standardhuman@gmail.com → test-operations@example.com`

**Actual Results:**
_____________________

---

## Test 3: Send Test Email

**Steps:**
1. In Operations row, verify BCC address is `test-operations@example.com`
2. Click 📧 Test button for Operations
3. Wait for alert confirmation

**Expected Results:**
- [ ] Alert shows: "✅ Test email sent! Check test-operations@example.com inbox for confirmation."
- [ ] Check test-operations@example.com inbox (or use real email for actual test)
- [ ] Email subject: `[TEST] BCC Configuration Test - operations`
- [ ] Email body shows service name and BCC address
- [ ] Email received as BCC (To: shows noreply@sailorskills.com)

**Actual Results:**
_____________________

**Email Screenshot/Evidence:**
_____________________

---

## Test 4: Live Email with New BCC

**Steps:**
1. Complete a service in Operations (or trigger any Operations email)
2. Check test-operations@example.com for BCC copy
3. Verify standardhuman@gmail.com does NOT receive copy

**Expected Results:**
- [ ] Email sent successfully to customer
- [ ] BCC copy received at test-operations@example.com
- [ ] Old BCC (standardhuman@gmail.com) does NOT receive copy
- [ ] Edge function logs show: `[BCC] operations: test-operations@example.com (from database)`

**Actual Results:**
_____________________

**Email Screenshot/Evidence:**
_____________________

---

## Test 5: ENV Fallback Behavior

**Purpose:** Verify system falls back to ENV variable when database entry is inactive

**Steps:**
1. In database, run:
   ```sql
   UPDATE email_bcc_settings SET is_active = false WHERE service_name = 'operations';
   ```
2. Trigger an Operations email (service completion, notification, etc.)
3. Check which email receives BCC

**Expected Results:**
- [ ] Email still sends successfully
- [ ] BCC received at standardhuman@gmail.com (from ENV, not database)
- [ ] Edge function logs show: `[BCC] operations: standardhuman@gmail.com (from ENV fallback)`
- [ ] No errors in function logs

**Actual Results:**
_____________________

**Cleanup:**
```sql
UPDATE email_bcc_settings SET is_active = true WHERE service_name = 'operations';
UPDATE email_bcc_settings SET bcc_address = 'standardhuman@gmail.com' WHERE service_name = 'operations';
```

---

## Test 6: Deactivate BCC for Service

**Steps:**
1. In Settings UI, uncheck Active for Billing
2. Save changes
3. Trigger a billing email (invoice or receipt)
4. Check if BCC is sent

**Expected Results:**
- [ ] Email sends successfully to customer
- [ ] Falls back to ENV: standardhuman@gmail.com receives BCC
- [ ] Function logs show ENV fallback message

**Actual Results:**
_____________________

**Cleanup:** Re-enable Billing BCC in UI

---

## Test 7: Email Validation

**Steps:**
1. Try to save invalid email: `invalid-email`
2. Try to save disposable domain: `test@tempmail.com`
3. Try to save very long email (300 characters)

**Expected Results:**
- [ ] Alert shows: "Invalid email format" for invalid-email
- [ ] Alert shows: "Disposable email domains not allowed" for tempmail.com
- [ ] Alert shows: "Email address too long" for 300-char email
- [ ] No changes saved to database

**Actual Results:**
_____________________

---

## Test 8: Audit Log Verification

**Steps:**
1. Make 2-3 BCC address changes via UI
2. Check audit log in database:
   ```sql
   SELECT * FROM email_bcc_audit_log
   ORDER BY changed_at DESC
   LIMIT 10;
   ```

**Expected Results:**
- [ ] All changes recorded in audit log
- [ ] Each row shows: service_name, old_address, new_address, changed_by (user ID), changed_at, reason
- [ ] Reason shows: "Updated via Settings UI"
- [ ] Timestamps are accurate
- [ ] changed_by matches logged-in user ID

**Actual Results:**
_____________________

**Audit Log Screenshot:**
_____________________

---

## Test 9: Cross-Service BCC Testing

**Test each service's BCC functionality:**

### Operations (send-notification)
- [ ] Service completion email
- [ ] BCC received correctly
- [ ] Function: `/Users/brian/app-development/sailorskills-repos/sailorskills-operations/supabase/functions/send-notification/`

### Billing (send-email)
- [ ] Invoice email
- [ ] Receipt email
- [ ] BCC received for both
- [ ] Function: `/Users/brian/app-development/sailorskills-repos/sailorskills-billing/supabase/functions/send-email/`

### Billing (send-receipt)
- [ ] Payment receipt
- [ ] BCC received
- [ ] Function: `/Users/brian/app-development/sailorskills-repos/sailorskills-billing/supabase/functions/send-receipt/`

### Settings (auth emails - test 2-3 types)
- [ ] Magic link (login)
- [ ] Password reset
- [ ] Signup confirmation (if applicable)
- [ ] BCC received for all tested
- [ ] Functions: `sailorskills-settings/supabase/functions/auth-send-*/`

**Actual Results:**
_____________________

---

## Test 10: Reset Functionality

**Steps:**
1. Make changes to 2-3 BCC addresses
2. DO NOT save
3. Click "↺ Reset to Database Values"

**Expected Results:**
- [ ] Alert shows: "BCC settings reset to current database values"
- [ ] All unsaved changes discarded
- [ ] Table shows original database values

**Actual Results:**
_____________________

---

## Test 11: Database Fallback on Error

**Purpose:** Verify ENV fallback works when database is unreachable

**Steps:**
1. Temporarily make database query fail (optional advanced test)
2. OR just verify function code has try/catch
3. Trigger email

**Expected Results:**
- [ ] Email still sends (graceful degradation)
- [ ] Falls back to ENV BCC
- [ ] Error logged but doesn't break email sending

**Actual Results:**
_____________________

---

## Test 12: Immediate Effect Verification

**Purpose:** Confirm no redeploy needed for changes

**Steps:**
1. Note current time
2. Change BCC address via UI and save
3. IMMEDIATELY (within 30 seconds) trigger email
4. Check if new BCC is used

**Expected Results:**
- [ ] Email uses NEW BCC address immediately
- [ ] No redeploy or restart required
- [ ] Proves database-first lookup is working

**Actual Results:**
_____________________

---

## Performance & Observability

### Function Logs Review
Check Supabase function logs for:
- [ ] BCC lookup messages: `[BCC] {service}: {address} (from database)`
- [ ] Fallback messages when needed
- [ ] No unexpected errors
- [ ] Reasonable response times

### Database Performance
- [ ] BCC settings query is fast (< 50ms)
- [ ] No impact on email send time
- [ ] Audit log inserts complete successfully

---

## Summary

**Total Tests:** 12
**Passed:** _____
**Failed:** _____
**Blocked:** _____

**Critical Issues Found:**
_____________________

**Non-Critical Issues:**
_____________________

**Recommendations:**
_____________________

**Sign-off:**
- [ ] All critical tests passing
- [ ] Production ready for deployment
- [ ] Documentation updated

**Tested by:** _____________________
**Date:** _____________________
