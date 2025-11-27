# Pending Orders: Enhanced Decline Workflow with Email Notifications

**Date:** 2025-11-03
**Feature:** Customer email notifications when orders are declined
**Services:** Operations (primary), Portal (customer visibility)
**Estimated Effort:** 5 hours

---

## Overview

Currently, when an admin declines a pending order in Operations, the order is marked as cancelled with a decline reason, but the customer receives no notification. This enhancement adds automatic email notifications to customers when their service requests are declined, improving transparency and customer communication.

## Requirements

### Functional Requirements

1. **Email Notification**: When admin declines an order, customer receives email with:
   - Decline reason provided by admin
   - Original order details (boat, service type, estimated amount)
   - Alternative actions (contact info, reschedule suggestions)
   - Professional, friendly tone

2. **Data Storage**: Store decline reason separately from general notes field

3. **Audit Trail**: Log all decline notification emails for monitoring and troubleshooting

4. **User Feedback**: Admin sees confirmation that customer will be notified

### Non-Functional Requirements

- Leverage existing email infrastructure (`send-notification` edge function)
- Match email styling/branding of existing notifications
- Immediate email delivery (no queuing delays)
- Simple, maintainable implementation

---

## Architecture

### **Approach: Extend Existing Email System**

Reuse the established pattern from `send-notification` and `send-receipt` edge functions:
1. Frontend invokes edge function after database update
2. Edge function sends via Resend API
3. Email logged to `email_logs` table
4. No queuing or retry complexity

**Benefits:**
- Consistent with existing codebase
- Proven reliable (already used for receipts, service completion, invoices)
- Simple to implement and maintain
- No new infrastructure needed

---

## Database Schema Changes

### 1. Add `decline_reason` column to `service_orders`

```sql
-- Migration: 015_add_decline_reason.sql
ALTER TABLE service_orders
ADD COLUMN decline_reason TEXT;

COMMENT ON COLUMN service_orders.decline_reason IS
  'Reason provided by admin when declining/rejecting order. NULL if order not declined.';
```

**Rationale:** Separate from `notes` field for cleaner data structure and easier querying of declined orders.

### 2. Use existing `email_logs` table

No changes needed - already exists and used by `send-receipt` function:
```sql
-- Reference: existing structure
CREATE TABLE email_logs (
  id UUID PRIMARY KEY,
  email_type TEXT,           -- Will use 'order_declined'
  recipient_email TEXT,
  recipient_name TEXT,
  subject TEXT,
  status TEXT,               -- 'sent' or 'failed'
  resend_id TEXT,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP,
  sent_at TIMESTAMP
);
```

---

## Implementation Details

### Frontend Changes (Operations)

**File:** `sailorskills-operations/src/views/pending-orders.js`

**Function:** `openDeclineModal()` (lines 314-369)

**Changes:**

1. **Update database** with decline reason:
```javascript
const { error } = await window.app.supabase
  .from('service_orders')
  .update({
    status: 'cancelled',
    decline_reason: reason,  // NEW: separate field
    updated_at: new Date().toISOString()
  })
  .eq('id', orderId);
```

2. **Invoke email notification:**
```javascript
// Send email notification to customer
await window.app.supabase.functions.invoke('send-notification', {
  body: {
    type: 'order_declined',
    data: {
      customerEmail: order.customer.email,
      customerName: order.customer.name,
      orderNumber: order.order_number,
      boatName: order.boat.name,
      serviceType: order.service_type,
      estimatedAmount: order.estimated_amount,
      declineReason: reason
    }
  }
});
```

3. **Update toast message:**
```javascript
showToast('Order declined. Customer will be notified via email.', 'success');
```

4. **Error handling:**
```javascript
try {
  // Database update
  // Email invoke
} catch (error) {
  console.error('Error declining order:', error);
  showToast('Failed to decline order', 'error');
  throw error;
}
```

---

### Backend Changes (Edge Function)

**File:** `sailorskills-operations/supabase/functions/send-notification/index.ts`

**Add new email template:** `getOrderDeclinedTemplate()`

