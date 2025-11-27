# Email Templates Documentation

**Last Updated:** 2025-11-08
**Status:** Production templates synced to Settings database

---

## 📧 PRODUCTION EMAIL TEMPLATES

These templates are **ACTIVELY BEING SENT** to customers in production.

### Source: Operations send-notification Edge Function
**Location:** `/sailorskills-operations/supabase/functions/send-notification/index.ts`

1. **service_completion** - Service Completion Notification
   - **Trigger:** When a service is marked complete in Operations
   - **Subject:** `Service Completed: {{serviceName}} - {{boatName}}`
   - **Variables:** customerName, boatName, serviceName, serviceDate, totalHours
   - **Status:** ✅ Synced to Settings database

2. **new_invoice** - New Invoice Available
   - **Trigger:** When Operations creates a new invoice
   - **Subject:** `New Invoice {{invoiceNumber}} - {{boatName}}`
   - **Variables:** customerName, boatName, invoiceNumber, invoiceTotal, invoiceStatus, paymentLink, dueDate
   - **Status:** ✅ Synced to Settings database

3. **upcoming_service** - Service Reminder
   - **Trigger:** Scheduled reminder before service appointment
   - **Subject:** `Service Reminder: {{serviceName}} - {{boatName}}`
   - **Variables:** customerName, boatName, serviceName, serviceDate
   - **Status:** ✅ Synced to Settings database

4. **new_message** - Customer Message Notification
   - **Trigger:** When operations team sends a message to customer
   - **Subject:** `New Message from SailorSkills`
   - **Variables:** customerName, boatName, messageDate, messagePreview
   - **Status:** ✅ Synced to Settings database

5. **order_declined** - Service Request Declined
   - **Trigger:** When admin declines a pending service request
   - **Subject:** `Update on Your Service Request #{{orderNumber}}`
   - **Variables:** customerName, boatName, serviceType, estimatedAmount, orderNumber, declineReason
   - **Status:** ✅ Synced to Settings database

6. **request_accepted** - Service Request Accepted
   - **Trigger:** When admin accepts a pending service request
   - **Subject:** `Service Request Accepted - {{boatName}}`
   - **Variables:** customerName, boatName, serviceType, estimatedAmount, orderNumber
   - **Status:** ✅ Synced to Settings database

### Source: Billing send-receipt Edge Function
**Location:** `/sailorskills-billing/supabase/functions/send-receipt/index.ts`

7. **payment_receipt** - Payment Receipt (COMPLEX)
   - **Trigger:** After successful Stripe payment
   - **Subject:** `Payment Receipt - ${{amount}} - Sailor Skills`
   - **Variables:** customerEmail, customerName, amount, serviceName, boatName, boatLength, paymentIntentId, chargeId, serviceDate, serviceLogId, chargeBreakdown (complex object)
   - **Status:** ⚠️ **NOT in Settings database - Too complex**
   - **Note:** Contains TypeScript conditional logic for anodes, line items, discounts, boat details, service notes. Must remain inline in edge function.

---

## ❌ LEGACY / UNUSED TEMPLATES

These templates exist in the codebase but are **NOT being sent** to customers.

### File-Based Templates (NOT USED)
**Location:** `/sailorskills-operations/src/email/templates/`

- ❌ `service-completion.html` - Uses `{{CUSTOMER_NAME}}` style variables
- ❌ `new-invoice.html` - Uses `{{INVOICE_NUMBER}}` style variables
- ❌ `upcoming-service.html` - File-based version not used
- ❌ `new-message.html` - File-based version not used

**Why not used:** The Operations `send-notification` edge function uses inline HTML templates instead of loading from these files.

### Shared Package Templates (NOT DEPLOYED)
**Location:** `/sailorskills-shared/src/email/templates/`

- ❌ `order-confirmation.html` - Blue gradient header version (nice design but not in production)
- ❌ `order-declined.html` - Info icon version (not the production version)
- ❌ `status-update.html` - Timeline visualization (not deployed)
- ❌ `new-order-alert.html` - Admin notification (not being sent)

**Why not used:** The `notification-service.js` that references these templates is not deployed. The actual production code uses inline templates in edge functions.

---

## 🔄 MIGRATION STATUS