```typescript
function getOrderDeclinedTemplate(data: any): EmailTemplate {
  return {
    subject: `Update on Your Service Request #${data.orderNumber}`,
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Montserrat', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; }
    .header { background: #1a237e; color: #fff; padding: 32px 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { padding: 40px 24px; }
    .order-box { background: #f8f9fa; border-left: 4px solid #1a237e; padding: 20px; margin: 24px 0; }
    .reason-box { background: #fff3cd; border-left: 4px solid #ff9800; padding: 20px; margin: 24px 0; }
    .contact-box { background: #e3f2fd; border-left: 4px solid #2196f3; padding: 20px; margin: 24px 0; }
    .footer { background: #f8f9fa; padding: 24px; text-align: center; border-top: 1px solid #e0e0e0; }
    .footer a { color: #1a237e; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Service Request Update</h1>
    </div>
    <div class="content">
      <h2>Hello ${data.customerName},</h2>

      <p>Thank you for your interest in Sailor Skills marine services.</p>

      <p>Unfortunately, we are unable to schedule your requested service at this time.</p>

      <div class="order-box">
        <strong>Your Request:</strong><br>
        <strong>Boat:</strong> ${data.boatName}<br>
        <strong>Service:</strong> ${data.serviceType}<br>
        <strong>Estimated Amount:</strong> $${data.estimatedAmount.toFixed(2)}
      </div>

      <div class="reason-box">
        <strong>Reason:</strong><br>
        ${data.declineReason}
      </div>

      <div class="contact-box">
        <strong>Next Steps</strong><br>
        We'd love to help if circumstances change. Please feel free to:
        <ul style="margin: 12px 0; padding-left: 20px;">
          <li>Call us at (555) 123-4567 to discuss alternatives</li>
          <li>Email us at support@sailorskills.com with questions</li>
          <li>Submit a new request at sailorskills.com when ready</li>
        </ul>
      </div>

      <p>We appreciate your understanding and hope to work with you in the future.</p>

      <p>Best regards,<br>
      <strong>The Sailor Skills Team</strong></p>
    </div>
    <div class="footer">
      <p><strong>Sailor Skills Marine Services</strong></p>
      <p><a href="https://ops.sailorskills.com/portal.html">Visit Customer Portal</a></p>
      <p style="font-size: 12px; color: #666; margin-top: 16px;">
        This is an automated notification. Please do not reply to this email.
      </p>
    </div>
  </div>
</body>
</html>`
  };
}
```

**Add template to switch statement:**

```typescript
// In main handler (line ~268)
case 'order_declined':
  template = getOrderDeclinedTemplate(data);
  break;
```

**Email logging:**

Existing `send-notification` function already logs to console. For decline emails specifically, consider logging successful sends to `email_logs` table:

```typescript
// After successful email send
const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

await supabaseClient.from('email_logs').insert({
  email_type: 'order_declined',
  recipient_email: data.customerEmail,
  recipient_name: data.customerName,
  subject: template.subject,
  status: 'sent',
  resend_id: result.id,
  metadata: {
    order_number: data.orderNumber,
    boat_name: data.boatName,
    service_type: data.serviceType,
    decline_reason: data.declineReason
  }
});
```

---

## Testing Plan

### Manual Testing

1. **Happy Path:**
   - Admin declines order with reason "Boat too large for our equipment"
   - Verify order status = 'cancelled'
   - Verify decline_reason field populated
   - Check customer receives email within 30 seconds
   - Verify email contains all required information
   - Confirm email_logs entry created

2. **Error Handling:**
   - Invalid email address → Edge function should log error
   - Network failure → Frontend should show error toast
   - Missing customer email → Should handle gracefully

3. **Edge Cases:**
   - Very long decline reason (500+ chars) → Should display correctly in email
   - Special characters in reason → Should escape properly in HTML
   - Customer with no email → Skip notification, don't crash

### Database Queries for Verification

```sql
-- View declined orders with reasons
SELECT
  order_number,
  customer_name,
  boat_name,
  decline_reason,
  updated_at
FROM service_orders
WHERE status = 'cancelled'
  AND decline_reason IS NOT NULL
ORDER BY updated_at DESC;

-- Check email delivery status
SELECT
  email_type,
  recipient_email,
  status,
  sent_at,
  metadata->>'order_number' as order_number
FROM email_logs
WHERE email_type = 'order_declined'
ORDER BY created_at DESC
LIMIT 10;
```

---

## Deployment Steps

1. **Run database migration:**
   ```bash
   psql "$DATABASE_URL" -f migrations/015_add_decline_reason.sql
   ```

2. **Deploy edge function:**
   ```bash
   cd sailorskills-operations/supabase/functions/send-notification
   supabase functions deploy send-notification
   ```

3. **Verify environment variables:**
   - `RESEND_API_KEY` set in Supabase
   - `EMAIL_FROM_ADDRESS` configured
   - `SUPABASE_SERVICE_ROLE_KEY` available

4. **Deploy Operations frontend:**
   ```bash
   cd sailorskills-operations
   npm run build
   vercel --prod
   ```

5. **Test on production:**
   - Decline a test order
   - Verify email received
   - Check email_logs table

---

## Success Criteria

- ✅ Customer receives professional email when order declined
- ✅ Email includes decline reason, order details, contact info
- ✅ Admin sees confirmation that notification will be sent
- ✅ All decline emails logged to database for audit trail
- ✅ No new infrastructure or complexity added
- ✅ Matches existing email system patterns

---

## Future Enhancements (Optional)

1. **Customer Portal visibility:** Show decline reason in portal order history
2. **Decline reason templates:** Pre-defined common reasons for consistency
3. **Email delivery status:** Show in Operations UI if email succeeded/failed
4. **Analytics:** Track decline reasons to identify patterns (capacity issues, service types, etc.)
5. **Re-submission workflow:** Allow customer to modify and re-submit from portal

---

## Files Modified

1. `migrations/015_add_decline_reason.sql` - NEW
2. `sailorskills-operations/src/views/pending-orders.js` - MODIFIED
3. `sailorskills-operations/supabase/functions/send-notification/index.ts` - MODIFIED
4. `docs/plans/2025-11-03-pending-orders-decline-notification.md` - NEW (this file)

---

## Dependencies

- Existing `send-notification` edge function
- Resend API account with configured domain
- `email_logs` table (already exists)

---

**Design Status:** ✅ Complete
**Ready for Implementation:** Yes
**Estimated Implementation Time:** 5 hours