### What Was Done:
1. ✅ Identified all production emails being sent
2. ✅ Extracted inline HTML from edge functions
3. ✅ Synced 6 production templates to Settings database
4. ✅ Updated email-manager.js to display HTML templates
5. ✅ Created sync script: `sync-production-inline-templates.mjs`

### What's NOT Done:
- ⏳ Payment receipt template (too complex for Settings database)
- ⏳ Update edge functions to load templates from Settings API
- ⏳ Remove or archive unused file-based templates
- ⏳ Update shared notification-service.js or remove if unused

---

## 🎯 NEXT STEPS FOR FULL CENTRALIZATION

If you want all emails managed through Settings:

### Phase 1: Current State (DONE ✅)
- Settings database has all simple production templates
- Email manager UI can edit and preview them
- Templates match what's actually being sent

### Phase 2: Dynamic Loading (Future)
1. Update Operations `send-notification` edge function to:
   - Fetch templates from Settings API
   - Use Supabase client to load `html_template_file`
   - Perform variable substitution dynamically

2. Update Billing `send-receipt` edge function:
   - Keep inline for now due to complexity
   - OR: Build advanced template engine that handles conditional logic

3. Deprecate file-based templates:
   - Remove unused HTML files from `/src/email/templates/`
   - Update or remove `notification-service.js`

### Phase 3: Complete Migration
- All services load templates from Settings database
- Email manager becomes single source of truth
- Version control for template changes
- A/B testing capability

---

## 📋 TEMPLATE COMPARISON

| Email Type | File-Based Template | Inline Production | Settings Database |
|------------|-------------------|------------------|-------------------|
| Service Completion | ❌ Not used | ✅ Active | ✅ Synced |
| New Invoice | ❌ Not used | ✅ Active | ✅ Synced |
| Upcoming Service | ❌ Not used | ✅ Active | ✅ Synced |
| New Message | ❌ Not used | ✅ Active | ✅ Synced |
| Order Declined | ❌ Not used | ✅ Active | ✅ Synced |
| Request Accepted | ❌ Not used | ✅ Active | ✅ Synced |
| Payment Receipt | N/A | ✅ Active (complex) | ❌ Too complex |
| Order Confirmation | ❌ Not deployed | ❌ Not used | ❌ Old version |
| Status Update | ❌ Not deployed | ❌ Not used | ❌ Not production |

---

## 🚨 IMPORTANT NOTES

### Payment Receipt Complexity
The payment receipt template (send-receipt) includes:
- Conditional anode details rendering
- Dynamic line item displays
- Discount calculations
- Boat details (type, hull, engines, paint, growth)
- Service notes (through-hull, propeller conditions)
- Surcharge calculations

**This requires a more sophisticated template engine** than simple {{variable}} substitution.

### Variable Naming Conventions
- **Operations templates:** camelCase (customerName, boatName)
- **Old file templates:** UPPER_SNAKE_CASE (CUSTOMER_NAME, BOAT_NAME)
- **Production uses:** camelCase consistently

### Email Sending Flow
```
Service Event (Operations/Billing)
    ↓
Edge Function (send-notification / send-receipt)
    ↓
Inline HTML Template + Variable Substitution
    ↓
Resend API
    ↓
Customer Email
    ↓
email_logs table (tracking)
```

---

## 📁 KEY FILES

### Production Email Code:
- `/sailorskills-operations/supabase/functions/send-notification/index.ts` (6 templates)
- `/sailorskills-billing/supabase/functions/send-receipt/index.ts` (1 complex template)

### Settings Service:
- `/sailorskills-settings/src/views/email-manager.html` - Template editor UI
- `/sailorskills-settings/src/views/email-manager.js` - Editor logic
- `/sailorskills-settings/src/lib/email-service.js` - CRUD operations
- `/sailorskills-settings/scripts/sync-production-inline-templates.mjs` - Sync script

### Database:
- Table: `email_templates`
- Fields: `template_key`, `template_name`, `subject_line`, `html_template_file`, `available_variables`, `service`

---

## ✅ VERIFICATION

To verify templates in Settings:
```bash
cd /Users/brian/app-development/sailorskills-repos/sailorskills-settings
source ../db-env.sh
node scripts/sync-production-inline-templates.mjs
```

To view in UI:
```
https://sailorskills-settings-reyevubvv-sailorskills.vercel.app/src/views/email-manager.html
```

---

**Maintained by:** Claude Code
**Contact:** Update this doc when templates change
